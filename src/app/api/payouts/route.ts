import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreatePayoutInput } from '@/types/ap'

// GET /api/payouts - 支払一覧取得
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
  const vendorId = searchParams.get('vendor_id')

  let query = supabase
    .from('payouts')
    .select('*, vendors(id, name)')
    .eq('tenant_id', profile.tenant_id)
    .order('paid_on', { ascending: false })

  if (vendorId) {
    query = query.eq('vendor_id', vendorId)
  }

  const { data: payouts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payouts })
}

// POST /api/payouts - 支払登録
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

  const body: CreatePayoutInput = await request.json()

  if (!body.paid_on || body.amount === undefined || body.amount <= 0) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const { data: payout, error } = await supabase
    .from('payouts')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      vendor_id: body.vendor_id || null,
      paid_on: body.paid_on,
      amount: body.amount,
      method: body.method || null,
      reference_number: body.reference_number || null,
      memo: body.memo || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payout }, { status: 201 })
}
