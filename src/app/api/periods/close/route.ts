import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/periods/close
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
  const { period_id, closing_date } = body

  if (!period_id || !closing_date) {
    return NextResponse.json(
      { error: 'period_id, closing_date が必要です' },
      { status: 400 }
    )
  }

  try {
    // 会計期間を取得
    const { data: period, error: periodError } = await supabase
      .from('accounting_periods')
      .select('id, name, start_date, end_date, status')
      .eq('id', period_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (periodError || !period) {
      return NextResponse.json({ error: '会計期間が見つかりません' }, { status: 404 })
    }

    // すでに閉じているかチェック
    if (period.status === 'closed' || period.status === 'locked') {
      return NextResponse.json(
        { error: 'この期間はすでに締められています' },
        { status: 400 }
      )
    }

    // 収益・費用科目を取得
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, code, name, type')
      .eq('tenant_id', profile.tenant_id)
      .in('type', ['revenue', 'expense'])

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: '収益・費用科目が見つかりません' },
        { status: 404 }
      )
    }

    const accountIds = accounts.map((a) => a.id)

    // 期間内の収益・費用の残高を計算
    const { data: lines } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, journals!inner(journal_date)')
      .eq('tenant_id', profile.tenant_id)
      .in('account_id', accountIds)
      .gte('journals.journal_date', period.start_date)
      .lte('journals.journal_date', period.end_date)

    const accountBalances = new Map<string, number>()
    for (const account of accounts) {
      accountBalances.set(account.id, 0)
    }

    if (lines) {
      for (const line of lines) {
        const account = accounts.find((a) => a.id === line.account_id)
        if (!account) continue

        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0
        const currentBalance = accountBalances.get(account.id) || 0

        // 費用：借方増加、収益：貸方増加
        if (account.type === 'expense') {
          accountBalances.set(account.id, currentBalance + debit - credit)
        } else {
          accountBalances.set(account.id, currentBalance + credit - debit)
        }
      }
    }

    // 当期純利益を計算
    let totalRevenue = 0
    let totalExpense = 0

    for (const [accountId, balance] of accountBalances) {
      const account = accounts.find((a) => a.id === accountId)
      if (account?.type === 'revenue') {
        totalRevenue += balance
      } else if (account?.type === 'expense') {
        totalExpense += balance
      }
    }

    const netProfit = totalRevenue - totalExpense

    // 繰越利益剰余金科目を探す（簡易実装：equity タイプで "繰越利益剰余金" を含む科目）
    const { data: retainedEarningsAccount } = await supabase
      .from('accounts')
      .select('id, code, name')
      .eq('tenant_id', profile.tenant_id)
      .eq('type', 'equity')
      .ilike('name', '%繰越利益剰余金%')
      .limit(1)
      .single()

    if (!retainedEarningsAccount) {
      return NextResponse.json(
        { error: '繰越利益剰余金科目が見つかりません。先に勘定科目を設定してください。' },
        { status: 404 }
      )
    }

    // 決算仕訳を作成
    const closingEntries = []

    // 1. 収益科目をゼロにする（借方：収益、貸方：損益）
    // 2. 費用科目をゼロにする（借方：損益、貸方：費用）
    // 3. 損益を繰越利益剰余金に振替（借方 or 貸方：損益、貸方 or 借方：繰越利益剰余金）

    // まず、収益・費用の各科目をゼロにする仕訳を作成
    const journalLines = []

    // 収益科目をゼロにする（借方：収益、貸方：繰越利益剰余金）
    for (const [accountId, balance] of accountBalances) {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) continue

      if (balance === 0) continue // 残高ゼロの科目はスキップ

      if (account.type === 'revenue' && balance > 0) {
        journalLines.push({
          account_id: accountId,
          debit: balance,
          credit: 0,
          description: `${period.name} 決算振替（収益）`,
        })
      }

      if (account.type === 'expense' && balance > 0) {
        journalLines.push({
          account_id: accountId,
          debit: 0,
          credit: balance,
          description: `${period.name} 決算振替（費用）`,
        })
      }
    }

    // 純利益を繰越利益剰余金に振替
    if (netProfit !== 0) {
      if (netProfit > 0) {
        // 利益の場合：貸方に繰越利益剰余金
        journalLines.push({
          account_id: retainedEarningsAccount.id,
          debit: 0,
          credit: netProfit,
          description: `${period.name} 当期純利益`,
        })
      } else {
        // 損失の場合：借方に繰越利益剰余金
        journalLines.push({
          account_id: retainedEarningsAccount.id,
          debit: Math.abs(netProfit),
          credit: 0,
          description: `${period.name} 当期純損失`,
        })
      }
    }

    // 仕訳を作成
    if (journalLines.length > 0) {
      const { data: journal, error: journalError } = await supabase
        .from('journals')
        .insert({
          tenant_id: profile.tenant_id,
          journal_date: closing_date,
          memo: `${period.name} 決算仕訳`,
          created_by: user.id,
        })
        .select()
        .single()

      if (journalError || !journal) {
        return NextResponse.json(
          { error: '決算仕訳の作成に失敗しました: ' + journalError?.message },
          { status: 500 }
        )
      }

      // 仕訳明細を作成
      const linesWithJournalId = journalLines.map((line, index) => ({
        ...line,
        journal_id: journal.id,
        tenant_id: profile.tenant_id,
        line_number: index + 1,
      }))

      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(linesWithJournalId)

      if (linesError) {
        // ロールバック：作成した仕訳を削除
        await supabase.from('journals').delete().eq('id', journal.id)
        return NextResponse.json(
          { error: '決算仕訳明細の作成に失敗しました: ' + linesError.message },
          { status: 500 }
        )
      }

      closingEntries.push(journal.id)
    }

    // 期間ステータスを 'closed' に更新
    const { error: updateError } = await supabase
      .from('accounting_periods')
      .update({ status: 'closed' })
      .eq('id', period_id)
      .eq('tenant_id', profile.tenant_id)

    if (updateError) {
      return NextResponse.json(
        { error: '期間の締め処理に失敗しました: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${period.name} を正常に締めました`,
      closing_entries_created: closingEntries.length,
      net_profit: netProfit,
    })
  } catch (error: any) {
    console.error('Period Close Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
