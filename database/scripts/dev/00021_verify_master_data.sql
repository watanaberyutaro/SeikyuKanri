-- マスターデータ投入の確認スクリプト
-- テナントID: b91ce4bb-a6f3-49a0-9bc5-f37082c9687c

-- ==========================================
-- 投入結果サマリー
-- ==========================================
SELECT '【投入結果サマリー】' AS "確認";

SELECT
  (SELECT COUNT(*) FROM tax_rates WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "税率数",
  (SELECT COUNT(*) FROM accounts WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "勘定科目数",
  (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "経費カテゴリ数",
  CASE
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') >= 8 THEN '✓ 完了'
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') = 0 THEN '⚠ データなし'
    ELSE '⚠ データ不足'
  END AS "ステータス";

-- ==========================================
-- 税率マスター確認
-- ==========================================
SELECT '【税率マスター】' AS "確認";
SELECT
  name AS "名称",
  rate AS "税率",
  category AS "カテゴリ",
  is_active AS "有効"
FROM tax_rates
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
ORDER BY rate DESC;

-- ==========================================
-- 費用科目確認（経費精算用）
-- ==========================================
SELECT '【費用科目（経費精算用）】' AS "確認";
SELECT
  code AS "コード",
  name AS "科目名",
  type AS "種別",
  is_active AS "有効"
FROM accounts
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
  AND type = 'expense'
ORDER BY code;

-- ==========================================
-- 経費カテゴリ詳細確認
-- ==========================================
SELECT '【経費カテゴリ詳細】' AS "確認";
SELECT
  ec.name AS "カテゴリ名",
  a.code || ' - ' || a.name AS "デフォルト勘定科目",
  tr.name || ' (' || tr.rate || '%)' AS "デフォルト税率",
  CASE
    WHEN ec.default_account_id IS NOT NULL THEN '✓'
    ELSE '⚠'
  END AS "科目設定",
  CASE
    WHEN ec.tax_rate_id IS NOT NULL THEN '✓'
    ELSE '⚠'
  END AS "税率設定"
FROM expense_categories ec
LEFT JOIN accounts a ON ec.default_account_id = a.id
LEFT JOIN tax_rates tr ON ec.tax_rate_id = tr.id
WHERE ec.tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
ORDER BY ec.created_at;

-- ==========================================
-- プルダウン用データ確認
-- ==========================================
SELECT '【プルダウン用データ確認】' AS "確認";

-- 経費カテゴリプルダウン
SELECT 'カテゴリプルダウン' AS "項目", COUNT(*) AS "件数",
  CASE WHEN COUNT(*) >= 8 THEN '✓' ELSE '⚠' END AS "状態"
FROM expense_categories
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'

UNION ALL

-- 勘定科目プルダウン（費用のみ）
SELECT '勘定科目プルダウン（費用）' AS "項目", COUNT(*) AS "件数",
  CASE WHEN COUNT(*) >= 10 THEN '✓' ELSE '⚠' END AS "状態"
FROM accounts
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
  AND type = 'expense'
  AND is_active = true

UNION ALL

-- 税率プルダウン
SELECT '税率プルダウン' AS "項目", COUNT(*) AS "件数",
  CASE WHEN COUNT(*) >= 4 THEN '✓' ELSE '⚠' END AS "状態"
FROM tax_rates
WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
  AND is_active = true;

-- ==========================================
-- 問題がある場合の診断
-- ==========================================
SELECT '【診断結果】' AS "確認";

SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') = 0
    THEN '⚠ 経費カテゴリが投入されていません。00020_insert_master_data_final.sql を実行してください。'
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c' AND default_account_id IS NULL) > 0
    THEN '⚠ 一部の経費カテゴリに勘定科目が設定されていません。'
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c' AND tax_rate_id IS NULL) > 0
    THEN '⚠ 一部の経費カテゴリに税率が設定されていません。'
    ELSE '✓ すべてのマスターデータが正常に投入されています！'
  END AS "診断結果";
