import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    // 通常のクライアント（RLS適用）
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 管理者クライアント（RLSバイパス）
    let adminData = null
    let adminError = null

    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('invoices')
        .select('id, user_id, invoice_number, title, status, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      adminData = data
      adminError = error
    } catch (err: any) {
      adminError = { message: err.message, hint: 'SUPABASE_SERVICE_ROLE_KEY may not be set' }
    }

    // 通常のクライアントでのデータ取得
    const { data: userInvoices, error: userError } = await supabase
      .from('invoices')
      .select('id, user_id, invoice_number, title, status, total_amount')
      .order('created_at', { ascending: false })

    // 企業データも確認
    const { data: companies, error: companiesError } = await supabase
      .from('client_companies')
      .select('id, user_id, name')

    // 診断情報を返す
    return NextResponse.json({
      診断情報: {
        現在のユーザーID: user.id,
        ユーザーEmail: user.email,
        認証状態: '成功',
      },
      データベース状態: {
        全請求書データ_管理者権限: {
          データ: adminData,
          エラー: adminError,
          件数: adminData?.length || 0,
          説明: 'RLSをバイパスして取得したすべての請求書データ（最新10件）'
        },
        ユーザー請求書データ_通常権限: {
          データ: userInvoices,
          エラー: userError,
          件数: userInvoices?.length || 0,
          説明: 'RLS適用後の現在のユーザーの請求書データ'
        },
        企業データ: {
          データ: companies,
          エラー: companiesError,
          件数: companies?.length || 0
        }
      },
      診断結果: {
        判定: adminData && adminData.length > 0 && (!userInvoices || userInvoices.length === 0)
          ? 'データは存在しますが、user_idが一致していません'
          : adminData && adminData.length === 0
          ? 'データベースに請求書データが存在しません'
          : userInvoices && userInvoices.length > 0
          ? '正常にデータを取得できています'
          : '不明なエラー',
        推奨アクション: adminData && adminData.length > 0 && (!userInvoices || userInvoices.length === 0)
          ? `以下のSQLをSupabase SQL Editorで実行してください:\n\nUPDATE invoices SET user_id = '${user.id}';`
          : adminData && adminData.length === 0
          ? 'テストデータを作成してください（DEBUG.mdを参照）'
          : 'データは正常です',
        user_id不一致のデータ: adminData?.filter((invoice: any) => invoice.user_id !== user.id) || []
      }
    }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug API error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
