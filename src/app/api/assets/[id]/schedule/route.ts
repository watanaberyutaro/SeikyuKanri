import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDepreciationSchedule } from '@/lib/fixed-assets/depreciation'

// POST /api/assets/[id]/schedule - 償却スケジュール生成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: assetId } = await params

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

  const body = await request.json()
  const { start_date, end_date } = body

  if (!start_date || !end_date) {
    return NextResponse.json(
      { error: '償却開始日と終了日を指定してください' },
      { status: 400 }
    )
  }

  // 固定資産を取得
  const { data: asset, error: assetError } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('id', assetId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (assetError || !asset) {
    return NextResponse.json({ error: '固定資産が見つかりません' }, { status: 404 })
  }

  // 除却済みの資産はスケジュール生成不可
  if (asset.status === 'disposed') {
    return NextResponse.json(
      { error: '除却済みの資産はスケジュール生成できません' },
      { status: 400 }
    )
  }

  try {
    // 償却スケジュールを計算
    const schedule = generateDepreciationSchedule(
      asset.acquisition_cost,
      asset.salvage_value,
      asset.useful_life_months,
      asset.depreciation_method,
      new Date(start_date),
      new Date(end_date)
    )

    if (schedule.length === 0) {
      return NextResponse.json(
        { error: '償却スケジュールを生成できませんでした' },
        { status: 400 }
      )
    }

    // 既存のスケジュールを削除（未起票のもののみ）
    const { error: deleteError } = await supabase
      .from('depreciation_schedules')
      .delete()
      .eq('asset_id', assetId)
      .eq('tenant_id', profile.tenant_id)
      .eq('posted', false)

    if (deleteError) {
      console.error('既存スケジュール削除エラー:', deleteError)
    }

    // 会計期間を取得してマッピング
    const { data: periods } = await supabase
      .from('accounting_periods')
      .select('id, start_date, end_date')
      .eq('tenant_id', profile.tenant_id)
      .order('start_date', { ascending: true })

    // スケジュールをDBに保存
    const scheduleData = schedule.map((item) => {
      // 該当する会計期間を検索
      const scheduleDate = new Date(item.fiscal_year, item.fiscal_month - 1, 1)
      const period = periods?.find((p) => {
        const pStart = new Date(p.start_date)
        const pEnd = new Date(p.end_date)
        return scheduleDate >= pStart && scheduleDate <= pEnd
      })

      return {
        tenant_id: profile.tenant_id,
        user_id: user.id,
        asset_id: assetId,
        period_id: period?.id || null,
        fiscal_year: item.fiscal_year,
        fiscal_month: item.fiscal_month,
        depreciation_amount: item.depreciation_amount,
        accumulated_depreciation: item.accumulated_depreciation,
        book_value: item.book_value,
        posted: false,
        created_by: user.id,
      }
    })

    const { data: savedSchedules, error: insertError } = await supabase
      .from('depreciation_schedules')
      .insert(scheduleData)
      .select()

    if (insertError) {
      console.error('スケジュール保存エラー:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: '償却スケジュールを生成しました',
      schedules: savedSchedules,
      count: savedSchedules.length,
    })
  } catch (error: any) {
    console.error('スケジュール生成エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/assets/[id]/schedule - 償却スケジュール取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: assetId } = await params

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

  // 償却スケジュールを取得
  const { data: schedules, error } = await supabase
    .from('depreciation_schedules')
    .select('*, period:accounting_periods(id, name)')
    .eq('asset_id', assetId)
    .eq('tenant_id', profile.tenant_id)
    .order('fiscal_year', { ascending: true })
    .order('fiscal_month', { ascending: true })

  if (error) {
    console.error('スケジュール取得エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ schedules })
}
