-- tenantsテーブルのUPDATEポリシーを修正
-- Row Level Security (RLS) でテナントの更新を許可

-- 既存のUPDATEポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;
DROP POLICY IF EXISTS "tenant_update_policy" ON tenants;

-- 新しいUPDATEポリシーを作成
-- ユーザーが自分のテナント（profilesテーブルのtenant_idに紐づく）を更新できるようにする
CREATE POLICY "Users can update their own tenant"
ON tenants
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- 既存のSELECTポリシーも確認・修正
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;

CREATE POLICY "Users can view their own tenant"
ON tenants
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tenant_id
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- ポリシーの確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY cmd, policyname;
