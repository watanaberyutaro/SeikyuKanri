import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/payments/[id] - 入金詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 入金を取得（RLSが自動的にtenant_id + user_idをチェック）
  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      customer:client_companies(id, name),
      allocations:payment_allocations(
        *,
        invoice:invoices(id, invoice_number, total_amount)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!payment) {
    return NextResponse.json({ error: '入金が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ payment })
}

// DELETE /api/payments/[id] - 入金削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 配分があるかチェック
  const { data: allocations } = await supabase
    .from('payment_allocations')
    .select('id')
    .eq('payment_id', id)

  if (allocations && allocations.length > 0) {
    return NextResponse.json(
      { error: '配分済みの入金は削除できません。先に配分を削除してください' },
      { status: 400 }
    )
  }

  // 入金を削除（RLSが自動的にtenant_id + user_idをチェック）
  const { error } = await supabase.from('payments').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
