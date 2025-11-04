export type TenantApplicationStatus = 'pending' | 'approved' | 'rejected'

export type TenantApplication = {
  id: string
  company_name: string
  postal_code: string | null
  address: string | null
  phone: string
  email: string
  representative_name: string
  representative_email: string
  status: TenantApplicationStatus
  notes: string | null
  tenant_id: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type CreateTenantApplicationInput = {
  company_name: string
  postal_code?: string
  address?: string
  phone: string
  email: string
  representative_name: string
  representative_email: string
  password: string
  fiscal_year_end_month: number // 決算月（1-12）
  first_fiscal_year: number // 最初の会計年度
}

export type UpdateTenantApplicationInput = {
  status?: TenantApplicationStatus
  notes?: string
}
