-- 買掛管理（AP: Accounts Payable）機能
-- 既存のAR（売掛管理）とは完全に独立したデータ構造

-- ========================================
-- 1. 仕入先マスタ
-- ========================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT, -- 仕入先コード
  email TEXT,
  phone TEXT,
  postal_code TEXT,
  address TEXT,
  contact_person TEXT,
  payment_terms TEXT, -- 支払条件（例: 月末締め翌月末払い）
  memo TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_tenant_id ON vendors(tenant_id);
CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_code ON vendors(code);

-- RLS設定
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own tenant vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own tenant vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ========================================
-- 2. 請求書（買掛）
-- ========================================
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  bill_number TEXT NOT NULL, -- 請求書番号（仕入先からの番号）
  bill_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_breakdown JSONB, -- 税率別内訳 [{"rate": 10, "base": 10000, "tax": 1000}]
  status TEXT NOT NULL DEFAULT 'draft', -- draft, issued, partially_paid, paid, overdue
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bills_total_check CHECK (total_amount >= 0),
  CONSTRAINT bills_status_check CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue'))
);

CREATE INDEX idx_bills_tenant_id ON bills(tenant_id);
CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_vendor_id ON bills(vendor_id);
CREATE INDEX idx_bills_bill_date ON bills(bill_date);
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_bills_status ON bills(status);

-- RLS設定
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant bills"
  ON bills FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own tenant bills"
  ON bills FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own tenant bills"
  ON bills FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ========================================
-- 3. 請求書明細
-- ========================================
CREATE TABLE IF NOT EXISTS bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0, -- quantity * unit_price
  tax_rate_id UUID REFERENCES tax_rates(id),
  account_id UUID REFERENCES accounts(id), -- 費用勘定科目（会計連携用）
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT bill_lines_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_bill_lines_tenant_id ON bill_lines(tenant_id);
CREATE INDEX idx_bill_lines_bill_id ON bill_lines(bill_id);

-- RLS設定
ALTER TABLE bill_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant bill lines"
  ON bill_lines FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own tenant bill lines"
  ON bill_lines FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own tenant bill lines"
  ON bill_lines FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own tenant bill lines"
  ON bill_lines FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ========================================
-- 4. 支払（Payouts）
-- ========================================
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- NULL可（一般支払）
  paid_on DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  method TEXT, -- bank_transfer, cash, check, etc.
  reference_number TEXT, -- 振込番号など
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payouts_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_payouts_tenant_id ON payouts(tenant_id);
CREATE INDEX idx_payouts_user_id ON payouts(user_id);
CREATE INDEX idx_payouts_vendor_id ON payouts(vendor_id);
CREATE INDEX idx_payouts_paid_on ON payouts(paid_on);

-- RLS設定
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own tenant payouts"
  ON payouts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own tenant payouts"
  ON payouts FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ========================================
-- 5. 買掛消込（AP Allocations）
-- ========================================
CREATE TABLE IF NOT EXISTS ap_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ap_allocations_amount_check CHECK (allocated_amount > 0)
);

CREATE INDEX idx_ap_allocations_tenant_id ON ap_allocations(tenant_id);
CREATE INDEX idx_ap_allocations_payout_id ON ap_allocations(payout_id);
CREATE INDEX idx_ap_allocations_bill_id ON ap_allocations(bill_id);

-- RLS設定
ALTER TABLE ap_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant ap allocations"
  ON ap_allocations FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own tenant ap allocations"
  ON ap_allocations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ========================================
-- 6. システム勘定科目マッピング（会計連携用）
-- ========================================
CREATE TABLE IF NOT EXISTS system_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL, -- 'ap_payable', 'ap_cash', 'ap_bank', 'ar_receivable', 'ar_cash', etc.
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT system_account_mappings_type_check CHECK (
    mapping_type IN ('ap_payable', 'ap_cash', 'ap_bank', 'ar_receivable', 'ar_cash', 'ar_bank')
  ),
  UNIQUE(tenant_id, mapping_type)
);

CREATE INDEX idx_system_account_mappings_tenant_id ON system_account_mappings(tenant_id);

-- RLS設定
ALTER TABLE system_account_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant system account mappings"
  ON system_account_mappings FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own tenant system account mappings"
  ON system_account_mappings FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own tenant system account mappings"
  ON system_account_mappings FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ========================================
-- 7. AP年齢表ビュー（仕入先別）
-- ========================================
CREATE OR REPLACE VIEW ap_aging_by_vendor AS
SELECT
  b.tenant_id,
  b.user_id,
  v.id AS vendor_id,
  v.name AS vendor_name,
  SUM(CASE
    WHEN b.due_date IS NULL OR CURRENT_DATE - b.due_date <= 30 THEN
      b.total_amount - COALESCE(alloc.allocated, 0)
    ELSE 0
  END) AS b0_30,
  SUM(CASE
    WHEN b.due_date IS NOT NULL AND CURRENT_DATE - b.due_date BETWEEN 31 AND 60 THEN
      b.total_amount - COALESCE(alloc.allocated, 0)
    ELSE 0
  END) AS b31_60,
  SUM(CASE
    WHEN b.due_date IS NOT NULL AND CURRENT_DATE - b.due_date BETWEEN 61 AND 90 THEN
      b.total_amount - COALESCE(alloc.allocated, 0)
    ELSE 0
  END) AS b61_90,
  SUM(CASE
    WHEN b.due_date IS NOT NULL AND CURRENT_DATE - b.due_date > 90 THEN
      b.total_amount - COALESCE(alloc.allocated, 0)
    ELSE 0
  END) AS b90_plus,
  SUM(b.total_amount - COALESCE(alloc.allocated, 0)) AS total,
  CURRENT_DATE AS as_of
FROM bills b
JOIN vendors v ON b.vendor_id = v.id
LEFT JOIN (
  SELECT
    bill_id,
    SUM(allocated_amount) AS allocated
  FROM ap_allocations
  GROUP BY bill_id
) alloc ON b.id = alloc.bill_id
WHERE b.status IN ('issued', 'partially_paid')
  AND (b.total_amount - COALESCE(alloc.allocated, 0)) > 0
GROUP BY b.tenant_id, b.user_id, v.id, v.name;

-- ========================================
-- 8. トリガー: updated_at自動更新
-- ========================================
CREATE OR REPLACE FUNCTION update_ap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_ap_updated_at();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_ap_updated_at();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_ap_updated_at();

CREATE TRIGGER update_system_account_mappings_updated_at
  BEFORE UPDATE ON system_account_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_ap_updated_at();

-- ========================================
-- 完了
-- ========================================
-- このマイグレーションにより、AR（売掛）とは完全に独立したAP（買掛）機能が追加されます。
-- 負残・過配分の防止はアプリケーション層のトランザクションで制御します。
