import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, is_admin')
    .eq('id', user.id)
    .single()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name')
    .eq('id', profile?.tenant_id!)
    .single()

  const { data: accountsCount } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profile?.tenant_id!)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      tenant_id: profile?.tenant_id,
      is_admin: profile?.is_admin,
    },
    tenant: {
      id: tenant?.id,
      company_name: tenant?.company_name,
    },
    accounts_count: accountsCount || 0,
  })
}
