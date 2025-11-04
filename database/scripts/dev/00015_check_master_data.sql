-- マスターデータ投入状況を確認するクエリ
-- あなたのテナントID: b91ce4bb-a6f3-49a0-9bc5-f37082c9687c

-- 1. テナント情報を確認
SELECT '【テナント情報】' AS "確認項目";
SELECT
  id,
  company_name,
  company_code,
  is_active,
  created_at
FROM tenants
WHERE id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';

-- 2. 税率マスターを確認
SELECT '【税率マスター】' AS "確認項目";
SELECT
  id,
  name,
  rate,
  description,
  created_at
FROM tax_rates
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
ORDER BY rate DESC;

-- 税率の件数
SELECT '税率件数: ' || COUNT(*) AS "結果"
FROM tax_rates
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';

-- 3. 勘定科目マスターを確認
SELECT '【勘定科目マスター】' AS "確認項目";
SELECT
  code,
  name,
  account_type,
  description
FROM accounts
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
ORDER BY code;

-- 勘定科目の件数（タイプ別）
SELECT
  account_type AS "勘定科目タイプ",
  COUNT(*) AS "件数"
FROM accounts
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
GROUP BY account_type
ORDER BY account_type;

-- 勘定科目の総件数
SELECT '勘定科目件数: ' || COUNT(*) AS "結果"
FROM accounts
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';

-- 4. 経費カテゴリマスターを確認
SELECT '【経費カテゴリマスター】' AS "確認項目";
SELECT
  ec.name AS "カテゴリ名",
  a.code || ' - ' || a.name AS "デフォルト勘定科目",
  tr.name || ' (' || tr.rate || '%)' AS "デフォルト税率",
  ec.created_at AS "作成日時"
FROM expense_categories ec
LEFT JOIN accounts a ON ec.default_account_id = a.id
LEFT JOIN tax_rates tr ON ec.tax_rate_id = tr.id
WHERE ec.tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
ORDER BY ec.created_at;

-- 経費カテゴリの件数
SELECT '経費カテゴリ件数: ' || COUNT(*) AS "結果"
FROM expense_categories
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';

-- 5. RLSポリシーを確認
SELECT '【RLSポリシー確認】' AS "確認項目";

-- テーブルのRLS有効化状態を確認
SELECT
  schemaname,
  tablename,
  rowsecurity AS "RLS有効"
FROM pg_tables
WHERE tablename IN ('tax_rates', 'accounts', 'expense_categories')
  AND schemaname = 'public';

-- 6. プロフィール情報を確認（RLSで見えるか確認）
SELECT '【プロフィール確認】' AS "確認項目";
SELECT
  id,
  email,
  tenant_id,
  is_admin
FROM profiles
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';

-- 7. 総合結果サマリー
SELECT '【総合結果】' AS "確認項目";
SELECT
  (SELECT COUNT(*) FROM tax_rates WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "税率数",
  (SELECT COUNT(*) FROM accounts WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "勘定科目数",
  (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "経費カテゴリ数",
  CASE
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') >= 8 THEN '✓ 完了'
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') > 0 THEN '⚠ 一部のみ'
    ELSE '✗ 未投入'
  END AS "ステータス";
