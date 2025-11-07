-- ポリシー確認用SQL
-- このクエリで現在設定されているポリシーを確認できます

-- storage.objects テーブルのポリシー一覧を表示
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%company-seals%'
ORDER BY policyname;
