'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * 勘定科目が存在しない場合のみ自動的にインポートする
 * ページ初回アクセス時に呼び出される
 */
export async function autoImportAccountsIfNeeded() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { imported: false, error: '認証が必要です' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return { imported: false, error: 'テナント情報が見つかりません' }
  }

  // 既存の科目を確認
  const { data: existingAccounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .limit(1)

  // 既に勘定科目が存在する場合はスキップ
  if (existingAccounts && existingAccounts.length > 0) {
    return { imported: false }
  }

  console.log('🔄 勘定科目が存在しないため、自動インポートを開始します...')

  // importAccounts関数を内部的に呼び出す
  const result = await importAccountsInternal(supabase, user.id, profile.tenant_id)

  if (result.success) {
    console.log('✅ 勘定科目の自動インポートが完了しました')
    return { imported: true, message: result.message }
  } else {
    console.error('❌ 自動インポート失敗:', result.error)
    return { imported: false, error: result.error }
  }
}

/**
 * 手動インポート用（ボタン押下時）
 */
/**
 * 内部共通インポート処理
 */
async function importAccountsInternal(
  supabase: any,
  userId: string,
  tenantId: string
): Promise<{ success?: boolean; message?: string; error?: string }> {
  console.log('📦 勘定科目インポート開始')
  console.log('  - User ID:', userId)
  console.log('  - Tenant ID:', tenantId)

  try {
    // テンプレートテーブルから税率を取得
    console.log('💰 税率テンプレートを取得中...')
    const { data: taxRateTemplates, error: taxTemplateError } = await supabase
      .from('tax_rate_templates')
      .select('*')
      .order('id')

    if (taxTemplateError || !taxRateTemplates || taxRateTemplates.length === 0) {
      console.error('❌ 税率テンプレートの取得失敗:', taxTemplateError)
      return { error: '税率テンプレートが見つかりません。管理者にお問い合わせください。' }
    }

    console.log(`  - ${taxRateTemplates.length}件の税率テンプレートを取得`)

    // 税率をインポート
    console.log('💰 税率をインポート中...')
    const taxRates = taxRateTemplates.map((tr: any) => ({
      tenant_id: tenantId,
      user_id: userId,
      name: tr.name,
      rate: tr.rate,
      category: tr.category,
      applies_from: tr.applies_from,
      applies_to: null,
      is_active: true,
      description: tr.description || null,
    }))

    const { error: taxError } = await supabase.from('tax_rates').insert(taxRates)

    if (taxError) {
      console.error('❌ 税率のインポート失敗:', taxError)
      return { error: `税率のインポートに失敗しました: ${taxError.message}` }
    }

    console.log(`✅ ${taxRates.length}件の税率をインポートしました`)

    // テンプレートテーブルから勘定科目を取得
    console.log('📋 勘定科目テンプレートを取得中...')
    const { data: accountTemplates, error: accountTemplateError } = await supabase
      .from('account_templates')
      .select('*')
      .order('sort_order')

    if (accountTemplateError || !accountTemplates || accountTemplates.length === 0) {
      console.error('❌ 勘定科目テンプレートの取得失敗:', accountTemplateError)
      return { error: '勘定科目テンプレートが見つかりません。管理者にお問い合わせください。' }
    }

    console.log(`  - ${accountTemplates.length}件の勘定科目テンプレートを取得`)

    // 勘定科目をインポート（親子関係を考慮）
    console.log('📋 勘定科目をインポート中...')
    const codeToIdMap: { [key: string]: string } = {}

    // 親科目がnullのものを先に、それ以外はsort_orderでソート
    const sortedAccounts = [...accountTemplates].sort((a, b) => {
      if (a.parent_code === null && b.parent_code !== null) return -1
      if (a.parent_code !== null && b.parent_code === null) return 1
      return a.sort_order - b.sort_order
    })

    let importedCount = 0

    for (const acc of sortedAccounts) {
      const parentId = acc.parent_code ? codeToIdMap[acc.parent_code] : null

      const { data: account, error: accError } = await supabase
        .from('accounts')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          parent_id: parentId,
          tax_category: acc.tax_category,
          is_active: true,
          sort_order: acc.sort_order,
          description: acc.description || null,
        })
        .select('id')
        .single()

      if (accError || !account) {
        console.error(`❌ 科目 ${acc.code} ${acc.name} のインポート失敗:`, accError)
        return {
          error: `勘定科目 ${acc.code} ${acc.name} のインポートに失敗しました: ${accError?.message}`,
        }
      }

      codeToIdMap[acc.code] = account.id
      importedCount++
    }

    console.log(`✅ ${importedCount}件の勘定科目をインポートしました`)

    return {
      success: true,
      message: `${importedCount}科目と${taxRates.length}税率をインポートしました`,
    }
  } catch (error: any) {
    console.error('❌ インポートエラー:', error)
    return { error: `インポートに失敗しました: ${error.message}` }
  }
}

/**
 * 手動インポート用（ボタン押下時）
 */
export async function importAccounts() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return { error: 'テナント情報が見つかりません' }
  }

  // 既存の科目を確認
  const { data: existingAccounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .limit(1)

  if (existingAccounts && existingAccounts.length > 0) {
    console.log('⚠️ 既に勘定科目が存在します')
    return { error: '既に勘定科目が登録されています' }
  }

  // 共通のインポート処理を実行
  const result = await importAccountsInternal(supabase, user.id, profile.tenant_id)

  revalidatePath('/accounting/accounts')

  return result
}
