/**
 * Bank API OAuth Callback Endpoint
 *
 * Handles OAuth callback from bank API providers (Moneytree)
 * GET /api/bank-api/callback/[provider]?code=xxx&state=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMoneytreeClient } from '@/lib/bank/moneytree'
import { encryptTokenData } from '@/lib/crypto/tokens'

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    // Feature flag check
    if (process.env.FEATURE_BANK_API !== '1') {
      return NextResponse.redirect(
        new URL('/dashboard?error=feature_disabled', request.url)
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/bank-api/connections?error=${error}`, request.url)
      )
    }

    // Validate code and state
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/bank-api/connections?error=missing_params', request.url)
      )
    }

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=unauthorized', request.url)
      )
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.redirect(
        new URL('/dashboard?error=tenant_not_found', request.url)
      )
    }

    const provider = params.provider.toLowerCase()

    // Only Moneytree supported for now
    if (provider !== 'moneytree') {
      return NextResponse.redirect(
        new URL('/bank-api/connections?error=unsupported_provider', request.url)
      )
    }

    // Get provider from database
    const { data: providerData, error: providerError } = await supabase
      .from('bank_api_providers')
      .select('id')
      .eq('name', provider)
      .single()

    if (providerError || !providerData) {
      return NextResponse.redirect(
        new URL('/bank-api/connections?error=provider_not_found', request.url)
      )
    }

    // Get connection record and validate state
    const { data: connection, error: connectionError } = await supabase
      .from('bank_api_connections')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('provider_id', providerData.id)
      .single()

    if (connectionError || !connection) {
      return NextResponse.redirect(
        new URL('/bank-api/connections?error=connection_not_found', request.url)
      )
    }

    // Validate state (CSRF protection)
    if (connection.last_state !== state) {
      console.error('State mismatch - possible CSRF attack')
      return NextResponse.redirect(
        new URL('/bank-api/connections?error=state_mismatch', request.url)
      )
    }

    // Exchange code for tokens
    const client = createMoneytreeClient()
    const tokenResponse = await client.exchangeCodeForToken(code)

    // Encrypt tokens
    const encryptedData = await encryptTokenData(supabase, {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope
    })

    // Update connection with encrypted tokens
    const { error: updateError } = await supabase
      .from('bank_api_connections')
      .update({
        access_token_enc: encryptedData.access_token_enc,
        refresh_token_enc: encryptedData.refresh_token_enc,
        expires_at: encryptedData.expires_at,
        scope: encryptedData.scope,
        status: 'active',
        error_message: null,
        last_state: null, // Clear state after use
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    if (updateError) {
      console.error('Failed to update connection:', updateError)
      return NextResponse.redirect(
        new URL('/bank-api/connections?error=update_failed', request.url)
      )
    }

    // Log activity
    await supabase.rpc('log_bank_api_activity', {
      p_tenant_id: profile.tenant_id,
      p_user_id: user.id,
      p_action: 'oauth_connected',
      p_resource_type: 'bank_api_connection',
      p_resource_id: connection.id,
      p_details: {
        provider: provider,
        scope: tokenResponse.scope
      }
    })

    // Redirect to connections page with success
    return NextResponse.redirect(
      new URL('/bank-api/connections?success=connected', request.url)
    )
  } catch (error) {
    console.error('Bank API callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/bank-api/connections?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'unknown_error'
        )}`,
        request.url
      )
    )
  }
}
