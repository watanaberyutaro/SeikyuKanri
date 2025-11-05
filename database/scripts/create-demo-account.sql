-- デモ用アカウント作成スクリプト
--
-- このスクリプトは以下を作成します：
-- 1. デモ用テナント（企業）
-- 2. デモ用ユーザー
-- 3. サンプルの取引先データ
-- 4. サンプルの品目データ
--
-- 実行方法: Supabase SQL Editorでこのスクリプトを実行してください

-- ===========================================
-- 1. デモ用テナント（企業）を作成
-- ===========================================

DO $$
DECLARE
  demo_tenant_id uuid;
  demo_user_id uuid;
  demo_email text := 'demo@example.com';
  demo_password text := 'DemoPassword123!'; -- 本番環境では必ず変更してください
  demo_company_code text := 'DEMO-2025';
BEGIN
  -- 既存のデモテナントを削除（存在する場合）
  DELETE FROM tenants WHERE company_code = demo_company_code;

  -- デモ用テナントを作成
  INSERT INTO tenants (
    company_name,
    company_code,
    postal_code,
    address,
    phone,
    email,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    'デモ株式会社',
    demo_company_code,
    '100-0001',
    '東京都千代田区千代田1-1-1',
    '03-1234-5678',
    'info@demo-company.example.com',
    true,
    now(),
    now()
  )
  RETURNING id INTO demo_tenant_id;

  RAISE NOTICE 'デモテナント作成完了: %', demo_tenant_id;

  -- ===========================================
  -- 2. デモ用ユーザーを作成
  -- ===========================================

  -- 既存のデモユーザーを削除（存在する場合）
  DELETE FROM auth.users WHERE email = demo_email;

  -- 認証ユーザーを作成
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    demo_email,
    crypt(demo_password, gen_salt('bf')), -- パスワードをハッシュ化
    now(),
    now(),
    '',
    '',
    '',
    '',
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', 'デモユーザー', 'tenant_id', demo_tenant_id),
    false,
    now()
  )
  RETURNING id INTO demo_user_id;

  RAISE NOTICE 'デモユーザー作成完了: %', demo_user_id;

  -- プロフィールを作成/更新
  INSERT INTO profiles (
    id,
    email,
    full_name,
    tenant_id,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    demo_user_id,
    demo_email,
    'デモユーザー',
    demo_tenant_id,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    tenant_id = demo_tenant_id,
    full_name = 'デモユーザー',
    email = demo_email,
    updated_at = now();

  RAISE NOTICE 'デモプロフィール作成完了';

  -- ===========================================
  -- 3. サンプル取引先データを作成
  -- ===========================================

  INSERT INTO companies (
    tenant_id,
    user_id,
    name,
    postal_code,
    address,
    phone,
    email,
    contact_person,
    payment_terms,
    notes,
    created_at,
    updated_at
  ) VALUES
  -- 取引先1: ABC商事
  (
    demo_tenant_id,
    demo_user_id,
    '株式会社ABC商事',
    '150-0001',
    '東京都渋谷区神宮前1-2-3',
    '03-1111-2222',
    'contact@abc-trading.example.com',
    '山田太郎',
    30,
    '主要取引先',
    now(),
    now()
  ),
  -- 取引先2: XYZ株式会社
  (
    demo_tenant_id,
    demo_user_id,
    'XYZ株式会社',
    '160-0023',
    '東京都新宿区西新宿2-4-5',
    '03-3333-4444',
    'info@xyz-corp.example.com',
    '佐藤花子',
    60,
    '月次定期取引',
    now(),
    now()
  ),
  -- 取引先3: テクノロジー産業
  (
    demo_tenant_id,
    demo_user_id,
    '株式会社テクノロジー産業',
    '105-0011',
    '東京都港区芝公園3-6-7',
    '03-5555-6666',
    'sales@tech-industry.example.com',
    '鈴木一郎',
    45,
    'IT関連サービス提供先',
    now(),
    now()
  );

  RAISE NOTICE 'サンプル取引先データ作成完了';

  -- ===========================================
  -- 4. サンプル品目データを作成
  -- ===========================================

  INSERT INTO items (
    tenant_id,
    user_id,
    name,
    description,
    unit_price,
    unit,
    tax_rate,
    is_active,
    created_at,
    updated_at
  ) VALUES
  -- 品目1: システム開発
  (
    demo_tenant_id,
    demo_user_id,
    'システム開発（月額）',
    'Webシステム開発・保守サービス',
    500000,
    '式',
    10,
    true,
    now(),
    now()
  ),
  -- 品目2: コンサルティング
  (
    demo_tenant_id,
    demo_user_id,
    'ITコンサルティング',
    '技術コンサルティングサービス（1日）',
    100000,
    '日',
    10,
    true,
    now(),
    now()
  ),
  -- 品目3: サーバー利用料
  (
    demo_tenant_id,
    demo_user_id,
    'サーバー利用料',
    'クラウドサーバー月額利用料',
    50000,
    '月',
    10,
    true,
    now(),
    now()
  ),
  -- 品目4: ライセンス料
  (
    demo_tenant_id,
    demo_user_id,
    'ソフトウェアライセンス',
    'ソフトウェアライセンス料（年間）',
    300000,
    '年',
    10,
    true,
    now(),
    now()
  ),
  -- 品目5: 研修サービス
  (
    demo_tenant_id,
    demo_user_id,
    '技術研修サービス',
    'エンジニア向け技術研修（1名）',
    80000,
    '名',
    10,
    true,
    now(),
    now()
  );

  RAISE NOTICE 'サンプル品目データ作成完了';

  -- ===========================================
  -- 完了メッセージ
  -- ===========================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'デモアカウント作成が完了しました！';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ログイン情報:';
  RAISE NOTICE '  企業コード: %', demo_company_code;
  RAISE NOTICE '  メールアドレス: %', demo_email;
  RAISE NOTICE '  パスワード: %', demo_password;
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠️  セキュリティ警告:';
  RAISE NOTICE '  本番環境では必ずパスワードを変更してください！';
  RAISE NOTICE '========================================';

END $$;
