/**
 * Moneytree API Client
 *
 * OAuth 2.0 + Bank Account/Transaction API
 * https://docs.getmoneytree.com/
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken } from '@/lib/crypto/tokens'

// ============================================================================
// Types
// ============================================================================

export interface MoneytreeConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizeUrl: string
  tokenUrl: string
  apiBaseUrl: string
}

export interface MoneytreeTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope?: string
}

export interface MoneytreeAccount {
  id: string
  name: string
  account_number?: string
  bank_name?: string
  branch_name?: string
  account_type?: 'checking' | 'savings' | 'other'
  currency: string
  current_balance?: number
  updated_at: string
}

export interface MoneytreeTransaction {
  id: string
  account_id: string
  date: string // YYYY-MM-DD
  amount: number
  description: string
  category?: string
  is_income: boolean
  balance?: number
  created_at: string
}

// ============================================================================
// Moneytree API Client Class
// ============================================================================

export class MoneytreeClient {
  private config: MoneytreeConfig

  constructor(config: MoneytreeConfig) {
    this.config = config
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string, scopes: string[] = ['accounts_read', 'transactions_read']): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state
    })

    return `${this.config.authorizeUrl}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<MoneytreeTokenResponse> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${error}`)
    }

    return response.json()
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<MoneytreeTokenResponse> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${error}`)
    }

    return response.json()
  }

  /**
   * Fetch bank accounts
   */
  async getAccounts(accessToken: string): Promise<MoneytreeAccount[]> {
    const response = await fetch(`${this.config.apiBaseUrl}/v1/accounts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch accounts: ${response.status} ${error}`)
    }

    const data = await response.json()

    // Moneytree API response structure may vary - adjust based on actual API
    return (data.accounts || data || []).map((acc: any) => ({
      id: acc.id,
      name: acc.name || acc.institution_name || 'Unknown',
      account_number: acc.account_number,
      bank_name: acc.institution_name,
      branch_name: acc.branch_name,
      account_type: this.normalizeAccountType(acc.account_type || acc.type),
      currency: acc.currency || 'JPY',
      current_balance: acc.current_balance ? parseFloat(acc.current_balance) : undefined,
      updated_at: acc.updated_at || new Date().toISOString()
    }))
  }

  /**
   * Fetch transactions for an account
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    options?: {
      from?: string // YYYY-MM-DD
      to?: string // YYYY-MM-DD
      limit?: number
    }
  ): Promise<MoneytreeTransaction[]> {
    const params = new URLSearchParams()
    if (options?.from) params.set('from', options.from)
    if (options?.to) params.set('to', options.to)
    if (options?.limit) params.set('limit', options.limit.toString())

    const url = `${this.config.apiBaseUrl}/v1/accounts/${accountId}/transactions?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch transactions: ${response.status} ${error}`)
    }

    const data = await response.json()

    // Moneytree API response structure may vary - adjust based on actual API
    return (data.transactions || data || []).map((txn: any) => ({
      id: txn.id,
      account_id: accountId,
      date: txn.date || txn.transaction_date,
      amount: parseFloat(txn.amount),
      description: txn.description || txn.memo || '',
      category: txn.category,
      is_income: parseFloat(txn.amount) > 0,
      balance: txn.balance ? parseFloat(txn.balance) : undefined,
      created_at: txn.created_at || new Date().toISOString()
    }))
  }

  /**
   * Normalize account type
   */
  private normalizeAccountType(type: string): 'checking' | 'savings' | 'other' {
    const normalized = type?.toLowerCase()
    if (normalized === 'checking' || normalized === '普通預金') return 'checking'
    if (normalized === 'savings' || normalized === '貯蓄預金') return 'savings'
    return 'other'
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create Moneytree client from environment variables
 */
export function createMoneytreeClient(): MoneytreeClient {
  const clientId = process.env.MONEYTREE_CLIENT_ID
  const clientSecret = process.env.MONEYTREE_CLIENT_SECRET
  const redirectUri = process.env.MONEYTREE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Moneytree credentials not configured. Check MONEYTREE_CLIENT_ID, MONEYTREE_CLIENT_SECRET, and MONEYTREE_REDIRECT_URI')
  }

  return new MoneytreeClient({
    clientId,
    clientSecret,
    redirectUri,
    authorizeUrl: 'https://myaccount.getmoneytree.com/oauth/authorize',
    tokenUrl: 'https://myaccount.getmoneytree.com/oauth/token',
    apiBaseUrl: 'https://api.getmoneytree.com'
  })
}

/**
 * Get active connection for tenant
 */
export async function getActiveConnection(
  supabase: SupabaseClient,
  tenantId: string,
  providerId: string
) {
  const { data, error } = await supabase
    .from('bank_api_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider_id', providerId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Get decrypted access token for connection
 */
export async function getAccessToken(
  supabase: SupabaseClient,
  connection: any
): Promise<string> {
  const decrypted = await decryptToken(supabase, connection.access_token_enc)
  return decrypted
}

/**
 * Refresh and update connection token if expired
 */
export async function refreshConnectionToken(
  supabase: SupabaseClient,
  connection: any,
  client: MoneytreeClient
): Promise<string> {
  // Check if expired
  const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null
  const now = new Date()
  const bufferMs = 5 * 60 * 1000 // 5 minute buffer

  if (!expiresAt || expiresAt.getTime() - now.getTime() > bufferMs) {
    // Not expired, return current token
    return getAccessToken(supabase, connection)
  }

  // Token expired - refresh it
  if (!connection.refresh_token_enc) {
    throw new Error('No refresh token available')
  }

  const refreshToken = await decryptToken(supabase, connection.refresh_token_enc)
  const tokenResponse = await client.refreshToken(refreshToken)

  // Encrypt new tokens
  const newAccessTokenEnc = await encryptToken(supabase, tokenResponse.access_token)
  let newRefreshTokenEnc = connection.refresh_token_enc

  if (tokenResponse.refresh_token) {
    newRefreshTokenEnc = await encryptToken(supabase, tokenResponse.refresh_token)
  }

  let newExpiresAt = connection.expires_at
  if (tokenResponse.expires_in) {
    const expiresDate = new Date()
    expiresDate.setSeconds(expiresDate.getSeconds() + tokenResponse.expires_in)
    newExpiresAt = expiresDate.toISOString()
  }

  // Update connection
  await supabase
    .from('bank_api_connections')
    .update({
      access_token_enc: newAccessTokenEnc,
      refresh_token_enc: newRefreshTokenEnc,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', connection.id)

  return tokenResponse.access_token
}
