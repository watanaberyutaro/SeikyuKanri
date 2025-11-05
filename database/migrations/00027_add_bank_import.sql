-- 銀行CSVインポート・リコンサイル機能
-- FEATURE_BANK_IMPORT フラグで制御される新機能
-- 既存のAR（payments）、AP（payouts）と突合するための「リコンサイル層」

-- ==========================================
-- 1. bank_statements テーブル（取込ファイル単位）
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL, -- 口座名（例：三菱UFJ銀行 普通預金）
  statement_date DATE NOT NULL, -- 明細の日付（通常は取り込み日）
  raw_file_url TEXT, -- アップロードされたCSV/TSVのURL（Supabase Storageなど）
  file_name TEXT, -- ファイル名
  row_count INTEGER DEFAULT 0, -- インポートされた行数
  matched_count INTEGER DEFAULT 0, -- 突合済みの行数
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_bank_statements_tenant_id ON bank_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON bank_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON bank_statements(statement_date);

-- RLS有効化
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant bank statements" ON bank_statements
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert tenant bank statements" ON bank_statements
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update tenant bank statements" ON bank_statements
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete tenant bank statements" ON bank_statements
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ==========================================
-- 2. bank_rows テーブル（取込データの個別行）
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL, -- 取引日
  description TEXT NOT NULL, -- 摘要・取引内容
  amount NUMERIC(18, 2) NOT NULL, -- 金額（絶対値）
  type TEXT NOT NULL CHECK (type IN ('in', 'out')), -- 入金/出金
  hash CHAR(64) UNIQUE NOT NULL, -- 重複防止用ハッシュ（SHA-256）
  matched BOOLEAN DEFAULT false, -- 突合済みフラグ
  matched_target_type TEXT CHECK (matched_target_type IN ('invoice', 'bill', 'payment', 'payout')), -- 突合対象タイプ
  matched_target_id UUID, -- 突合対象ID（invoices.id または bills.id）
  matched_at TIMESTAMPTZ, -- 突合日時
  notes TEXT, -- メモ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_bank_rows_tenant_id ON bank_rows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_rows_statement_id ON bank_rows(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_rows_txn_date ON bank_rows(txn_date);
CREATE INDEX IF NOT EXISTS idx_bank_rows_type ON bank_rows(type);
CREATE INDEX IF NOT EXISTS idx_bank_rows_matched ON bank_rows(matched);
CREATE INDEX IF NOT EXISTS idx_bank_rows_hash ON bank_rows(hash);
CREATE INDEX IF NOT EXISTS idx_bank_rows_amount ON bank_rows(amount);

-- RLS有効化
ALTER TABLE bank_rows ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant bank rows" ON bank_rows
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert tenant bank rows" ON bank_rows
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update tenant bank rows" ON bank_rows
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete tenant bank rows" ON bank_rows
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ==========================================
-- 3. ハッシュ生成関数
-- ==========================================
-- 重複防止のため、txn_date + amount + 正規化したdescriptionからハッシュを生成
CREATE OR REPLACE FUNCTION generate_bank_row_hash(
  p_txn_date DATE,
  p_amount NUMERIC,
  p_description TEXT,
  p_type TEXT
) RETURNS CHAR(64) AS $$
DECLARE
  normalized_desc TEXT;
  hash_input TEXT;
BEGIN
  -- 摘要を正規化（全角→半角、空白除去、小文字化）
  normalized_desc := LOWER(REGEXP_REPLACE(p_description, '\s+', '', 'g'));

  -- ハッシュ入力文字列を作成
  hash_input := p_txn_date::TEXT || '|' || p_amount::TEXT || '|' || normalized_desc || '|' || p_type;

  -- SHA-256ハッシュを生成
  RETURN encode(digest(hash_input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- 4. bank_statements の統計更新関数
-- ==========================================
CREATE OR REPLACE FUNCTION update_bank_statement_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE bank_statements
    SET
      row_count = (
        SELECT COUNT(*) FROM bank_rows WHERE statement_id = NEW.statement_id
      ),
      matched_count = (
        SELECT COUNT(*) FROM bank_rows WHERE statement_id = NEW.statement_id AND matched = true
      ),
      updated_at = NOW()
    WHERE id = NEW.statement_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bank_statements
    SET
      row_count = (
        SELECT COUNT(*) FROM bank_rows WHERE statement_id = OLD.statement_id
      ),
      matched_count = (
        SELECT COUNT(*) FROM bank_rows WHERE statement_id = OLD.statement_id AND matched = true
      ),
      updated_at = NOW()
    WHERE id = OLD.statement_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER update_bank_statement_stats_on_row_change
  AFTER INSERT OR UPDATE OR DELETE ON bank_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_statement_stats();

-- ==========================================
-- 5. updated_at 自動更新トリガー
-- ==========================================
CREATE TRIGGER update_bank_statements_updated_at
  BEFORE UPDATE ON bank_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_rows_updated_at
  BEFORE UPDATE ON bank_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. コメント追加
-- ==========================================
COMMENT ON TABLE bank_statements IS '銀行CSVインポート: 取り込みファイル単位のメタデータ';
COMMENT ON TABLE bank_rows IS '銀行CSVインポート: 取り込みデータの個別行';
COMMENT ON COLUMN bank_rows.hash IS '重複防止用ハッシュ（txn_date + amount + 正規化description + type）';
COMMENT ON COLUMN bank_rows.matched_target_type IS '突合対象タイプ（invoice: 請求書/AR, bill: 請求書/AP, payment: 入金, payout: 支払）';
COMMENT ON COLUMN bank_rows.matched_target_id IS '突合対象のID（invoices.id, bills.id, payments.id, payouts.id）';

-- ==========================================
-- 7. 完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 銀行CSVインポート・リコンサイル機能の追加が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テーブル:';
  RAISE NOTICE '  - bank_statements (取込ファイル単位)';
  RAISE NOTICE '  - bank_rows (個別行データ)';
  RAISE NOTICE '';
  RAISE NOTICE '機能:';
  RAISE NOTICE '  - CSV/TSVアップロード＆パース';
  RAISE NOTICE '  - 重複防止（ハッシュベース）';
  RAISE NOTICE '  - AR（請求書・入金）との突合';
  RAISE NOTICE '  - AP（請求書・支払）との突合';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  → FEATURE_BANK_IMPORT=1 を環境変数に設定';
  RAISE NOTICE '  → /bank/import でCSVアップロード';
  RAISE NOTICE '  → /bank/reconcile で突合・確定';
  RAISE NOTICE '========================================';
END $$;
