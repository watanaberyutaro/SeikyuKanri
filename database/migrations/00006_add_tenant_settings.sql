-- テナント（企業）設定機能追加マイグレーション
-- 企業情報の詳細設定、インボイス番号、電子印（ハンコ）機能

-- tenantsテーブルに追加フィールドを追加
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS invoice_registration_number TEXT,
ADD COLUMN IF NOT EXISTS company_seal_url TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- コメント追加
COMMENT ON COLUMN tenants.invoice_registration_number IS 'インボイス登録番号（適格請求書発行事業者番号）';
COMMENT ON COLUMN tenants.company_seal_url IS '電子印（ハンコ）画像のURL';
COMMENT ON COLUMN tenants.postal_code IS '郵便番号';
COMMENT ON COLUMN tenants.address IS '住所';
COMMENT ON COLUMN tenants.phone IS '電話番号';
COMMENT ON COLUMN tenants.representative_name IS '代表者名';
COMMENT ON COLUMN tenants.email IS 'メールアドレス';
COMMENT ON COLUMN tenants.website IS 'ウェブサイトURL';
COMMENT ON COLUMN tenants.description IS '企業説明・備考';
