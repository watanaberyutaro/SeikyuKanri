-- ====================================================================
-- 銀行API連携機能 完全マイグレーション
-- ====================================================================
-- このファイルには以下のマイグレーションが含まれています:
-- - 00028: 銀行APIテーブル作成
-- - 00029: 支払いテーブルに冪等性キー追加
-- - 00030: トークン暗号化関数作成
-- - 00031: tenant_applicationsテーブル拡張
-- ====================================================================

BEGIN;

-- ====================================================================
-- マイグレーション 00028: 銀行APIテーブル作成
-- ====================================================================

-- pgcrypto拡張を有効化（トークン暗号化用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 銀行APIプロバイダー（Moneytreeなど）
CREATE TABLE IF NOT EXISTS bank_api_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'moneytree', 'freee' など
  display_name TEXT NOT NULL,
  description TEXT,
  api_base_url TEXT,
  oauth_authorize_url TEXT,
  oauth_token_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- プロバイダー接続情報（テナントごと）
CREATE TABLE IF NOT EXISTS bank_api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES bank_api_providers(id) ON DELETE CASCADE,

  -- OAuth認証情報（暗号化）
  access_token_enc TEXT NOT NULL, -- 暗号化されたアクセストークン
  refresh_token_enc TEXT, -- 暗号化されたリフレッシュトークン
  expires_at TIMESTAMPTZ, -- トークン有効期限
  scope TEXT, -- 許可されたスコープ

  -- 接続状態
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  error_message TEXT,
  last_sync_at TIMESTAMPTZ,
  last_state TEXT, -- OAuth state（CSRF保護用、一時保存）

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, provider_id) -- テナントごとにプロバイダーは1接続のみ
);

-- 銀行口座（API経由で取得）
CREATE TABLE IF NOT EXISTS bank_api_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES bank_api_connections(id) ON DELETE CASCADE,

  -- 外部API情報
  external_account_id TEXT NOT NULL, -- Moneytreeのaccount_id
  account_name TEXT NOT NULL, -- 口座名（例: 三菱UFJ銀行 普通預金）
  account_number TEXT, -- 口座番号（マスク済み）
  account_type TEXT, -- 'checking', 'savings', 'credit_card'
  institution_name TEXT, -- 金融機関名
  currency TEXT NOT NULL DEFAULT 'JPY',
  current_balance DECIMAL(15, 2), -- 現在残高
  available_balance DECIMAL(15, 2), -- 利用可能残高

  -- メタデータ
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(connection_id, external_account_id)
);

-- 銀行取引（API経由で取得）
CREATE TABLE IF NOT EXISTS bank_api_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES bank_api_accounts(id) ON DELETE CASCADE,

  -- 外部API情報
  external_transaction_id TEXT NOT NULL, -- Moneytreeのtransaction_id
  transaction_hash TEXT NOT NULL, -- 重複検出用ハッシュ

  -- 取引情報
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL, -- 金額（正=入金、負=出金）
  balance_after DECIMAL(15, 2), -- 取引後残高
  category TEXT, -- カテゴリ
  memo TEXT,

  -- 照合情報
  is_matched BOOLEAN NOT NULL DEFAULT false, -- 請求書に紐付け済みか
  matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  matched_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(account_id, external_transaction_id),
  UNIQUE(account_id, transaction_hash) -- 同一ハッシュの重複を防ぐ
);

-- 同期ジョブ履歴
CREATE TABLE IF NOT EXISTS bank_api_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES bank_api_connections(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- 同期結果
  accounts_synced INTEGER DEFAULT 0,
  transactions_synced INTEGER DEFAULT 0,
  new_transactions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_bank_api_connections_tenant ON bank_api_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_connections_status ON bank_api_connections(status);
CREATE INDEX IF NOT EXISTS idx_bank_api_accounts_connection ON bank_api_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_account ON bank_api_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_matched ON bank_api_transactions(is_matched);
CREATE INDEX IF NOT EXISTS idx_bank_api_transactions_date ON bank_api_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_api_sync_jobs_connection ON bank_api_sync_jobs(connection_id);

-- RLS有効化
ALTER TABLE bank_api_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_api_sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view all providers"
  ON bank_api_providers FOR SELECT
  USING (true);

CREATE POLICY "Users can view own tenant connections"
  ON bank_api_connections FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view own tenant accounts"
  ON bank_api_accounts FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM bank_api_connections
      WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view own tenant transactions"
  ON bank_api_transactions FOR ALL
  USING (
    account_id IN (
      SELECT id FROM bank_api_accounts
      WHERE connection_id IN (
        SELECT id FROM bank_api_connections
        WHERE tenant_id IN (
          SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view own tenant sync jobs"
  ON bank_api_sync_jobs FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM bank_api_connections
      WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- デフォルトプロバイダーを挿入
INSERT INTO bank_api_providers (name, display_name, description, api_base_url, oauth_authorize_url, oauth_token_url)
VALUES (
  'moneytree',
  'Moneytree',
  '日本の主要銀行と連携できる金融データプラットフォーム',
  'https://api.getmoneytree.com',
  'https://myaccount.getmoneytree.com/oauth/authorize',
  'https://api.getmoneytree.com/oauth/token'
) ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- マイグレーション 00029: 支払いテーブルに冪等性キー追加
-- ====================================================================

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
ON payments(idempotency_key)
WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN payments.idempotency_key IS '冪等性キー（銀行API連携での重複防止用）';

-- ====================================================================
-- マイグレーション 00030: トークン暗号化関数作成
-- ====================================================================

-- トークン暗号化関数
CREATE OR REPLACE FUNCTION encrypt_token(
  plain_text TEXT,
  passphrase TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(plain_text, passphrase),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トークン復号化関数
CREATE OR REPLACE FUNCTION decrypt_token(
  encrypted_text TEXT,
  passphrase TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    passphrase
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の権限設定
GRANT EXECUTE ON FUNCTION encrypt_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_token(TEXT, TEXT) TO authenticated;

-- ====================================================================
-- マイグレーション 00031: tenant_applicationsテーブル拡張
-- ====================================================================

ALTER TABLE tenant_applications
ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE tenant_applications
ADD COLUMN IF NOT EXISTS fiscal_year_end_month INTEGER
CHECK (fiscal_year_end_month BETWEEN 1 AND 12);

ALTER TABLE tenant_applications
ADD COLUMN IF NOT EXISTS first_fiscal_year INTEGER;

COMMENT ON COLUMN tenant_applications.password IS '承認後のアカウント作成用パスワード';
COMMENT ON COLUMN tenant_applications.fiscal_year_end_month IS '決算月（1-12）';
COMMENT ON COLUMN tenant_applications.first_fiscal_year IS '会計年度';

COMMIT;

-- ====================================================================
-- マイグレーション完了
-- ====================================================================

-- 確認クエリ
SELECT
  'bank_api_providers' as table_name,
  COUNT(*) as record_count
FROM bank_api_providers
UNION ALL
SELECT
  'bank_api_connections',
  COUNT(*)
FROM bank_api_connections
UNION ALL
SELECT
  'bank_api_accounts',
  COUNT(*)
FROM bank_api_accounts
UNION ALL
SELECT
  'bank_api_transactions',
  COUNT(*)
FROM bank_api_transactions;
