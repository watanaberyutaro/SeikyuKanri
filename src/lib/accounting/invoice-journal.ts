/**
 * 請求書から仕訳を自動生成するユーティリティ
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { CreateJournalInput } from '@/types/accounting'

interface Invoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string | null
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  payment_date: string | null
  company: {
    name: string
  }
}

/**
 * 請求書発行時の仕訳を生成（売掛金/売上）
 * @param invoice 請求書データ
 * @param supabase Supabaseクライアント
 * @param tenantId テナントID
 * @param userId ユーザーID
 * @returns 仕訳データ（未登録）
 */
export async function createInvoiceIssuedJournal(
  invoice: Invoice,
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<CreateJournalInput | null> {
  console.log('🔍 createInvoiceIssuedJournal 開始')
  console.log('  - tenantId:', tenantId)
  console.log('  - userId:', userId)
  console.log('  - invoice:', invoice)

  // 勘定科目を取得
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, code, name')
    .eq('tenant_id', tenantId)
    .in('code', ['1110', '4100']) // 1110:売掛金, 4100:売上高
    .eq('is_active', true)

  console.log('📋 勘定科目取得結果:', accounts)
  console.log('  - 取得件数:', accounts?.length)
  if (accountsError) {
    console.error('  - エラー:', accountsError)
  }

  if (!accounts || accounts.length < 2) {
    console.error('❌ 必要な勘定科目が見つかりません（売掛金、売上高）')
    console.error('  - 取得した科目:', accounts)
    return null
  }

  const receivableAccount = accounts.find((a) => a.code === '1110') // 売掛金
  const revenueAccount = accounts.find((a) => a.code === '4100') // 売上高

  console.log('  - 売掛金:', receivableAccount)
  console.log('  - 売上高:', revenueAccount)

  if (!receivableAccount || !revenueAccount) {
    console.error('❌ 必要な勘定科目が見つかりません')
    return null
  }

  // 仕訳データを作成
  const journal: CreateJournalInput = {
    journal_date: invoice.issue_date,
    memo: `請求書発行: ${invoice.invoice_number}`,
    source: invoice.invoice_number,
    source_type: 'invoice',
    source_id: invoice.id,
    lines: [
      {
        line_number: 1,
        account_id: receivableAccount.id,
        description: `${invoice.company.name}`,
        debit: invoice.total_amount,
        credit: 0,
      },
      {
        line_number: 2,
        account_id: revenueAccount.id,
        description: `${invoice.company.name}`,
        debit: 0,
        credit: invoice.total_amount,
      },
    ],
  }

  return journal
}

/**
 * 請求書入金時の仕訳を生成（現金/売掛金）
 * @param invoice 請求書データ
 * @param supabase Supabaseクライアント
 * @param tenantId テナントID
 * @param userId ユーザーID
 * @returns 仕訳データ（未登録）
 */
export async function createInvoicePaymentJournal(
  invoice: Invoice,
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<CreateJournalInput | null> {
  // 勘定科目を取得
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name')
    .eq('tenant_id', tenantId)
    .in('code', ['1101', '1110']) // 1101:現金, 1110:売掛金
    .eq('is_active', true)

  if (!accounts || accounts.length < 2) {
    console.error('必要な勘定科目が見つかりません（現金、売掛金）')
    return null
  }

  const cashAccount = accounts.find((a) => a.code === '1101') // 現金
  const receivableAccount = accounts.find((a) => a.code === '1110') // 売掛金

  if (!cashAccount || !receivableAccount) {
    console.error('必要な勘定科目が見つかりません')
    return null
  }

  // 入金日を使用（なければ今日の日付）
  const paymentDate = invoice.payment_date || new Date().toISOString().split('T')[0]

  // 仕訳データを作成
  const journal: CreateJournalInput = {
    journal_date: paymentDate,
    memo: `請求書入金: ${invoice.invoice_number}`,
    source: invoice.invoice_number,
    source_type: 'invoice',
    source_id: invoice.id,
    lines: [
      {
        line_number: 1,
        account_id: cashAccount.id,
        description: `${invoice.company.name}からの入金`,
        debit: invoice.total_amount,
        credit: 0,
      },
      {
        line_number: 2,
        account_id: receivableAccount.id,
        description: `${invoice.company.name}売掛金消込`,
        debit: 0,
        credit: invoice.total_amount,
      },
    ],
  }

  return journal
}

/**
 * 仕訳をSupabaseに登録
 * @param journal 仕訳データ
 * @param supabase Supabaseクライアント
 * @param tenantId テナントID
 * @param userId ユーザーID
 * @returns 登録された仕訳ID
 */
export async function saveJournal(
  journal: CreateJournalInput,
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<string | null> {
  console.log('💾 saveJournal 開始')
  console.log('  - journal:', journal)
  console.log('  - tenantId:', tenantId)
  console.log('  - userId:', userId)

  try {
    // 会計期間を自動検出
    let periodId = journal.period_id
    if (!periodId) {
      console.log('🔍 会計期間を自動検出...')
      const { data: period, error: periodError } = await supabase
        .from('accounting_periods')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .lte('start_date', journal.journal_date)
        .gte('end_date', journal.journal_date)
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      console.log('  - 検出された期間:', period)
      if (periodError) {
        console.log('  - 期間エラー（期間なしで登録）:', periodError.message)
      }

      if (period?.status === 'locked') {
        console.error('❌ 該当する会計期間がロックされています')
        return null
      }
      periodId = period?.id
      console.log('  - 使用する期間ID:', periodId)
    }

    // 仕訳本体を登録
    console.log('📝 仕訳本体を登録...')
    const journalInsertData = {
      tenant_id: tenantId,
      user_id: userId,
      journal_date: journal.journal_date,
      period_id: periodId,
      memo: journal.memo,
      source: journal.source,
      source_type: journal.source_type,
      source_id: journal.source_id,
      is_approved: false, // 未承認
      created_by: userId,
    }
    console.log('  - 挿入データ:', journalInsertData)

    const { data: journalData, error: journalError } = await supabase
      .from('journals')
      .insert(journalInsertData)
      .select()
      .single()

    if (journalError || !journalData) {
      console.error('❌ 仕訳の登録に失敗しました:', journalError)
      return null
    }

    console.log('✅ 仕訳本体を登録しました:', journalData.id)

    // 仕訳明細を登録
    console.log('📝 仕訳明細を登録...')
    const journalLines = journal.lines.map((line) => ({
      tenant_id: tenantId,
      user_id: userId,
      journal_id: journalData.id,
      line_number: line.line_number,
      account_id: line.account_id,
      description: line.description,
      debit: line.debit || 0,
      credit: line.credit || 0,
      tax_rate_id: line.tax_rate_id,
      department: line.department,
    }))
    console.log('  - 明細データ:', journalLines)

    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines)

    if (linesError) {
      console.error('❌ 仕訳明細の登録に失敗しました:', linesError)
      return null
    }

    console.log('✅ 仕訳明細を登録しました')
    console.log('🎉 仕訳の保存が完了しました。ID:', journalData.id)

    return journalData.id
  } catch (error) {
    console.error('仕訳の保存に失敗しました:', error)
    return null
  }
}
