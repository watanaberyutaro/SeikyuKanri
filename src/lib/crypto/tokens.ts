/**
 * Token Encryption/Decryption Utilities
 *
 * OAuthトークンの暗号化・復号化
 * Supabase pgcrypto extension (pgp_sym_encrypt/decrypt) を使用
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * アクセストークンを暗号化
 * @param supabase Supabaseクライアント
 * @param token 平文トークン
 * @returns 暗号化されたトークン
 */
export async function encryptToken(
  supabase: SupabaseClient,
  token: string
): Promise<string> {
  const encryptionKey = process.env.BANK_ENCRYPTION_KEY

  if (!encryptionKey) {
    throw new Error('BANK_ENCRYPTION_KEY is not configured')
  }

  // Supabase関数でpgcryptoを使用して暗号化
  const { data, error } = await supabase.rpc('encrypt_token', {
    plain_text: token,
    passphrase: encryptionKey
  })

  if (error) {
    throw new Error(`Token encryption failed: ${error.message}`)
  }

  return data
}

/**
 * アクセストークンを復号化
 * @param supabase Supabaseクライアント
 * @param encryptedToken 暗号化されたトークン
 * @returns 平文トークン
 */
export async function decryptToken(
  supabase: SupabaseClient,
  encryptedToken: string
): Promise<string> {
  const encryptionKey = process.env.BANK_ENCRYPTION_KEY

  if (!encryptionKey) {
    throw new Error('BANK_ENCRYPTION_KEY is not configured')
  }

  // Supabase関数でpgcryptoを使用して復号化
  const { data, error } = await supabase.rpc('decrypt_token', {
    encrypted_text: encryptedToken,
    passphrase: encryptionKey
  })

  if (error) {
    throw new Error(`Token decryption failed: ${error.message}`)
  }

  return data
}

/**
 * トークンデータを安全に保存用に変換
 */
export interface TokenData {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

/**
 * 暗号化されたトークンデータ
 */
export interface EncryptedTokenData {
  access_token_enc: string
  refresh_token_enc: string | null
  expires_at: string | null
  scope: string | null
}

/**
 * トークンデータを暗号化して保存形式に変換
 */
export async function encryptTokenData(
  supabase: SupabaseClient,
  tokenData: TokenData
): Promise<EncryptedTokenData> {
  const access_token_enc = await encryptToken(supabase, tokenData.access_token)

  let refresh_token_enc: string | null = null
  if (tokenData.refresh_token) {
    refresh_token_enc = await encryptToken(supabase, tokenData.refresh_token)
  }

  let expires_at: string | null = null
  if (tokenData.expires_in) {
    const expiresDate = new Date()
    expiresDate.setSeconds(expiresDate.getSeconds() + tokenData.expires_in)
    expires_at = expiresDate.toISOString()
  }

  return {
    access_token_enc,
    refresh_token_enc,
    expires_at,
    scope: tokenData.scope || null
  }
}

/**
 * 暗号化されたトークンデータを復号化
 */
export async function decryptTokenData(
  supabase: SupabaseClient,
  encryptedData: EncryptedTokenData
): Promise<TokenData> {
  const access_token = await decryptToken(supabase, encryptedData.access_token_enc)

  let refresh_token: string | undefined
  if (encryptedData.refresh_token_enc) {
    refresh_token = await decryptToken(supabase, encryptedData.refresh_token_enc)
  }

  return {
    access_token,
    refresh_token,
    scope: encryptedData.scope || undefined
  }
}

/**
 * トークンの有効期限をチェック
 */
export function isTokenExpired(expires_at: string | null): boolean {
  if (!expires_at) return false

  const expiresDate = new Date(expires_at)
  const now = new Date()

  // 5分のバッファを持たせる
  const bufferMs = 5 * 60 * 1000
  return expiresDate.getTime() - now.getTime() < bufferMs
}
