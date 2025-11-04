-- 外部キー制約を修正
-- companiesテーブルがclient_companiesにリネームされたため、参照を更新

-- 1. 既存の外部キー制約を削除
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_company_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_fkey;

-- 2. 新しい外部キー制約を追加（client_companiesを参照）
ALTER TABLE quotes
  ADD CONSTRAINT quotes_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES client_companies(id) ON DELETE CASCADE;

-- 3. 確認
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('quotes', 'invoices')
  AND kcu.column_name = 'company_id';
