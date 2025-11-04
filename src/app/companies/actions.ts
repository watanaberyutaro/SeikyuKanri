'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createCompany(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  // ユーザーのtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const data = {
    user_id: user.id,
    tenant_id: profile?.tenant_id,
    name: formData.get('name') as string,
    postal_code: formData.get('postal_code') as string || null,
    address: formData.get('address') as string || null,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    contact_person: formData.get('contact_person') as string || null,
    notes: formData.get('notes') as string || null,
  }

  const { error } = await supabase.from('client_companies').insert(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/companies')
  redirect('/companies')
}

export async function updateCompany(id: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const data = {
    name: formData.get('name') as string,
    postal_code: formData.get('postal_code') as string || null,
    address: formData.get('address') as string || null,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    contact_person: formData.get('contact_person') as string || null,
    notes: formData.get('notes') as string || null,
  }

  const { error } = await supabase
    .from('client_companies')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/companies')
  redirect('/companies')
}

export async function deleteCompany(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const { error } = await supabase
    .from('client_companies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/companies')
  return { success: true }
}
