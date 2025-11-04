-- 請求書と見積書の明細に税区分を追加するマイグレーション
-- invoice_items と quote_items テーブルに tax_rate_id カラムを追加

-- ==========================================
-- 1. invoice_items テーブルに tax_rate_id を追加
-- ==========================================
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL;

-- デフォルトでは10%の税率を設定（存在する場合）
-- 注: 各テナントのデフォルト税率IDは異なるため、アプリケーション側で設定

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_invoice_items_tax_rate_id ON invoice_items(tax_rate_id);

-- ==========================================
-- 2. quote_items テーブルに tax_rate_id を追加
-- ==========================================
ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_quote_items_tax_rate_id ON quote_items(tax_rate_id);

-- ==========================================
-- 3. 既存の請求書/見積書に対する更新
-- ==========================================
-- 注: 既存のデータには tax_rate_id は NULL のまま
-- 今後作成される明細には、フォームで選択された税率が設定されます

-- ==========================================
-- 完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 税区分カラムの追加が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テーブル:';
  RAISE NOTICE '  - invoice_items.tax_rate_id (追加)';
  RAISE NOTICE '  - quote_items.tax_rate_id (追加)';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  → フォームで各明細に税区分を選択可能に';
  RAISE NOTICE '  → 税率に基づいた税額計算が可能に';
  RAISE NOTICE '========================================';
END $$;
