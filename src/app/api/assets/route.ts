import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateFixedAssetInput } from '@/types/fixed-assets'

// GET /api/assets - 固定資産一覧取得
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
  const status = searchParams.get('status') // 'active', 'disposed'
  const category = searchParams.get('category')
  const withAccounts = searchParams.get('with_accounts') === 'true'

  // 固定資産を取得
  let query = supabase
    .from('fixed_assets')
    .select(
      withAccounts
        ? `
      *,
      asset_account:account_asset(id, code, name, type),
      depr_exp_account:account_depr_exp(id, code, name, type),
      accum_depr_account:account_accum_depr(id, code, name, type)
    `
        : '*'
    )
    .eq('tenant_id', profile.tenant_id)
    .order('acquisition_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data: assets, error } = await query

  if (error) {
    console.error('固定資産取得エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ assets })
}

// POST /api/assets - 固定資産登録
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

  const body: CreateFixedAssetInput = await request.json()

  // バリデーション
  if (
    !body.asset_code ||
    !body.name ||
    !body.acquisition_date ||
    !body.acquisition_cost ||
    !body.depreciation_method ||
    !body.useful_life_months
  ) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  if (body.acquisition_cost <= 0) {
    return NextResponse.json({ error: '取得価額は0より大きい値を入力してください' }, { status: 400 })
  }

  if (body.useful_life_months <= 0) {
    return NextResponse.json({ error: '耐用年数は0より大きい値を入力してください' }, { status: 400 })
  }

  // 資産コードの重複チェック
  const { data: existingAsset } = await supabase
    .from('fixed_assets')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('asset_code', body.asset_code)
    .single()

  if (existingAsset) {
    return NextResponse.json({ error: 'この資産コードは既に使用されています' }, { status: 400 })
  }

  // 固定資産を登録
  const { data: asset, error } = await supabase
    .from('fixed_assets')
    .insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      asset_code: body.asset_code,
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      acquisition_date: body.acquisition_date,
      acquisition_cost: body.acquisition_cost,
      salvage_value: body.salvage_value || 0,
      depreciation_method: body.depreciation_method,
      useful_life_months: body.useful_life_months,
      account_asset: body.account_asset || null,
      account_depr_exp: body.account_depr_exp || null,
      account_accum_depr: body.account_accum_depr || null,
      status: 'active',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('固定資産登録エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ asset }, { status: 201 })
}
