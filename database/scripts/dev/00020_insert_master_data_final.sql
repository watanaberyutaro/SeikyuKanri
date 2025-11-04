-- 最終版：既存テーブル構造に完全対応したマスターデータ投入スクリプト
-- テナントID: b91ce4bb-a6f3-49a0-9bc5-f37082c9687c

DO $$
DECLARE
  v_tenant_id UUID := 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c';
  v_user_id UUID;
  v_account_travel UUID;
  v_account_supplies UUID;
  v_account_entertainment UUID;
  v_account_communication UUID;
  v_account_misc UUID;
  v_tax_rate_10 UUID;
  v_tax_rate_8 UUID;
BEGIN
  -- ユーザーIDを取得
  SELECT id INTO v_user_id
  FROM profiles
  WHERE tenant_id = v_tenant_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが見つかりません';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'マスターデータ投入開始';
  RAISE NOTICE 'tenant_id: %', v_tenant_id;
  RAISE NOTICE 'user_id: %', v_user_id;
  RAISE NOTICE '========================================';

  -- ==========================================
  -- 1. 税率マスターを投入
  -- ==========================================
  RAISE NOTICE '1. 税率マスター投入中...';

  INSERT INTO tax_rates (tenant_id, user_id, name, rate, category, applies_from, is_active, description)
  VALUES
    (v_tenant_id, v_user_id, '課税10%', 10.00, 'standard', '2019-10-01', true, '標準税率（消費税10%）'),
    (v_tenant_id, v_user_id, '課税8%（軽減税率）', 8.00, 'reduced', '2019-10-01', true, '軽減税率（食品等）'),
    (v_tenant_id, v_user_id, '不課税', 0.00, 'non_taxable', '2000-01-01', true, '課税対象外'),
    (v_tenant_id, v_user_id, '免税', 0.00, 'zero_rated', '2000-01-01', true, '免税取引')
  ON CONFLICT (tenant_id, name) DO NOTHING;

  RAISE NOTICE '  ✓ 税率マスター投入完了';

  -- ==========================================
  -- 2. 勘定科目マスターを投入
  -- ==========================================
  RAISE NOTICE '2. 勘定科目マスター投入中...';

  -- 費用科目（経費精算で使用）
  INSERT INTO accounts (tenant_id, user_id, code, name, type, is_active, description)
  VALUES
    (v_tenant_id, v_user_id, '5110', '売上原価', 'expense', true, '商品の仕入原価'),
    (v_tenant_id, v_user_id, '6110', '給料手当', 'expense', true, '従業員への給与'),
    (v_tenant_id, v_user_id, '6120', '法定福利費', 'expense', true, '社会保険料等'),
    (v_tenant_id, v_user_id, '6210', '旅費交通費', 'expense', true, '出張費・交通費'),
    (v_tenant_id, v_user_id, '6220', '通信費', 'expense', true, '電話代・郵送料等'),
    (v_tenant_id, v_user_id, '6230', '消耗品費', 'expense', true, '事務用品等の消耗品'),
    (v_tenant_id, v_user_id, '6240', '地代家賃', 'expense', true, 'オフィス賃料等'),
    (v_tenant_id, v_user_id, '6250', '水道光熱費', 'expense', true, '電気・ガス・水道代'),
    (v_tenant_id, v_user_id, '6260', '接待交際費', 'expense', true, '取引先との接待・贈答'),
    (v_tenant_id, v_user_id, '6270', '広告宣伝費', 'expense', true, '広告・宣伝費用'),
    (v_tenant_id, v_user_id, '6280', '支払手数料', 'expense', true, '銀行手数料・専門家報酬等'),
    (v_tenant_id, v_user_id, '6290', '減価償却費', 'expense', true, '固定資産の減価償却'),
    (v_tenant_id, v_user_id, '6310', '支払利息', 'expense', true, '借入金の利息'),
    (v_tenant_id, v_user_id, '6910', '雑費', 'expense', true, 'その他の費用')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 資産科目
  INSERT INTO accounts (tenant_id, user_id, code, name, type, is_active, description)
  VALUES
    (v_tenant_id, v_user_id, '1110', '現金', 'asset', true, '手元現金'),
    (v_tenant_id, v_user_id, '1120', '普通預金', 'asset', true, '銀行の普通預金口座'),
    (v_tenant_id, v_user_id, '1130', '当座預金', 'asset', true, '銀行の当座預金口座'),
    (v_tenant_id, v_user_id, '1210', '売掛金', 'asset', true, '商品・サービスの売上に係る債権'),
    (v_tenant_id, v_user_id, '1220', '受取手形', 'asset', true, '手形による債権'),
    (v_tenant_id, v_user_id, '1410', '前払金', 'asset', true, '前払いした費用'),
    (v_tenant_id, v_user_id, '1420', '仮払金', 'asset', true, '一時的な支払い')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 負債科目
  INSERT INTO accounts (tenant_id, user_id, code, name, type, is_active, description)
  VALUES
    (v_tenant_id, v_user_id, '2110', '買掛金', 'liability', true, '商品・サービスの仕入に係る債務'),
    (v_tenant_id, v_user_id, '2120', '支払手形', 'liability', true, '手形による債務'),
    (v_tenant_id, v_user_id, '2130', '未払金', 'liability', true, '商品・サービス以外の債務'),
    (v_tenant_id, v_user_id, '2140', '未払費用', 'liability', true, '継続的役務提供の未払分'),
    (v_tenant_id, v_user_id, '2150', '預り金', 'liability', true, '従業員等からの一時預り金'),
    (v_tenant_id, v_user_id, '2160', '前受金', 'liability', true, '商品・サービス提供前の受取額'),
    (v_tenant_id, v_user_id, '2210', '短期借入金', 'liability', true, '1年以内返済予定の借入金'),
    (v_tenant_id, v_user_id, '2310', '長期借入金', 'liability', true, '1年超の借入金')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 純資産科目
  INSERT INTO accounts (tenant_id, user_id, code, name, type, is_active, description)
  VALUES
    (v_tenant_id, v_user_id, '3110', '資本金', 'equity', true, '会社の資本金'),
    (v_tenant_id, v_user_id, '3210', '繰越利益剰余金', 'equity', true, '過年度からの利益の累積')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- 収益科目
  INSERT INTO accounts (tenant_id, user_id, code, name, type, is_active, description)
  VALUES
    (v_tenant_id, v_user_id, '4110', '売上高', 'revenue', true, '商品・サービスの売上'),
    (v_tenant_id, v_user_id, '4210', '受取利息', 'revenue', true, '預金利息等の受取利息'),
    (v_tenant_id, v_user_id, '4220', '受取配当金', 'revenue', true, '株式配当金等'),
    (v_tenant_id, v_user_id, '4910', '雑収入', 'revenue', true, 'その他の収入')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  RAISE NOTICE '  ✓ 勘定科目マスター投入完了';

  -- ==========================================
  -- 3. 経費カテゴリマスターを投入
  -- ==========================================
  RAISE NOTICE '3. 経費カテゴリマスター投入中...';

  -- 勘定科目IDを取得
  SELECT id INTO v_account_travel FROM accounts WHERE tenant_id = v_tenant_id AND code = '6210' LIMIT 1;
  SELECT id INTO v_account_supplies FROM accounts WHERE tenant_id = v_tenant_id AND code = '6230' LIMIT 1;
  SELECT id INTO v_account_entertainment FROM accounts WHERE tenant_id = v_tenant_id AND code = '6260' LIMIT 1;
  SELECT id INTO v_account_communication FROM accounts WHERE tenant_id = v_tenant_id AND code = '6220' LIMIT 1;
  SELECT id INTO v_account_misc FROM accounts WHERE tenant_id = v_tenant_id AND code = '6910' LIMIT 1;

  -- 税率IDを取得
  SELECT id INTO v_tax_rate_10 FROM tax_rates WHERE tenant_id = v_tenant_id AND rate = 10 LIMIT 1;
  SELECT id INTO v_tax_rate_8 FROM tax_rates WHERE tenant_id = v_tenant_id AND rate = 8 LIMIT 1;

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

  RAISE NOTICE '  ✓ 経費カテゴリマスター投入完了';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ すべてのマスターデータ投入が完了しました！';
  RAISE NOTICE '========================================';
END $$;

-- 投入結果を確認
SELECT '【投入結果サマリー】' AS "確認";

SELECT
  (SELECT COUNT(*) FROM tax_rates WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "税率数",
  (SELECT COUNT(*) FROM accounts WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "勘定科目数",
  (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') AS "経費カテゴリ数",
  CASE
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c') >= 8 THEN '✓ 完了'
    ELSE '⚠ 確認必要'
  END AS "ステータス";

-- データ詳細
SELECT '【税率マスター】' AS "確認";
SELECT name, rate, category FROM tax_rates WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c' ORDER BY rate DESC;

SELECT '【費用科目（経費精算用）】' AS "確認";
SELECT code, name FROM accounts WHERE tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c' AND type = 'expense' ORDER BY code;

SELECT '【経費カテゴリ】' AS "確認";
SELECT
  ec.name AS "カテゴリ名",
  a.code || ' - ' || a.name AS "デフォルト勘定科目",
  tr.name || ' (' || tr.rate || '%)' AS "デフォルト税率"
FROM expense_categories ec
LEFT JOIN accounts a ON ec.default_account_id = a.id
LEFT JOIN tax_rates tr ON ec.tax_rate_id = tr.id
WHERE ec.tenant_id = 'b91ce4bb-a6f3-49a0-9bc5-f37082c9687c'
ORDER BY ec.created_at;
