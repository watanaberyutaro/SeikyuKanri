/**
 * AR（売掛金）アダプタ
 *
 * 既存のAR（payments, payment_allocations）テーブルへの統一インターフェースを提供
 * 銀行リコンサイル機能から、既存ARシステムを直接操作せず、このアダプタ経由でアクセス
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { CreatePaymentInput, CreateAllocationInput } from '@/types/ar'

export type RegisterIncomingPaymentInput = {
  invoice_id: string
  amount: number
  received_on: string // YYYY-MM-DD
  customer_id?: string
  method?: string
  memo?: string
}

export type RegisterIncomingPaymentResult = {
  success: boolean
  payment_id?: string
  allocation_id?: string
  error?: string
}

/**
 * 入金を登録し、請求書に消込
 *
 * @param input 入金情報
 * @param supabase Supabase クライアント
 * @param tenant_id テナントID
 * @param user_id ユーザーID
 * @returns 登録結果
 */
export async function registerIncomingPayment(
  input: RegisterIncomingPaymentInput,
  supabase: SupabaseClient,
  tenant_id: string,
  user_id: string
): Promise<RegisterIncomingPaymentResult> {
  try {
    // 1. 請求書の存在と金額を確認
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total_amount, company_id')
      .eq('id', input.invoice_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (invoiceError || !invoice) {
      return {
        success: false,
        error: `請求書が見つかりません: ${invoiceError?.message || 'Not found'}`
      }
    }

    // 2. 既存の配分合計を取得
    const { data: existingAllocations, error: allocError } = await supabase
      .from('payment_allocations')
      .select('allocated_amount')
      .eq('invoice_id', input.invoice_id)
      .eq('tenant_id', tenant_id)

    if (allocError) {
      return {
        success: false,
        error: `既存配分の取得に失敗: ${allocError.message}`
      }
    }

    const totalAllocated = existingAllocations?.reduce(
      (sum, alloc) => sum + Number(alloc.allocated_amount),
      0
    ) || 0

    // 3. 配分可能額チェック
    const remainingBalance = Number(invoice.total_amount) - totalAllocated

    if (input.amount > remainingBalance) {
      return {
        success: false,
        error: `配分額（${input.amount}）が請求書の残高（${remainingBalance}）を超えています`
      }
    }

    if (input.amount <= 0) {
      return {
        success: false,
        error: '配分額は0より大きい必要があります'
      }
    }

    // 4. 入金レコードを作成
    const paymentData: CreatePaymentInput = {
      customer_id: input.customer_id || invoice.company_id,
      received_on: input.received_on,
      amount: input.amount,
      method: input.method || '銀行振込（自動）',
      memo: input.memo
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id,
        user_id,
        ...paymentData
      })
      .select('id')
      .single()

    if (paymentError || !payment) {
      return {
        success: false,
        error: `入金登録に失敗: ${paymentError?.message || 'Unknown error'}`
      }
    }

    // 5. 配分レコードを作成
    const allocationData: CreateAllocationInput = {
      payment_id: payment.id,
      invoice_id: input.invoice_id,
      allocated_amount: input.amount
    }

    const { data: allocation, error: allocationError } = await supabase
      .from('payment_allocations')
      .insert({
        tenant_id,
        user_id,
        ...allocationData
      })
      .select('id')
      .single()

    if (allocationError || !allocation) {
      // 配分失敗時は入金も削除（ロールバック）
      await supabase
        .from('payments')
        .delete()
        .eq('id', payment.id)
        .eq('tenant_id', tenant_id)

      return {
        success: false,
        error: `配分登録に失敗: ${allocationError?.message || 'Unknown error'}`
      }
    }

    return {
      success: true,
      payment_id: payment.id,
      allocation_id: allocation.id
    }
  } catch (error) {
    console.error('registerIncomingPayment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 請求書の残高を取得
 *
 * @param invoice_id 請求書ID
 * @param supabase Supabase クライアント
 * @param tenant_id テナントID
 * @returns 残高情報
 */
export async function getInvoiceBalance(
  invoice_id: string,
  supabase: SupabaseClient,
  tenant_id: string
): Promise<{
  total_amount: number
  allocated_amount: number
  balance: number
} | null> {
  try {
    // 請求書の総額を取得
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', invoice_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (invoiceError || !invoice) {
      return null
    }

    // 配分合計を取得
    const { data: allocations, error: allocError } = await supabase
      .from('payment_allocations')
      .select('allocated_amount')
      .eq('invoice_id', invoice_id)
      .eq('tenant_id', tenant_id)

    if (allocError) {
      return null
    }

    const allocated_amount = allocations?.reduce(
      (sum, alloc) => sum + Number(alloc.allocated_amount),
      0
    ) || 0

    return {
      total_amount: Number(invoice.total_amount),
      allocated_amount,
      balance: Number(invoice.total_amount) - allocated_amount
    }
  } catch (error) {
    console.error('getInvoiceBalance error:', error)
    return null
  }
}

/**
 * 未払い請求書の一覧を取得（リコンサイル候補用）
 *
 * @param supabase Supabase クライアント
 * @param tenant_id テナントID
 * @param filters オプションのフィルタ
 * @returns 未払い請求書の一覧
 */
export async function getUnpaidInvoices(
  supabase: SupabaseClient,
  tenant_id: string,
  filters?: {
    amount?: number // 金額完全一致
    amount_range?: { min: number; max: number } // 金額範囲
    date_range?: { start: string; end: string } // 日付範囲
    customer_name?: string // 顧客名（部分一致）
  }
) {
  try {
    let query = supabase
      .from('ar_invoice_balance')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gt('balance', 0)
      .order('issue_date', { ascending: false })

    // フィルタ適用
    if (filters) {
      if (filters.amount !== undefined) {
        query = query.eq('total_amount', filters.amount)
      }

      if (filters.amount_range) {
        query = query
          .gte('total_amount', filters.amount_range.min)
          .lte('total_amount', filters.amount_range.max)
      }

      if (filters.date_range) {
        query = query
          .gte('issue_date', filters.date_range.start)
          .lte('issue_date', filters.date_range.end)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('getUnpaidInvoices error:', error)
      return []
    }

    // 顧客名フィルタ（ビューにcustomer_nameがない場合はclient_companiesから取得が必要）
    let result = data || []

    if (filters?.customer_name) {
      // 顧客名で絞り込む場合は、client_companiesテーブルと結合が必要
      const { data: invoicesWithCustomer, error: joinError } = await supabase
        .from('invoices')
        .select(`
          *,
          client_companies(name)
        `)
        .eq('tenant_id', tenant_id)
        .in('id', result.map(inv => inv.invoice_id))

      if (!joinError && invoicesWithCustomer) {
        const matchingIds = invoicesWithCustomer
          .filter(inv =>
            inv.client_companies?.name
              ?.toLowerCase()
              .includes(filters.customer_name!.toLowerCase())
          )
          .map(inv => inv.id)

        result = result.filter(inv => matchingIds.includes(inv.invoice_id))
      }
    }

    return result
  } catch (error) {
    console.error('getUnpaidInvoices error:', error)
    return []
  }
}
