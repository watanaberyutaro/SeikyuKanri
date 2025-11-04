-- システム管理者アカウントの作成

-- 1. 管理者用のテナントを作成
INSERT INTO tenants (company_code, company_name, is_active)
VALUES ('ADMIN', '管理者', true)
ON CONFLICT (company_code) DO NOTHING;

-- 2. テナントIDを取得して確認
SELECT id, company_code, company_name FROM tenants WHERE company_code = 'ADMIN';

-- 注意: 次のステップはブラウザから実行する必要があります
-- Supabaseの認証システムではSQLから直接ユーザーを作成できないため、
-- ブラウザのサインアップ画面から以下の情報で登録してください：
--
-- 企業コード: ADMIN
-- 氏名: システム管理者
-- メールアドレス: admin2025@admin.local
-- パスワード: admin2025
--
-- 登録後、以下のSQLでis_adminフラグを設定します：

-- 3. 作成したユーザーを管理者に設定（サインアップ後に実行）
UPDATE profiles
SET is_admin = true
WHERE email = 'admin2025@admin.local';

-- 4. 確認
SELECT id, email, full_name, is_admin, tenant_id
FROM profiles
WHERE email = 'admin2025@admin.local';
