import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateAllocationInput } from '@/types/ar'

// POST /api/allocations - 配分登録
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

  const body: CreateAllocationInput = await request.json()

  // バリデーション
  if (!body.payment_id || !body.invoice_id || !body.allocated_amount || body.allocated_amount <= 0) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 配分を作成（トリガーが整合性をチェック）
  const { data: allocation, error } = await supabase
    .from('payment_allocations')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      payment_id: body.payment_id,
      invoice_id: body.invoice_id,
      allocated_amount: body.allocated_amount,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 請求書の残高を確認してステータスを更新
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total_amount')
    .eq('id', body.invoice_id)
    .single()

  if (invoice) {
    // この請求書への配分合計を計算
    const { data: allocations } = await supabase
      .from('payment_allocations')
      .select('allocated_amount')
      .eq('invoice_id', body.invoice_id)

    const totalAllocated = allocations?.reduce(
      (sum, a) => sum + Number(a.allocated_amount),
      0
    ) || 0

    // 残高がゼロ以下になったら入金済みに更新（即時反映）
    if (totalAllocated >= Number(invoice.total_amount)) {
      // 入金日を取得
      const { data: payment } = await supabase
        .from('payments')
        .select('received_on')
        .eq('id', body.payment_id)
        .single()

      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          payment_date: payment?.received_on || new Date().toISOString().split('T')[0],
        })
        .eq('id', body.invoice_id)
    }
  }

  return NextResponse.json({ allocation }, { status: 201 })
}

// DELETE /api/allocations/[id] - 配分削除
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  // 削除前に請求書IDを取得
  const { data: allocationToDelete } = await supabase
    .from('payment_allocations')
    .select('invoice_id')
    .eq('id', id)
    .single()

  const invoiceId = allocationToDelete?.invoice_id

  // 配分を削除（RLSが自動的にtenant_id + user_idをチェック）
  const { error } = await supabase.from('payment_allocations').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 請求書のステータスを更新（残高が発生したら入金済みを解除）
  if (invoiceId) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, total_amount, status')
      .eq('id', invoiceId)
      .single()

    if (invoice && invoice.status === 'paid') {
      // 残りの配分合計を計算
      const { data: remainingAllocations } = await supabase
        .from('payment_allocations')
        .select('allocated_amount')
        .eq('invoice_id', invoiceId)

      const totalAllocated = remainingAllocations?.reduce(
        (sum, a) => sum + Number(a.allocated_amount),
        0
      ) || 0

      // 残高が発生したら'sent'に戻す
      if (totalAllocated < Number(invoice.total_amount)) {
        await supabase
          .from('invoices')
          .update({
            status: 'sent',
            payment_date: null,
          })
          .eq('id', invoiceId)
      }
    }
  }

  return NextResponse.json({ success: true })
}
