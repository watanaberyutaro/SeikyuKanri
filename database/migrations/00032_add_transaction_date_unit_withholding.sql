-- 請求書と見積書の明細に取引日、単位、源泉徴収を追加するマイグレーション
-- invoice_items と quote_items テーブルに transaction_date, unit, withholding_tax_rate カラムを追加

-- ==========================================
-- 1. invoice_items テーブルに新しいカラムを追加
-- ==========================================

-- 取引日を追加
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS transaction_date DATE;

-- 単位を追加（例: 時間, 個, 式, etc.）
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS unit TEXT;

-- 源泉徴収税率を追加（例: 10.21%）
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(5, 2) DEFAULT 0;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_invoice_items_transaction_date ON invoice_items(transaction_date);

-- ==========================================
-- 2. quote_items テーブルに新しいカラムを追加
-- ==========================================

-- 取引日を追加
ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS transaction_date DATE;

-- 単位を追加
ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS unit TEXT;

-- 源泉徴収税率を追加
ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(5, 2) DEFAULT 0;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_quote_items_transaction_date ON quote_items(transaction_date);

-- ==========================================
-- 3. 既存の請求書/見積書に対する更新
-- ==========================================
-- 注: 既存のデータには新しいカラムは NULL または DEFAULT 値のまま
-- 今後作成される明細には、フォームで入力された値が設定されます

-- ==========================================
-- 完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 明細項目の追加が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テーブル:';
  RAISE NOTICE '  - invoice_items.transaction_date (追加)';
  RAISE NOTICE '  - invoice_items.unit (追加)';
  RAISE NOTICE '  - invoice_items.withholding_tax_rate (追加)';
  RAISE NOTICE '  - quote_items.transaction_date (追加)';
  RAISE NOTICE '  - quote_items.unit (追加)';
  RAISE NOTICE '  - quote_items.withholding_tax_rate (追加)';
  RAISE NOTICE '';
  RAISE NOTICE '項目の説明:';
  RAISE NOTICE '  - 取引日: 各明細の取引が発生した日付';
  RAISE NOTICE '  - 単位: 数量の単位（時間、個、式など）';
  RAISE NOTICE '  - 源泉徴収税率: 源泉徴収が必要な場合の税率';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  → フォームで各明細に取引日、単位、源泉徴収を入力可能に';
  RAISE NOTICE '  → PDF出力時に新しい項目が表示されるよう更新';
  RAISE NOTICE '========================================';
END $$;
