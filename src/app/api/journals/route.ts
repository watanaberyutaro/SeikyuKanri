import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateJournalInput } from '@/types/accounting'

// GET /api/journals - 仕訳一覧取得
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
  const periodId = searchParams.get('period_id')
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  const source = searchParams.get('source')
  const approved = searchParams.get('approved')
  const limit = searchParams.get('limit') || '100'

  // 仕訳を取得
  let query = supabase
    .from('journals')
    .select(`
      *,
      period:accounting_periods(id, name, status),
      lines:journal_lines(
        *,
        account:accounts(id, code, name, type),
        tax_rate:tax_rates(id, name, rate)
      )
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('journal_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))

  if (periodId) {
    query = query.eq('period_id', periodId)
  }

  if (fromDate) {
    query = query.gte('journal_date', fromDate)
  }

  if (toDate) {
    query = query.lte('journal_date', toDate)
  }

  if (source) {
    query = query.eq('source', source)
  }

  if (approved === 'true') {
    query = query.eq('is_approved', true)
  } else if (approved === 'false') {
    query = query.eq('is_approved', false)
  }

  const { data: journals, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ journals })
}

// POST /api/journals - 仕訳登録
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

  const body: CreateJournalInput = await request.json()

  // バリデーション
  if (!body.journal_date || !body.lines || body.lines.length === 0) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 借方・貸方の合計を計算
  const totalDebit = body.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = body.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

  if (totalDebit !== totalCredit) {
    return NextResponse.json(
      { error: `借方合計(${totalDebit})と貸方合計(${totalCredit})が一致しません` },
      { status: 400 }
    )
  }

  if (totalDebit === 0) {
    return NextResponse.json({ error: '借方・貸方の金額が0です' }, { status: 400 })
  }

  // 会計期間の自動判定（period_idが指定されていない場合）
  let periodId = body.period_id
  if (!periodId) {
    const { data: period } = await supabase
      .from('accounting_periods')
      .select('id, status')
      .eq('tenant_id', profile.tenant_id)
      .lte('start_date', body.journal_date)
      .gte('end_date', body.journal_date)
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

  // トランザクション開始（仕訳ヘッダーと明細を一括登録）
  // 1. 仕訳ヘッダーを登録
  const { data: journal, error: journalError } = await supabase
    .from('journals')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      journal_date: body.journal_date,
      period_id: periodId || null,
      memo: body.memo || null,
      source: body.source || null,
      source_id: body.source_id || null,
      source_type: body.source_type || null,
      is_approved: body.is_approved !== undefined ? body.is_approved : false,
      created_by: user.id,
    })
    .select()
    .single()

  if (journalError) {
    return NextResponse.json({ error: journalError.message }, { status: 500 })
  }

  // 2. 仕訳明細を登録
  const journalLines = body.lines.map((line) => ({
    tenant_id: profile.tenant_id,
    user_id: user.id,
    journal_id: journal.id,
    line_number: line.line_number,
    account_id: line.account_id,
    description: line.description || null,
    debit: line.debit || 0,
    credit: line.credit || 0,
    tax_rate_id: line.tax_rate_id || null,
    department: line.department || null,
  }))

  const { data: lines, error: linesError } = await supabase
    .from('journal_lines')
    .insert(journalLines)
    .select(`
      *,
      account:accounts(id, code, name, type),
      tax_rate:tax_rates(id, name, rate)
    `)

  if (linesError) {
    // エラーが発生した場合、仕訳ヘッダーも削除（ロールバック的な処理）
    await supabase.from('journals').delete().eq('id', journal.id)
    return NextResponse.json({ error: linesError.message }, { status: 500 })
  }

  // 完成した仕訳を返す
  const journalWithLines = {
    ...journal,
    lines: lines,
  }

  return NextResponse.json({ journal: journalWithLines }, { status: 201 })
}
