/**
 * Bank API Transactions Endpoint
 *
 * Lists bank transactions synced from Moneytree
 * GET /api/bank-api/transactions?account_id=xxx&matched=false&from=2025-01-01&to=2025-01-31
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')
    const matched = searchParams.get('matched')
    const direction = searchParams.get('direction')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    // Build query
    let query = supabase
      .from('bank_api_transactions')
      .select(`
        *,
        bank_api_accounts (
          account_name,
          bank_name,
          account_number
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('txn_date', { ascending: false })
      .limit(limit)

    // Apply filters
    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (matched !== null) {
      query = query.eq('matched', matched === 'true')
    }

    if (direction) {
      query = query.eq('direction', direction)
    }

    if (from) {
      query = query.gte('txn_date', from)
    }

    if (to) {
      query = query.lte('txn_date', to)
    }

    // Execute query
    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Failed to fetch transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transactions: transactions || [],
      count: transactions?.length || 0
    })
  } catch (error) {
    console.error('Bank API transactions error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
