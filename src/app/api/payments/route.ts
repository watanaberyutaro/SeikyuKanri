import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreatePaymentInput } from '@/types/ar'

// GET /api/payments - 入金一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // プロフィールからtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 400 })
  }

  // クエリパラメータ
  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get('customer_id')

  // 入金を取得
  let query = supabase
    .from('payments')
    .select(`
      *,
      customer:client_companies(id, name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('user_id', user.id)
    .order('received_on', { ascending: false })

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data: payments, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payments })
}

// POST /api/payments - 入金登録
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // プロフィールからtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 400 })
  }

  const body: CreatePaymentInput = await request.json()

  // バリデーション
  if (!body.received_on || !body.amount || body.amount <= 0) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 入金を作成
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      customer_id: body.customer_id || null,
      received_on: body.received_on,
      amount: body.amount,
      method: body.method || null,
      memo: body.memo || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payment }, { status: 201 })
}
