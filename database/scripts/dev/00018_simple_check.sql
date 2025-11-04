-- シンプルなデータ確認クエリ

-- 1. accountsテーブルの構造を確認
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. tax_ratesテーブルの構造を確認
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'tax_rates'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. expense_categoriesテーブルの構造を確認
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'expense_categories'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. あなたのテナントのデータを確認
SELECT COUNT(*) AS "税率数" FROM tax_rates WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';
SELECT COUNT(*) AS "勘定科目数" FROM accounts WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';
SELECT COUNT(*) AS "経費カテゴリ数" FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';

-- 5. データのサンプルを確認
SELECT * FROM tax_rates WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c' LIMIT 3;
SELECT * FROM accounts WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c' LIMIT 3;
SELECT * FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c' LIMIT 3;
