// 売掛管理機能の型定義

export type Payment = {
  id: string
  tenant_id: string
  user_id: string
  customer_id: string | null
  received_on: string
  amount: number
  method: string | null
  memo: string | null
  created_at: string
  updated_at: string
}

export type PaymentAllocation = {
  id: string
  tenant_id: string
  user_id: string
  payment_id: string
  invoice_id: string
  allocated_amount: number
  created_at: string
}

export type DunningRule = {
  id: string
  tenant_id: string
  user_id: string
  name: string
  bucket: '0-30' | '31-60' | '61-90' | '90+'
  subject: string
  body: string
  send_email: boolean
  bcc: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export type DunningLog = {
  id: string
  tenant_id: string
  user_id: string
  invoice_id: string
  rule_id: string | null
  sent_at: string
  channel: 'email' | 'none'
  result: string | null
  created_at: string
}

export type ARAgingByCustomer = {
  tenant_id: string
  user_id: string
  customer_id: string
  customer_name: string
  current: number
  b31_60: number
  b61_90: number
  b90_plus: number
  total: number
  as_of: string
}

export type ARInvoiceBalance = {
  invoice_id: string
  tenant_id: string
  user_id: string
  company_id: string
  invoice_number: string
  issue_date: string
  due_date: string | null
  total_amount: number
  allocated_amount: number
  balance: number
  days_overdue: number
  aging_bucket: '0-30' | '31-60' | '61-90' | '90+'
}

export type CreatePaymentInput = {
  customer_id?: string
  received_on: string
  amount: number
  method?: string
  memo?: string
}

export type CreateAllocationInput = {
  payment_id: string
  invoice_id: string
  allocated_amount: number
}

export type SendDunningInput = {
  invoice_ids: string[]
  rule_id: string
  dry_run?: boolean
}
