-- 全テナントに一括でマスターデータを投入するスクリプト
-- 既存の全テナントに対して、勘定科目・税率・経費カテゴリを作成します

DO $$
DECLARE
  tenant_record RECORD;
  v_account_travel UUID;
  v_account_supplies UUID;
  v_account_entertainment UUID;
  v_account_communication UUID;
  v_account_misc UUID;
  v_tax_rate_10 UUID;
  v_tax_rate_8 UUID;
  tenant_count INTEGER := 0;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '全テナント一括マスターデータ投入を開始します';
  RAISE NOTICE '========================================';

  -- 全テナントをループ処理
  FOR tenant_record IN
    SELECT id, company_name, company_code
    FROM tenants
    WHERE is_active = true
    ORDER BY created_at
  LOOP
    tenant_count := tenant_count + 1;

    BEGIN
      RAISE NOTICE '';
      RAISE NOTICE '----------------------------------------';
      RAISE NOTICE 'テナント %: % (%)', tenant_count, tenant_record.company_name, tenant_record.company_code;
      RAISE NOTICE '  tenant_id: %', tenant_record.id;
      RAISE NOTICE '----------------------------------------';

      -- ==========================================
      -- 1. 税率マスターを投入
      -- ==========================================
      INSERT INTO tax_rates (tenant_id, name, rate, description)
      VALUES
        (tenant_record.id, '課税10%', 10, '標準税率'),
        (tenant_record.id, '課税8%（軽減税率）', 8, '軽減税率（食品等）'),
        (tenant_record.id, '非課税', 0, '非課税取引'),
        (tenant_record.id, '不課税', 0, '課税対象外'),
        (tenant_record.id, '免税', 0, '免税取引')
      ON CONFLICT (tenant_id, name) DO NOTHING;

      RAISE NOTICE '  ✓ 税率マスター投入完了';

      -- ==========================================
      -- 2. 勘定科目マスターを投入
      -- ==========================================

      -- 資産
      INSERT INTO accounts (tenant_id, code, name, account_type, description)
      VALUES
        (tenant_record.id, '1110', '現金', 'asset', '手元現金'),
        (tenant_record.id, '1120', '普通預金', 'asset', '銀行の普通預金口座'),
        (tenant_record.id, '1130', '当座預金', 'asset', '銀行の当座預金口座'),
        (tenant_record.id, '1210', '売掛金', 'asset', '商品・サービスの売上に係る債権'),
        (tenant_record.id, '1220', '受取手形', 'asset', '手形による債権'),
        (tenant_record.id, '1310', '商品', 'asset', '販売目的の商品在庫'),
        (tenant_record.id, '1320', '製品', 'asset', '製造した製品在庫'),
        (tenant_record.id, '1330', '原材料', 'asset', '製造用の原材料'),
        (tenant_record.id, '1410', '前払金', 'asset', '前払いした費用'),
        (tenant_record.id, '1420', '仮払金', 'asset', '一時的な支払い')
      ON CONFLICT (tenant_id, code) DO NOTHING;

      -- 負債
      INSERT INTO accounts (tenant_id, code, name, account_type, description)
      VALUES
        (tenant_record.id, '2110', '買掛金', 'liability', '商品・サービスの仕入に係る債務'),
        (tenant_record.id, '2120', '支払手形', 'liability', '手形による債務'),
        (tenant_record.id, '2130', '未払金', 'liability', '商品・サービス以外の債務'),
        (tenant_record.id, '2140', '未払費用', 'liability', '継続的役務提供の未払分'),
        (tenant_record.id, '2150', '預り金', 'liability', '従業員等からの一時預り金'),
        (tenant_record.id, '2160', '前受金', 'liability', '商品・サービス提供前の受取額'),
        (tenant_record.id, '2210', '短期借入金', 'liability', '1年以内返済予定の借入金'),
        (tenant_record.id, '2310', '長期借入金', 'liability', '1年超の借入金')
      ON CONFLICT (tenant_id, code) DO NOTHING;

      -- 純資産
      INSERT INTO accounts (tenant_id, code, name, account_type, description)
      VALUES
        (tenant_record.id, '3110', '資本金', 'equity', '会社の資本金'),
        (tenant_record.id, '3210', '繰越利益剰余金', 'equity', '過年度からの利益の累積')
      ON CONFLICT (tenant_id, code) DO NOTHING;

      -- 収益
      INSERT INTO accounts (tenant_id, code, name, account_type, description)
      VALUES
        (tenant_record.id, '4110', '売上高', 'revenue', '商品・サービスの売上'),
        (tenant_record.id, '4210', '受取利息', 'revenue', '預金利息等の受取利息'),
        (tenant_record.id, '4220', '受取配当金', 'revenue', '株式配当金等'),
        (tenant_record.id, '4910', '雑収入', 'revenue', 'その他の収入')
      ON CONFLICT (tenant_id, code) DO NOTHING;

      -- 費用
      INSERT INTO accounts (tenant_id, code, name, account_type, description)
      VALUES
        (tenant_record.id, '5110', '売上原価', 'expense', '商品の仕入原価'),
        (tenant_record.id, '6110', '給料手当', 'expense', '従業員への給与'),
        (tenant_record.id, '6120', '法定福利費', 'expense', '社会保険料等'),
        (tenant_record.id, '6210', '旅費交通費', 'expense', '出張費・交通費'),
        (tenant_record.id, '6220', '通信費', 'expense', '電話代・郵送料等'),
        (tenant_record.id, '6230', '消耗品費', 'expense', '事務用品等の消耗品'),
        (tenant_record.id, '6240', '地代家賃', 'expense', 'オフィス賃料等'),
        (tenant_record.id, '6250', '水道光熱費', 'expense', '電気・ガス・水道代'),
        (tenant_record.id, '6260', '接待交際費', 'expense', '取引先との接待・贈答'),
        (tenant_record.id, '6270', '広告宣伝費', 'expense', '広告・宣伝費用'),
        (tenant_record.id, '6280', '支払手数料', 'expense', '銀行手数料・専門家報酬等'),
        (tenant_record.id, '6290', '減価償却費', 'expense', '固定資産の減価償却'),
        (tenant_record.id, '6310', '支払利息', 'expense', '借入金の利息'),
        (tenant_record.id, '6910', '雑費', 'expense', 'その他の費用')
      ON CONFLICT (tenant_id, code) DO NOTHING;

      RAISE NOTICE '  ✓ 勘定科目マスター投入完了';

      -- ==========================================
      -- 3. 経費カテゴリマスターを投入
      -- ==========================================

      -- 勘定科目IDを取得
      SELECT id INTO v_account_travel
      FROM accounts
      WHERE tenant_id = tenant_record.id AND code = '6210'
      LIMIT 1;

      SELECT id INTO v_account_supplies
      FROM accounts
      WHERE tenant_id = tenant_record.id AND code = '6230'
      LIMIT 1;

      SELECT id INTO v_account_entertainment
      FROM accounts
      WHERE tenant_id = tenant_record.id AND code = '6260'
      LIMIT 1;

      SELECT id INTO v_account_communication
      FROM accounts
      WHERE tenant_id = tenant_record.id AND code = '6220'
      LIMIT 1;

      SELECT id INTO v_account_misc
      FROM accounts
      WHERE tenant_id = tenant_record.id AND code = '6910'
      LIMIT 1;

      -- 税率IDを取得
      SELECT id INTO v_tax_rate_10
      FROM tax_rates
      WHERE tenant_id = tenant_record.id AND rate = 10
      LIMIT 1;

      SELECT id INTO v_tax_rate_8
      FROM tax_rates
      WHERE tenant_id = tenant_record.id AND rate = 8
      LIMIT 1;

      -- 経費カテゴリを投入
      INSERT INTO expense_categories (tenant_id, name, default_account_id, tax_rate_id)
      VALUES
        (tenant_record.id, '交通費', v_account_travel, v_tax_rate_10),
        (tenant_record.id, '宿泊費', v_account_travel, v_tax_rate_10),
        (tenant_record.id, '会議費', v_account_entertainment, v_tax_rate_10),
        (tenant_record.id, '接待交際費', v_account_entertainment, v_tax_rate_10),
        (tenant_record.id, '消耗品費', v_account_supplies, v_tax_rate_10),
        (tenant_record.id, '通信費', v_account_communication, v_tax_rate_10),
        (tenant_record.id, '書籍・資料代', v_account_supplies, v_tax_rate_10),
        (tenant_record.id, 'その他', v_account_misc, v_tax_rate_10)
      ON CONFLICT (tenant_id, name) DO NOTHING;

      RAISE NOTICE '  ✓ 経費カテゴリマスター投入完了';
      RAISE NOTICE '  ✓ テナント処理成功';

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING '  ✗ テナント処理エラー: %', SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '一括投入処理が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '処理対象テナント数: %', tenant_count;
  RAISE NOTICE '成功: %', success_count;
  RAISE NOTICE 'エラー: %', error_count;
  RAISE NOTICE '========================================';
END $$;

-- ==========================================
-- 投入結果を確認
-- ==========================================

SELECT '【テナント別マスターデータ投入状況】' AS "確認";

SELECT
  t.company_name AS "企業名",
  t.company_code AS "企業コード",
  (SELECT COUNT(*) FROM tax_rates WHERE tenant_id = t.id) AS "税率数",
  (SELECT COUNT(*) FROM accounts WHERE tenant_id = t.id) AS "勘定科目数",
  (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = t.id) AS "経費カテゴリ数",
  CASE
    WHEN (SELECT COUNT(*) FROM expense_categories WHERE tenant_id = t.id) >= 8 THEN '✓ 完了'
    ELSE '⚠ 未完了'
  END AS "ステータス"
FROM tenants t
WHERE t.is_active = true
ORDER BY t.created_at;
