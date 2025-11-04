-- 銀行・カード取引管理機能のマイグレーション
-- 通帳・カードからの取引をインポートして仕訳を作成する機能

-- ==========================================
-- 1. bank_accounts テーブル（銀行口座・カードマスタ）
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'card', 'cash')),
  account_number TEXT,
  bank_name TEXT,
  branch_name TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- 対応する勘定科目
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant_id ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(account_type);

-- RLS有効化
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Users can view tenant bank accounts" ON bank_accounts;
CREATE POLICY "Users can view tenant bank accounts" ON bank_accounts
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert tenant bank accounts" ON bank_accounts;
CREATE POLICY "Users can insert tenant bank accounts" ON bank_accounts
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update tenant bank accounts" ON bank_accounts;
CREATE POLICY "Users can update tenant bank accounts" ON bank_accounts
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete tenant bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete tenant bank accounts" ON bank_accounts
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_accounts_updated_at();

-- ==========================================
-- 2. bank_transactions テーブル（取引履歴）
-- ==========================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  balance NUMERIC(15, 2),
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit')),
  journal_id UUID REFERENCES journals(id) ON DELETE SET NULL, -- 仕訳済みの場合
  is_reconciled BOOLEAN DEFAULT false, -- 仕訳済みフラグ
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_bank_transactions_tenant_id ON bank_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account_id ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_journal_id ON bank_transactions(journal_id);

-- RLS有効化
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Users can view tenant transactions" ON bank_transactions;
CREATE POLICY "Users can view tenant transactions" ON bank_transactions
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert tenant transactions" ON bank_transactions;
CREATE POLICY "Users can insert tenant transactions" ON bank_transactions
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update tenant transactions" ON bank_transactions;
CREATE POLICY "Users can update tenant transactions" ON bank_transactions
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete tenant transactions" ON bank_transactions;
CREATE POLICY "Users can delete tenant transactions" ON bank_transactions
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_bank_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_transactions_updated_at();

-- ==========================================
-- 3. journals テーブルに is_approved カラムと source_type カラムを追加
-- ==========================================
ALTER TABLE journals
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_type TEXT;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_journals_approved ON journals(is_approved);
CREATE INDEX IF NOT EXISTS idx_journals_source_type ON journals(source_type);

-- ==========================================
-- 完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 銀行取引管理機能の追加が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テーブル:';
  RAISE NOTICE '  - bank_accounts (銀行口座・カードマスタ)';
  RAISE NOTICE '  - bank_transactions (取引履歴)';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  → 通帳・カード類ページから取引を登録';
  RAISE NOTICE '  → 未仕訳の取引から仕訳を作成';
  RAISE NOTICE '========================================';
END $$;
