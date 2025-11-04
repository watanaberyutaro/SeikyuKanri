import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/expenses/claims/[id]/reject - 経費申請を却下
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
    const body = await request.json()
    const comment = body.comment || null

    // 申請を取得
    const { data: claim, error: fetchError } = await supabase
      .from('expense_claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !claim) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // ステータスチェック
    if (claim.status !== 'submitted') {
      return NextResponse.json(
        { error: '提出済みの申請のみ却下できます' },
        { status: 400 }
      )
    }

    // 自分の申請は却下できない
    if (claim.employee_user_id === user.id) {
      return NextResponse.json(
        { error: '自分の申請は却下できません' },
        { status: 400 }
      )
    }

    // ステータスを rejected に更新
    const { data: updatedClaim, error: updateError } = await supabase
      .from('expense_claims')
      .update({
        status: 'rejected',
      })
      .eq('id', claimId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Claim reject error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 承認履歴を作成
    const { error: approvalError } = await supabase
      .from('expense_approvals')
      .insert({
        tenant_id: profile.tenant_id,
        claim_id: claimId,
        approver_user_id: user.id,
        status: 'rejected',
        comment: comment,
        decided_at: new Date().toISOString(),
      })

    if (approvalError) {
      console.error('Approval history error:', approvalError)
      // 承認履歴の作成失敗はログのみ
    }

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      message: '経費申請を却下しました',
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
