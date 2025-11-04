// 決算・レポート機能の型定義
// 既存のAR（売掛管理）は参照のみ、変更禁止

import { AccountType } from './accounting'

// ========================================
// 総勘定元帳（General Ledger）
// ========================================
export type GLEntry = {
  journal_id: string
  journal_date: string
  journal_number?: string
  memo?: string
  line_number: number
  description: string
  debit: number
  credit: number
  balance: number // 累積残高
}

export type GLReport = {
  account_id: string
  account_code: string
  account_name: string
  account_type: AccountType
  opening_balance: number
  entries: GLEntry[]
  closing_balance: number
  total_debit: number
  total_credit: number
}

// ========================================
// 試算表（Trial Balance）
// ========================================
export type TBEntry = {
  account_id: string
  account_code: string
  account_name: string
  account_type: AccountType
  parent_id?: string
  opening_balance: number
  debit_amount: number // 当期借方合計
  credit_amount: number // 当期貸方合計
  closing_balance: number
  level: number // 階層レベル（0=親、1=子、2=孫...）
}

export type TrialBalance = {
  period_id: string
  period_name: string
  start_date: string
  end_date: string
  as_of: string
  entries: TBEntry[]
  total_debit: number
  total_credit: number
}

// ========================================
// 貸借対照表（Balance Sheet）/ 損益計算書（P&L）
// ========================================
export type BSPLSection = {
  section_name: string // 流動資産、固定資産、流動負債、売上高、売上原価、など
  section_type: AccountType
  accounts: {
    account_id: string
    account_code: string
    account_name: string
    amount: number
    level: number
    is_subtotal: boolean
  }[]
  subtotal: number
}

export type BalanceSheet = {
  period_id: string
  period_name: string
  as_of: string // 期末日
  assets: BSPLSection[] // 資産の部
  liabilities: BSPLSection[] // 負債の部
  equity: BSPLSection[] // 純資産の部
  total_assets: number
  total_liabilities: number
  total_equity: number
}

export type ProfitAndLoss = {
  period_id: string
  period_name: string
  start_date: string
  end_date: string
  revenue: BSPLSection[] // 収益の部
  expenses: BSPLSection[] // 費用の部
  gross_profit: number // 売上総利益
  operating_profit: number // 営業利益
  net_profit: number // 当期純利益
  total_revenue: number
  total_expenses: number
}

export type BSPLReport = {
  balance_sheet: BalanceSheet
  profit_and_loss: ProfitAndLoss
}

// ========================================
// 消費税レポート（VAT Report）
// ========================================
export type VATEntry = {
  tax_rate_id: string
  tax_rate_name: string
  tax_rate: number
  tax_category: 'standard' | 'reduced' | 'exempt' | 'non_taxable'
  // 課税売上
  taxable_sales_base: number // 税抜額
  taxable_sales_tax: number // 消費税額
  // 課税仕入
  taxable_purchases_base: number // 税抜額
  taxable_purchases_tax: number // 消費税額
}

export type VATReport = {
  from_date: string
  to_date: string
  entries: VATEntry[]
  // サマリー
  total_sales_base: number
  total_sales_tax: number
  total_purchases_base: number
  total_purchases_tax: number
  net_vat_payable: number // 納付税額（売上税 - 仕入税）
}

// ========================================
// 期末処理
// ========================================
export type PeriodCloseInput = {
  period_id: string
  closing_date: string
}

export type PeriodLockInput = {
  period_id: string
}

export type PeriodCloseResult = {
  success: boolean
  message?: string
  error?: string
  closing_entries_created?: number // 決算仕訳の件数
}

// ========================================
// レポートパラメータ
// ========================================
export type GLReportParams = {
  account_id: string
  from_date: string
  to_date: string
}

export type TBReportParams = {
  period_id: string
}

export type BSPLReportParams = {
  period_id: string
}

export type VATReportParams = {
  from_date: string
  to_date: string
}
