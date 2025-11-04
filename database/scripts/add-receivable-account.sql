-- 売掛金勘定科目を追加
-- このSQLをSupabaseのSQL Editorで実行してください

-- まず、あなたのtenant_idとuser_idを確認
-- SELECT id, tenant_id FROM profiles WHERE email = 'あなたのメールアドレス';

-- 以下のSQLで、YOUR_TENANT_ID と YOUR_USER_ID を実際の値に置き換えてから実行してください

INSERT INTO accounts (
  tenant_id,
  user_id,
  code,
  name,
  type,
  parent_id,
  tax_category,
  is_active,
  sort_order,
  description
)
SELECT
  tenant_id,
  user_id,
  '1105',
  '売掛金',
  'asset',
  (SELECT id FROM accounts WHERE code = '1100' AND tenant_id = tenant_id LIMIT 1), -- 流動資産の親
  'non-tax',
  true,
  1105,
  '得意先に対する売掛債権'
FROM profiles
WHERE id = auth.uid(); -- 現在ログイン中のユーザー

-- 確認
SELECT code, name, type FROM accounts WHERE code = '1105';
