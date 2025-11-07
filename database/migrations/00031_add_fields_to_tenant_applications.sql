-- tenant_applicationsテーブルに不足しているカラムを追加

-- パスワード（承認後のアカウント作成用）
ALTER TABLE tenant_applications
ADD COLUMN IF NOT EXISTS password TEXT;

-- 決算月（1-12）
ALTER TABLE tenant_applications
ADD COLUMN IF NOT EXISTS fiscal_year_end_month INTEGER
CHECK (fiscal_year_end_month BETWEEN 1 AND 12);

-- 会計年度
ALTER TABLE tenant_applications
ADD COLUMN IF NOT EXISTS first_fiscal_year INTEGER;

-- コメント
COMMENT ON COLUMN tenant_applications.password IS '承認後のアカウント作成用パスワード';
COMMENT ON COLUMN tenant_applications.fiscal_year_end_month IS '決算月（1-12）';
COMMENT ON COLUMN tenant_applications.first_fiscal_year IS '会計年度';
