-- マスターデータ投入スクリプト（テナントID直接指定版）
-- 使い方:
-- 1. 00012_check_tenant_id.sql を実行してテナントIDを確認
-- 2. 下記の 'YOUR_TENANT_ID_HERE' を実際のテナントIDに置き換える（4箇所）
-- 3. このスクリプトを実行

-- 注意: このスクリプトは既存テナント用です
-- 新規テナント作成時は、自動的に経費カテゴリが作成されます

DO $$
DECLARE
  -- ★★★ ここにあなたのテナントIDを貼り付けてください ★★★
  v_tenant_id UUID := 'YOUR_TENANT_ID_HERE';  -- 例: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  v_account_travel UUID;
  v_account_supplies UUID;
  v_account_entertainment UUID;
  v_account_communication UUID;
  v_account_misc UUID;
  v_tax_rate_10 UUID;
  v_tax_rate_8 UUID;
BEGIN
  -- テナントIDのバリデーション
  IF v_tenant_id = 'YOUR_TENANT_ID_HERE' THEN
    RAISE EXCEPTION '★★★ スクリプトの v_tenant_id を実際のテナントIDに置き換えてください！ ★★★';
  END IF;

  -- テナントが存在するか確認
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RAISE EXCEPTION 'テナントID % が見つかりません', v_tenant_id;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'マスターデータ投入を開始します';
  RAISE NOTICE 'tenant_id: %', v_tenant_id;
  RAISE NOTICE '========================================';

  -- ==========================================
  -- 1. 税率マスターを投入
  -- ==========================================
  RAISE NOTICE '1. 税率マスターを投入中...';

  INSERT INTO tax_rates (tenant_id, name, rate, description)
  VALUES
    (v_tenant_id, '課税10%', 10, '標準税率'),
    (v_tenant_id, '課税8%（軽減税率）', 8, '軽減税率（食品等）'),
    (v_tenant_id, '非課税', 0, '非課税取引'),
    (v_tenant_id, '不課税', 0, '課税対象外'),
    (v_tenant_id, '免税', 0, '免税取引')
  ON CONFLICT (tenant_id, name) DO NOTHING;

  RAISE NOTICE '   ✓ 税率マスター投入完了';

  -- ==========================================
  -- 2. 勘定科目マスターを投入
  -- ==========================================
  RAISE NOTICE '2. 勘定科目マスターを投入中...';

  -- 資産
  INSERT INTO accounts (tenant_id, code, name, account_type, description)
  VALUES
    (v_tenant_id, '1110', '現金', 'asset', '手元現金'),
    (v_tenant_id, '1120', '普通預金', 'asset', '銀行の普通預金口座'),
    (v_tenant_id, '1130', '当座預金', 'asset', '銀行の当座預金口座'),
    (v_tenant_id, '1210', '売掛金', 'asset', '商品・サービスの売上に係る債権'),
    (v_tenant_id, '1220', '受取手形', 'asset', '手形による債権'),
    (v_tenant_id, '1310', '商品', 'asset', '販売目的の商品在庫'),
    (v_tenant_id, '1320', '製品', 'asset', '製造した製品在庫'),
    (v_tenant_id, '1330', '原材料', 'asset', '製造用の原材料'),
    (v_tenant_id, '1410', '前払金', 'asset', '前払いした費用'),
    (v_tenant_id, '1420', '仮払金', 'asset', '一時的な支払い')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 負債
  INSERT INTO accounts (tenant_id, code, name, account_type, description)
  VALUES
    (v_tenant_id, '2110', '買掛金', 'liability', '商品・サービスの仕入に係る債務'),
    (v_tenant_id, '2120', '支払手形', 'liability', '手形による債務'),
    (v_tenant_id, '2130', '未払金', 'liability', '商品・サービス以外の債務'),
    (v_tenant_id, '2140', '未払費用', 'liability', '継続的役務提供の未払分'),
    (v_tenant_id, '2150', '預り金', 'liability', '従業員等からの一時預り金'),
    (v_tenant_id, '2160', '前受金', 'liability', '商品・サービス提供前の受取額'),
    (v_tenant_id, '2210', '短期借入金', 'liability', '1年以内返済予定の借入金'),
    (v_tenant_id, '2310', '長期借入金', 'liability', '1年超の借入金')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 純資産
  INSERT INTO accounts (tenant_id, code, name, account_type, description)
  VALUES
    (v_tenant_id, '3110', '資本金', 'equity', '会社の資本金'),
    (v_tenant_id, '3210', '繰越利益剰余金', 'equity', '過年度からの利益の累積')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 収益
  INSERT INTO accounts (tenant_id, code, name, account_type, description)
  VALUES
    (v_tenant_id, '4110', '売上高', 'revenue', '商品・サービスの売上'),
    (v_tenant_id, '4210', '受取利息', 'revenue', '預金利息等の受取利息'),
    (v_tenant_id, '4220', '受取配当金', 'revenue', '株式配当金等'),
    (v_tenant_id, '4910', '雑収入', 'revenue', 'その他の収入')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 費用
  INSERT INTO accounts (tenant_id, code, name, account_type, description)
  VALUES
    (v_tenant_id, '5110', '売上原価', 'expense', '商品の仕入原価'),
    (v_tenant_id, '6110', '給料手当', 'expense', '従業員への給与'),
    (v_tenant_id, '6120', '法定福利費', 'expense', '社会保険料等'),
    (v_tenant_id, '6210', '旅費交通費', 'expense', '出張費・交通費'),
    (v_tenant_id, '6220', '通信費', 'expense', '電話代・郵送料等'),
    (v_tenant_id, '6230', '消耗品費', 'expense', '事務用品等の消耗品'),
    (v_tenant_id, '6240', '地代家賃', 'expense', 'オフィス賃料等'),
    (v_tenant_id, '6250', '水道光熱費', 'expense', '電気・ガス・水道代'),
    (v_tenant_id, '6260', '接待交際費', 'expense', '取引先との接待・贈答'),
    (v_tenant_id, '6270', '広告宣伝費', 'expense', '広告・宣伝費用'),
    (v_tenant_id, '6280', '支払手数料', 'expense', '銀行手数料・専門家報酬等'),
    (v_tenant_id, '6290', '減価償却費', 'expense', '固定資産の減価償却'),
    (v_tenant_id, '6310', '支払利息', 'expense', '借入金の利息'),
    (v_tenant_id, '6910', '雑費', 'expense', 'その他の費用')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  RAISE NOTICE '   ✓ 勘定科目マスター投入完了';

  -- ==========================================
  -- 3. 経費カテゴリマスターを投入
  -- ==========================================
  RAISE NOTICE '3. 経費カテゴリマスターを投入中...';

  -- 勘定科目IDを取得
  SELECT id INTO v_account_travel
  FROM accounts
  WHERE tenant_id = v_tenant_id AND code = '6210'
  LIMIT 1;

  SELECT id INTO v_account_supplies
  FROM accounts
  WHERE tenant_id = v_tenant_id AND code = '6230'
  LIMIT 1;

  SELECT id INTO v_account_entertainment
  FROM accounts
  WHERE tenant_id = v_tenant_id AND code = '6260'
  LIMIT 1;

  SELECT id INTO v_account_communication
  FROM accounts
  WHERE tenant_id = v_tenant_id AND code = '6220'
  LIMIT 1;

  SELECT id INTO v_account_misc
  FROM accounts
  WHERE tenant_id = v_tenant_id AND code = '6910'
  LIMIT 1;

  -- 税率IDを取得
  SELECT id INTO v_tax_rate_10
  FROM tax_rates
  WHERE tenant_id = v_tenant_id AND rate = 10
  LIMIT 1;

  SELECT id INTO v_tax_rate_8
  FROM tax_rates
  WHERE tenant_id = v_tenant_id AND rate = 8
  LIMIT 1;

  -- 経費カテゴリを投入
  INSERT INTO expense_categories (tenant_id, name, default_account_id, tax_rate_id)
  VALUES
    (v_tenant_id, '交通費', v_account_travel, v_tax_rate_10),
    (v_tenant_id, '宿泊費', v_account_travel, v_tax_rate_10),
    (v_tenant_id, '会議費', v_account_entertainment, v_tax_rate_10),
    (v_tenant_id, '接待交際費', v_account_entertainment, v_tax_rate_10),
    (v_tenant_id, '消耗品費', v_account_supplies, v_tax_rate_10),
    (v_tenant_id, '通信費', v_account_communication, v_tax_rate_10),
    (v_tenant_id, '書籍・資料代', v_account_supplies, v_tax_rate_10),
    (v_tenant_id, 'その他', v_account_misc, v_tax_rate_10)
  ON CONFLICT (tenant_id, name) DO NOTHING;

  RAISE NOTICE '   ✓ 経費カテゴリマスター投入完了';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ すべてのマスターデータ投入が完了しました！';
  RAISE NOTICE '========================================';
END $$;

-- ==========================================
-- 投入結果を確認
-- ==========================================

SELECT '【税率マスター】' AS "確認";
SELECT
  name AS "税率名",
  rate AS "税率(%)",
  description AS "説明"
FROM tax_rates
WHERE tenant_id = 'YOUR_TENANT_ID_HERE'  -- ★ここも置き換えてください
ORDER BY rate DESC;

SELECT '【勘定科目マスター】' AS "確認";
SELECT
  code AS "コード",
  name AS "勘定科目名",
  CASE account_type
    WHEN 'asset' THEN '資産'
    WHEN 'liability' THEN '負債'
    WHEN 'equity' THEN '純資産'
    WHEN 'revenue' THEN '収益'
    WHEN 'expense' THEN '費用'
  END AS "区分"
FROM accounts
WHERE tenant_id = 'YOUR_TENANT_ID_HERE'  -- ★ここも置き換えてください
ORDER BY code;

SELECT '【経費カテゴリマスター】' AS "確認";
SELECT
  ec.name AS "カテゴリ名",
  a.code || ' - ' || a.name AS "デフォルト勘定科目",
  tr.name AS "デフォルト税率"
FROM expense_categories ec
LEFT JOIN accounts a ON ec.default_account_id = a.id
LEFT JOIN tax_rates tr ON ec.tax_rate_id = tr.id
WHERE ec.tenant_id = 'YOUR_TENANT_ID_HERE'  -- ★ここも置き換えてください
ORDER BY ec.created_at;
