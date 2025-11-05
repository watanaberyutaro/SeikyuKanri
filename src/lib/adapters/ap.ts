/**
 * AP（買掛金）アダプタ
 *
 * 既存のAP（payouts, ap_allocations, bills）テーブルへの統一インターフェースを提供
 * 銀行リコンサイル機能から、既存APシステムを直接操作せず、このアダプタ経由でアクセス
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { CreatePayoutInput, CreateAPAllocationInput } from '@/types/ap'

export type RegisterOutgoingPaymentInput = {
  bill_id: string
  amount: number
  paid_on: string // YYYY-MM-DD
  vendor_id?: string
  method?: string
  reference_number?: string
  memo?: string
}

export type RegisterOutgoingPaymentResult = {
  success: boolean
  payout_id?: string
  allocation_id?: string
  error?: string
}

/**
 * 支払を登録し、請求書（買掛）に消込
 *
 * @param input 支払情報
 * @param supabase Supabase クライアント
 * @param tenant_id テナントID
 * @param user_id ユーザーID
 * @returns 登録結果
 */
export async function registerOutgoingPayment(
  input: RegisterOutgoingPaymentInput,
  supabase: SupabaseClient,
  tenant_id: string,
  user_id: string
): Promise<RegisterOutgoingPaymentResult> {
  try {
    // 1. 請求書（買掛）の存在と金額を確認
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, total_amount, vendor_id')
      .eq('id', input.bill_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (billError || !bill) {
      return {
        success: false,
        error: `請求書が見つかりません: ${billError?.message || 'Not found'}`
      }
    }

    // 2. 既存の配分合計を取得
    const { data: existingAllocations, error: allocError } = await supabase
      .from('ap_allocations')
      .select('allocated_amount')
      .eq('bill_id', input.bill_id)
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
    const remainingBalance = Number(bill.total_amount) - totalAllocated

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

    // 4. 支払レコードを作成
    const payoutData: CreatePayoutInput = {
      vendor_id: input.vendor_id || bill.vendor_id,
      paid_on: input.paid_on,
      amount: input.amount,
      method: input.method || '銀行振込（自動）',
      reference_number: input.reference_number,
      memo: input.memo
    }

    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        tenant_id,
        user_id,
        ...payoutData
      })
      .select('id')
      .single()

    if (payoutError || !payout) {
      return {
        success: false,
        error: `支払登録に失敗: ${payoutError?.message || 'Unknown error'}`
      }
    }

    // 5. 配分レコードを作成
    const allocationData: CreateAPAllocationInput = {
      payout_id: payout.id,
      bill_id: input.bill_id,
      allocated_amount: input.amount
    }

    const { data: allocation, error: allocationError } = await supabase
      .from('ap_allocations')
      .insert({
        tenant_id,
        user_id,
        ...allocationData
      })
      .select('id')
      .single()

    if (allocationError || !allocation) {
      // 配分失敗時は支払も削除（ロールバック）
      await supabase
        .from('payouts')
        .delete()
        .eq('id', payout.id)
        .eq('tenant_id', tenant_id)

      return {
        success: false,
        error: `配分登録に失敗: ${allocationError?.message || 'Unknown error'}`
      }
    }

    return {
      success: true,
      payout_id: payout.id,
      allocation_id: allocation.id
    }
  } catch (error) {
    console.error('registerOutgoingPayment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 請求書（買掛）の残高を取得
 *
 * @param bill_id 請求書ID
 * @param supabase Supabase クライアント
 * @param tenant_id テナントID
 * @returns 残高情報
 */
export async function getBillBalance(
  bill_id: string,
  supabase: SupabaseClient,
  tenant_id: string
): Promise<{
  total_amount: number
  allocated_amount: number
  balance: number
} | null> {
  try {
    // 請求書の総額を取得
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('total_amount')
      .eq('id', bill_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (billError || !bill) {
      return null
    }

    // 配分合計を取得
    const { data: allocations, error: allocError } = await supabase
      .from('ap_allocations')
      .select('allocated_amount')
      .eq('bill_id', bill_id)
      .eq('tenant_id', tenant_id)

    if (allocError) {
      return null
    }

    const allocated_amount = allocations?.reduce(
      (sum, alloc) => sum + Number(alloc.allocated_amount),
      0
    ) || 0

    return {
      total_amount: Number(bill.total_amount),
      allocated_amount,
      balance: Number(bill.total_amount) - allocated_amount
    }
  } catch (error) {
    console.error('getBillBalance error:', error)
    return null
  }
}

/**
 * 未払い請求書（買掛）の一覧を取得（リコンサイル候補用）
 *
 * @param supabase Supabase クライアント
 * @param tenant_id テナントID
 * @param filters オプションのフィルタ
 * @returns 未払い請求書の一覧
 */
export async function getUnpaidBills(
  supabase: SupabaseClient,
  tenant_id: string,
  filters?: {
    amount?: number // 金額完全一致
    amount_range?: { min: number; max: number } // 金額範囲
    date_range?: { start: string; end: string } // 日付範囲
    vendor_name?: string // 仕入先名（部分一致）
  }
) {
  try {
    // bills と vendors を結合して取得
    let query = supabase
      .from('bills')
      .select(`
        *,
        vendors(name)
      `)
      .eq('tenant_id', tenant_id)
      .in('status', ['issued', 'partially_paid'])
      .order('bill_date', { ascending: false })

    // 金額フィルタ
    if (filters?.amount !== undefined) {
      query = query.eq('total_amount', filters.amount)
    }

    if (filters?.amount_range) {
      query = query
        .gte('total_amount', filters.amount_range.min)
        .lte('total_amount', filters.amount_range.max)
    }

    // 日付フィルタ
    if (filters?.date_range) {
      query = query
        .gte('bill_date', filters.date_range.start)
        .lte('bill_date', filters.date_range.end)
    }

    const { data: bills, error } = await query

    if (error) {
      console.error('getUnpaidBills error:', error)
      return []
    }

    if (!bills) {
      return []
    }

    // 各請求書の配分額を取得
    const billsWithBalance = await Promise.all(
      bills.map(async (bill) => {
        const { data: allocations } = await supabase
          .from('ap_allocations')
          .select('allocated_amount')
          .eq('bill_id', bill.id)
          .eq('tenant_id', tenant_id)

        const allocated_amount = allocations?.reduce(
          (sum, alloc) => sum + Number(alloc.allocated_amount),
          0
        ) || 0

        const balance = Number(bill.total_amount) - allocated_amount

        return {
          ...bill,
          allocated_amount,
          balance,
          vendor_name: (bill.vendors as any)?.name || ''
        }
      })
    )

    // 残高がある請求書のみフィルタ
    let result = billsWithBalance.filter(bill => bill.balance > 0)

    // 仕入先名フィルタ
    if (filters?.vendor_name) {
      const lowerVendorName = filters.vendor_name.toLowerCase()
      result = result.filter(bill =>
        bill.vendor_name.toLowerCase().includes(lowerVendorName)
      )
    }

    return result
  } catch (error) {
    console.error('getUnpaidBills error:', error)
    return []
  }
}
