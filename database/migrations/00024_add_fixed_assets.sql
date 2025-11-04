-- 固定資産管理機能のマイグレーション
-- 取得・除却・償却のライフサイクル管理

-- ==============================================
-- 1. 固定資産テーブル
-- ==============================================
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本情報
  asset_code TEXT NOT NULL, -- 資産コード（例: FA-2024-001）
  name TEXT NOT NULL, -- 資産名（例: ノートPC）
  description TEXT, -- 説明
  category TEXT, -- カテゴリ（建物、機械、車両、工具器具備品など）

  -- 取得情報
  acquisition_date DATE NOT NULL, -- 取得日
  acquisition_cost NUMERIC(15, 2) NOT NULL CHECK (acquisition_cost >= 0), -- 取得価額
  salvage_value NUMERIC(15, 2) DEFAULT 0 CHECK (salvage_value >= 0), -- 残存価額

  -- 償却情報
  depreciation_method TEXT NOT NULL CHECK (depreciation_method IN ('straight', 'declining')), -- 償却方法（定額法、定率法）
  useful_life_months INTEGER NOT NULL CHECK (useful_life_months > 0), -- 耐用年数（月数）

  -- 勘定科目紐付け（会計コア連携）
  account_asset UUID REFERENCES accounts(id), -- 固定資産勘定（借方：資産計上）
  account_depr_exp UUID REFERENCES accounts(id), -- 減価償却費勘定（借方：費用計上）
  account_accum_depr UUID REFERENCES accounts(id), -- 減価償却累計額勘定（貸方：資産の評価減）

  -- ステータス
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed')), -- active: 使用中, disposed: 除却済み
  disposal_date DATE, -- 除却日
  disposal_reason TEXT, -- 除却理由

  -- 監査
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- ユニーク制約
  UNIQUE(tenant_id, asset_code)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant_id ON fixed_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_acquisition_date ON fixed_assets(acquisition_date);

-- RLS（Row Level Security）
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

-- 全権限ポリシー（tenant_id が一致するデータのみアクセス可能）
CREATE POLICY fixed_assets_tenant_policy ON fixed_assets
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ==============================================
-- 2. 償却スケジュールテーブル
-- ==============================================
CREATE TABLE IF NOT EXISTS depreciation_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 紐付け
  asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  period_id UUID REFERENCES accounting_periods(id) ON DELETE SET NULL, -- 会計期間

  -- 償却情報
  fiscal_year INTEGER NOT NULL, -- 会計年度
  fiscal_month INTEGER NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12), -- 会計月
  depreciation_amount NUMERIC(15, 2) NOT NULL CHECK (depreciation_amount >= 0), -- 当期償却額
  accumulated_depreciation NUMERIC(15, 2) NOT NULL CHECK (accumulated_depreciation >= 0), -- 累計償却額
  book_value NUMERIC(15, 2) NOT NULL CHECK (book_value >= 0), -- 帳簿価額（取得価額 - 累計償却額）

  -- 仕訳連携
  posted BOOLEAN DEFAULT FALSE, -- 仕訳起票済みフラグ
  posted_journal_id UUID REFERENCES journals(id) ON DELETE SET NULL, -- 起票した仕訳ID
  posted_at TIMESTAMPTZ, -- 起票日時

  -- 監査
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- ユニーク制約（同じ資産・同じ会計期間に複数のスケジュールを作成しない）
  UNIQUE(asset_id, fiscal_year, fiscal_month)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_tenant_id ON depreciation_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_asset_id ON depreciation_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_period_id ON depreciation_schedules(period_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_posted ON depreciation_schedules(posted);

-- RLS
ALTER TABLE depreciation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY depreciation_schedules_tenant_policy ON depreciation_schedules
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ==============================================
-- 3. トリガー（updated_at自動更新）
-- ==============================================
CREATE OR REPLACE FUNCTION update_fixed_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fixed_assets_updated_at
  BEFORE UPDATE ON fixed_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_fixed_assets_updated_at();

CREATE TRIGGER trigger_update_depreciation_schedules_updated_at
  BEFORE UPDATE ON depreciation_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_fixed_assets_updated_at();

-- ==============================================
-- 4. コメント
-- ==============================================
COMMENT ON TABLE fixed_assets IS '固定資産台帳';
COMMENT ON TABLE depreciation_schedules IS '償却スケジュール';

COMMENT ON COLUMN fixed_assets.depreciation_method IS 'straight: 定額法, declining: 定率法';
COMMENT ON COLUMN fixed_assets.useful_life_months IS '耐用年数（月数）。例: 5年 = 60ヶ月';
COMMENT ON COLUMN fixed_assets.status IS 'active: 使用中, disposed: 除却済み';
COMMENT ON COLUMN depreciation_schedules.posted IS '仕訳起票済みフラグ。true: 起票済み, false: 未起票';

-- ==============================================
-- 5. 完了メッセージ
-- ==============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 固定資産管理テーブルの作成が完了しました';
  RAISE NOTICE '   - fixed_assets: 固定資産台帳';
  RAISE NOTICE '   - depreciation_schedules: 償却スケジュール';
END $$;
