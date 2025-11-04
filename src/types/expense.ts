// 経費精算機能の型定義

export type ExpenseClaimStatus = 'draft' | 'submitted' | 'approved' | 'reimbursed' | 'rejected'

export type ExpenseApprovalStatus = 'approved' | 'rejected'

// 経費カテゴリ
export type ExpenseCategory = {
  id: string
  tenant_id: string
  name: string
  default_account_id: string | null
  tax_rate_id: string | null
  created_at: string
  updated_at: string
}

export type CreateExpenseCategoryInput = {
  name: string
  default_account_id?: string | null
  tax_rate_id?: string | null
}

export type UpdateExpenseCategoryInput = Partial<CreateExpenseCategoryInput>

// 経費申請
export type ExpenseClaim = {
  id: string
  tenant_id: string
  employee_user_id: string
  status: ExpenseClaimStatus
  submit_date: string | null
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

// 経費申請（詳細情報付き）
export type ExpenseClaimWithDetails = ExpenseClaim & {
  employee_name?: string
  employee_email?: string
  items?: ExpenseItem[]
  approvals?: ExpenseApproval[]
}

export type CreateExpenseClaimInput = {
  notes?: string | null
}

export type UpdateExpenseClaimInput = {
  notes?: string | null
  status?: ExpenseClaimStatus
}

// 経費明細
export type ExpenseItem = {
  id: string
  tenant_id: string
  claim_id: string
  spent_on: string
  merchant: string
  description: string | null
  amount: number
  tax_rate_id: string | null
  account_id: string | null
  category_id: string | null
  attachment_url: string | null
  created_at: string
  updated_at: string
}

// 経費明細（詳細情報付き）
export type ExpenseItemWithDetails = ExpenseItem & {
  tax_rate_name?: string
  account_code?: string
  account_name?: string
  category_name?: string
}

export type CreateExpenseItemInput = {
  claim_id: string
  spent_on: string
  merchant: string
  description?: string | null
  amount: number
  tax_rate_id?: string | null
  account_id?: string | null
  category_id?: string | null
  attachment_url?: string | null
}

export type UpdateExpenseItemInput = Partial<Omit<CreateExpenseItemInput, 'claim_id'>>

// 承認履歴
export type ExpenseApproval = {
  id: string
  tenant_id: string
  claim_id: string
  approver_user_id: string
  status: ExpenseApprovalStatus
  comment: string | null
  decided_at: string
  created_at: string
}

// 承認履歴（詳細情報付き）
export type ExpenseApprovalWithDetails = ExpenseApproval & {
  approver_name?: string
  approver_email?: string
}

export type CreateExpenseApprovalInput = {
  claim_id: string
  status: ExpenseApprovalStatus
  comment?: string | null
}

// API レスポンス型
export type ExpenseCategoriesResponse = {
  categories: ExpenseCategory[]
}

export type ExpenseClaimsResponse = {
  claims: ExpenseClaimWithDetails[]
}

export type ExpenseClaimResponse = {
  claim: ExpenseClaimWithDetails
}

export type ExpenseItemsResponse = {
  items: ExpenseItemWithDetails[]
}
