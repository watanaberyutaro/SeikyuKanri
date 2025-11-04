import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BSPLReport, BalanceSheet, ProfitAndLoss, BSPLSection } from '@/types/reports'
import { AccountType } from '@/types/accounting'

// GET /api/reports/bspl?period_id=xxx
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

    // すべての勘定科目を取得
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, code, name, type, parent_id')
      .eq('tenant_id', profile.tenant_id)
      .order('code', { ascending: true })

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: '勘定科目が見つかりません' }, { status: 404 })
    }

    // すべての科目の残高を計算
    const accountIds = accounts.map((a) => a.id)

    // 期間内およびそれ以前の全仕訳を取得（期末残高算出用）
    const { data: allLines } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, journals!inner(journal_date)')
      .eq('tenant_id', profile.tenant_id)
      .in('account_id', accountIds)
      .lte('journals.journal_date', period.end_date)

    // 科目ごとの残高計算
    const accountBalances = new Map<string, number>()

    for (const account of accounts) {
      accountBalances.set(account.id, 0)
    }

    if (allLines) {
      for (const line of allLines) {
        const account = accounts.find((a) => a.id === line.account_id)
        if (!account) continue

        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0

        const currentBalance = accountBalances.get(account.id) || 0

        // 資産・費用：借方増加、負債・純資産・収益：貸方増加
        if (account.type === 'asset' || account.type === 'expense') {
          accountBalances.set(account.id, currentBalance + debit - credit)
        } else {
          accountBalances.set(account.id, currentBalance + credit - debit)
        }
      }
    }

    // 階層レベル計算用関数
    const getLevel = (accountId: string): number => {
      let level = 0
      let currentAccount = accounts.find((a) => a.id === accountId)
      while (currentAccount?.parent_id) {
        level++
        currentAccount = accounts.find((a) => a.id === currentAccount!.parent_id)
      }
      return level
    }

    // セクション別に科目をグループ化する関数
    const buildSection = (sectionName: string, accountType: AccountType): BSPLSection => {
      const sectionAccounts = accounts
        .filter((a) => a.type === accountType)
        .map((a) => ({
          account_id: a.id,
          account_code: a.code,
          account_name: a.name,
          amount: accountBalances.get(a.id) || 0,
          level: getLevel(a.id),
          is_subtotal: false, // 簡易実装：小計行は今回は含めない
        }))

      const subtotal = sectionAccounts.reduce((sum, a) => sum + a.amount, 0)

      return {
        section_name: sectionName,
        section_type: accountType,
        accounts: sectionAccounts,
        subtotal,
      }
    }

    // ===== 貸借対照表 (Balance Sheet) =====
    const assetsSections: BSPLSection[] = [
      buildSection('流動資産', 'asset'), // 簡易実装：流動/固定の区別は今後実装
    ]

    const liabilitiesSections: BSPLSection[] = [
      buildSection('負債', 'liability'),
    ]

    const equitySections: BSPLSection[] = [
      buildSection('純資産', 'equity'),
    ]

    const totalAssets = assetsSections.reduce((sum, s) => sum + s.subtotal, 0)
    const totalLiabilities = liabilitiesSections.reduce((sum, s) => sum + s.subtotal, 0)
    const totalEquity = equitySections.reduce((sum, s) => sum + s.subtotal, 0)

    const balanceSheet: BalanceSheet = {
      period_id: period.id,
      period_name: period.name,
      as_of: period.end_date,
      assets: assetsSections,
      liabilities: liabilitiesSections,
      equity: equitySections,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
    }

    // ===== 損益計算書 (P&L) =====
    // 収益・費用は期間内の累積
    const { data: plLines } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, journals!inner(journal_date)')
      .eq('tenant_id', profile.tenant_id)
      .in('account_id', accountIds)
      .gte('journals.journal_date', period.start_date)
      .lte('journals.journal_date', period.end_date)

    // 収益・費用の残高を再計算
    const plBalances = new Map<string, number>()

    for (const account of accounts) {
      if (account.type === 'revenue' || account.type === 'expense') {
        plBalances.set(account.id, 0)
      }
    }

    if (plLines) {
      for (const line of plLines) {
        const account = accounts.find((a) => a.id === line.account_id)
        if (!account || (account.type !== 'revenue' && account.type !== 'expense')) continue

        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0

        const currentBalance = plBalances.get(account.id) || 0

        // 費用：借方増加、収益：貸方増加
        if (account.type === 'expense') {
          plBalances.set(account.id, currentBalance + debit - credit)
        } else {
          plBalances.set(account.id, currentBalance + credit - debit)
        }
      }
    }

    // P&L セクション構築
    const buildPLSection = (sectionName: string, accountType: AccountType): BSPLSection => {
      const sectionAccounts = accounts
        .filter((a) => a.type === accountType)
        .map((a) => ({
          account_id: a.id,
          account_code: a.code,
          account_name: a.name,
          amount: plBalances.get(a.id) || 0,
          level: getLevel(a.id),
          is_subtotal: false,
        }))

      const subtotal = sectionAccounts.reduce((sum, a) => sum + a.amount, 0)

      return {
        section_name: sectionName,
        section_type: accountType,
        accounts: sectionAccounts,
        subtotal,
      }
    }

    const revenueSections: BSPLSection[] = [
      buildPLSection('売上高', 'revenue'),
    ]

    const expenseSections: BSPLSection[] = [
      buildPLSection('費用', 'expense'),
    ]

    const totalRevenue = revenueSections.reduce((sum, s) => sum + s.subtotal, 0)
    const totalExpenses = expenseSections.reduce((sum, s) => sum + s.subtotal, 0)

    // 利益計算（簡易実装：売上総利益=営業利益=当期純利益）
    const netProfit = totalRevenue - totalExpenses

    const profitAndLoss: ProfitAndLoss = {
      period_id: period.id,
      period_name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      revenue: revenueSections,
      expenses: expenseSections,
      gross_profit: netProfit, // 簡易実装
      operating_profit: netProfit, // 簡易実装
      net_profit: netProfit,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
    }

    const report: BSPLReport = {
      balance_sheet: balanceSheet,
      profit_and_loss: profitAndLoss,
    }

    return NextResponse.json({ report })
  } catch (error: any) {
    console.error('BS/PL Report Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
