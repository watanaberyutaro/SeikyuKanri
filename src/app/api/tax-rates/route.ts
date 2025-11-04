import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateTaxRateInput, UpdateTaxRateInput } from '@/types/accounting'

// GET /api/tax-rates - 税率一覧取得
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
  const category = searchParams.get('category')
  const isActive = searchParams.get('is_active')
  const date = searchParams.get('date') // 特定日時点で有効な税率を取得

  // 税率を取得
  let query = supabase
    .from('tax_rates')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('category', { ascending: true })
    .order('applies_from', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true')
  }

  if (date) {
    query = query
      .lte('applies_from', date)
      .or(`applies_to.is.null,applies_to.gte.${date}`)
  }

  const { data: taxRates, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ taxRates })
}

// POST /api/tax-rates - 税率登録
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

  const body: CreateTaxRateInput = await request.json()

  // バリデーション
  if (!body.name || body.rate === undefined || !body.category || !body.applies_from) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  if (body.rate < 0 || body.rate > 100) {
    return NextResponse.json({ error: '税率は0〜100の範囲で指定してください' }, { status: 400 })
  }

  // 税率を作成
  const { data: taxRate, error } = await supabase
    .from('tax_rates')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      name: body.name,
      rate: body.rate,
      category: body.category,
      applies_from: body.applies_from,
      applies_to: body.applies_to || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      description: body.description || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ taxRate }, { status: 201 })
}

// PATCH /api/tax-rates - 税率更新
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

  const body: UpdateTaxRateInput = await request.json()

  // 更新データを準備
  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.rate !== undefined) {
    if (body.rate < 0 || body.rate > 100) {
      return NextResponse.json({ error: '税率は0〜100の範囲で指定してください' }, { status: 400 })
    }
    updateData.rate = body.rate
  }
  if (body.category !== undefined) updateData.category = body.category
  if (body.applies_from !== undefined) updateData.applies_from = body.applies_from
  if (body.applies_to !== undefined) updateData.applies_to = body.applies_to
  if (body.is_active !== undefined) updateData.is_active = body.is_active
  if (body.description !== undefined) updateData.description = body.description

  // 税率を更新
  const { data: taxRate, error } = await supabase
    .from('tax_rates')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ taxRate })
}

// DELETE /api/tax-rates - 税率削除
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

  // 仕訳での使用チェック
  const { data: usedInJournals } = await supabase
    .from('journal_lines')
    .select('id')
    .eq('tax_rate_id', id)
    .limit(1)

  if (usedInJournals && usedInJournals.length > 0) {
    return NextResponse.json(
      { error: '仕訳で使用されているため削除できません' },
      { status: 400 }
    )
  }

  // 税率を削除
  const { error } = await supabase.from('tax_rates').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
