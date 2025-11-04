import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/debug-tenant - テナント情報をデバッグ
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です', user: null }, { status: 401 })
  }

  // プロフィール情報を取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // テナント情報を取得（SELECT）
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile?.tenant_id || 'invalid')
    .single()

  // UPDATE権限テスト（実際には更新しない）
  const testUpdateData = {
    updated_at: new Date().toISOString(),
  }

  const { data: updateTest, error: updateError } = await supabase
    .from('tenants')
    .update(testUpdateData)
    .eq('id', profile?.tenant_id || 'invalid')
    .select()

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      data: profile,
      error: profileError,
    },
    tenant: {
      data: tenant,
      error: tenantError,
    },
    updateTest: {
      data: updateTest,
      error: updateError,
      rowsAffected: updateTest?.length || 0,
    },
    diagnosis: {
      hasUser: !!user,
      hasProfile: !!profile,
      hasTenantId: !!profile?.tenant_id,
      canReadTenant: !!tenant && !tenantError,
      canUpdateTenant: !!updateTest && updateTest.length > 0 && !updateError,
    },
  })
}
