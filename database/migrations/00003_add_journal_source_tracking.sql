-- 仕訳と請求書の連携機能追加
-- 請求書から自動生成された仕訳を追跡するためのカラムを追加

-- journalsテーブルにソース追跡カラムを追加
ALTER TABLE journals
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS source_id UUID;

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_journals_source ON journals(source_type, source_id);

-- コメントを追加
COMMENT ON COLUMN journals.source_type IS '仕訳のソースタイプ (invoice, quote, manual など)';
COMMENT ON COLUMN journals.source_id IS '関連する請求書や見積書のID';
