-- 経費精算機能のテーブル作成
-- FEATURE_EXPENSES=1 で有効化

-- 経費カテゴリマスタ
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- 経費申請（ヘッダ）
CREATE TABLE IF NOT EXISTS expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'reimbursed', 'rejected')),
  submit_date DATE,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 経費明細（領収書単位）
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  spent_on DATE NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 承認履歴
CREATE TABLE IF NOT EXISTS expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  approver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  comment TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_expense_categories_tenant ON expense_categories(tenant_id);
CREATE INDEX idx_expense_claims_tenant ON expense_claims(tenant_id);
CREATE INDEX idx_expense_claims_employee ON expense_claims(employee_user_id);
CREATE INDEX idx_expense_claims_status ON expense_claims(status);
CREATE INDEX idx_expense_items_tenant ON expense_items(tenant_id);
CREATE INDEX idx_expense_items_claim ON expense_items(claim_id);
CREATE INDEX idx_expense_approvals_tenant ON expense_approvals(tenant_id);
CREATE INDEX idx_expense_approvals_claim ON expense_approvals(claim_id);

-- 更新日時の自動更新トリガー
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_claims_updated_at
  BEFORE UPDATE ON expense_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_items_updated_at
  BEFORE UPDATE ON expense_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS（Row Level Security）設定
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;

-- 経費カテゴリのRLSポリシー
CREATE POLICY "Users can view expense categories in their tenant"
  ON expense_categories FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create expense categories in their tenant"
  ON expense_categories FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update expense categories in their tenant"
  ON expense_categories FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete expense categories in their tenant"
  ON expense_categories FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 経費申請のRLSポリシー
CREATE POLICY "Users can view expense claims in their tenant"
  ON expense_claims FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create expense claims in their tenant"
  ON expense_claims FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND employee_user_id = auth.uid()
  );

CREATE POLICY "Users can update their own draft expense claims"
  ON expense_claims FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (employee_user_id = auth.uid() OR status != 'draft')
  );

CREATE POLICY "Users can delete their own draft expense claims"
  ON expense_claims FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND employee_user_id = auth.uid()
    AND status = 'draft'
  );

-- 経費明細のRLSポリシー
CREATE POLICY "Users can view expense items in their tenant"
  ON expense_items FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create expense items in their tenant"
  ON expense_items FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update expense items in their tenant"
  ON expense_items FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete expense items in their tenant"
  ON expense_items FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 承認履歴のRLSポリシー
CREATE POLICY "Users can view expense approvals in their tenant"
  ON expense_approvals FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create expense approvals in their tenant"
  ON expense_approvals FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND approver_user_id = auth.uid()
  );

-- コメント追加
COMMENT ON TABLE expense_categories IS '経費カテゴリマスタ（交通費、宿泊費など）';
COMMENT ON TABLE expense_claims IS '経費申請ヘッダ（申請単位）';
COMMENT ON TABLE expense_items IS '経費明細（領収書単位）';
COMMENT ON TABLE expense_approvals IS '経費承認履歴';

COMMENT ON COLUMN expense_claims.status IS 'draft: 下書き, submitted: 申請済み, approved: 承認済み, reimbursed: 精算済み, rejected: 却下';
COMMENT ON COLUMN expense_items.attachment_url IS '領収書画像のURL（Supabase Storageなど）';
