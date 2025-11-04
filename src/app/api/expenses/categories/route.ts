import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateExpenseCategoryInput } from '@/types/expense'

// GET /api/expenses/categories - 経費カテゴリ一覧を取得
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
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  try {
    // 経費カテゴリを取得（勘定科目・税率情報も含む）
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select(`
        *,
        default_account:accounts!expense_categories_default_account_id_fkey(
          id,
          code,
          name
        ),
        tax_rate:tax_rates!expense_categories_tax_rate_id_fkey(
          id,
          name,
          rate
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Categories fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST /api/expenses/categories - 経費カテゴリを作成
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
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  try {
    const body: CreateExpenseCategoryInput = await request.json()

    // バリデーション
    if (!body.name) {
      return NextResponse.json({ error: 'カテゴリ名は必須です' }, { status: 400 })
    }

    // カテゴリを作成
    const { data: category, error } = await supabase
      .from('expense_categories')
      .insert({
        tenant_id: profile.tenant_id,
        name: body.name,
        default_account_id: body.default_account_id || null,
        tax_rate_id: body.tax_rate_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Category creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
