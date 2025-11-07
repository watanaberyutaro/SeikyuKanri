-- ====================================================================
-- テストデータクリーンアップスクリプト
-- 管理者アカウントとDEMOアカウント以外のすべてのデータを削除
-- ====================================================================

-- 注意: このスクリプトは開発/テスト環境でのみ実行してください
-- 本番環境では絶対に実行しないでください

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '=== クリーンアップ開始 ===';

  -- ====================================================================
  -- 保護対象の特定
  -- ====================================================================

  -- 管理者のIDを一時テーブルに保存
  CREATE TEMP TABLE IF NOT EXISTS admin_users AS
  SELECT id FROM profiles WHERE is_admin = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '管理者アカウント数: %', v_count;

  -- DEMOアカウントのIDを保存
  CREATE TEMP TABLE IF NOT EXISTS demo_users AS
  SELECT DISTINCT p.id
  FROM profiles p
  LEFT JOIN tenants t ON p.tenant_id = t.id
  WHERE
    p.email ILIKE '%demo%'
    OR t.company_name ILIKE '%DEMO%'
    OR t.company_name ILIKE '%デモ%'
    OR t.company_code ILIKE '%DEMO%';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'DEMOアカウント数: %', v_count;

  -- 保護するユーザー（管理者 + DEMO）
  CREATE TEMP TABLE IF NOT EXISTS protected_users AS
  SELECT id FROM admin_users
  UNION
  SELECT id FROM demo_users;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '保護対象ユーザー合計: %', v_count;

  -- 管理者のtenant_idを保存
  CREATE TEMP TABLE IF NOT EXISTS admin_tenants AS
  SELECT DISTINCT tenant_id FROM profiles WHERE is_admin = true AND tenant_id IS NOT NULL;

  -- DEMOテナントを保存
  CREATE TEMP TABLE IF NOT EXISTS demo_tenants AS
  SELECT DISTINCT id
  FROM tenants
  WHERE
    company_name ILIKE '%DEMO%'
    OR company_name ILIKE '%デモ%'
    OR company_code ILIKE '%DEMO%';

  -- 保護するテナント（管理者 + DEMO）
  CREATE TEMP TABLE IF NOT EXISTS protected_tenants AS
  SELECT tenant_id as id FROM admin_tenants WHERE tenant_id IS NOT NULL
  UNION
  SELECT id FROM demo_tenants;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '保護対象テナント数: %', v_count;

  -- ====================================================================
  -- ビジネスデータの削除（テーブルが存在する場合のみ）
  -- ====================================================================

  RAISE NOTICE '=== ビジネスデータ削除開始 ===';

  -- 経費関連
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_items') THEN
    DELETE FROM expense_items
    WHERE claim_id IN (
      SELECT id FROM expense_claims
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: expense_items % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_claims') THEN
    DELETE FROM expense_claims
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: expense_claims % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_categories') THEN
    DELETE FROM expense_categories
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: expense_categories % 件', v_count;
  END IF;

  -- 支払関連
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_allocations') THEN
    DELETE FROM payment_allocations
    WHERE payment_id IN (
      SELECT id FROM payments
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: payment_allocations % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    DELETE FROM payments
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: payments % 件', v_count;
  END IF;

  -- 請求書関連
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
    DELETE FROM invoice_items
    WHERE invoice_id IN (
      SELECT id FROM invoices
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: invoice_items % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    DELETE FROM invoices
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: invoices % 件', v_count;
  END IF;

  -- 見積書関連
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items') THEN
    DELETE FROM quote_items
    WHERE quote_id IN (
      SELECT id FROM quotes
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: quote_items % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
    DELETE FROM quotes
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: quotes % 件', v_count;
  END IF;

  -- 顧客企業
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    DELETE FROM companies
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: companies % 件', v_count;
  END IF;

  -- 銀行データ（CSV Import）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_rows') THEN
    DELETE FROM bank_rows
    WHERE statement_id IN (
      SELECT id FROM bank_statements
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_rows % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_statements') THEN
    DELETE FROM bank_statements
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_statements % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_accounts') THEN
    DELETE FROM bank_accounts
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_accounts % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_transactions') THEN
    DELETE FROM bank_transactions
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_transactions % 件', v_count;
  END IF;

  -- 銀行API関連
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_api_transactions') THEN
    DELETE FROM bank_api_transactions
    WHERE account_id IN (
      SELECT id FROM bank_api_accounts
      WHERE connection_id IN (
        SELECT id FROM bank_api_connections
        WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
      )
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_api_transactions % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_api_accounts') THEN
    DELETE FROM bank_api_accounts
    WHERE connection_id IN (
      SELECT id FROM bank_api_connections
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_api_accounts % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_api_sync_jobs') THEN
    DELETE FROM bank_api_sync_jobs
    WHERE connection_id IN (
      SELECT id FROM bank_api_connections
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_api_sync_jobs % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_api_connections') THEN
    DELETE FROM bank_api_connections
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: bank_api_connections % 件', v_count;
  END IF;

  -- 会計関連
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_lines') THEN
    DELETE FROM journal_lines
    WHERE journal_id IN (
      SELECT id FROM journals
      WHERE tenant_id NOT IN (SELECT id FROM protected_tenants)
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: journal_lines % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journals') THEN
    DELETE FROM journals
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: journals % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
    DELETE FROM accounts
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: accounts % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_rates') THEN
    DELETE FROM tax_rates
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: tax_rates % 件', v_count;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_periods') THEN
    DELETE FROM accounting_periods
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: accounting_periods % 件', v_count;
  END IF;

  -- 固定資産
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_assets') THEN
    DELETE FROM fixed_assets
    WHERE tenant_id NOT IN (SELECT id FROM protected_tenants);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: fixed_assets % 件', v_count;
  END IF;

  -- ====================================================================
  -- テナント申請の削除
  -- ====================================================================

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_applications') THEN
    DELETE FROM tenant_applications;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '削除: tenant_applications % 件', v_count;
  END IF;

  -- ====================================================================
  -- プロフィールとテナントの削除
  -- ====================================================================

  RAISE NOTICE '=== プロフィール・テナント削除 ===';

  -- 保護対象以外のプロフィール削除
  DELETE FROM profiles
  WHERE id NOT IN (SELECT id FROM protected_users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '削除: profiles % 件', v_count;

  -- 保護対象以外のテナント削除
  DELETE FROM tenants
  WHERE id NOT IN (SELECT id FROM protected_tenants);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '削除: tenants % 件', v_count;

  -- ====================================================================
  -- Authユーザーの削除
  -- ====================================================================

  RAISE NOTICE '=== Authユーザー削除 ===';

  -- 削除対象ユーザー数を表示
  SELECT COUNT(*) INTO v_count
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM protected_users);

  RAISE NOTICE '削除対象Authユーザー数: %', v_count;

  -- auth.users から保護対象以外のユーザーを削除
  DELETE FROM auth.users
  WHERE id NOT IN (SELECT id FROM protected_users);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '削除: auth.users % 件', v_count;

  -- ====================================================================
  -- クリーンアップ完了
  -- ====================================================================

  RAISE NOTICE '=== クリーンアップ完了 ===';

  -- 残りの確認
  SELECT COUNT(*) INTO v_count FROM tenants;
  RAISE NOTICE '残存テナント数: %', v_count;

  SELECT COUNT(*) INTO v_count FROM profiles;
  RAISE NOTICE '残存プロフィール数: %', v_count;

  SELECT COUNT(*) INTO v_count FROM auth.users;
  RAISE NOTICE '残存Authユーザー数: %', v_count;

END $$;

-- ====================================================================
-- 実行後の確認クエリ
-- ====================================================================

-- 保護されたアカウントの確認（管理者 + DEMO）
SELECT
  p.id,
  p.email,
  p.is_admin,
  t.company_name,
  t.company_code,
  CASE
    WHEN p.is_admin THEN '管理者'
    WHEN p.email ILIKE '%demo%' OR t.company_name ILIKE '%DEMO%' OR t.company_name ILIKE '%デモ%' THEN 'DEMO'
    ELSE 'その他'
  END as account_type
FROM profiles p
LEFT JOIN tenants t ON p.tenant_id = t.id
ORDER BY p.is_admin DESC, account_type;
