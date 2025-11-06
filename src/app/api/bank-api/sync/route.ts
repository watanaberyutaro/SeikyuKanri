/**
 * Bank API Sync Endpoint
 *
 * Syncs bank accounts and transactions from Moneytree API
 * POST /api/bank-api/sync
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createMoneytreeClient,
  getActiveConnection,
  refreshConnectionToken
} from '@/lib/bank/moneytree'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
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

    // Get provider ID for Moneytree
    const { data: provider } = await supabase
      .from('bank_api_providers')
      .select('id')
      .eq('name', 'moneytree')
      .single()

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    // Get active connection
    const connection = await getActiveConnection(
      supabase,
      profile.tenant_id,
      provider.id
    )

    if (!connection) {
      return NextResponse.json(
        { error: 'No active connection found. Please connect to Moneytree first.' },
        { status: 404 }
      )
    }

    // Create sync job record
    const { data: syncJob, error: syncJobError } = await supabase
      .from('bank_api_sync_jobs')
      .insert({
        tenant_id: profile.tenant_id,
        connection_id: connection.id,
        status: 'running',
        sync_from: null,
        sync_to: null
      })
      .select('id')
      .single()

    if (syncJobError || !syncJob) {
      return NextResponse.json(
        { error: 'Failed to create sync job' },
        { status: 500 }
      )
    }

    const client = createMoneytreeClient()

    try {
      // Get or refresh access token
      const accessToken = await refreshConnectionToken(supabase, connection, client)

      // 1. Fetch and sync accounts
      const accounts = await client.getAccounts(accessToken)

      let accountsSynced = 0
      for (const account of accounts) {
        const { error: accountError } = await supabase
          .from('bank_api_accounts')
          .upsert(
            {
              tenant_id: profile.tenant_id,
              user_id: user.id,
              connection_id: connection.id,
              external_account_id: account.id,
              account_name: account.name,
              account_number: account.account_number,
              bank_name: account.bank_name,
              branch_name: account.branch_name,
              account_type: account.account_type,
              currency: account.currency,
              current_balance: account.current_balance,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'connection_id,external_account_id'
            }
          )

        if (!accountError) {
          accountsSynced++
        }
      }

      // 2. Fetch and sync transactions for each account
      let transactionsFetched = 0
      let transactionsInserted = 0
      let transactionsDuplicated = 0

      // Get date range for sync (last 90 days)
      const toDate = new Date()
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 90)

      const fromStr = fromDate.toISOString().split('T')[0]
      const toStr = toDate.toISOString().split('T')[0]

      for (const account of accounts) {
        // Get our internal account ID
        const { data: internalAccount } = await supabase
          .from('bank_api_accounts')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('external_account_id', account.id)
          .single()

        if (!internalAccount) continue

        // Fetch transactions
        const transactions = await client.getTransactions(accessToken, account.id, {
          from: fromStr,
          to: toStr,
          limit: 500
        })

        transactionsFetched += transactions.length

        // Insert transactions (skip duplicates)
        for (const txn of transactions) {
          // Generate hash for duplicate detection
          const hash = createHash('sha256')
            .update(
              `${internalAccount.id}|${txn.date}|${txn.amount}|${txn.description.replace(/\s+/g, '')}|${txn.is_income ? 'in' : 'out'}`
            )
            .digest('hex')

          const { error: txnError } = await supabase
            .from('bank_api_transactions')
            .insert({
              tenant_id: profile.tenant_id,
              user_id: user.id,
              account_id: internalAccount.id,
              txn_date: txn.date,
              amount: Math.abs(txn.amount),
              direction: txn.is_income ? 'in' : 'out',
              description: txn.description,
              external_txn_id: txn.id,
              hash: hash,
              raw_data: txn,
              matched: false
            })

          if (txnError) {
            if (txnError.code === '23505') {
              // Unique constraint violation - duplicate
              transactionsDuplicated++
            }
          } else {
            transactionsInserted++
          }
        }
      }

      // Update sync job as completed
      await supabase
        .from('bank_api_sync_jobs')
        .update({
          status: 'completed',
          sync_from: fromStr,
          sync_to: toStr,
          transactions_fetched: transactionsFetched,
          transactions_inserted: transactionsInserted,
          transactions_duplicated: transactionsDuplicated,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncJob.id)

      // Log activity
      await supabase.rpc('log_bank_api_activity', {
        p_tenant_id: profile.tenant_id,
        p_user_id: user.id,
        p_action: 'sync_completed',
        p_resource_type: 'bank_api_sync_job',
        p_resource_id: syncJob.id,
        p_details: {
          accounts_synced: accountsSynced,
          transactions_fetched: transactionsFetched,
          transactions_inserted: transactionsInserted,
          transactions_duplicated: transactionsDuplicated
        }
      })

      return NextResponse.json({
        success: true,
        job_id: syncJob.id,
        accounts_synced: accountsSynced,
        transactions_fetched: transactionsFetched,
        transactions_inserted: transactionsInserted,
        transactions_duplicated: transactionsDuplicated
      })
    } catch (error) {
      // Update sync job as failed
      await supabase
        .from('bank_api_sync_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', syncJob.id)

      throw error
    }
  } catch (error) {
    console.error('Bank API sync error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
