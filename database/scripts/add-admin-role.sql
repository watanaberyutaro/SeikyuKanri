-- 管理者機能を追加

-- 1. profilesテーブルにis_adminカラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. テスト用：最初のユーザーを管理者にする（必要に応じて変更）
-- 特定のメールアドレスのユーザーを管理者にする場合は以下を実行
-- UPDATE profiles SET is_admin = true WHERE email = 'your-admin@example.com';

-- または、最初に登録されたユーザーを管理者にする場合
UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- 3. 確認
SELECT id, email, full_name, is_admin, tenant_id
FROM profiles
ORDER BY created_at;

-- 4. コメント追加
COMMENT ON COLUMN profiles.is_admin IS '管理者フラグ（true = システム管理者）';
