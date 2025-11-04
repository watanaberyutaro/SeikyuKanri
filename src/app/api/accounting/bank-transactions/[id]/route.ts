import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    // 取引を取得
    const { data: transaction, error } = await supabase
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
          account_type,
          account_id
        ),
        journal:journals (
          id,
          journal_date,
          memo
        )
      `
      )
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (error) {
      console.error('Failed to fetch transaction:', error)
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    const { is_reconciled, journal_id, notes } = body

    // 更新データを準備
    const updateData: any = {}
    if (is_reconciled !== undefined) updateData.is_reconciled = is_reconciled
    if (journal_id !== undefined) updateData.journal_id = journal_id
    if (notes !== undefined) updateData.notes = notes

    // 取引を更新
    const { data: transaction, error } = await supabase
      .from('bank_transactions')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update transaction:', error)
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
