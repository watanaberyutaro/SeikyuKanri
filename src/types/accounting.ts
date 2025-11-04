// 会計コア機能の型定義

// ==================== 勘定科目 ====================
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'contra'

export type TaxCategory = 'standard' | 'reduced' | 'exempt' | 'non-tax'

export interface Account {
  id: string
  tenant_id: string
  user_id: string
  code: string
  name: string
  type: AccountType
  parent_id: string | null
  tax_category: TaxCategory | null
  is_active: boolean
  sort_order: number
  description: string | null
  created_at: string
  updated_at: string
}

export interface CreateAccountInput {
  code: string
  name: string
  type: AccountType
  parent_id?: string | null
  tax_category?: TaxCategory | null
  is_active?: boolean
  sort_order?: number
  description?: string | null
}

export interface UpdateAccountInput {
  code?: string
  name?: string
  type?: AccountType
  parent_id?: string | null
  tax_category?: TaxCategory | null
  is_active?: boolean
  sort_order?: number
  description?: string | null
}

// 勘定科目ツリー表示用
export interface AccountTreeNode extends Account {
  children?: AccountTreeNode[]
  level: number
}

// ==================== 税率 ====================
export type TaxRateCategory = 'standard' | 'reduced' | 'exempt' | 'non-tax'

export interface TaxRate {
  id: string
  tenant_id: string
  user_id: string
  name: string
  rate: number
  category: TaxRateCategory
  applies_from: string
  applies_to: string | null
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaxRateInput {
  name: string
  rate: number
  category: TaxRateCategory
  applies_from: string
  applies_to?: string | null
  is_active?: boolean
  description?: string | null
}

export interface UpdateTaxRateInput {
  name?: string
  rate?: number
  category?: TaxRateCategory
  applies_from?: string
  applies_to?: string | null
  is_active?: boolean
  description?: string | null
}

// ==================== 会計期間 ====================
export type PeriodStatus = 'open' | 'closed' | 'locked'

export interface AccountingPeriod {
  id: string
  tenant_id: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  status: PeriodStatus
  fiscal_year: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface CreatePeriodInput {
  name: string
  start_date: string
  end_date: string
  status?: PeriodStatus
  fiscal_year?: number | null
  description?: string | null
}

export interface UpdatePeriodInput {
  name?: string
  start_date?: string
  end_date?: string
  status?: PeriodStatus
  fiscal_year?: number | null
  description?: string | null
}

// ==================== 仕訳 ====================
export type JournalSourceType = 'invoice' | 'quote' | 'manual' | 'bank_transaction' | 'fixed_asset' | null

export interface Journal {
  id: string
  tenant_id: string
  user_id: string
  journal_date: string
  period_id: string | null
  memo: string | null
  source: string | null
  source_type: JournalSourceType
  source_id: string | null
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface JournalLine {
  id: string
  tenant_id: string
  user_id: string
  journal_id: string
  line_number: number
  account_id: string
  description: string | null
  debit: number
  credit: number
  tax_rate_id: string | null
  department: string | null
  created_at: string
}

export interface CreateJournalInput {
  journal_date: string
  period_id?: string | null
  memo?: string | null
  source?: string | null
  source_type?: JournalSourceType
  source_id?: string | null
  is_approved?: boolean
  lines: CreateJournalLineInput[]
}

export interface CreateJournalLineInput {
  line_number: number
  account_id: string
  description?: string | null
  debit?: number
  credit?: number
  tax_rate_id?: string | null
  department?: string | null
}

// 仕訳表示用（勘定科目情報を含む）
export interface JournalWithLines extends Journal {
  lines: JournalLineWithAccount[]
}

export interface JournalLineWithAccount extends JournalLine {
  account: {
    id: string
    code: string
    name: string
    type: AccountType
  }
  tax_rate?: {
    id: string
    name: string
    rate: number
  } | null
}

// ==================== 帳票・レポート ====================
export interface GeneralLedgerEntry {
  tenant_id: string
  user_id: string
  journal_date: string
  account_code: string
  account_name: string
  account_type: AccountType
  description: string | null
  debit: number
  credit: number
  net_amount: number
  journal_memo: string | null
  source: string | null
  source_id: string | null
  department: string | null
  tax_rate_name: string | null
  tax_rate: number | null
  journal_id: string
  journal_line_id: string
  created_at: string
}

export interface TrialBalanceEntry {
  tenant_id: string
  user_id: string
  account_id: string
  account_code: string
  account_name: string
  account_type: AccountType
  total_debit: number
  total_credit: number
  balance: number
}

// ==================== 初期科目テンプレート ====================
export interface AccountTemplate {
  code: string
  name: string
  type: AccountType
  parent_code: string | null
  tax_category: TaxCategory | null
  sort_order: number
  description?: string
}

export interface AccountingTemplate {
  version: string
  name: string
  description: string
  accounts: AccountTemplate[]
  tax_rates: {
    name: string
    rate: number
    category: TaxRateCategory
    applies_from: string
    description?: string
  }[]
}
