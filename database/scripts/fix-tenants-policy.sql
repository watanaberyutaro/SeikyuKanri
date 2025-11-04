-- tenantsテーブルのRLSポリシーを修正
-- ログイン/サインアップ時に企業コードを検証できるようにする

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;

-- 新しいポリシー：すべてのユーザーが企業コードで検索できる
-- （企業コードは公開情報として扱う）
CREATE POLICY "Anyone can read active tenants" ON tenants
  FOR SELECT USING (is_active = true);

-- または、より制限的にしたい場合は以下のポリシーを使用
-- （認証済みユーザーのみが読める）
-- CREATE POLICY "Authenticated users can read active tenants" ON tenants
--   FOR SELECT TO authenticated USING (is_active = true);
