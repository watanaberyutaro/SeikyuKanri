import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateFixedAssetInput } from '@/types/fixed-assets'

// GET /api/assets/[id] - 固定資産詳細取得
export async function GET(
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

  // 固定資産を取得（勘定科目情報付き）
  const { data: asset, error } = await supabase
    .from('fixed_assets')
    .select(`
      *,
      asset_account:account_asset(id, code, name, type),
      depr_exp_account:account_depr_exp(id, code, name, type),
      accum_depr_account:account_accum_depr(id, code, name, type)
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (error) {
    console.error('固定資産取得エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!asset) {
    return NextResponse.json({ error: '固定資産が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ asset })
}

// PATCH /api/assets/[id] - 固定資産更新
export async function PATCH(
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

  const body: UpdateFixedAssetInput = await request.json()

  // バリデーション
  if (body.acquisition_cost !== undefined && body.acquisition_cost <= 0) {
    return NextResponse.json({ error: '取得価額は0より大きい値を入力してください' }, { status: 400 })
  }

  if (body.useful_life_months !== undefined && body.useful_life_months <= 0) {
    return NextResponse.json({ error: '耐用年数は0より大きい値を入力してください' }, { status: 400 })
  }

  // 更新データの準備
  const updateData: any = {
    updated_by: user.id,
  }

  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.category !== undefined) updateData.category = body.category
  if (body.acquisition_date !== undefined) updateData.acquisition_date = body.acquisition_date
  if (body.acquisition_cost !== undefined) updateData.acquisition_cost = body.acquisition_cost
  if (body.salvage_value !== undefined) updateData.salvage_value = body.salvage_value
  if (body.depreciation_method !== undefined)
    updateData.depreciation_method = body.depreciation_method
  if (body.useful_life_months !== undefined)
    updateData.useful_life_months = body.useful_life_months
  if (body.account_asset !== undefined) updateData.account_asset = body.account_asset
  if (body.account_depr_exp !== undefined) updateData.account_depr_exp = body.account_depr_exp
  if (body.account_accum_depr !== undefined)
    updateData.account_accum_depr = body.account_accum_depr
  if (body.status !== undefined) updateData.status = body.status
  if (body.disposal_date !== undefined) updateData.disposal_date = body.disposal_date
  if (body.disposal_reason !== undefined) updateData.disposal_reason = body.disposal_reason

  // 固定資産を更新
  const { data: asset, error } = await supabase
    .from('fixed_assets')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .select()
    .single()

  if (error) {
    console.error('固定資産更新エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!asset) {
    return NextResponse.json({ error: '固定資産が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ asset })
}

// DELETE /api/assets/[id] - 固定資産削除
export async function DELETE(
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

  // 関連する償却スケジュールがあるかチェック
  const { data: schedules } = await supabase
    .from('depreciation_schedules')
    .select('id')
    .eq('asset_id', id)
    .eq('tenant_id', profile.tenant_id)

  if (schedules && schedules.length > 0) {
    return NextResponse.json(
      { error: '償却スケジュールが存在するため削除できません。先にスケジュールを削除してください。' },
      { status: 400 }
    )
  }

  // 固定資産を削除
  const { error } = await supabase
    .from('fixed_assets')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) {
    console.error('固定資産削除エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: '固定資産を削除しました' })
}
