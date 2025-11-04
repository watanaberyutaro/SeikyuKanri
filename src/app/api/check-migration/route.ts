import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/check-migration - テーブル構造をチェック
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

  // 現在のテナント情報を取得（すべてのカラムを試す）
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  if (error) {
    return NextResponse.json({
      error: error.message,
      has_migration: false,
    })
  }

  // 新しいカラムが存在するかチェック
  const requiredColumns = [
    'invoice_registration_number',
    'company_seal_url',
    'postal_code',
    'address',
    'phone',
    'representative_name',
    'email',
    'website',
    'description',
  ]

  const existingColumns = tenant ? Object.keys(tenant) : []
  const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))

  return NextResponse.json({
    has_migration: missingColumns.length === 0,
    existing_columns: existingColumns,
    required_columns: requiredColumns,
    missing_columns: missingColumns,
    tenant_data: tenant,
  })
}
