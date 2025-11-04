-- マルチテナント対応マイグレーションSQL
-- 実行前に既存データをバックアップすることを推奨

-- ステップ1: 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;
DROP POLICY IF EXISTS "Users can view own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can insert own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can delete own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can view own quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can insert own quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can update own quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can delete own quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can update own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice items" ON invoice_items;

-- ステップ2: テナント（システム利用企業）テーブルを作成
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ステップ3: companiesテーブルをclient_companiesにリネーム（請求先企業との混同を避ける）
ALTER TABLE IF EXISTS companies RENAME TO client_companies;

-- インデックスもリネーム
ALTER INDEX IF EXISTS idx_companies_user_id RENAME TO idx_client_companies_user_id;

-- ステップ4: 全テーブルにtenant_idカラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE client_companies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ステップ5: tenant_id用のインデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_companies_tenant_id ON client_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);

-- 複合インデックス（tenant_id + user_id）
CREATE INDEX IF NOT EXISTS idx_client_companies_tenant_user ON client_companies(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_user ON quotes(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_user ON invoices(tenant_id, user_id);

-- ステップ6: テナントテーブルのRLS有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ステップ7: 新しいRLSポリシーを作成（tenant_idベース）

-- テナントのポリシー
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (
    id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- プロフィールのポリシー
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 請求先企業のポリシー（tenant_idで分離）
CREATE POLICY "Users can view tenant client companies" ON client_companies
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert tenant client companies" ON client_companies
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant client companies" ON client_companies
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete tenant client companies" ON client_companies
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- 見積書のポリシー（tenant_idで分離）
CREATE POLICY "Users can view tenant quotes" ON quotes
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert tenant quotes" ON quotes
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant quotes" ON quotes
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete tenant quotes" ON quotes
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- 見積書明細のポリシー（tenant_idで分離）
CREATE POLICY "Users can view tenant quote items" ON quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tenant quote items" ON quote_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tenant quote items" ON quote_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tenant quote items" ON quote_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND quotes.user_id = auth.uid()
    )
  );

-- 請求書のポリシー（tenant_idで分離）
CREATE POLICY "Users can view tenant invoices" ON invoices
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert tenant invoices" ON invoices
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update tenant invoices" ON invoices
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete tenant invoices" ON invoices
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- 請求書明細のポリシー（tenant_idで分離）
CREATE POLICY "Users can view tenant invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tenant invoice items" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tenant invoice items" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tenant invoice items" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
      AND invoices.user_id = auth.uid()
    )
  );

-- ステップ8: トリガー追加（updated_at自動更新）
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ステップ9: client_companies外部キー参照を修正
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_company_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE;

-- ステップ10: ユーザー登録時のトリガーを更新（tenant_idは後で手動で設定）
-- 既存のトリガーはそのまま使用可能

-- 完了メッセージ
COMMENT ON TABLE tenants IS 'マルチテナント対応完了: このテーブルはシステム利用企業を管理します';
