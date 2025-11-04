import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/assets/[id]/post - 当期償却仕訳を起票
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
  const { schedule_id, journal_date } = body

  if (!schedule_id) {
    return NextResponse.json({ error: 'スケジュールIDが必要です' }, { status: 400 })
  }

  if (!journal_date) {
    return NextResponse.json({ error: '仕訳日が必要です' }, { status: 400 })
  }

  try {
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

    // 勘定科目が設定されているかチェック
    if (!asset.account_depr_exp || !asset.account_accum_depr) {
      return NextResponse.json(
        { error: '減価償却費勘定と減価償却累計額勘定を設定してください' },
        { status: 400 }
      )
    }

    // 償却スケジュールを取得
    const { data: schedule, error: scheduleError } = await supabase
      .from('depreciation_schedules')
      .select('*')
      .eq('id', schedule_id)
      .eq('asset_id', assetId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: '償却スケジュールが見つかりません' }, { status: 404 })
    }

    // 既に起票済みかチェック
    if (schedule.posted) {
      return NextResponse.json({ error: 'このスケジュールは既に起票済みです' }, { status: 400 })
    }

    // 償却額が0の場合はエラー
    if (schedule.depreciation_amount <= 0) {
      return NextResponse.json({ error: '償却額が0以下のため起票できません' }, { status: 400 })
    }

    // 会計期間を自動判定
    let periodId = schedule.period_id

    if (!periodId) {
      const { data: period } = await supabase
        .from('accounting_periods')
        .select('id, status')
        .eq('tenant_id', profile.tenant_id)
        .lte('start_date', journal_date)
        .gte('end_date', journal_date)
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      if (period) {
        if (period.status === 'locked') {
          return NextResponse.json(
            { error: '該当する会計期間がロックされています' },
            { status: 400 }
          )
        }
        periodId = period.id
      }
    }

    // 仕訳を作成
    // 借方: 減価償却費（費用）
    // 貸方: 減価償却累計額（資産のマイナス勘定）
    const { data: journal, error: journalError } = await supabase
      .from('journals')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        journal_date: journal_date,
        period_id: periodId || null,
        memo: `${asset.name} 減価償却費（${schedule.fiscal_year}年${schedule.fiscal_month}月）`,
        source: `ASSET-${asset.asset_code}`,
        source_id: assetId,
        source_type: 'fixed_asset',
        is_approved: false, // 未承認として作成
        created_by: user.id,
      })
      .select()
      .single()

    if (journalError) {
      console.error('仕訳作成エラー:', journalError)
      return NextResponse.json({ error: journalError.message }, { status: 500 })
    }

    // 仕訳明細を作成
    const journalLines = [
      {
        tenant_id: profile.tenant_id,
        user_id: user.id,
        journal_id: journal.id,
        line_number: 1,
        account_id: asset.account_depr_exp, // 減価償却費（借方）
        description: `${asset.name} 減価償却費`,
        debit: schedule.depreciation_amount,
        credit: 0,
        tax_rate_id: null,
        department: null,
      },
      {
        tenant_id: profile.tenant_id,
        user_id: user.id,
        journal_id: journal.id,
        line_number: 2,
        account_id: asset.account_accum_depr, // 減価償却累計額（貸方）
        description: `${asset.name} 減価償却累計額`,
        debit: 0,
        credit: schedule.depreciation_amount,
        tax_rate_id: null,
        department: null,
      },
    ]

    const { data: lines, error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines)
      .select()

    if (linesError) {
      // エラーが発生した場合、仕訳ヘッダーも削除
      await supabase.from('journals').delete().eq('id', journal.id)
      console.error('仕訳明細作成エラー:', linesError)
      return NextResponse.json({ error: linesError.message }, { status: 500 })
    }

    // スケジュールを起票済みに更新
    const { error: updateError } = await supabase
      .from('depreciation_schedules')
      .update({
        posted: true,
        posted_journal_id: journal.id,
        posted_at: new Date().toISOString(),
      })
      .eq('id', schedule_id)

    if (updateError) {
      console.error('スケジュール更新エラー:', updateError)
      // エラーでもロールバックはしない（仕訳は作成済み）
    }

    return NextResponse.json({
      message: '償却仕訳を起票しました',
      journal: {
        ...journal,
        lines: lines,
      },
    })
  } catch (error: any) {
    console.error('仕訳起票エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
