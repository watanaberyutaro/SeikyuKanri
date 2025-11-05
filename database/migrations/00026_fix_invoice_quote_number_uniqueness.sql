-- 請求書番号と見積書番号のUNIQUE制約を修正
-- 全テナントでの一意性から、テナントごとの一意性に変更
--
-- 実行方法: Supabase SQL Editorでこのスクリプトを実行してください

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '請求書・見積書番号の制約を修正開始';
  RAISE NOTICE '========================================';

  -- ==========================================
  -- 1. 請求書テーブル (invoices)
  -- ==========================================

  -- 既存のUNIQUE制約を削除
  BEGIN
    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
    RAISE NOTICE '✓ invoices: 既存のUNIQUE制約を削除';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠ invoices: 既存の制約削除でエラー（制約が存在しない可能性）';
  END;

  -- テナントIDと請求書番号の複合UNIQUE制約を追加
  BEGIN
    ALTER TABLE invoices
    ADD CONSTRAINT invoices_tenant_invoice_number_key
    UNIQUE (tenant_id, invoice_number);
    RAISE NOTICE '✓ invoices: (tenant_id, invoice_number) の複合UNIQUE制約を追加';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠ invoices: 複合UNIQUE制約の追加でエラー（既に存在する可能性）';
  END;

  -- インデックスを追加（パフォーマンス向上）
  CREATE INDEX IF NOT EXISTS idx_invoices_tenant_invoice_number
    ON invoices(tenant_id, invoice_number);
  RAISE NOTICE '✓ invoices: インデックスを追加';

  -- ==========================================
  -- 2. 見積書テーブル (quotes)
  -- ==========================================

  -- 既存のUNIQUE制約を削除
  BEGIN
    ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_quote_number_key;
    RAISE NOTICE '✓ quotes: 既存のUNIQUE制約を削除';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠ quotes: 既存の制約削除でエラー（制約が存在しない可能性）';
  END;

  -- テナントIDと見積書番号の複合UNIQUE制約を追加
  BEGIN
    ALTER TABLE quotes
    ADD CONSTRAINT quotes_tenant_quote_number_key
    UNIQUE (tenant_id, quote_number);
    RAISE NOTICE '✓ quotes: (tenant_id, quote_number) の複合UNIQUE制約を追加';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠ quotes: 複合UNIQUE制約の追加でエラー（既に存在する可能性）';
  END;

  -- インデックスを追加（パフォーマンス向上）
  CREATE INDEX IF NOT EXISTS idx_quotes_tenant_quote_number
    ON quotes(tenant_id, quote_number);
  RAISE NOTICE '✓ quotes: インデックスを追加';

  -- ==========================================
  -- 完了メッセージ
  -- ==========================================

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 制約の修正が完了しました！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '変更内容:';
  RAISE NOTICE '  【修正前】';
  RAISE NOTICE '    - invoice_number: 全テナントで一意';
  RAISE NOTICE '    - quote_number: 全テナントで一意';
  RAISE NOTICE '';
  RAISE NOTICE '  【修正後】';
  RAISE NOTICE '    - invoice_number: テナントごとに一意';
  RAISE NOTICE '    - quote_number: テナントごとに一意';
  RAISE NOTICE '';
  RAISE NOTICE '効果:';
  RAISE NOTICE '  → 各企業が独立して番号を採番できるように';
  RAISE NOTICE '  → 企業A: INV-2025-001, 002, 003...';
  RAISE NOTICE '  → 企業B: INV-2025-001, 002, 003... (独立)';
  RAISE NOTICE '========================================';
END $$;
