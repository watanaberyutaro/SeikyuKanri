import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// POST /api/applications/[id]/approve - 申請を承認
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 通常のSupabaseクライアント（認証チェック用）
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 管理者チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { id: applicationId } = await params
  const body = await request.json()
  const notes = body.notes || null

  // Service Role Keyを使用（RLSをバイパス、Admin API使用可能）
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // 申請を取得
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('tenant_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: 'この申請は既に処理されています' },
        { status: 400 }
      )
    }

    // 1. 企業コードを生成（6桁のランダム文字列）
    const companyCode = generateCompanyCode()

    // 2. テナント（企業）を作成
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        company_name: application.company_name,
        company_code: companyCode,
        postal_code: application.postal_code,
        address: application.address,
        phone: application.phone,
        email: application.email,
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json(
        { error: 'テナントの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 3. 申請時に設定されたパスワードを使用
    const userPassword = application.password || generateTemporaryPassword()

    // 4. Supabase Authでユーザーアカウントを作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: application.representative_email,
      password: userPassword,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        name: application.representative_name,
      },
    })

    if (authError || !authData.user) {
      // テナント作成をロールバック（削除）
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)

      console.error('User creation error:', authError)
      return NextResponse.json(
        { error: 'ユーザーアカウントの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 5. プロフィールを作成（トリガーで自動作成されるが、tenant_idを更新）
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        tenant_id: tenant.id,
        email: application.representative_email,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // プロフィール更新失敗時もロールバック
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)

      return NextResponse.json(
        { error: 'プロフィールの更新に失敗しました' },
        { status: 500 }
      )
    }

    // 5.5. 初期会計期間を作成（申請時に入力された決算月・会計年度を使用）
    if (application.fiscal_year_end_month && application.first_fiscal_year) {
      try {
        const fiscalYearEndMonth = application.fiscal_year_end_month
        const fiscalYear = application.first_fiscal_year

        // 会計期間の開始日と終了日を計算
        // 例: 3月決算、2025年度 → 2024/4/1 〜 2025/3/31
        const startMonth = fiscalYearEndMonth % 12 + 1 // 決算月の翌月
        const startYear = fiscalYearEndMonth === 12 ? fiscalYear : fiscalYear - 1

        const startDate = new Date(startYear, startMonth - 1, 1)
        const endDate = new Date(fiscalYear, fiscalYearEndMonth - 1, getLastDayOfMonth(fiscalYear, fiscalYearEndMonth))

        const { error: periodError } = await supabaseAdmin
          .from('accounting_periods')
          .insert({
            tenant_id: tenant.id,
            name: `${fiscalYear}年度`,
            fiscal_year: fiscalYear,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            status: 'open',
          })

        if (periodError) {
          console.error('Accounting period creation error:', periodError)
          // 会計期間の作成失敗はログのみ（テナント作成は成功として扱う）
        } else {
          console.log('Initial accounting period created:', {
            tenant_id: tenant.id,
            fiscal_year: fiscalYear,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
          })
        }
      } catch (periodCreationError) {
        console.error('Accounting period creation error:', periodCreationError)
        // エラーをログに記録するが、承認処理は続行
      }
    }

    // 5.6. デフォルトの経費カテゴリを作成（経費精算機能が有効な場合）
    const expensesFeatureEnabled = process.env.FEATURE_EXPENSES === '1'
    if (expensesFeatureEnabled) {
      try {
        // 既存の勘定科目と税率を取得（存在する場合のみ使用）
        const { data: accounts } = await supabaseAdmin
          .from('accounts')
          .select('id, code, name')
          .eq('tenant_id', tenant.id)
          .eq('account_type', 'expense')

        const { data: taxRates } = await supabaseAdmin
          .from('tax_rates')
          .select('id, rate')
          .eq('tenant_id', tenant.id)

        // 勘定科目をコードでマッピング
        const accountMap: Record<string, string | null> = {
          travel: accounts?.find(a => a.code === '6210')?.id || null, // 旅費交通費
          supplies: accounts?.find(a => a.code === '6230')?.id || null, // 消耗品費
          entertainment: accounts?.find(a => a.code === '6260')?.id || null, // 接待交際費
          communication: accounts?.find(a => a.code === '6220')?.id || null, // 通信費
          misc: accounts?.find(a => a.code === '6910')?.id || null, // 雑費
        }

        // 税率をマッピング
        const taxRateMap: Record<string, string | null> = {
          rate10: taxRates?.find(t => t.rate === 10)?.id || null,
          rate8: taxRates?.find(t => t.rate === 8)?.id || null,
        }

        // デフォルト経費カテゴリを作成
        const defaultCategories = [
          { name: '交通費', account: accountMap.travel, taxRate: taxRateMap.rate10 },
          { name: '宿泊費', account: accountMap.travel, taxRate: taxRateMap.rate10 },
          { name: '会議費', account: accountMap.entertainment, taxRate: taxRateMap.rate10 },
          { name: '接待交際費', account: accountMap.entertainment, taxRate: taxRateMap.rate10 },
          { name: '消耗品費', account: accountMap.supplies, taxRate: taxRateMap.rate10 },
          { name: '通信費', account: accountMap.communication, taxRate: taxRateMap.rate10 },
          { name: '書籍・資料代', account: accountMap.supplies, taxRate: taxRateMap.rate10 },
          { name: 'その他', account: accountMap.misc, taxRate: taxRateMap.rate10 },
        ]

        const { error: categoriesError } = await supabaseAdmin
          .from('expense_categories')
          .insert(
            defaultCategories.map(cat => ({
              tenant_id: tenant.id,
              name: cat.name,
              default_account_id: cat.account,
              tax_rate_id: cat.taxRate,
            }))
          )

        if (categoriesError) {
          console.error('Expense categories creation error:', categoriesError)
          // カテゴリ作成失敗はログのみ
        } else {
          console.log('Default expense categories created:', {
            tenant_id: tenant.id,
            count: defaultCategories.length,
          })
        }
      } catch (categoryCreationError) {
        console.error('Expense categories creation error:', categoryCreationError)
        // エラーをログに記録するが、承認処理は続行
      }
    }

    // 6. 申請を承認済みに更新（パスワードをクリア）
    const { error: updateError } = await supabaseAdmin
      .from('tenant_applications')
      .update({
        status: 'approved',
        tenant_id: tenant.id,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        password: null, // セキュリティのためパスワードをクリア
        notes,
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('Application update error:', updateError)
    }

    // 7. 申請者にメール通知を送信
    try {
      // TODO: 実際のメール送信処理を実装
      console.log('申請者へのメール通知:', {
        to: application.representative_email,
        subject: '【請求書管理システム】お申し込みが承認されました',
        content: {
          company_name: application.company_name,
          company_code: companyCode,
          email: application.representative_email,
          password_note: '申請時に設定されたパスワードでログインしてください',
          login_url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        },
      })

      // メール送信の例（実際のAPIを使う場合）
      /*
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@yourdomain.com',
          to: application.representative_email,
          subject: '【請求書管理システム】お申し込みが承認されました',
          html: `
            <h2>お申し込みが承認されました</h2>
            <p>${application.representative_name} 様</p>
            <p>お申し込みいただき、ありがとうございます。</p>
            <p>審査の結果、お申し込みを承認させていただきました。</p>
            <p>以下の情報でログインしてご利用ください。</p>
            <h3>ログイン情報</h3>
            <ul>
              <li>企業コード: <strong>${companyCode}</strong></li>
              <li>メールアドレス: <strong>${application.representative_email}</strong></li>
              <li>パスワード: 申請時に設定されたパスワード</li>
            </ul>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login">ログインページへ</a></p>
            <p>※ パスワードをお忘れの場合は、パスワードリセット機能をご利用ください。</p>
          `,
        }),
      })
      */
    } catch (emailError) {
      console.error('Email notification error:', emailError)
      // メール送信失敗は警告のみ
    }

    return NextResponse.json({
      success: true,
      tenant,
      company_code: companyCode,
      login_info: {
        company_code: companyCode,
        email: application.representative_email,
        company_name: application.company_name,
        representative_name: application.representative_name,
      },
      message: '申請を承認しました。テナントとユーザーアカウントが作成されました。',
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 企業コードを生成（6桁の英数字）
function generateCompanyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 一時パスワードを生成（12桁の英数字記号）
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// 月の最終日を取得
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// 日付をYYYY-MM-DD形式にフォーマット
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
