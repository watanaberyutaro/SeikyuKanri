-- テナント申請テーブル
CREATE TABLE IF NOT EXISTS tenant_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 企業情報
  company_name TEXT NOT NULL,
  postal_code TEXT,
  address TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,

  -- 代表者情報
  representative_name TEXT NOT NULL,
  representative_email TEXT NOT NULL,

  -- 申請情報
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT, -- 管理者メモ

  -- 承認後の情報
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_tenant_applications_status ON tenant_applications(status);
CREATE INDEX idx_tenant_applications_email ON tenant_applications(email);
CREATE INDEX idx_tenant_applications_created_at ON tenant_applications(created_at DESC);

-- RLS有効化
ALTER TABLE tenant_applications ENABLE ROW LEVEL SECURITY;

-- ポリシー：誰でも申請を作成できる（認証不要）
CREATE POLICY "Anyone can create applications"
  ON tenant_applications
  FOR INSERT
  WITH CHECK (true);

-- ポリシー：管理者のみ閲覧可能
CREATE POLICY "Admins can view all applications"
  ON tenant_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ポリシー：管理者のみ更新可能
CREATE POLICY "Admins can update applications"
  ON tenant_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 更新トリガー
CREATE TRIGGER update_tenant_applications_updated_at
  BEFORE UPDATE ON tenant_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE tenant_applications IS 'テナント申請（企業登録申請）';
COMMENT ON COLUMN tenant_applications.status IS 'pending: 承認待ち, approved: 承認済み, rejected: 却下';
