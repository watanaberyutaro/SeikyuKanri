import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BillBalance } from '@/types/ap'

// GET /api/ap/aging - 買掛年齢表取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const view = searchParams.get('view') || 'vendor'

  try {
    if (view === 'bill') {
      // 請求書単位の残高取得
      const balances = await getBillBalances(supabase, profile.tenant_id, user.id)
      return NextResponse.json({ balances })
    } else {
      // 仕入先単位の年齢区分別集計
      const { data: aging, error } = await supabase
        .from('ap_aging_by_vendor')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('total', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ aging })
    }
  } catch (error: any) {
    console.error('Error fetching AP aging:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 請求書単位の残高を取得
async function getBillBalances(
  supabase: any,
  tenantId: string,
  userId: string
): Promise<BillBalance[]> {
  // 発行済み（未払い）の請求書を取得
  const { data: bills, error } = await supabase
    .from('bills')
    .select('id, vendor_id, bill_number, bill_date, due_date, total_amount, status, vendors(name)')
    .eq('tenant_id', tenantId)
    .in('status', ['issued', 'partially_paid'])
    .order('bill_date', { ascending: false })

  if (error) {
    console.error('Error fetching bills:', error)
    throw new Error('請求書の取得に失敗しました')
  }

  if (!bills || bills.length === 0) {
    return []
  }

  // 各請求書の支払済み額を取得
  const billIds = bills.map((b) => b.id)
  const { data: allocations } = await supabase
    .from('ap_allocations')
    .select('bill_id, allocated_amount')
    .eq('tenant_id', tenantId)
    .in('bill_id', billIds)

  // 支払額を請求書ごとに集計
  const allocationMap = new Map<string, number>()
  if (allocations) {
    for (const alloc of allocations) {
      const current = allocationMap.get(alloc.bill_id) || 0
      allocationMap.set(alloc.bill_id, current + Number(alloc.allocated_amount))
    }
  }

  // 残高を計算
  const today = new Date()
  const balances: BillBalance[] = bills
    .map((bill) => {
      const totalAmount = Number(bill.total_amount)
      const allocatedAmount = allocationMap.get(bill.id) || 0
      const balance = totalAmount - allocatedAmount

      // 残高がある場合のみ含める
      if (balance <= 0) {
        return null
      }

      // 遅延日数を計算
      const dueDate = bill.due_date ? new Date(bill.due_date) : null
      const daysOverdue = dueDate
        ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0

      // 年齢区分を決定
      let agingBucket: '0-30' | '31-60' | '61-90' | '90+' = '0-30'
      if (daysOverdue > 90) {
        agingBucket = '90+'
      } else if (daysOverdue > 60) {
        agingBucket = '61-90'
      } else if (daysOverdue > 30) {
        agingBucket = '31-60'
      }

      return {
        bill_id: bill.id,
        tenant_id: tenantId,
        user_id: userId,
        vendor_id: bill.vendor_id,
        vendor_name: bill.vendors?.name || '',
        bill_number: bill.bill_number,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        total_amount: totalAmount,
        allocated_amount: allocatedAmount,
        balance,
        days_overdue: daysOverdue,
        aging_bucket: agingBucket,
        status: bill.status,
      } as BillBalance
    })
    .filter((b): b is BillBalance => b !== null)

  return balances
}
