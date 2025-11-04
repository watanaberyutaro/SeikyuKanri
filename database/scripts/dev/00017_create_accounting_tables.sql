-- 会計コア機能のテーブルを作成するマイグレーション
-- 経費精算機能に必要な accounts と tax_rates テーブルを作成します

-- ==========================================
-- 1. tax_rates テーブル（税率マスター）
-- ==========================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(5, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant_id ON tax_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_rate ON tax_rates(rate);

-- RLS有効化
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Users can view tenant tax rates" ON tax_rates;
CREATE POLICY "Users can view tenant tax rates" ON tax_rates
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert tenant tax rates" ON tax_rates;
CREATE POLICY "Users can insert tenant tax rates" ON tax_rates
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update tenant tax rates" ON tax_rates;
CREATE POLICY "Users can update tenant tax rates" ON tax_rates
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete tenant tax rates" ON tax_rates;
CREATE POLICY "Users can delete tenant tax rates" ON tax_rates
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_tax_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tax_rates_updated_at ON tax_rates;
CREATE TRIGGER update_tax_rates_updated_at
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_rates_updated_at();

-- ==========================================
-- 2. accounts テーブル（勘定科目マスター）
-- ==========================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_account_id);

-- RLS有効化
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Users can view tenant accounts" ON accounts;
CREATE POLICY "Users can view tenant accounts" ON accounts
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert tenant accounts" ON accounts;
CREATE POLICY "Users can insert tenant accounts" ON accounts
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update tenant accounts" ON accounts;
CREATE POLICY "Users can update tenant accounts" ON accounts
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete tenant accounts" ON accounts;
CREATE POLICY "Users can delete tenant accounts" ON accounts
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_updated_at();

-- ==========================================
-- 完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 会計テーブルの作成が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テーブル:';
  RAISE NOTICE '  - tax_rates (税率マスター)';
  RAISE NOTICE '  - accounts (勘定科目マスター)';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  → 00014_bulk_insert_master_data_for_all_tenants.sql を実行';
  RAISE NOTICE '========================================';
END $$;
