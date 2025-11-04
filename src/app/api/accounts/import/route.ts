import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AccountingTemplate } from '@/types/accounting'
import templateData from '../../../../../database/templates/accounting-template.json'

// POST /api/accounts/import - 初期科目テンプレートをインポート
export async function POST(request: NextRequest) {
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

  const template = templateData as AccountingTemplate

  try {
    // 既存の科目数をチェック
    const { data: existingAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .limit(1)

    if (existingAccounts && existingAccounts.length > 0) {
      return NextResponse.json(
        { error: '既に勘定科目が登録されています。インポートは初回のみ実行可能です。' },
        { status: 400 }
      )
    }

    // 1. 税率をインポート
    const taxRates = template.tax_rates.map((tr) => ({
      tenant_id: profile.tenant_id,
      user_id: user.id,
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
      return NextResponse.json(
        { error: `税率のインポートに失敗しました: ${taxRateError.message}` },
        { status: 500 }
      )
    }

    // 2. 勘定科目をインポート（親科目から順に）
    // parent_codeをparent_idに変換するためのマップ
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
          tenant_id: profile.tenant_id,
          user_id: user.id,
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
        return NextResponse.json(
          { error: `勘定科目「${acc.name}」のインポートに失敗しました: ${error.message}` },
          { status: 500 }
        )
      }

      // コードとIDのマッピングを保存
      codeToIdMap[acc.code] = account.id
    }

    return NextResponse.json({
      success: true,
      message: `勘定科目${template.accounts.length}件、税率${template.tax_rates.length}件をインポートしました`,
      imported: {
        accounts: template.accounts.length,
        tax_rates: template.tax_rates.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: `インポート処理中にエラーが発生しました: ${error.message}` },
      { status: 500 }
    )
  }
}
