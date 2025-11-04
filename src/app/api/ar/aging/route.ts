import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ARInvoiceBalance } from '@/types/ar'

// GET /api/ar/aging - 売掛残高を年齢区分別に取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ユーザーのtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const view = searchParams.get('view') || 'customer'

  try {
    if (view === 'invoice') {
      // 請求書単位の残高取得
      const balances = await getInvoiceBalances(supabase, profile.tenant_id, user.id)
      return NextResponse.json({ balances })
    } else {
      // 顧客単位の年齢区分別集計（未実装）
      return NextResponse.json({ error: '顧客単位の集計は未実装です' }, { status: 501 })
    }
  } catch (error: any) {
    console.error('Error fetching AR aging:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 請求書単位の残高を取得
async function getInvoiceBalances(
  supabase: any,
  tenantId: string,
  userId: string
): Promise<ARInvoiceBalance[]> {
  // 送付済み（未入金）の請求書を取得
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, company_id, invoice_number, issue_date, due_date, total_amount')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'sent')
    .order('issue_date', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
    throw new Error('請求書の取得に失敗しました')
  }

  if (!invoices || invoices.length === 0) {
    return []
  }

  // 各請求書の入金済み額を取得
  const invoiceIds = invoices.map((inv) => inv.id)
  const { data: allocations } = await supabase
    .from('ar_payment_allocations')
    .select('invoice_id, allocated_amount')
    .eq('tenant_id', tenantId)
    .in('invoice_id', invoiceIds)

  // 入金額を請求書ごとに集計
  const allocationMap = new Map<string, number>()
  if (allocations) {
    for (const alloc of allocations) {
      const current = allocationMap.get(alloc.invoice_id) || 0
      allocationMap.set(alloc.invoice_id, current + Number(alloc.allocated_amount))
    }
  }

  // 残高を計算
  const today = new Date()
  const balances: ARInvoiceBalance[] = invoices
    .map((invoice) => {
      const totalAmount = Number(invoice.total_amount)
      const allocatedAmount = allocationMap.get(invoice.id) || 0
      const balance = totalAmount - allocatedAmount

      // 残高がある場合のみ含める
      if (balance <= 0) {
        return null
      }

      // 遅延日数を計算
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
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
        invoice_id: invoice.id,
        tenant_id: tenantId,
        user_id: userId,
        company_id: invoice.company_id,
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total_amount: totalAmount,
        allocated_amount: allocatedAmount,
        balance,
        days_overdue: daysOverdue,
        aging_bucket: agingBucket,
      } as ARInvoiceBalance
    })
    .filter((b): b is ARInvoiceBalance => b !== null)

  return balances
}
