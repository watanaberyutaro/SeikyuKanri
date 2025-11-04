import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/expenses/claims/[id]/submit - 経費申請を提出
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  const { id: claimId } = await params

  try {
    // 申請を取得
    const { data: claim, error: fetchError } = await supabase
      .from('expense_claims')
      .select('*, items:expense_items(id)')
      .eq('id', claimId)
      .eq('tenant_id', profile.tenant_id)
      .eq('employee_user_id', user.id) // 自分の申請のみ
      .single()

    if (fetchError || !claim) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // ステータスチェック
    if (claim.status !== 'draft') {
      return NextResponse.json(
        { error: '下書き状態の申請のみ提出できます' },
        { status: 400 }
      )
    }

    // 明細が存在するかチェック
    if (!claim.items || claim.items.length === 0) {
      return NextResponse.json(
        { error: '明細が1件以上必要です' },
        { status: 400 }
      )
    }

    // ステータスを submitted に更新
    const { data: updatedClaim, error: updateError } = await supabase
      .from('expense_claims')
      .update({
        status: 'submitted',
        submit_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', claimId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Claim submit error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      message: '経費申請を提出しました',
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
