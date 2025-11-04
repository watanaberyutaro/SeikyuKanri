import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TrialBalance, TBEntry } from '@/types/reports'

// GET /api/reports/tb?period_id=xxx
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
  const periodId = searchParams.get('period_id')

  if (!periodId) {
    return NextResponse.json(
      { error: 'period_id パラメータが必要です' },
      { status: 400 }
    )
  }

  try {
    // 会計期間情報を取得
    const { data: period, error: periodError } = await supabase
      .from('accounting_periods')
      .select('id, name, start_date, end_date, status')
      .eq('id', periodId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (periodError || !period) {
      return NextResponse.json({ error: '会計期間が見つかりません' }, { status: 404 })
    }

    // すべての勘定科目を取得（階層構造を保持）
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, code, name, type, parent_id')
      .eq('tenant_id', profile.tenant_id)
      .order('code', { ascending: true })

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: '勘定科目が見つかりません' }, { status: 404 })
    }

    // すべての科目の期首残高と期間内仕訳を取得
    const accountIds = accounts.map((a) => a.id)

    // 期首残高計算（period.start_date より前の仕訳）
    const { data: openingLines } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, journals!inner(journal_date)')
      .eq('tenant_id', profile.tenant_id)
      .in('account_id', accountIds)
      .lt('journals.journal_date', period.start_date)

    // 期間内仕訳（period.start_date 〜 period.end_date）
    const { data: periodLines } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, journals!inner(journal_date)')
      .eq('tenant_id', profile.tenant_id)
      .in('account_id', accountIds)
      .gte('journals.journal_date', period.start_date)
      .lte('journals.journal_date', period.end_date)

    // 科目ごとに集計
    const accountMap = new Map<string, {
      account: typeof accounts[number]
      opening_balance: number
      debit_amount: number
      credit_amount: number
      closing_balance: number
    }>()

    // 初期化
    for (const account of accounts) {
      accountMap.set(account.id, {
        account,
        opening_balance: 0,
        debit_amount: 0,
        credit_amount: 0,
        closing_balance: 0,
      })
    }

    // 期首残高計算
    if (openingLines) {
      for (const line of openingLines) {
        const entry = accountMap.get(line.account_id)
        if (!entry) continue

        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0

        // 資産・費用：借方増加、負債・純資産・収益：貸方増加
        if (entry.account.type === 'asset' || entry.account.type === 'expense') {
          entry.opening_balance += debit - credit
        } else {
          entry.opening_balance += credit - debit
        }
      }
    }

    // 期間内仕訳集計
    if (periodLines) {
      for (const line of periodLines) {
        const entry = accountMap.get(line.account_id)
        if (!entry) continue

        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0

        entry.debit_amount += debit
        entry.credit_amount += credit
      }
    }

    // 期末残高計算
    let totalDebit = 0
    let totalCredit = 0

    const entries: TBEntry[] = []

    for (const [accountId, entry] of accountMap) {
      // 期末残高 = 期首残高 + (借方 - 貸方) または (貸方 - 借方)
      if (entry.account.type === 'asset' || entry.account.type === 'expense') {
        entry.closing_balance = entry.opening_balance + entry.debit_amount - entry.credit_amount
      } else {
        entry.closing_balance = entry.opening_balance + entry.credit_amount - entry.debit_amount
      }

      // 階層レベル計算（parent_id の数）
      let level = 0
      let currentAccount = entry.account
      while (currentAccount.parent_id) {
        level++
        const parent = accounts.find((a) => a.id === currentAccount.parent_id)
        if (!parent) break
        currentAccount = parent
      }

      entries.push({
        account_id: entry.account.id,
        account_code: entry.account.code,
        account_name: entry.account.name,
        account_type: entry.account.type,
        parent_id: entry.account.parent_id,
        opening_balance: entry.opening_balance,
        debit_amount: entry.debit_amount,
        credit_amount: entry.credit_amount,
        closing_balance: entry.closing_balance,
        level,
      })

      // 合計集計（期間内の借方・貸方合計）
      totalDebit += entry.debit_amount
      totalCredit += entry.credit_amount
    }

    // コード順にソート（既にaccountsがcode順なので、accountsの順序を維持）
    entries.sort((a, b) => a.account_code.localeCompare(b.account_code))

    const trialBalance: TrialBalance = {
      period_id: period.id,
      period_name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      as_of: period.end_date,
      entries,
      total_debit: totalDebit,
      total_credit: totalCredit,
    }

    return NextResponse.json({ trial_balance: trialBalance })
  } catch (error: any) {
    console.error('Trial Balance Report Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
