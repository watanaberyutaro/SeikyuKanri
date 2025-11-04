import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateBillInput, UpdateBillInput } from '@/types/ap'

// GET /api/bills - 請求書一覧取得
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
  const status = searchParams.get('status')
  const vendorId = searchParams.get('vendor_id')

  let query = supabase
    .from('bills')
    .select('*, vendors(id, name)')
    .eq('tenant_id', profile.tenant_id)
    .order('bill_date', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (vendorId) {
    query = query.eq('vendor_id', vendorId)
  }

  const { data: bills, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bills })
}

// POST /api/bills - 請求書登録
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

  const body: CreateBillInput = await request.json()

  if (!body.vendor_id || !body.bill_number || !body.bill_date || !body.lines || body.lines.length === 0) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 小計、税額、合計を計算
  const subtotal = body.lines.reduce((sum, line) => sum + line.amount, 0)
  const tax_amount = Math.floor(subtotal * 0.1) // 簡易計算（10%）
  const total_amount = subtotal + tax_amount

  // 請求書を作成
  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      vendor_id: body.vendor_id,
      bill_number: body.bill_number,
      bill_date: body.bill_date,
      due_date: body.due_date || null,
      subtotal,
      tax_amount,
      total_amount,
      status: body.status || 'draft',
      notes: body.notes || null,
    })
    .select()
    .single()

  if (billError) {
    return NextResponse.json({ error: billError.message }, { status: 500 })
  }

  // 明細を作成
  const lines = body.lines.map((line, index) => ({
    tenant_id: profile.tenant_id,
    user_id: user.id,
    bill_id: bill.id,
    line_number: index + 1,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    amount: line.amount,
    tax_rate_id: line.tax_rate_id || null,
    account_id: line.account_id || null,
    sort_order: index,
  }))

  const { error: linesError } = await supabase.from('bill_lines').insert(lines)

  if (linesError) {
    return NextResponse.json({ error: linesError.message }, { status: 500 })
  }

  return NextResponse.json({ bill }, { status: 201 })
}

// PATCH /api/bills?id=xxx - 請求書更新
export async function PATCH(request: NextRequest) {
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
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  const body: UpdateBillInput = await request.json()

  // 明細が更新される場合
  if (body.lines) {
    // 既存の明細を削除
    await supabase.from('bill_lines').delete().eq('bill_id', id)

    // 小計、税額、合計を再計算
    const subtotal = body.lines.reduce((sum, line) => sum + line.amount, 0)
    const tax_amount = Math.floor(subtotal * 0.1)
    const total_amount = subtotal + tax_amount

    // 新しい明細を作成
    const lines = body.lines.map((line, index) => ({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      bill_id: id,
      line_number: index + 1,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      amount: line.amount,
      tax_rate_id: line.tax_rate_id || null,
      account_id: line.account_id || null,
      sort_order: index,
    }))

    const { error: linesError } = await supabase.from('bill_lines').insert(lines)

    if (linesError) {
      return NextResponse.json({ error: linesError.message }, { status: 500 })
    }

    // 請求書の金額を更新
    const updateData: any = {
      subtotal,
      tax_amount,
      total_amount,
    }

    if (body.vendor_id !== undefined) updateData.vendor_id = body.vendor_id
    if (body.bill_number !== undefined) updateData.bill_number = body.bill_number
    if (body.bill_date !== undefined) updateData.bill_date = body.bill_date
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: bill, error } = await supabase
      .from('bills')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bill })
  } else {
    // ステータスのみの更新など
    const updateData: any = {}
    if (body.vendor_id !== undefined) updateData.vendor_id = body.vendor_id
    if (body.bill_number !== undefined) updateData.bill_number = body.bill_number
    if (body.bill_date !== undefined) updateData.bill_date = body.bill_date
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: bill, error } = await supabase
      .from('bills')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bill })
  }
}
