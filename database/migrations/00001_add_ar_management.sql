-- 売掛管理機能追加マイグレーション
-- FEATURE_AR_MANAGEMENT フラグで制御される新機能

-- ==============================
-- 1. 入金テーブル (payments)
-- ==============================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES client_companies(id) ON DELETE SET NULL,
  received_on DATE NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  method TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_on ON payments(received_on);

-- RLS有効化
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant payments" ON payments
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert tenant payments" ON payments
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant payments" ON payments
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete tenant payments" ON payments
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- ==============================
-- 2. 入金配分テーブル (payment_allocations)
-- ==============================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(18, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_payment_allocations_tenant_id ON payment_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- RLS有効化
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant allocations" ON payment_allocations
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert tenant allocations" ON payment_allocations
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete tenant allocations" ON payment_allocations
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- ==============================
-- 3. 督促ルールテーブル (dunning_rules)
-- ==============================
CREATE TABLE IF NOT EXISTS dunning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('0-30', '31-60', '61-90', '90+')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  send_email BOOLEAN DEFAULT true,
  bcc TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_dunning_rules_tenant_id ON dunning_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dunning_rules_enabled ON dunning_rules(enabled);

-- RLS有効化
ALTER TABLE dunning_rules ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant dunning rules" ON dunning_rules
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert tenant dunning rules" ON dunning_rules
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant dunning rules" ON dunning_rules
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete tenant dunning rules" ON dunning_rules
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- ==============================
-- 4. 督促ログテーブル (dunning_logs)
-- ==============================
CREATE TABLE IF NOT EXISTS dunning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES dunning_rules(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'none')),
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_dunning_logs_tenant_id ON dunning_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dunning_logs_invoice_id ON dunning_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_logs_sent_at ON dunning_logs(sent_at);

-- RLS有効化
ALTER TABLE dunning_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view tenant dunning logs" ON dunning_logs
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert tenant dunning logs" ON dunning_logs
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- ==============================
-- 5. 売掛年齢表ビュー (ar_aging_by_customer)
-- ==============================
CREATE OR REPLACE VIEW ar_aging_by_customer AS
SELECT
  i.tenant_id,
  i.user_id,
  i.company_id AS customer_id,
  cc.name AS customer_name,
  COALESCE(SUM(CASE
    WHEN CURRENT_DATE - i.issue_date <= 30
    THEN i.total_amount - COALESCE(pa_sum.allocated, 0)
    ELSE 0
  END), 0) AS current,
  COALESCE(SUM(CASE
    WHEN CURRENT_DATE - i.issue_date BETWEEN 31 AND 60
    THEN i.total_amount - COALESCE(pa_sum.allocated, 0)
    ELSE 0
  END), 0) AS b31_60,
  COALESCE(SUM(CASE
    WHEN CURRENT_DATE - i.issue_date BETWEEN 61 AND 90
    THEN i.total_amount - COALESCE(pa_sum.allocated, 0)
    ELSE 0
  END), 0) AS b61_90,
  COALESCE(SUM(CASE
    WHEN CURRENT_DATE - i.issue_date > 90
    THEN i.total_amount - COALESCE(pa_sum.allocated, 0)
    ELSE 0
  END), 0) AS b90_plus,
  COALESCE(SUM(i.total_amount - COALESCE(pa_sum.allocated, 0)), 0) AS total,
  CURRENT_DATE AS as_of
FROM invoices i
LEFT JOIN client_companies cc ON i.company_id = cc.id
LEFT JOIN (
  SELECT
    invoice_id,
    SUM(allocated_amount) AS allocated
  FROM payment_allocations
  GROUP BY invoice_id
) pa_sum ON i.id = pa_sum.invoice_id
WHERE i.status IN ('sent', 'pending')
  AND i.total_amount > COALESCE(pa_sum.allocated, 0)
GROUP BY i.tenant_id, i.user_id, i.company_id, cc.name;

-- ==============================
-- 6. 請求別残高ビュー (ar_invoice_balance)
-- ==============================
CREATE OR REPLACE VIEW ar_invoice_balance AS
SELECT
  i.id AS invoice_id,
  i.tenant_id,
  i.user_id,
  i.company_id,
  i.invoice_number,
  i.issue_date,
  i.due_date,
  i.total_amount,
  COALESCE(pa_sum.allocated, 0) AS allocated_amount,
  i.total_amount - COALESCE(pa_sum.allocated, 0) AS balance,
  CASE
    WHEN i.due_date IS NULL THEN 0
    WHEN CURRENT_DATE > i.due_date THEN CURRENT_DATE - i.due_date
    ELSE 0
  END AS days_overdue,
  CASE
    WHEN CURRENT_DATE - i.issue_date <= 30 THEN '0-30'
    WHEN CURRENT_DATE - i.issue_date BETWEEN 31 AND 60 THEN '31-60'
    WHEN CURRENT_DATE - i.issue_date BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END AS aging_bucket
FROM invoices i
LEFT JOIN (
  SELECT
    invoice_id,
    SUM(allocated_amount) AS allocated
  FROM payment_allocations
  GROUP BY invoice_id
) pa_sum ON i.id = pa_sum.invoice_id
WHERE i.status IN ('sent', 'pending')
  AND i.total_amount > COALESCE(pa_sum.allocated, 0);

-- ==============================
-- 7. トリガー：updated_at自動更新
-- ==============================
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dunning_rules_updated_at
  BEFORE UPDATE ON dunning_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================
-- 8. 配分整合性チェック関数
-- ==============================
CREATE OR REPLACE FUNCTION check_allocation_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_allocated NUMERIC(18, 2);
  payment_amount NUMERIC(18, 2);
  invoice_total NUMERIC(18, 2);
  invoice_allocated NUMERIC(18, 2);
BEGIN
  -- 入金の総額を取得
  SELECT amount INTO payment_amount
  FROM payments
  WHERE id = NEW.payment_id;

  -- この入金の配分合計を計算
  SELECT COALESCE(SUM(allocated_amount), 0) INTO total_allocated
  FROM payment_allocations
  WHERE payment_id = NEW.payment_id;

  -- 新しい配分を加えた合計が入金額を超えないかチェック
  IF total_allocated + NEW.allocated_amount > payment_amount THEN
    RAISE EXCEPTION '配分額が入金額を超えています';
  END IF;

  -- 請求書の総額を取得
  SELECT total_amount INTO invoice_total
  FROM invoices
  WHERE id = NEW.invoice_id;

  -- この請求書への配分合計を計算
  SELECT COALESCE(SUM(allocated_amount), 0) INTO invoice_allocated
  FROM payment_allocations
  WHERE invoice_id = NEW.invoice_id;

  -- 新しい配分を加えた合計が請求書総額を超えないかチェック
  IF invoice_allocated + NEW.allocated_amount > invoice_total THEN
    RAISE EXCEPTION '配分額が請求書金額を超えています';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
CREATE TRIGGER check_allocation_before_insert
  BEFORE INSERT ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION check_allocation_balance();

-- ==============================
-- 9. コメント追加
-- ==============================
COMMENT ON TABLE payments IS '売掛管理: 入金記録テーブル';
COMMENT ON TABLE payment_allocations IS '売掛管理: 入金配分テーブル（請求書への消込）';
COMMENT ON TABLE dunning_rules IS '売掛管理: 督促ルールテーブル';
COMMENT ON TABLE dunning_logs IS '売掛管理: 督促送信ログテーブル';
COMMENT ON VIEW ar_aging_by_customer IS '売掛管理: 顧客別年齢表ビュー';
COMMENT ON VIEW ar_invoice_balance IS '売掛管理: 請求別残高ビュー';
