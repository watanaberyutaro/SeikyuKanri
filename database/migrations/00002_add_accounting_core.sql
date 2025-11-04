-- 会計コア機能追加マイグレーション
-- FEATURE_ACCOUNTING_CORE フラグで制御される新機能
-- 既存の請求・見積・売掛管理機能には一切影響なし

-- ==============================
-- 1. 勘定科目テーブル (accounts)
-- ==============================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'contra')),
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  tax_category TEXT CHECK (tax_category IN ('standard', 'reduced', 'exempt', 'non-tax', NULL)),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(tenant_id, code);

-- RLS有効化
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant accounts" ON accounts
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert tenant accounts" ON accounts
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant accounts" ON accounts
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete tenant accounts" ON accounts
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ==============================
-- 2. 税率テーブル (tax_rates)
-- ==============================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(5, 3) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  category TEXT NOT NULL CHECK (category IN ('standard', 'reduced', 'exempt', 'non-tax')),
  applies_from DATE NOT NULL,
  applies_to DATE,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (applies_to IS NULL OR applies_to >= applies_from)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant_id ON tax_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_user_id ON tax_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_category ON tax_rates(category);
CREATE INDEX IF NOT EXISTS idx_tax_rates_dates ON tax_rates(applies_from, applies_to);

-- RLS有効化
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant tax rates" ON tax_rates
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert tenant tax rates" ON tax_rates
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant tax rates" ON tax_rates
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete tenant tax rates" ON tax_rates
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ==============================
-- 3. 会計期間テーブル (accounting_periods)
-- ==============================
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  fiscal_year INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_accounting_periods_tenant_id ON accounting_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_user_id ON accounting_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_dates ON accounting_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status ON accounting_periods(status);

-- RLS有効化
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant periods" ON accounting_periods
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert tenant periods" ON accounting_periods
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant periods" ON accounting_periods
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete tenant periods" ON accounting_periods
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ==============================
-- 4. 仕訳帳テーブル (journals)
-- ==============================
CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_date DATE NOT NULL,
  period_id UUID REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  memo TEXT,
  source TEXT,
  source_id UUID,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_journals_tenant_id ON journals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journals_user_id ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_period_id ON journals(period_id);
CREATE INDEX IF NOT EXISTS idx_journals_date ON journals(journal_date);
CREATE INDEX IF NOT EXISTS idx_journals_source ON journals(source, source_id);

-- RLS有効化
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant journals" ON journals
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert tenant journals" ON journals
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update tenant journals" ON journals
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete tenant journals" ON journals
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ==============================
-- 5. 仕訳明細テーブル (journal_lines)
-- ==============================
CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  description TEXT,
  debit NUMERIC(18, 2) DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(18, 2) DEFAULT 0 CHECK (credit >= 0),
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (NOT (debit > 0 AND credit > 0)),
  CHECK (debit > 0 OR credit > 0)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_id ON journal_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_user_id ON journal_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tax_rate_id ON journal_lines(tax_rate_id);

-- RLS有効化
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant journal lines" ON journal_lines
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert tenant journal lines" ON journal_lines
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant journal lines" ON journal_lines
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete tenant journal lines" ON journal_lines
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ==============================
-- 6. トリガー: updated_at自動更新
-- ==============================
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_periods_updated_at
  BEFORE UPDATE ON accounting_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journals_updated_at
  BEFORE UPDATE ON journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================
-- 7. 借貸一致チェック関数
-- ==============================
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit NUMERIC(18, 2);
  total_credit NUMERIC(18, 2);
BEGIN
  -- 該当仕訳の借方・貸方合計を計算
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO total_debit, total_credit
  FROM journal_lines
  WHERE journal_id = COALESCE(NEW.journal_id, OLD.journal_id);

  -- 借方合計と貸方合計が一致しない場合はエラー
  IF total_debit != total_credit THEN
    RAISE EXCEPTION '借方合計(%)と貸方合計(%)が一致しません', total_debit, total_credit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 借貸一致チェックトリガー
CREATE TRIGGER check_journal_balance_on_insert
  AFTER INSERT ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_balance();

CREATE TRIGGER check_journal_balance_on_update
  AFTER UPDATE ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_balance();

CREATE TRIGGER check_journal_balance_on_delete
  AFTER DELETE ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_balance();

-- ==============================
-- 8. 期間ロックチェック関数
-- ==============================
CREATE OR REPLACE FUNCTION check_period_lock()
RETURNS TRIGGER AS $$
DECLARE
  period_status TEXT;
  journal_date DATE;
BEGIN
  -- 仕訳日を取得
  IF TG_TABLE_NAME = 'journals' THEN
    journal_date := NEW.journal_date;
  ELSE
    -- journal_linesの場合、親の仕訳から日付を取得
    SELECT j.journal_date INTO journal_date
    FROM journals j
    WHERE j.id = NEW.journal_id;
  END IF;

  -- 該当期間のステータスを確認
  SELECT status INTO period_status
  FROM accounting_periods
  WHERE tenant_id = NEW.tenant_id
    AND journal_date BETWEEN start_date AND end_date
  LIMIT 1;

  -- ロックされている期間への登録・更新を禁止
  IF period_status = 'locked' THEN
    RAISE EXCEPTION '会計期間がロックされているため、仕訳の登録・更新はできません';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 期間ロックチェックトリガー
CREATE TRIGGER check_period_lock_on_journal_insert
  BEFORE INSERT ON journals
  FOR EACH ROW
  EXECUTE FUNCTION check_period_lock();

CREATE TRIGGER check_period_lock_on_journal_update
  BEFORE UPDATE ON journals
  FOR EACH ROW
  EXECUTE FUNCTION check_period_lock();

CREATE TRIGGER check_period_lock_on_journal_line_insert
  BEFORE INSERT ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_period_lock();

CREATE TRIGGER check_period_lock_on_journal_line_update
  BEFORE UPDATE ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION check_period_lock();

-- ==============================
-- 9. 総勘定元帳ビュー（参考実装）
-- ==============================
CREATE OR REPLACE VIEW general_ledger AS
SELECT
  jl.tenant_id,
  jl.user_id,
  j.journal_date,
  a.code AS account_code,
  a.name AS account_name,
  a.type AS account_type,
  jl.description,
  jl.debit,
  jl.credit,
  jl.debit - jl.credit AS net_amount,
  j.memo AS journal_memo,
  j.source,
  j.source_id,
  jl.department,
  tr.name AS tax_rate_name,
  tr.rate AS tax_rate,
  j.id AS journal_id,
  jl.id AS journal_line_id,
  j.created_at
FROM journal_lines jl
INNER JOIN journals j ON jl.journal_id = j.id
INNER JOIN accounts a ON jl.account_id = a.id
LEFT JOIN tax_rates tr ON jl.tax_rate_id = tr.id
ORDER BY j.journal_date, j.id, jl.line_number;

-- ==============================
-- 10. 試算表ビュー（参考実装）
-- ==============================
CREATE OR REPLACE VIEW trial_balance AS
SELECT
  jl.tenant_id,
  jl.user_id,
  a.id AS account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.type AS account_type,
  SUM(jl.debit) AS total_debit,
  SUM(jl.credit) AS total_credit,
  SUM(jl.debit - jl.credit) AS balance
FROM journal_lines jl
INNER JOIN journals j ON jl.journal_id = j.id
INNER JOIN accounts a ON jl.account_id = a.id
GROUP BY jl.tenant_id, jl.user_id, a.id, a.code, a.name, a.type
ORDER BY a.code;

-- 完了メッセージ
COMMENT ON TABLE accounts IS '会計コア: 勘定科目マスタ';
COMMENT ON TABLE tax_rates IS '会計コア: 税率マスタ';
COMMENT ON TABLE accounting_periods IS '会計コア: 会計期間マスタ';
COMMENT ON TABLE journals IS '会計コア: 仕訳帳';
COMMENT ON TABLE journal_lines IS '会計コア: 仕訳明細';
