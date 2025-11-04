/**
 * 勘定科目の自動インポートユーティリティ
 * 初回アクセス時に勘定科目がなければ自動的にインポートする
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AccountingTemplate } from '@/types/accounting'
import templateData from '../../../database/templates/accounting-template.json'

/**
 * 勘定科目が存在しない場合、自動的にインポートする
 * @param supabase Supabaseクライアント
 * @param tenantId テナントID
 * @param userId ユーザーID
 * @returns インポート結果
 */
export async function autoImportAccountsIfNeeded(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<{ imported: boolean; error?: string }> {
  try {
    // 既存の科目数をチェック
    const { data: existingAccounts, error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)

    if (checkError) {
      console.error('勘定科目チェックエラー:', checkError)
      return { imported: false, error: checkError.message }
    }

    // 既に勘定科目が存在する場合はスキップ
    if (existingAccounts && existingAccounts.length > 0) {
      console.log('勘定科目は既に存在します。インポートをスキップします。')
      return { imported: false }
    }

    console.log('勘定科目が存在しないため、自動インポートを開始します...')

    const template = templateData as AccountingTemplate

    // 1. 税率をインポート
    const taxRates = template.tax_rates.map((tr) => ({
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

    const { error: taxRateError } = await supabase.from('tax_rates').insert(taxRates)

    if (taxRateError) {
      console.error('税率インポートエラー:', taxRateError)
      return { imported: false, error: `税率のインポートに失敗しました: ${taxRateError.message}` }
    }

    console.log(`税率 ${taxRates.length}件をインポートしました`)

    // 2. 勘定科目をインポート（親科目から順に）
    const codeToIdMap: { [key: string]: string } = {}

    // 親科目がnullのものから順に登録
    const sortedAccounts = [...template.accounts].sort((a, b) => {
      if (a.parent_code === null && b.parent_code !== null) return -1
      if (a.parent_code !== null && b.parent_code === null) return 1
      return a.sort_order - b.sort_order
    })

    for (const acc of sortedAccounts) {
      const { data: account, error } = await supabase
        .from('accounts')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          parent_id: acc.parent_code ? codeToIdMap[acc.parent_code] : null,
          tax_category: acc.tax_category,
          is_active: true,
          sort_order: acc.sort_order,
          description: acc.description || null,
        })
        .select('id')
        .single()

      if (error) {
        console.error(`勘定科目「${acc.name}」のインポートエラー:`, error)
        return {
          imported: false,
          error: `勘定科目「${acc.name}」のインポートに失敗しました: ${error.message}`,
        }
      }

      // コードとIDのマッピングを保存
      codeToIdMap[acc.code] = account.id
    }

    console.log(`勘定科目 ${template.accounts.length}件をインポートしました`)
    console.log('✅ 初期勘定科目の自動インポートが完了しました')

    return { imported: true }
  } catch (error: any) {
    console.error('自動インポート処理エラー:', error)
    return { imported: false, error: `インポート処理中にエラーが発生しました: ${error.message}` }
  }
}
