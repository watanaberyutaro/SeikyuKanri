-- 管理者アカウント以外のデータをリセットするスクリプト
-- 注意: このスクリプトは管理者（is_admin = true）以外の全データを削除します

-- Step 1: 管理者のtenant_idを確認（実行前に確認してください）
-- SELECT p.id, p.email, p.tenant_id, p.is_admin, t.company_name
-- FROM profiles p
-- LEFT JOIN tenants t ON p.tenant_id = t.id
-- WHERE p.is_admin = true;

-- Step 2: 管理者以外のテナントIDを取得
-- 管理者のtenant_idを除外するため、まず管理者のtenant_idを変数に設定
DO $$
DECLARE
  admin_tenant_id UUID;
BEGIN
  -- 管理者のtenant_idを取得
  SELECT tenant_id INTO admin_tenant_id
  FROM profiles
  WHERE is_admin = true
  LIMIT 1;

  -- 管理者のtenant_idが見つからない場合はエラー
  IF admin_tenant_id IS NULL THEN
    RAISE EXCEPTION '管理者アカウントが見つかりません';
  END IF;

  -- ログ出力
  RAISE NOTICE '管理者のtenant_id: %', admin_tenant_id;
  RAISE NOTICE '管理者以外のデータを削除します...';

  -- Step 3: 管理者以外のテナントに関連するデータを削除

  -- 仕訳明細を削除
  DELETE FROM journal_lines
  WHERE tenant_id != admin_tenant_id;
  RAISE NOTICE '仕訳明細を削除しました';

  -- 仕訳を削除
  DELETE FROM journals
  WHERE tenant_id != admin_tenant_id;
  RAISE NOTICE '仕訳を削除しました';

  -- 請求書明細を削除
  DELETE FROM invoice_items
  WHERE invoice_id IN (
    SELECT id FROM invoices WHERE tenant_id != admin_tenant_id
  );
  RAISE NOTICE '請求書明細を削除しました';

  -- 請求書を削除
  DELETE FROM invoices
  WHERE tenant_id != admin_tenant_id;
  RAISE NOTICE '請求書を削除しました';

  -- 見積書明細を削除
  DELETE FROM quote_items
  WHERE quote_id IN (
    SELECT id FROM quotes WHERE tenant_id != admin_tenant_id
  );
  RAISE NOTICE '見積書明細を削除しました';

  -- 見積書を削除
  DELETE FROM quotes
  WHERE tenant_id != admin_tenant_id;
  RAISE NOTICE '見積書を削除しました';

  -- 会社を削除
  DELETE FROM companies
  WHERE tenant_id != admin_tenant_id;
  RAISE NOTICE '会社を削除しました';

  -- 会計期間を削除
  DELETE FROM accounting_periods
  WHERE tenant_id != admin_tenant_id;
  RAISE NOTICE '会計期間を削除しました';

  -- カスタム勘定科目を削除（tenant_idがある場合）
  DELETE FROM accounts
  WHERE tenant_id IS NOT NULL AND tenant_id != admin_tenant_id;
  RAISE NOTICE 'カスタム勘定科目を削除しました';

  -- カスタム税率を削除（tenant_idがある場合）
  DELETE FROM tax_rates
  WHERE tenant_id IS NOT NULL AND tenant_id != admin_tenant_id;
  RAISE NOTICE 'カスタム税率を削除しました';

  -- 経費関連データがある場合
  -- expense_items, expense_claimsなどを追加

  -- Step 4: 管理者以外のプロフィールを削除
  DELETE FROM profiles
  WHERE tenant_id != admin_tenant_id OR (tenant_id IS NULL AND is_admin = false);
  RAISE NOTICE 'プロフィールを削除しました';

  -- Step 5: 管理者以外のテナントを削除
  DELETE FROM tenants
  WHERE id != admin_tenant_id;
  RAISE NOTICE 'テナントを削除しました';

  -- 完了メッセージ
  RAISE NOTICE '✅ データのリセットが完了しました';
  RAISE NOTICE '管理者アカウントとそのテナント（%）は保持されています', admin_tenant_id;
END $$;

-- Step 6: 結果を確認
SELECT
  'テナント数' as item,
  COUNT(*)::text as count
FROM tenants
UNION ALL
SELECT
  'ユーザー数' as item,
  COUNT(*)::text as count
FROM profiles
UNION ALL
SELECT
  '会社数' as item,
  COUNT(*)::text as count
FROM companies
UNION ALL
SELECT
  '請求書数' as item,
  COUNT(*)::text as count
FROM invoices
UNION ALL
SELECT
  '見積書数' as item,
  COUNT(*)::text as count
FROM quotes
UNION ALL
SELECT
  '仕訳数' as item,
  COUNT(*)::text as count
FROM journals;
