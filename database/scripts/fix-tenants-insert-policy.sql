-- tenantsテーブルのINSERTポリシーを追加
-- 管理者がテナント企業を作成できるようにする

-- 既存のINSERTポリシーを削除（あれば）
DROP POLICY IF EXISTS "Admins can insert tenants" ON tenants;

-- 管理者のみがテナントを作成できるポリシー
CREATE POLICY "Admins can insert tenants" ON tenants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 管理者がテナントを更新できるポリシー
DROP POLICY IF EXISTS "Admins can update tenants" ON tenants;

CREATE POLICY "Admins can update tenants" ON tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 管理者がテナントを削除できるポリシー（必要な場合）
DROP POLICY IF EXISTS "Admins can delete tenants" ON tenants;

CREATE POLICY "Admins can delete tenants" ON tenants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 確認
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;
