-- テーブル構造を確認するクエリ

-- 1. accounts テーブルの構造を確認
SELECT '【accountsテーブルの構造】' AS "確認項目";
SELECT
  column_name AS "カラム名",
  data_type AS "データ型",
  is_nullable AS "NULL許可",
  column_default AS "デフォルト値"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'accounts'
ORDER BY ordinal_position;

-- 2. tax_rates テーブルの構造を確認
SELECT '【tax_ratesテーブルの構造】' AS "確認項目";
SELECT
  column_name AS "カラム名",
  data_type AS "データ型",
  is_nullable AS "NULL許可",
  column_default AS "デフォルト値"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tax_rates'
ORDER BY ordinal_position;

-- 3. expense_categories テーブルの構造を確認
SELECT '【expense_categoriesテーブルの構造】' AS "確認項目";
SELECT
  column_name AS "カラム名",
  data_type AS "データ型",
  is_nullable AS "NULL許可",
  column_default AS "デフォルト値"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'expense_categories'
ORDER BY ordinal_position;

-- 4. 既存のaccountsテーブルのデータサンプルを確認
SELECT '【accountsテーブルのデータサンプル】' AS "確認項目";
SELECT *
FROM accounts
LIMIT 5;

-- 5. 既存のtax_ratesテーブルのデータサンプルを確認
SELECT '【tax_ratesテーブルのデータサンプル】' AS "確認項目";
SELECT *
FROM tax_rates
LIMIT 5;

-- 6. すべてのテーブル一覧を確認
SELECT '【公開スキーマのテーブル一覧】' AS "確認項目";
SELECT
  table_name AS "テーブル名",
  (SELECT COUNT(*)
   FROM information_schema.columns c
   WHERE c.table_schema = t.table_schema
     AND c.table_name = t.table_name) AS "カラム数"
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
