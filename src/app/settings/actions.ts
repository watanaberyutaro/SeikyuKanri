'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateTenantSettings(data: {
  company_name: string
  invoice_registration_number?: string
  postal_code?: string
  address?: string
  phone?: string
  representative_name?: string
  email?: string
  website?: string
  description?: string
  bank_name?: string
  bank_branch?: string
  bank_account_type?: string
  bank_account_number?: string
  bank_account_holder?: string
}) {
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

  if (!profile?.tenant_id) {
    return { error: 'テナント情報が見つかりません' }
  }

  // テナント情報を更新
  const updateData = {
    company_name: data.company_name,
    invoice_registration_number: data.invoice_registration_number || null,
    postal_code: data.postal_code || null,
    address: data.address || null,
    phone: data.phone || null,
    representative_name: data.representative_name || null,
    email: data.email || null,
    website: data.website || null,
    description: data.description || null,
    bank_name: data.bank_name || null,
    bank_branch: data.bank_branch || null,
    bank_account_type: data.bank_account_type || null,
    bank_account_number: data.bank_account_number || null,
    bank_account_holder: data.bank_account_holder || null,
    updated_at: new Date().toISOString(),
  }

  console.log('Updating tenant settings:', {
    tenant_id: profile.tenant_id,
    data: updateData,
  })

  const { data: updateResult, error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', profile.tenant_id)
    .select()

  console.log('Update result:', { updateResult, error })

  if (error) {
    console.error('Update error:', error)
    return { error: error.message }
  }

  if (!updateResult || updateResult.length === 0) {
    console.error('No rows updated')
    return { error: '更新対象のテナントが見つかりませんでした' }
  }

  revalidatePath('/settings')
  revalidatePath('/settings/edit')
  return { success: true }
}

export async function uploadCompanySeal(formData: FormData) {
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

  if (!profile?.tenant_id) {
    return { error: 'テナント情報が見つかりません' }
  }

  const file = formData.get('seal') as File
  if (!file) {
    return { error: 'ファイルが選択されていません' }
  }

  // ファイルサイズチェック（10MB以下）
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'ファイルサイズは10MB以下にしてください' }
  }

  // ファイル形式チェック
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: '画像ファイル（PNG, JPEG, GIF）のみアップロード可能です' }
  }

  // ファイル名を生成（tenant_id + タイムスタンプ）
  const fileExt = file.name.split('.').pop()
  const fileName = `${profile.tenant_id}_${Date.now()}.${fileExt}`
  const filePath = `company-seals/${fileName}`

  // Supabase Storageにアップロード
  console.log('Uploading file:', { filePath, fileType: file.type, fileSize: file.size })

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('company-seals')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  console.log('Upload result:', { uploadData, uploadError })

  if (uploadError) {
    console.error('Upload error details:', uploadError)
    // より詳細なエラーメッセージを返す
    if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
      return {
        error: 'Supabase Storageの「company-seals」バケットが存在しません。Supabaseダッシュボードで作成してください。',
        details: uploadError.message
      }
    }
    if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
      return {
        error: 'ストレージポリシーが設定されていません。Supabaseダッシュボードで「SQL Editor」を開き、プロジェクトルートの「supabase-storage-policies.sql」を実行してください。詳細は STORAGE_SETUP.md を参照してください。',
        details: uploadError.message
      }
    }
    return { error: `アップロード失敗: ${uploadError.message}` }
  }

  // 公開URLを取得
  const {
    data: { publicUrl },
  } = supabase.storage.from('company-seals').getPublicUrl(filePath)

  console.log('Public URL:', publicUrl)

  // テナント情報を更新
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      company_seal_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.tenant_id)

  if (updateError) {
    // アップロードしたファイルを削除
    await supabase.storage.from('company-seals').remove([filePath])
    return { error: `更新失敗: ${updateError.message}` }
  }

  revalidatePath('/settings')
  return { success: true, url: publicUrl }
}

export async function deleteCompanySeal() {
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

  if (!profile?.tenant_id) {
    return { error: 'テナント情報が見つかりません' }
  }

  // 現在のハンコURLを取得
  const { data: tenant } = await supabase
    .from('tenants')
    .select('company_seal_url')
    .eq('id', profile.tenant_id)
    .single()

  if (tenant?.company_seal_url) {
    // URLからファイルパスを抽出
    const url = new URL(tenant.company_seal_url)
    const filePath = url.pathname.split('/').slice(-2).join('/')

    // Storageから削除
    await supabase.storage.from('company-seals').remove([filePath])
  }

  // テナント情報を更新（URLをnullに）
  const { error } = await supabase
    .from('tenants')
    .update({
      company_seal_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.tenant_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}
