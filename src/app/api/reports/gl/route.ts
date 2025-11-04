import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GLReport, GLEntry } from '@/types/reports'

// GET /api/reports/gl?account_id=xxx&from=2024-01-01&to=2024-12-31
export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams
  const accountId = searchParams.get('account_id')
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')

  if (!accountId || !fromDate || !toDate) {
    return NextResponse.json(
      { error: 'account_id, from, to パラメータが必要です' },
      { status: 400 }
    )
  }

  try {
    // 勘定科目情報を取得
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, code, name, type')
      .eq('id', accountId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: '勘定科目が見つかりません' }, { status: 404 })
    }

    // 期首残高を計算（from_date以前の仕訳の累積）
    const { data: openingLines } = await supabase
      .from('journal_lines')
      .select('debit, credit, journals!inner(journal_date)')
      .eq('account_id', accountId)
      .eq('tenant_id', profile.tenant_id)
      .lt('journals.journal_date', fromDate)

    let openingBalance = 0
    if (openingLines) {
      for (const line of openingLines) {
        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0
        // 借方増加科目（資産・費用）は debit-credit、貸方増加科目（負債・純資産・収益）は credit-debit
        if (account.type === 'asset' || account.type === 'expense') {
          openingBalance += debit - credit
        } else {
          openingBalance += credit - debit
        }
      }
    }

    // 期間内の仕訳明細を取得
    const { data: lines, error: linesError } = await supabase
      .from('journal_lines')
      .select(`
        journal_id,
        line_number,
        description,
        debit,
        credit,
        journals!inner(journal_date, memo)
      `)
      .eq('account_id', accountId)
      .eq('tenant_id', profile.tenant_id)
      .gte('journals.journal_date', fromDate)
      .lte('journals.journal_date', toDate)
      .order('journals.journal_date', { ascending: true })
      .order('line_number', { ascending: true })

    if (linesError) {
      return NextResponse.json({ error: linesError.message }, { status: 500 })
    }

    // 残高を計算しながらエントリを作成
    let balance = openingBalance
    let totalDebit = 0
    let totalCredit = 0

    const entries: GLEntry[] = (lines || []).map((line: any) => {
      const debit = Number(line.debit) || 0
      const credit = Number(line.credit) || 0

      totalDebit += debit
      totalCredit += credit

      // 残高計算
      if (account.type === 'asset' || account.type === 'expense') {
        balance += debit - credit
      } else {
        balance += credit - debit
      }

      return {
        journal_id: line.journal_id,
        journal_date: line.journals?.journal_date,
        memo: line.journals?.memo,
        line_number: line.line_number,
        description: line.description,
        debit,
        credit,
        balance,
      }
    })

    const report: GLReport = {
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      account_type: account.type,
      opening_balance: openingBalance,
      entries,
      closing_balance: balance,
      total_debit: totalDebit,
      total_credit: totalCredit,
    }

    return NextResponse.json({ report })
  } catch (error: any) {
    console.error('GL Report Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
