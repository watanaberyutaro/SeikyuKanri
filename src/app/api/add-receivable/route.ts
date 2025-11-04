import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    return NextResponse.json(
      { error: 'テナント情報が見つかりません' },
      { status: 400 }
    )
  }

  console.log('💼 売掛金科目を追加します...')
  console.log('  - Tenant ID:', profile.tenant_id)
  console.log('  - User ID:', user.id)

  // 既に存在するか確認
  const { data: existing } = await supabase
    .from('accounts')
    .select('id, code, name')
    .eq('tenant_id', profile.tenant_id)
    .eq('code', '1105')
    .single()

  if (existing) {
    return NextResponse.json({
      success: true,
      message: '売掛金科目は既に存在します',
      account: existing,
    })
  }

  // 流動資産（1100）の親IDを取得
  const { data: parent } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('code', '1100')
    .single()

  console.log('  - 親科目（流動資産）:', parent)

  // 売掛金科目を追加
  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      code: '1105',
      name: '売掛金',
      type: 'asset',
      parent_id: parent?.id || null,
      tax_category: 'non-tax',
      is_active: true,
      sort_order: 1105,
      description: '得意先に対する売掛債権',
    })
    .select()
    .single()

  if (error) {
    console.error('❌ エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('✅ 売掛金科目を追加しました:', account)

  return NextResponse.json({
    success: true,
    message: '売掛金科目を追加しました',
    account,
  })
}
