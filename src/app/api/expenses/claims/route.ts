import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateExpenseClaimInput, UpdateExpenseClaimInput } from '@/types/expense'

// GET /api/expenses/claims - 経費申請一覧を取得
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
    // URLパラメータから絞り込み条件を取得
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const myOnly = searchParams.get('myOnly') === 'true'

    let query = supabase
      .from('expense_claims')
      .select(`
        *,
        items:expense_items(
          id,
          spent_on,
          merchant,
          amount,
          description,
          attachment_url,
          category:expense_categories(id, name),
          account:accounts(id, code, name),
          tax_rate:tax_rates(id, name, rate)
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    // ステータス絞り込み
    if (status) {
      query = query.eq('status', status)
    }

    // 自分の申請のみ
    if (myOnly) {
      query = query.eq('employee_user_id', user.id)
    }

    const { data: claims, error } = await query

    if (error) {
      console.error('Claims fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ claims: claims || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST /api/expenses/claims - 経費申請を作成
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
    const body: CreateExpenseClaimInput = await request.json()

    // 申請を作成（下書きステータス）
    const { data: claim, error } = await supabase
      .from('expense_claims')
      .insert({
        tenant_id: profile.tenant_id,
        employee_user_id: user.id,
        status: 'draft',
        notes: body.notes || null,
        total_amount: 0, // 初期値、明細追加時に更新
      })
      .select()
      .single()

    if (error) {
      console.error('Claim creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ claim }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PATCH /api/expenses/claims - 経費申請を更新
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
    const claimId = searchParams.get('id')

    if (!claimId) {
      return NextResponse.json({ error: '申請IDが必要です' }, { status: 400 })
    }

    const body: UpdateExpenseClaimInput = await request.json()

    // 更新データを準備
    const updateData: any = {}
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.status !== undefined) updateData.status = body.status

    // 申請を更新
    const { data: claim, error } = await supabase
      .from('expense_claims')
      .update(updateData)
      .eq('id', claimId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Claim update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ claim })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
