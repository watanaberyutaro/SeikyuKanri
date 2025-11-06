'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const companyCode = formData.get('company_code') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 1. 企業コードを検証
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, is_active')
    .eq('company_code', companyCode)
    .single()

  if (tenantError || !tenant) {
    return { error: '企業コードが無効です' }
  }

  if (!tenant.is_active) {
    return { error: 'この企業アカウントは無効化されています' }
  }

  // 2. ユーザー認証
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    console.error('認証エラー:', authError)
    return { error: `認証に失敗しました: ${authError.message}` }
  }

  if (!authData.user) {
    return { error: 'ユーザー情報が取得できませんでした' }
  }

  // 3. ユーザーのtenant_idとis_adminを検証
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, is_admin')
    .eq('id', authData.user.id)
    .single()

  if (profileError) {
    console.error('プロフィール取得エラー:', profileError)
    await supabase.auth.signOut()
    return { error: `ユーザー情報の取得に失敗しました: ${profileError.message}` }
  }

  if (!profile) {
    await supabase.auth.signOut()
    return { error: 'プロフィールが見つかりません' }
  }

  console.log('Profile tenant_id:', profile.tenant_id, 'Expected tenant_id:', tenant.id)

  if (profile.tenant_id !== tenant.id) {
    await supabase.auth.signOut()
    return { error: 'この企業コードではログインできません（企業IDが一致しません）' }
  }

  revalidatePath('/', 'layout')

  // 管理者の場合は管理画面へ、それ以外はダッシュボードへ
  if (profile.is_admin) {
    redirect('/admin/tenants')
  } else {
    redirect('/dashboard')
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const companyCode = formData.get('company_code') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  // 1. 企業コードを検証（招待制）
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, is_active')
    .eq('company_code', companyCode)
    .single()

  if (tenantError || !tenant) {
    return { error: '企業コードが無効です。管理者に確認してください' }
  }

  if (!tenant.is_active) {
    return { error: 'この企業アカウントは無効化されています' }
  }

  // 2. ユーザーを作成
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        tenant_id: tenant.id,
      },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  // 3. プロフィールにtenant_idを設定
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ tenant_id: tenant.id })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Failed to set tenant_id:', profileError)
      // エラーをログに記録するが、ユーザーには成功として扱う
      // （トリガーで作成されたプロフィールの更新失敗）
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Signout error:', error)
    // Even if signout fails, redirect to login
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
