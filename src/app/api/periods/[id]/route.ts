import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdatePeriodInput } from '@/types/accounting'

// PUT /api/periods/[id] - 会計期間更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const id = params.id
  const body: UpdatePeriodInput = await request.json()

  // 期間を取得して状態を確認
  const { data: existingPeriod } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!existingPeriod) {
    return NextResponse.json({ error: '会計期間が見つかりません' }, { status: 404 })
  }

  // ロックされた期間は編集不可
  if (existingPeriod.status === 'locked') {
    return NextResponse.json({ error: 'ロックされた期間は編集できません' }, { status: 400 })
  }

  // 更新データを準備
  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.start_date !== undefined) updateData.start_date = body.start_date
  if (body.end_date !== undefined) updateData.end_date = body.end_date
  if (body.fiscal_year !== undefined) updateData.fiscal_year = body.fiscal_year
  if (body.description !== undefined) updateData.description = body.description

  // 日付の妥当性チェック
  const startDate = body.start_date || existingPeriod.start_date
  const endDate = body.end_date || existingPeriod.end_date

  if (startDate > endDate) {
    return NextResponse.json({ error: '開始日は終了日より前である必要があります' }, { status: 400 })
  }

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

// DELETE /api/periods/[id] - 会計期間削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const id = params.id

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
  const { error } = await supabase
    .from('accounting_periods')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
