import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/periods/lock
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
  }

  const body = await request.json()
  const { period_id } = body

  if (!period_id) {
    return NextResponse.json(
      { error: 'period_id が必要です' },
      { status: 400 }
    )
  }

  try {
    // 会計期間を取得
    const { data: period, error: periodError } = await supabase
      .from('accounting_periods')
      .select('id, name, status')
      .eq('id', period_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (periodError || !period) {
      return NextResponse.json({ error: '会計期間が見つかりません' }, { status: 404 })
    }

    // すでにロックされているかチェック
    if (period.status === 'locked') {
      return NextResponse.json(
        { error: 'この期間はすでにロックされています' },
        { status: 400 }
      )
    }

    // 締め処理が完了していない場合は警告
    if (period.status !== 'closed') {
      return NextResponse.json(
        { error: '期間を締めていない状態でロックはできません。先に締め処理を行ってください。' },
        { status: 400 }
      )
    }

    // 期間ステータスを 'locked' に更新
    const { error: updateError } = await supabase
      .from('accounting_periods')
      .update({ status: 'locked' })
      .eq('id', period_id)
      .eq('tenant_id', profile.tenant_id)

    if (updateError) {
      return NextResponse.json(
        { error: '期間のロックに失敗しました: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${period.name} を正常にロックしました`,
    })
  } catch (error: any) {
    console.error('Period Lock Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
