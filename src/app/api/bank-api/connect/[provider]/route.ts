/**
 * Bank API OAuth Connect Endpoint
 *
 * Initiates OAuth flow for bank API providers (Moneytree)
 * GET /api/bank-api/connect/[provider]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMoneytreeClient } from '@/lib/bank/moneytree'
import { randomBytes } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    // Await params (Next.js 15 requirement)
    const { provider: providerParam } = await params

    // Feature flag check
    if (process.env.FEATURE_BANK_API !== '1') {
      return NextResponse.json(
        { error: 'Bank API feature is not enabled' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const provider = providerParam.toLowerCase()

    // Only Moneytree supported for now
    if (provider !== 'moneytree') {
      return NextResponse.json(
        { error: 'Unsupported provider' },
        { status: 400 }
      )
    }

    // Get provider from database
    const { data: providerData, error: providerError } = await supabase
      .from('bank_api_providers')
      .select('id')
      .eq('name', provider)
      .single()

    if (providerError || !providerData) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex')

    // Create or update connection record with state
    const { error: upsertError } = await supabase
      .from('bank_api_connections')
      .upsert(
        {
          tenant_id: profile.tenant_id,
          user_id: user.id,
          provider_id: providerData.id,
          last_state: state,
          status: 'active', // Will be updated after successful OAuth
          // Dummy encrypted tokens (will be replaced on callback)
          access_token_enc: 'pending',
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'tenant_id,provider_id'
        }
      )

    if (upsertError) {
      console.error('Failed to create connection record:', upsertError)
      return NextResponse.json(
        { error: 'Failed to initialize connection' },
        { status: 500 }
      )
    }

    // Create Moneytree client and generate authorization URL
    const client = createMoneytreeClient()
    const authUrl = client.getAuthorizationUrl(state)

    // Redirect to Moneytree OAuth page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Bank API connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
