import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerIncomingPayment } from '@/lib/adapters/ar'
import { registerOutgoingPayment } from '@/lib/adapters/ap'

/**
 * POST /api/bank/reconcile/confirm
 *
 * 銀行取引の突合を確定し、AR/AP に登録
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // プロフィール取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { bank_row_id, target_type, target_id } = body

    if (!bank_row_id || !target_type || !target_id) {
      return NextResponse.json(
        { error: 'bank_row_id, target_type, target_id は必須です' },
        { status: 400 }
      )
    }

    if (!['invoice', 'bill'].includes(target_type)) {
      return NextResponse.json(
        { error: 'target_type は invoice または bill である必要があります' },
        { status: 400 }
      )
    }

    // bank_row を取得
    const { data: bankRow, error: rowError } = await supabase
      .from('bank_rows')
      .select('*')
      .eq('id', bank_row_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (rowError || !bankRow) {
      return NextResponse.json({ error: '銀行取引行が見つかりません' }, { status: 404 })
    }

    // 既に突合済みかチェック
    if (bankRow.matched) {
      return NextResponse.json({ error: 'この取引は既に突合済みです' }, { status: 400 })
    }

    // タイプの整合性チェック
    if (target_type === 'invoice' && bankRow.type !== 'in') {
      return NextResponse.json(
        { error: '請求書（AR）は入金取引とのみ突合できます' },
        { status: 400 }
      )
    }

    if (target_type === 'bill' && bankRow.type !== 'out') {
      return NextResponse.json(
        { error: '請求書（AP）は出金取引とのみ突合できます' },
        { status: 400 }
      )
    }

    let result: any

    if (target_type === 'invoice') {
      // AR: 入金を登録して請求書に消込
      result = await registerIncomingPayment(
        {
          invoice_id: target_id,
          amount: Number(bankRow.amount),
          received_on: bankRow.txn_date,
          method: '銀行振込（自動突合）',
          memo: `銀行取引からの自動突合: ${bankRow.description}`
        },
        supabase,
        profile.tenant_id,
        user.id
      )

      if (!result.success) {
        return NextResponse.json(
          { error: `入金登録に失敗: ${result.error}` },
          { status: 400 }
        )
      }
    } else if (target_type === 'bill') {
      // AP: 支払を登録して請求書に消込
      result = await registerOutgoingPayment(
        {
          bill_id: target_id,
          amount: Number(bankRow.amount),
          paid_on: bankRow.txn_date,
          method: '銀行振込（自動突合）',
          memo: `銀行取引からの自動突合: ${bankRow.description}`
        },
        supabase,
        profile.tenant_id,
        user.id
      )

      if (!result.success) {
        return NextResponse.json(
          { error: `支払登録に失敗: ${result.error}` },
          { status: 400 }
        )
      }
    }

    // bank_row を突合済みに更新
    const { error: updateError } = await supabase
      .from('bank_rows')
      .update({
        matched: true,
        matched_target_type: target_type,
        matched_target_id: target_id,
        matched_at: new Date().toISOString()
      })
      .eq('id', bank_row_id)
      .eq('tenant_id', profile.tenant_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: '突合状態の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bank_row_id: bank_row_id,
      target_type: target_type,
      target_id: target_id,
      payment_id: result.payment_id || result.payout_id,
      allocation_id: result.allocation_id
    })
  } catch (error) {
    console.error('Reconcile confirm error:', error)
    return NextResponse.json(
      {
        error: '突合確定中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
