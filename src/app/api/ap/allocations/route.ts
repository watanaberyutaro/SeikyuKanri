import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateAPAllocationInput } from '@/types/ap'

// POST /api/ap/allocations - 買掛消込登録
export async function POST(request: NextRequest) {
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

  const body: CreateAPAllocationInput = await request.json()

  if (!body.payout_id || !body.bill_id || !body.allocated_amount || body.allocated_amount <= 0) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // トランザクション的に処理
  // 1. 請求書の残高を確認
  const { data: bill } = await supabase
    .from('bills')
    .select('total_amount')
    .eq('id', body.bill_id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!bill) {
    return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
  }

  // 既存の配分額を取得
  const { data: existingAllocations } = await supabase
    .from('ap_allocations')
    .select('allocated_amount')
    .eq('bill_id', body.bill_id)

  const totalAllocated =
    (existingAllocations?.reduce((sum, a) => sum + Number(a.allocated_amount), 0) || 0) +
    Number(body.allocated_amount)

  if (totalAllocated > Number(bill.total_amount)) {
    return NextResponse.json({ error: '配分額が請求額を超えています' }, { status: 400 })
  }

  // 2. 支払の残高を確認
  const { data: payout } = await supabase
    .from('payouts')
    .select('amount')
    .eq('id', body.payout_id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!payout) {
    return NextResponse.json({ error: '支払が見つかりません' }, { status: 404 })
  }

  const { data: payoutAllocations } = await supabase
    .from('ap_allocations')
    .select('allocated_amount')
    .eq('payout_id', body.payout_id)

  const totalPayoutAllocated =
    (payoutAllocations?.reduce((sum, a) => sum + Number(a.allocated_amount), 0) || 0) +
    Number(body.allocated_amount)

  if (totalPayoutAllocated > Number(payout.amount)) {
    return NextResponse.json({ error: '配分額が支払額を超えています' }, { status: 400 })
  }

  // 3. 配分を登録
  const { data: allocation, error } = await supabase
    .from('ap_allocations')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      payout_id: body.payout_id,
      bill_id: body.bill_id,
      allocated_amount: body.allocated_amount,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 4. 請求書のステータスを更新
  const billTotalAllocated = totalAllocated
  let newStatus = 'issued'
  if (billTotalAllocated >= Number(bill.total_amount)) {
    newStatus = 'paid'
  } else if (billTotalAllocated > 0) {
    newStatus = 'partially_paid'
  }

  await supabase
    .from('bills')
    .update({ status: newStatus })
    .eq('id', body.bill_id)
    .eq('tenant_id', profile.tenant_id)

  return NextResponse.json({ allocation }, { status: 201 })
}

// GET /api/ap/allocations - 買掛消込一覧取得
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
  const payoutId = searchParams.get('payout_id')
  const billId = searchParams.get('bill_id')

  let query = supabase
    .from('ap_allocations')
    .select('*, payouts(paid_on, amount), bills(bill_number, total_amount)')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  if (payoutId) {
    query = query.eq('payout_id', payoutId)
  }

  if (billId) {
    query = query.eq('bill_id', billId)
  }

  const { data: allocations, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ allocations })
}
