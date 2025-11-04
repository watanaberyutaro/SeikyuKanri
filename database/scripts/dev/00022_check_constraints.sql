-- 制約とインデックスの確認スクリプト

-- ==========================================
-- 1. tax_rates テーブルの制約確認
-- ==========================================
SELECT '【tax_rates テーブルの制約】' AS "確認";

SELECT
  conname AS "制約名",
  contype AS "タイプ",
  pg_get_constraintdef(oid) AS "定義"
FROM pg_constraint
WHERE conrelid = 'tax_rates'::regclass
ORDER BY conname;

-- ==========================================
-- 2. tax_rates テーブルのインデックス確認
-- ==========================================
SELECT '【tax_rates テーブルのインデックス】' AS "確認";

SELECT
  indexname AS "インデックス名",
  indexdef AS "定義"
FROM pg_indexes
WHERE tablename = 'tax_rates'
  AND schemaname = 'public'
ORDER BY indexname;

-- ==========================================
-- 3. accounts テーブルの制約確認
-- ==========================================
SELECT '【accounts テーブルの制約】' AS "確認";

SELECT
  conname AS "制約名",
  contype AS "タイプ",
  pg_get_constraintdef(oid) AS "定義"
FROM pg_constraint
WHERE conrelid = 'accounts'::regclass
ORDER BY conname;

-- ==========================================
-- 4. accounts テーブルのインデックス確認
-- ==========================================
SELECT '【accounts テーブルのインデックス】' AS "確認";

SELECT
  indexname AS "インデックス名",
  indexdef AS "定義"
FROM pg_indexes
WHERE tablename = 'accounts'
  AND schemaname = 'public'
ORDER BY indexname;

-- ==========================================
-- 5. expense_categories テーブルの制約確認
-- ==========================================
SELECT '【expense_categories テーブルの制約】' AS "確認";

SELECT
  conname AS "制約名",
  contype AS "タイプ",
  pg_get_constraintdef(oid) AS "定義"
FROM pg_constraint
WHERE conrelid = 'expense_categories'::regclass
ORDER BY conname;

-- ==========================================
-- 6. expense_categories テーブルのインデックス確認
-- ==========================================
SELECT '【expense_categories テーブルのインデックス】' AS "確認";

SELECT
  indexname AS "インデックス名",
  indexdef AS "定義"
FROM pg_indexes
WHERE tablename = 'expense_categories'
  AND schemaname = 'public'
ORDER BY indexname;
