import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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

  try {
    console.log('🔄 仕訳承認リクエスト:', { id, tenant_id: profile.tenant_id })

    // 仕訳を承認
    const { data: journal, error } = await supabase
      .from('journals')
      .update({ is_approved: true })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      console.error('❌ 承認エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ 承認成功:', journal)
    return NextResponse.json({ journal }, { status: 200 })
  } catch (error: any) {
    console.error('❌ 承認例外:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
