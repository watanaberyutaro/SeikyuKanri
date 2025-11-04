'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTenant(formData: FormData) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  // 管理者チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return { error: '管理者権限が必要です' }
  }

  const companyCode = formData.get('company_code') as string
  const companyName = formData.get('company_name') as string

  // 企業コードの重複チェック
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('company_code', companyCode)
    .single()

  if (existing) {
    return { error: 'この企業コードは既に使用されています' }
  }

  // テナントを作成
  const { error } = await supabase.from('tenants').insert({
    company_code: companyCode,
    company_name: companyName,
    is_active: true,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/tenants')
  return { success: true }
}
