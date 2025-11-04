import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateAccountInput, UpdateAccountInput } from '@/types/accounting'

// GET /api/accounts - 勘定科目一覧取得
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
  const type = searchParams.get('type')
  const isActive = searchParams.get('is_active')
  const parentId = searchParams.get('parent_id')

  // 勘定科目を取得
  let query = supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('sort_order', { ascending: true })
    .order('code', { ascending: true })

  if (type) {
    query = query.eq('type', type)
  }

  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true')
  }

  if (parentId) {
    query = query.eq('parent_id', parentId)
  }

  const { data: accounts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ accounts })
}

// POST /api/accounts - 勘定科目登録
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

  const body: CreateAccountInput = await request.json()

  // バリデーション
  if (!body.code || !body.name || !body.type) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 勘定科目コードの重複チェック
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('code', body.code)
    .single()

  if (existingAccount) {
    return NextResponse.json({ error: '勘定科目コードが既に存在します' }, { status: 400 })
  }

  // 勘定科目を作成
  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      code: body.code,
      name: body.name,
      type: body.type,
      parent_id: body.parent_id || null,
      tax_category: body.tax_category || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      sort_order: body.sort_order || 0,
      description: body.description || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account }, { status: 201 })
}

// PATCH /api/accounts - 勘定科目更新
export async function PATCH(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 })
  }

  const body: UpdateAccountInput = await request.json()

  // 勘定科目コードの重複チェック（変更する場合）
  if (body.code) {
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('code', body.code)
      .neq('id', id)
      .single()

    if (existingAccount) {
      return NextResponse.json({ error: '勘定科目コードが既に存在します' }, { status: 400 })
    }
  }

  // 更新データを準備
  const updateData: any = {}
  if (body.code !== undefined) updateData.code = body.code
  if (body.name !== undefined) updateData.name = body.name
  if (body.type !== undefined) updateData.type = body.type
  if (body.parent_id !== undefined) updateData.parent_id = body.parent_id
  if (body.tax_category !== undefined) updateData.tax_category = body.tax_category
  if (body.is_active !== undefined) updateData.is_active = body.is_active
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
  if (body.description !== undefined) updateData.description = body.description

  // 勘定科目を更新
  const { data: account, error } = await supabase
    .from('accounts')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account })
}

// DELETE /api/accounts - 勘定科目削除
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

  // 子科目の存在チェック
  const { data: children } = await supabase
    .from('accounts')
    .select('id')
    .eq('parent_id', id)
    .limit(1)

  if (children && children.length > 0) {
    return NextResponse.json(
      { error: '子科目が存在するため削除できません' },
      { status: 400 }
    )
  }

  // 仕訳での使用チェック
  const { data: usedInJournals } = await supabase
    .from('journal_lines')
    .select('id')
    .eq('account_id', id)
    .limit(1)

  if (usedInJournals && usedInJournals.length > 0) {
    return NextResponse.json(
      { error: '仕訳で使用されているため削除できません' },
      { status: 400 }
    )
  }

  // 勘定科目を削除
  const { error } = await supabase.from('accounts').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
