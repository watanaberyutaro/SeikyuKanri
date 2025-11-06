-- ============================================================================
-- Migration: 00028_add_bank_api.sql
-- Description: Bank API Integration (Moneytree OAuth + Auto Reconciliation)
-- Feature Flag: FEATURE_BANK_API
-- Date: 2025-11-06
-- Note: Tables prefixed with bank_api_ to avoid conflict with CSV import tables
-- ============================================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Bank API Providers (OAuth設定マスター)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_api_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  oauth_authorize_url TEXT NOT NULL,
  oauth_token_url TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bank_api_providers IS '銀行APIプロバイダー設定（Moneytreeなど）';
COMMENT ON COLUMN bank_api_providers.name IS 'プロバイダー名（例: moneytree）';
COMMENT ON COLUMN bank_api_providers.oauth_authorize_url IS 'OAuth認可エンドポイント';
COMMENT ON COLUMN bank_api_providers.oauth_token_url IS 'OAuthトークン交換エンドポイント';
COMMENT ON COLUMN bank_api_providers.api_base_url IS 'APIベースURL';
COMMENT ON COLUMN bank_api_providers.webhook_secret IS 'Webhook署名検証用シークレット';

-- Insert Moneytree provider
INSERT INTO bank_api_providers (name, oauth_authorize_url, oauth_token_url, api_base_url)
VALUES (
  'moneytree',
  'https://myaccount.getmoneytree.com/oauth/authorize',
  'https://myaccount.getmoneytree.com/oauth/token',
  'https://api.getmoneytree.com'
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. Bank API Connections (企業ごとのOAuth接続情報)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES bank_api_providers(id) ON DELETE CASCADE,

  -- 暗号化トークン（pgp_sym_encrypt/decryptで保護）
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,

  scope TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired', 'error')) DEFAULT 'active',
  error_message TEXT,

  -- OAuth state/PKCE
  last_state TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, provider_id)
);

COMMENT ON TABLE bank_api_connections IS '企業ごとの銀行API接続情報（OAuth認証済み）';
COMMENT ON COLUMN bank_api_connections.access_token_enc IS '暗号化されたアクセストークン';
COMMENT ON COLUMN bank_api_connections.refresh_token_enc IS '暗号化されたリフレッシュトークン';
COMMENT ON COLUMN bank_api_connections.status IS '接続ステータス（active/revoked/expired/error）';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_api_connections_tenant ON bank_api_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_connections_status ON bank_api_connections(status);
CREATE INDEX IF NOT EXISTS idx_bank_api_connections_expires ON bank_api_connections(expires_at);

-- ============================================================================
-- 3. Bank API Accounts (連携済み銀行口座)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_api_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bank_api_connections(id) ON DELETE CASCADE,

  external_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  branch_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'other')),
  currency TEXT NOT NULL DEFAULT 'JPY',

  current_balance NUMERIC(18, 2),
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(connection_id, external_account_id)
);

COMMENT ON TABLE bank_api_accounts IS '連携済み銀行口座情報（API経由）';
COMMENT ON COLUMN bank_api_accounts.external_account_id IS 'プロバイダー側の口座ID';
COMMENT ON COLUMN bank_api_accounts.current_balance IS '最終同期時の残高';
COMMENT ON COLUMN bank_api_accounts.last_synced_at IS '最終同期日時';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_api_accounts_tenant ON bank_api_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_accounts_connection ON bank_api_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_accounts_last_synced ON bank_api_accounts(last_synced_at);

-- ============================================================================
-- 4. Bank API Transactions (取引明細)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_api_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_api_accounts(id) ON DELETE CASCADE,

  txn_date DATE NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  description TEXT NOT NULL,

  -- 外部ID・重複防止
  external_txn_id TEXT NOT NULL,
  hash CHAR(64) NOT NULL UNIQUE,

  -- 照合情報
  matched BOOLEAN NOT NULL DEFAULT false,
  matched_invoice_id UUID REFERENCES invoices(id),
  matched_payment_id UUID REFERENCES payments(id),
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),

  -- 元データ
  raw_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(account_id, external_txn_id)
);

COMMENT ON TABLE bank_api_transactions IS '銀行取引明細（API経由で取得）';
COMMENT ON COLUMN bank_api_transactions.direction IS '入出金区分（in=入金, out=出金）';
COMMENT ON COLUMN bank_api_transactions.hash IS '重複検知用ハッシュ（SHA-256）';
COMMENT ON COLUMN bank_api_transactions.matched IS '請求書と突合済みかどうか';
COMMENT ON COLUMN bank_api_transactions.external_txn_id IS 'プロバイダー側の取引ID';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_tenant ON bank_api_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_account ON bank_api_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_date ON bank_api_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_direction ON bank_api_transactions(direction);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_matched ON bank_api_transactions(matched);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_amount ON bank_api_transactions(amount);

-- ============================================================================
-- 5. Bank API Sync Jobs (同期ジョブ履歴)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_api_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bank_api_connections(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  sync_from DATE,
  sync_to DATE,

  transactions_fetched INTEGER DEFAULT 0,
  transactions_inserted INTEGER DEFAULT 0,
  transactions_duplicated INTEGER DEFAULT 0,

  error_message TEXT,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bank_api_sync_jobs IS '銀行API同期ジョブ履歴';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_api_sync_jobs_tenant ON bank_api_sync_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_sync_jobs_connection ON bank_api_sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_sync_jobs_status ON bank_api_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bank_api_sync_jobs_started ON bank_api_sync_jobs(started_at);

-- ============================================================================
-- 6. Hash Generation Function (重複防止用)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_bank_api_txn_hash(
  p_account_id UUID,
  p_txn_date DATE,
  p_amount NUMERIC,
  p_description TEXT,
  p_direction TEXT
) RETURNS CHAR(64) AS $$
DECLARE
  normalized_desc TEXT;
  hash_input TEXT;
BEGIN
  -- 説明文を正規化（空白削除、小文字化）
  normalized_desc := LOWER(REGEXP_REPLACE(p_description, '\s+', '', 'g'));

  -- ハッシュ入力文字列を生成
  hash_input := p_account_id::TEXT || '|' ||
                p_txn_date::TEXT || '|' ||
                p_amount::TEXT || '|' ||
                normalized_desc || '|' ||
                p_direction;

  -- SHA-256ハッシュを返す
  RETURN encode(digest(hash_input, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_bank_api_txn_hash IS '銀行API取引の重複検知用ハッシュを生成';

-- ============================================================================
-- 7. Trigger: Updated At
-- ============================================================================
CREATE OR REPLACE FUNCTION update_bank_api_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_api_connections_updated_at
  BEFORE UPDATE ON bank_api_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_api_updated_at();

CREATE TRIGGER update_bank_api_accounts_updated_at
  BEFORE UPDATE ON bank_api_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_api_updated_at();

CREATE TRIGGER update_bank_api_transactions_updated_at
  BEFORE UPDATE ON bank_api_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_api_updated_at();

CREATE TRIGGER update_bank_api_providers_updated_at
  BEFORE UPDATE ON bank_api_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_api_updated_at();

-- ============================================================================
-- 8. Row Level Security (RLS)
-- ============================================================================
ALTER TABLE bank_api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_sync_jobs ENABLE ROW LEVEL SECURITY;

-- bank_api_connections policies
CREATE POLICY bank_api_connections_tenant_isolation ON bank_api_connections
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- bank_api_accounts policies
CREATE POLICY bank_api_accounts_tenant_isolation ON bank_api_accounts
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- bank_api_transactions policies
CREATE POLICY bank_api_transactions_tenant_isolation ON bank_api_transactions
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- bank_api_sync_jobs policies
CREATE POLICY bank_api_sync_jobs_tenant_isolation ON bank_api_sync_jobs
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 9. Audit Log Function (監査ログ記録)
-- ============================================================================
CREATE OR REPLACE FUNCTION log_bank_api_activity(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    created_at
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_bank_api_activity IS '銀行API関連の監査ログを記録';

-- ============================================================================
-- 10. Stats View (統計情報ビュー)
-- ============================================================================
CREATE OR REPLACE VIEW bank_api_stats AS
SELECT
  t.id AS tenant_id,
  COUNT(DISTINCT ba.id) AS total_accounts,
  COUNT(DISTINCT bc.id) AS total_connections,
  COUNT(bt.id) AS total_transactions,
  COUNT(bt.id) FILTER (WHERE bt.matched = true) AS matched_transactions,
  COUNT(bt.id) FILTER (WHERE bt.matched = false) AS unmatched_transactions,
  SUM(bt.amount) FILTER (WHERE bt.direction = 'in' AND bt.matched = false) AS unmatched_income_amount,
  MAX(bt.created_at) AS last_transaction_at
FROM tenants t
LEFT JOIN bank_api_connections bc ON bc.tenant_id = t.id AND bc.status = 'active'
LEFT JOIN bank_api_accounts ba ON ba.tenant_id = t.id
LEFT JOIN bank_api_transactions bt ON bt.tenant_id = t.id
GROUP BY t.id;

COMMENT ON VIEW bank_api_stats IS '銀行API連携の統計情報';

-- ============================================================================
-- Migration Complete
-- ============================================================================
