import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // テナントIDを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // クエリパラメータを取得
  const searchParams = request.nextUrl.searchParams
  const reconciled = searchParams.get('reconciled')
  const bankAccountId = searchParams.get('bank_account_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // 取引を取得
    let query = supabase
      .from('bank_transactions')
      .select(
        `
        id,
        transaction_date,
        description,
        amount,
        balance,
        transaction_type,
        is_reconciled,
        notes,
        journal_id,
        bank_account:bank_accounts (
          id,
          name,
          account_type
        ),
        journal:journals (
          id,
          journal_date,
          memo
        )
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    // 仕訳済み/未仕訳でフィルタ
    if (reconciled === 'true') {
      query = query.eq('is_reconciled', true)
    } else if (reconciled === 'false') {
      query = query.eq('is_reconciled', false)
    }

    // 口座でフィルタ
    if (bankAccountId) {
      query = query.eq('bank_account_id', bankAccountId)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: transactions, error } = await query

    if (error) {
      console.error('Failed to fetch bank transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // カウントを取得
    let countQuery = supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)

    if (reconciled === 'true') {
      countQuery = countQuery.eq('is_reconciled', true)
    } else if (reconciled === 'false') {
      countQuery = countQuery.eq('is_reconciled', false)
    }

    if (bankAccountId) {
      countQuery = countQuery.eq('bank_account_id', bankAccountId)
    }

    const { count } = await countQuery

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching bank transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // テナントIDを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const {
      bank_account_id,
      transaction_date,
      description,
      amount,
      balance,
      transaction_type,
      notes,
    } = body

    // バリデーション
    if (!bank_account_id || !transaction_date || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 取引を作成
    const { data: transaction, error } = await supabase
      .from('bank_transactions')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        bank_account_id,
        transaction_date,
        description,
        amount,
        balance: balance || null,
        transaction_type: transaction_type || null,
        notes: notes || null,
        is_reconciled: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create transaction:', error)
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
