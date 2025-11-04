// 買掛管理（AP: Accounts Payable）機能の型定義
// 既存のAR（売掛）とは完全に独立

// ========================================
// 仕入先
// ========================================
export type Vendor = {
  id: string
  tenant_id: string
  user_id: string
  name: string
  code?: string
  email?: string
  phone?: string
  postal_code?: string
  address?: string
  contact_person?: string
  payment_terms?: string
  memo?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreateVendorInput = {
  name: string
  code?: string
  email?: string
  phone?: string
  postal_code?: string
  address?: string
  contact_person?: string
  payment_terms?: string
  memo?: string
  is_active?: boolean
}

export type UpdateVendorInput = Partial<CreateVendorInput>

// ========================================
// 請求書（買掛）
// ========================================
export type BillStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue'

export type TaxBreakdown = {
  rate: number
  base: number
  tax: number
}

export type Bill = {
  id: string
  tenant_id: string
  user_id: string
  vendor_id: string
  bill_number: string
  bill_date: string
  due_date?: string
  subtotal: number
  tax_amount: number
  total_amount: number
  tax_breakdown?: TaxBreakdown[]
  status: BillStatus
  notes?: string
  created_at: string
  updated_at: string
}

export type BillLine = {
  id: string
  tenant_id: string
  user_id: string
  bill_id: string
  line_number: number
  description: string
  quantity: number
  unit_price: number
  amount: number
  tax_rate_id?: string
  account_id?: string
  sort_order: number
  created_at: string
}

export type CreateBillInput = {
  vendor_id: string
  bill_number: string
  bill_date: string
  due_date?: string
  status?: BillStatus
  notes?: string
  lines: {
    description: string
    quantity: number
    unit_price: number
    amount: number
    tax_rate_id?: string
    account_id?: string
  }[]
}

export type UpdateBillInput = {
  vendor_id?: string
  bill_number?: string
  bill_date?: string
  due_date?: string
  status?: BillStatus
  notes?: string
  lines?: {
    description: string
    quantity: number
    unit_price: number
    amount: number
    tax_rate_id?: string
    account_id?: string
  }[]
}

// ========================================
// 支払（Payout）
// ========================================
export type Payout = {
  id: string
  tenant_id: string
  user_id: string
  vendor_id?: string
  paid_on: string
  amount: number
  method?: string
  reference_number?: string
  memo?: string
  created_at: string
  updated_at: string
}

export type CreatePayoutInput = {
  vendor_id?: string
  paid_on: string
  amount: number
  method?: string
  reference_number?: string
  memo?: string
}

// ========================================
// 買掛消込
// ========================================
export type APAllocation = {
  id: string
  tenant_id: string
  user_id: string
  payout_id: string
  bill_id: string
  allocated_amount: number
  created_at: string
}

export type CreateAPAllocationInput = {
  payout_id: string
  bill_id: string
  allocated_amount: number
}

// ========================================
// 年齢表
// ========================================
export type APAgingByVendor = {
  tenant_id: string
  user_id: string
  vendor_id: string
  vendor_name: string
  b0_30: number
  b31_60: number
  b61_90: number
  b90_plus: number
  total: number
  as_of: string
}

// ========================================
// 請求書残高（明細用）
// ========================================
export type BillBalance = {
  bill_id: string
  tenant_id: string
  user_id: string
  vendor_id: string
  vendor_name: string
  bill_number: string
  bill_date: string
  due_date?: string
  total_amount: number
  allocated_amount: number
  balance: number
  days_overdue: number
  aging_bucket: '0-30' | '31-60' | '61-90' | '90+'
  status: BillStatus
}

// ========================================
// システム勘定科目マッピング
// ========================================
export type SystemAccountMappingType =
  | 'ap_payable' // 買掛金
  | 'ap_cash' // 現金（支払用）
  | 'ap_bank' // 預金（支払用）
  | 'ar_receivable' // 売掛金
  | 'ar_cash' // 現金（入金用）
  | 'ar_bank' // 預金（入金用）

export type SystemAccountMapping = {
  id: string
  tenant_id: string
  user_id: string
  mapping_type: SystemAccountMappingType
  account_id: string
  created_at: string
  updated_at: string
}

export type CreateSystemAccountMappingInput = {
  mapping_type: SystemAccountMappingType
  account_id: string
}

export type UpdateSystemAccountMappingInput = {
  account_id: string
}
