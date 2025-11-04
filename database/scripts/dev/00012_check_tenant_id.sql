-- テナントIDを確認するクエリ
-- このクエリをSupabase SQL Editorで実行して、tenant_idをメモしてください

SELECT
  t.id AS tenant_id,
  t.company_name,
  t.company_code,
  COUNT(p.id) AS user_count
FROM tenants t
LEFT JOIN profiles p ON p.tenant_id = t.id
GROUP BY t.id, t.company_name, t.company_code
ORDER BY t.created_at DESC;

-- 結果から、あなたのテナントのtenant_idをコピーしてください
