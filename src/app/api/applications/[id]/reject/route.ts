import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/applications/[id]/reject - 申請を却下
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

  // 管理者チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { id: applicationId } = await params
  const body = await request.json()
  const notes = body.notes || null

  try {
    // 申請を取得
    const { data: application, error: fetchError } = await supabase
      .from('tenant_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: 'この申請は既に処理されています' },
        { status: 400 }
      )
    }

    // 申請を却下に更新
    const { error: updateError } = await supabase
      .from('tenant_applications')
      .update({
        status: 'rejected',
        notes,
        approved_by: user.id, // 処理者として記録
        approved_at: new Date().toISOString(),
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('Application update error:', updateError)
      return NextResponse.json(
        { error: '申請の更新に失敗しました' },
        { status: 500 }
      )
    }

    // オプション: 申請者にメール通知を送信（要件次第）
    // 現在は却下時はメール送信しない仕様
    /*
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@yourdomain.com',
          to: application.representative_email,
          subject: '【請求書管理システム】お申し込みについて',
          html: `
            <p>${application.representative_name} 様</p>
            <p>お申し込みいただき、ありがとうございました。</p>
            <p>誠に申し訳ございませんが、今回のお申し込みは承認できませんでした。</p>
            ${notes ? `<p>理由: ${notes}</p>` : ''}
            <p>ご不明な点がございましたら、お問い合わせください。</p>
          `,
        }),
      })
    } catch (emailError) {
      console.error('Email notification error:', emailError)
    }
    */

    return NextResponse.json({
      success: true,
      message: '申請を却下しました',
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
