import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateExpenseItemInput, UpdateExpenseItemInput } from '@/types/expense'

// GET /api/expenses/items - 経費明細一覧を取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // プロフィールからtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const claimId = searchParams.get('claimId')

    let query = supabase
      .from('expense_items')
      .select(`
        *,
        category:expense_categories(id, name),
        account:accounts(id, code, name),
        tax_rate:tax_rates(id, name, rate)
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('spent_on', { ascending: false })

    // 申請IDで絞り込み
    if (claimId) {
      query = query.eq('claim_id', claimId)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('Items fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST /api/expenses/items - 経費明細を作成
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // プロフィールからtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  try {
    const body: CreateExpenseItemInput = await request.json()

    // バリデーション
    if (!body.claim_id || !body.spent_on || !body.merchant || body.amount === undefined) {
      return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })
    }

    // 明細を作成
    const { data: item, error } = await supabase
      .from('expense_items')
      .insert({
        tenant_id: profile.tenant_id,
        claim_id: body.claim_id,
        spent_on: body.spent_on,
        merchant: body.merchant,
        description: body.description || null,
        amount: body.amount,
        tax_rate_id: body.tax_rate_id || null,
        account_id: body.account_id || null,
        category_id: body.category_id || null,
        attachment_url: body.attachment_url || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Item creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 申請の合計金額を更新
    await updateClaimTotalAmount(supabase, body.claim_id, profile.tenant_id)

    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PATCH /api/expenses/items - 経費明細を更新
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // プロフィールからtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ error: '明細IDが必要です' }, { status: 400 })
    }

    const body: UpdateExpenseItemInput = await request.json()

    // 既存の明細を取得（claim_idを取得するため）
    const { data: existingItem } = await supabase
      .from('expense_items')
      .select('claim_id')
      .eq('id', itemId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!existingItem) {
      return NextResponse.json({ error: '明細が見つかりません' }, { status: 404 })
    }

    // 更新データを準備
    const updateData: any = {}
    if (body.spent_on !== undefined) updateData.spent_on = body.spent_on
    if (body.merchant !== undefined) updateData.merchant = body.merchant
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.tax_rate_id !== undefined) updateData.tax_rate_id = body.tax_rate_id
    if (body.account_id !== undefined) updateData.account_id = body.account_id
    if (body.category_id !== undefined) updateData.category_id = body.category_id
    if (body.attachment_url !== undefined) updateData.attachment_url = body.attachment_url

    // 明細を更新
    const { data: item, error } = await supabase
      .from('expense_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Item update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 申請の合計金額を更新
    await updateClaimTotalAmount(supabase, existingItem.claim_id, profile.tenant_id)

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/expenses/items - 経費明細を削除
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // プロフィールからtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ error: '明細IDが必要です' }, { status: 400 })
    }

    // 既存の明細を取得（claim_idを取得するため）
    const { data: existingItem } = await supabase
      .from('expense_items')
      .select('claim_id')
      .eq('id', itemId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!existingItem) {
      return NextResponse.json({ error: '明細が見つかりません' }, { status: 404 })
    }

    // 明細を削除
    const { error } = await supabase
      .from('expense_items')
      .delete()
      .eq('id', itemId)
      .eq('tenant_id', profile.tenant_id)

    if (error) {
      console.error('Item deletion error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 申請の合計金額を更新
    await updateClaimTotalAmount(supabase, existingItem.claim_id, profile.tenant_id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 申請の合計金額を更新するヘルパー関数
async function updateClaimTotalAmount(supabase: any, claimId: string, tenantId: string) {
  // 明細の合計金額を計算
  const { data: items } = await supabase
    .from('expense_items')
    .select('amount')
    .eq('claim_id', claimId)
    .eq('tenant_id', tenantId)

  const totalAmount = items?.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0) || 0

  // 申請の合計金額を更新
  await supabase
    .from('expense_claims')
    .update({ total_amount: totalAmount })
    .eq('id', claimId)
    .eq('tenant_id', tenantId)
}
