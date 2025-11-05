/**
 * 銀行取引の突合マッチングロジック
 *
 * bank_rows と invoices/bills を突合して候補を提示
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 文字列を正規化（全角→半角、空白除去、小文字化）
 */
export function normalizeString(str: string): string {
  if (!str) return ''

  return str
    // 全角英数字→半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    })
    // 全角スペース→半角スペース
    .replace(/　/g, ' ')
    // 空白除去
    .replace(/\s+/g, '')
    // 小文字化
    .toLowerCase()
}

/**
 * SHA-256ハッシュを生成（重複防止用）
 */
export async function generateBankRowHash(
  txn_date: string,
  amount: number,
  description: string,
  type: 'in' | 'out'
): Promise<string> {
  const normalized_desc = normalizeString(description)
  const hash_input = `${txn_date}|${amount}|${normalized_desc}|${type}`

  // Web Crypto API を使用してSHA-256ハッシュを生成
  const encoder = new TextEncoder()
  const data = encoder.encode(hash_input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * 突合候補のスコア計算
 */
function calculateMatchScore(
  bankRow: {
    txn_date: string
    amount: number
    description: string
  },
  target: {
    date: string // issue_date or bill_date
    amount: number
    name: string // customer_name or vendor_name
  },
  dateTolerance: number = 7 // ±N日
): number {
  let score = 0

  // 1. 金額の一致（最重要）
  if (Math.abs(bankRow.amount - target.amount) < 0.01) {
    score += 100
  } else {
    // 金額が異なる場合はスコア0
    return 0
  }

  // 2. 日付の近さ（±N日以内）
  const bankDate = new Date(bankRow.txn_date)
  const targetDate = new Date(target.date)
  const daysDiff = Math.abs(
    Math.floor((bankDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
  )

  if (daysDiff <= dateTolerance) {
    // 日付が近いほど高スコア（最大50点）
    score += Math.max(0, 50 - daysDiff * 5)
  } else {
    // 日付範囲外はスコア0
    return 0
  }

  // 3. 相手先名の類似度
  const normalizedBankDesc = normalizeString(bankRow.description)
  const normalizedTargetName = normalizeString(target.name)

  if (normalizedBankDesc.includes(normalizedTargetName)) {
    score += 30
  } else if (normalizedTargetName.includes(normalizedBankDesc)) {
    score += 20
  } else {
    // 部分一致をチェック
    const words = normalizedTargetName.split(/[^\w]+/).filter((w) => w.length > 1)
    const matchedWords = words.filter((word) => normalizedBankDesc.includes(word))

    if (matchedWords.length > 0) {
      score += 10 * (matchedWords.length / words.length)
    }
  }

  return score
}

/**
 * 入金（AR）の突合候補を検索
 */
export async function findInvoiceMatches(
  supabase: SupabaseClient,
  tenant_id: string,
  bankRow: {
    id: string
    txn_date: string
    amount: number
    description: string
    type: string
  },
  options: {
    dateTolerance?: number // ±N日（デフォルト: 7日）
    maxCandidates?: number // 最大候補数（デフォルト: 5）
  } = {}
): Promise<
  Array<{
    invoice_id: string
    invoice_number: string
    company_id: string
    company_name: string
    issue_date: string
    due_date: string | null
    total_amount: number
    balance: number
    score: number
  }>
> {
  const dateTolerance = options.dateTolerance ?? 7
  const maxCandidates = options.maxCandidates ?? 5

  try {
    // 日付範囲を計算
    const txnDate = new Date(bankRow.txn_date)
    const startDate = new Date(txnDate)
    startDate.setDate(startDate.getDate() - dateTolerance)
    const endDate = new Date(txnDate)
    endDate.setDate(endDate.getDate() + dateTolerance)

    // 金額と日付範囲で候補を検索
    const { data: candidates, error } = await supabase
      .from('ar_invoice_balance')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('total_amount', bankRow.amount)
      .gte('issue_date', startDate.toISOString().split('T')[0])
      .lte('issue_date', endDate.toISOString().split('T')[0])
      .gt('balance', 0)

    if (error) {
      console.error('findInvoiceMatches error:', error)
      return []
    }

    if (!candidates || candidates.length === 0) {
      return []
    }

    // 顧客名を取得
    const companyIds = [...new Set(candidates.map((c) => c.company_id))]
    const { data: companies } = await supabase
      .from('client_companies')
      .select('id, name')
      .in('id', companyIds)

    const companyMap = new Map(companies?.map((c) => [c.id, c.name]) || [])

    // スコアを計算して並べ替え
    const scoredCandidates = candidates
      .map((candidate) => ({
        invoice_id: candidate.invoice_id,
        invoice_number: candidate.invoice_number,
        company_id: candidate.company_id,
        company_name: companyMap.get(candidate.company_id) || '',
        issue_date: candidate.issue_date,
        due_date: candidate.due_date,
        total_amount: candidate.total_amount,
        balance: candidate.balance,
        score: calculateMatchScore(
          bankRow,
          {
            date: candidate.issue_date,
            amount: candidate.total_amount,
            name: companyMap.get(candidate.company_id) || ''
          },
          dateTolerance
        )
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates)

    return scoredCandidates
  } catch (error) {
    console.error('findInvoiceMatches error:', error)
    return []
  }
}

/**
 * 出金（AP）の突合候補を検索
 */
export async function findBillMatches(
  supabase: SupabaseClient,
  tenant_id: string,
  bankRow: {
    id: string
    txn_date: string
    amount: number
    description: string
    type: string
  },
  options: {
    dateTolerance?: number // ±N日（デフォルト: 7日）
    maxCandidates?: number // 最大候補数（デフォルト: 5）
  } = {}
): Promise<
  Array<{
    bill_id: string
    bill_number: string
    vendor_id: string
    vendor_name: string
    bill_date: string
    due_date: string | null
    total_amount: number
    balance: number
    score: number
  }>
> {
  const dateTolerance = options.dateTolerance ?? 7
  const maxCandidates = options.maxCandidates ?? 5

  try {
    // 日付範囲を計算
    const txnDate = new Date(bankRow.txn_date)
    const startDate = new Date(txnDate)
    startDate.setDate(startDate.getDate() - dateTolerance)
    const endDate = new Date(txnDate)
    endDate.setDate(endDate.getDate() + dateTolerance)

    // 金額と日付範囲で候補を検索
    const { data: candidates, error } = await supabase
      .from('bills')
      .select(`
        *,
        vendors(id, name)
      `)
      .eq('tenant_id', tenant_id)
      .eq('total_amount', bankRow.amount)
      .gte('bill_date', startDate.toISOString().split('T')[0])
      .lte('bill_date', endDate.toISOString().split('T')[0])
      .in('status', ['issued', 'partially_paid'])

    if (error) {
      console.error('findBillMatches error:', error)
      return []
    }

    if (!candidates || candidates.length === 0) {
      return []
    }

    // 各請求書の配分額を取得して残高計算
    const billsWithBalance = await Promise.all(
      candidates.map(async (bill) => {
        const { data: allocations } = await supabase
          .from('ap_allocations')
          .select('allocated_amount')
          .eq('bill_id', bill.id)
          .eq('tenant_id', tenant_id)

        const allocated_amount =
          allocations?.reduce((sum, alloc) => sum + Number(alloc.allocated_amount), 0) || 0
        const balance = Number(bill.total_amount) - allocated_amount

        return {
          ...bill,
          balance,
          vendor_name: (bill.vendors as any)?.name || ''
        }
      })
    )

    // 残高がある請求書のみフィルタ
    const unpaidBills = billsWithBalance.filter((bill) => bill.balance > 0)

    // スコアを計算して並べ替え
    const scoredCandidates = unpaidBills
      .map((bill) => ({
        bill_id: bill.id,
        bill_number: bill.bill_number,
        vendor_id: bill.vendor_id,
        vendor_name: bill.vendor_name,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        total_amount: bill.total_amount,
        balance: bill.balance,
        score: calculateMatchScore(
          bankRow,
          {
            date: bill.bill_date,
            amount: bill.total_amount,
            name: bill.vendor_name
          },
          dateTolerance
        )
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates)

    return scoredCandidates
  } catch (error) {
    console.error('findBillMatches error:', error)
    return []
  }
}

/**
 * 銀行取引行の突合候補を自動検索
 */
export async function findMatches(
  supabase: SupabaseClient,
  tenant_id: string,
  bankRow: {
    id: string
    txn_date: string
    amount: number
    description: string
    type: 'in' | 'out'
  },
  options?: {
    dateTolerance?: number
    maxCandidates?: number
  }
) {
  if (bankRow.type === 'in') {
    // 入金 → 請求書（AR）と突合
    return await findInvoiceMatches(supabase, tenant_id, bankRow, options)
  } else if (bankRow.type === 'out') {
    // 出金 → 請求書（AP）と突合
    return await findBillMatches(supabase, tenant_id, bankRow, options)
  }

  return []
}
