-- 電子取引データ・監査ログ機能のマイグレーション
-- 電子帳簿保存法対応（改ざん防止・検索要件）

-- ==============================================
-- 1. 電子文書テーブル（edocuments）
-- ==============================================
CREATE TABLE IF NOT EXISTS edocuments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- エンティティ紐付け
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'quote', 'bill', 'receipt', 'expense', 'contract')),
  entity_id UUID NOT NULL, -- 請求書ID、見積書ID等

  -- ファイル情報
  file_name TEXT NOT NULL, -- ファイル名
  file_size BIGINT NOT NULL, -- ファイルサイズ（バイト）
  mime_type TEXT NOT NULL, -- MIMEタイプ（application/pdf等）
  storage_url TEXT NOT NULL, -- ストレージURL（Supabase Storage等）

  -- 改ざん防止
  sha256 CHAR(64) NOT NULL, -- SHA-256ハッシュ（16進数文字列）
  version INTEGER NOT NULL DEFAULT 1, -- バージョン番号（差替時はインクリメント）
  is_latest BOOLEAN NOT NULL DEFAULT true, -- 最新版フラグ
  replaced_by UUID REFERENCES edocuments(id), -- 新バージョンへの参照

  -- 検索要件（電子帳簿保存法）
  issued_at TIMESTAMPTZ NOT NULL, -- 発行日時
  counterparty TEXT, -- 取引先名
  total_amount NUMERIC(15, 2), -- 合計金額
  document_number TEXT, -- 文書番号（請求書番号等）
  searchable JSONB, -- 検索用追加データ（JSON形式）

  -- タイムスタンプ（オプション）
  timestamp_token TEXT, -- 外部タイムスタンプサービスのトークン
  timestamp_url TEXT, -- タイムスタンプ検証URL
  timestamped_at TIMESTAMPTZ, -- タイムスタンプ付与日時

  -- 監査
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- インデックス用制約
  UNIQUE(tenant_id, entity_type, entity_id, version)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_edocuments_tenant_id ON edocuments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edocuments_entity ON edocuments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_edocuments_sha256 ON edocuments(sha256);
CREATE INDEX IF NOT EXISTS idx_edocuments_issued_at ON edocuments(issued_at);
CREATE INDEX IF NOT EXISTS idx_edocuments_counterparty ON edocuments(counterparty);
CREATE INDEX IF NOT EXISTS idx_edocuments_document_number ON edocuments(document_number);
CREATE INDEX IF NOT EXISTS idx_edocuments_latest ON edocuments(is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_edocuments_searchable ON edocuments USING gin(searchable);

-- RLS
ALTER TABLE edocuments ENABLE ROW LEVEL SECURITY;

CREATE POLICY edocuments_tenant_policy ON edocuments
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ==============================================
-- 2. 監査ログテーブル（audit_logs）
-- ==============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- アクター情報
  actor_user_id UUID REFERENCES auth.users(id), -- 操作実行者
  actor_name TEXT, -- 操作実行者名（ユーザー削除後も保持）
  actor_email TEXT, -- 操作実行者メール

  -- アクション
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'download', 'export'
  entity_type TEXT NOT NULL, -- 'invoice', 'journal', 'edocument', 'user', etc.
  entity_id UUID, -- 対象エンティティID
  entity_label TEXT, -- 対象エンティティのラベル（表示用）

  -- 変更内容
  before JSONB, -- 変更前データ
  after JSONB, -- 変更後データ
  changes JSONB, -- 差分情報

  -- コンテキスト情報
  ip INET, -- IPアドレス
  user_agent TEXT, -- ユーザーエージェント
  request_id TEXT, -- リクエストID（トレーシング用）

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_tenant_policy ON audit_logs
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 監査ログは追加のみ（更新・削除禁止）
CREATE POLICY audit_logs_insert_only ON audit_logs
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ==============================================
-- 3. トリガー（自動バージョン管理）
-- ==============================================
CREATE OR REPLACE FUNCTION update_edocument_version()
RETURNS TRIGGER AS $$
BEGIN
  -- 同じエンティティの既存最新版を非最新に更新
  UPDATE edocuments
  SET is_latest = false
  WHERE tenant_id = NEW.tenant_id
    AND entity_type = NEW.entity_type
    AND entity_id = NEW.entity_id
    AND is_latest = true
    AND id != NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_edocument_version
  BEFORE INSERT ON edocuments
  FOR EACH ROW
  EXECUTE FUNCTION update_edocument_version();

-- ==============================================
-- 4. コメント
-- ==============================================
COMMENT ON TABLE edocuments IS '電子文書管理（電子帳簿保存法対応）';
COMMENT ON TABLE audit_logs IS '監査ログ（全操作履歴）';

COMMENT ON COLUMN edocuments.sha256 IS 'SHA-256ハッシュ（改ざん検知用）';
COMMENT ON COLUMN edocuments.version IS 'バージョン番号（差替時インクリメント）';
COMMENT ON COLUMN edocuments.is_latest IS '最新版フラグ（旧版も保持）';
COMMENT ON COLUMN edocuments.searchable IS '検索用JSONB（任意の検索条件を格納可能）';
COMMENT ON COLUMN audit_logs.action IS 'create/update/delete/approve/download/export等';

-- ==============================================
-- 5. 完了メッセージ
-- ==============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 電子取引データ・監査ログテーブルの作成が完了しました';
  RAISE NOTICE '   - edocuments: 電子文書管理（SHA-256ハッシュ、検索要件）';
  RAISE NOTICE '   - audit_logs: 監査ログ（全操作履歴）';
END $$;
