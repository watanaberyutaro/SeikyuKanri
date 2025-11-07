-- tenantsテーブルに振込先口座情報のカラムを追加

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT,
ADD COLUMN IF NOT EXISTS bank_account_type TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;

COMMENT ON COLUMN tenants.bank_name IS '銀行名';
COMMENT ON COLUMN tenants.bank_branch IS '支店名';
COMMENT ON COLUMN tenants.bank_account_type IS '口座種別（普通/当座）';
COMMENT ON COLUMN tenants.bank_account_number IS '口座番号';
COMMENT ON COLUMN tenants.bank_account_holder IS '口座名義';
