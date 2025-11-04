import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreatePeriodInput, UpdatePeriodInput } from '@/types/accounting'

// GET /api/periods - 会計期間一覧取得
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
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 400 })
  }

  // クエリパラメータ
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const fiscalYear = searchParams.get('fiscal_year')

  // 会計期間を取得
  let query = supabase
    .from('accounting_periods')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('start_date', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (fiscalYear) {
    query = query.eq('fiscal_year', parseInt(fiscalYear))
  }

  const { data: periods, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ periods })
}

// POST /api/periods - 会計期間登録
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
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 400 })
  }

  const body: CreatePeriodInput = await request.json()

  // バリデーション
  if (!body.name || !body.start_date || !body.end_date) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  if (body.start_date > body.end_date) {
    return NextResponse.json({ error: '開始日は終了日より前である必要があります' }, { status: 400 })
  }

  // 期間の重複チェック
  const { data: overlapping } = await supabase
    .from('accounting_periods')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .or(
      `and(start_date.lte.${body.end_date},end_date.gte.${body.start_date})`
    )

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json({ error: '期間が重複しています' }, { status: 400 })
  }

  // 会計期間を作成
  const { data: period, error } = await supabase
    .from('accounting_periods')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      status: body.status || 'open',
      fiscal_year: body.fiscal_year || null,
      description: body.description || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ period }, { status: 201 })
}

// PATCH /api/periods - 会計期間更新
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
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 400 })
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const action = searchParams.get('action') // 'close' or 'lock' for special operations

  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  const body: UpdatePeriodInput = await request.json()

  // アクション処理
  if (action === 'close') {
    // 期間を締める
    const { data: period, error } = await supabase
      .from('accounting_periods')
      .update({ status: 'closed' })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ period })
  }

  if (action === 'lock') {
    // 期間をロック
    const { data: period, error } = await supabase
      .from('accounting_periods')
      .update({ status: 'locked' })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ period })
  }

  // 通常の更新
  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.start_date !== undefined) updateData.start_date = body.start_date
  if (body.end_date !== undefined) updateData.end_date = body.end_date
  if (body.status !== undefined) updateData.status = body.status
  if (body.fiscal_year !== undefined) updateData.fiscal_year = body.fiscal_year
  if (body.description !== undefined) updateData.description = body.description

  // 会計期間を更新
  const { data: period, error } = await supabase
    .from('accounting_periods')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ period })
}

// DELETE /api/periods - 会計期間削除
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  // 仕訳での使用チェック
  const { data: usedInJournals } = await supabase
    .from('journals')
    .select('id')
    .eq('period_id', id)
    .limit(1)

  if (usedInJournals && usedInJournals.length > 0) {
    return NextResponse.json(
      { error: '仕訳が存在するため削除できません' },
      { status: 400 }
    )
  }

  // 会計期間を削除
  const { error } = await supabase.from('accounting_periods').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
