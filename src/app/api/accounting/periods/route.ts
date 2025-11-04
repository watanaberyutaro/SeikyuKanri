import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/accounting/periods - 会計期間一覧取得
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

  // 会計期間を取得（新しい順）
  const { data: periods, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('start_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ periods: periods || [] })
}
