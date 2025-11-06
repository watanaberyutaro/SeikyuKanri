import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { CreateTenantApplicationInput } from '@/types/tenant-application'

// POST /api/applications - 新規申請を作成
export async function POST(request: NextRequest) {
  console.log('[API] POST /api/applications - Starting request')

  // 環境変数チェック
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('[API] NEXT_PUBLIC_SUPABASE_URL is not set')
    return NextResponse.json(
      { error: 'Supabase URL is not configured' },
      { status: 500 }
    )
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[API] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json(
      { error: 'Supabase Service Role Key is not configured' },
      { status: 500 }
    )
  }

  // Service Role Keyを使用（RLSをバイパスして申請を作成）
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    console.log('[API] Parsing request body')
    const body: CreateTenantApplicationInput = await request.json()
    console.log('[API] Request body:', {
      company_name: body.company_name,
      email: body.email,
      representative_email: body.representative_email
    })

    // バリデーション
    console.log('[API] Validating required fields')
    if (!body.company_name || !body.phone || !body.email || !body.representative_name || !body.representative_email || !body.password) {
      console.error('[API] Validation failed: missing required fields')
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // パスワードの長さチェック
    console.log('[API] Validating password length')
    if (body.password.length < 8) {
      console.error('[API] Validation failed: password too short')
      return NextResponse.json(
        { error: 'パスワードは8文字以上で設定してください' },
        { status: 400 }
      )
    }

    // メールアドレスの重複チェック（既存の申請）
    console.log('[API] Checking for existing application')
    const { data: existingApplication, error: checkError } = await supabase
      .from('tenant_applications')
      .select('id')
      .eq('representative_email', body.representative_email)
      .eq('status', 'pending')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (正常)
      console.error('[API] Error checking existing application:', checkError)
    }

    if (existingApplication) {
      console.log('[API] Duplicate application found')
      return NextResponse.json(
        { error: 'このメールアドレスで申請済みです。承認をお待ちください。' },
        { status: 400 }
      )
    }

    // 申請を作成
    console.log('[API] Creating new application')
    const { data: application, error } = await supabase
      .from('tenant_applications')
      .insert({
        company_name: body.company_name,
        postal_code: body.postal_code || null,
        address: body.address || null,
        phone: body.phone,
        email: body.email,
        representative_name: body.representative_name,
        representative_email: body.representative_email,
        password: body.password, // パスワードを保存
        fiscal_year_end_month: body.fiscal_year_end_month,
        first_fiscal_year: body.first_fiscal_year,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('[API] Application creation error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        {
          error: '申請の登録に失敗しました',
          details: error.message
        },
        { status: 500 }
      )
    }

    console.log('[API] Application created successfully:', application.id)

    // 管理者にメール通知を送信
    try {
      // 管理者のメールアドレスを取得
      const { data: admins } = await supabase
        .from('profiles')
        .select('email')
        .eq('is_admin', true)

      if (admins && admins.length > 0) {
        // TODO: 実際のメール送信処理を実装
        // Resend、SendGrid、またはSupabase Edge Functionなどを使用
        console.log('管理者へのメール通知:', {
          to: admins.map((a) => a.email),
          subject: '【請求書管理システム】新規申請がありました',
          application: {
            company_name: body.company_name,
            representative_name: body.representative_name,
            email: body.email,
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
            to: admins.map(a => a.email),
            subject: '【請求書管理システム】新規申請がありました',
            html: `
              <h2>新規申請が届きました</h2>
              <p>以下の企業から新規申請がありました。</p>
              <ul>
                <li>企業名: ${body.company_name}</li>
                <li>代表者: ${body.representative_name}</li>
                <li>メール: ${body.email}</li>
              </ul>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/applications">管理画面で確認する</a></p>
            `,
          }),
        })
        */
      }
    } catch (emailError) {
      // メール送信失敗はログのみ（申請自体は成功として扱う）
      console.error('Email notification error:', emailError)
    }

    console.log('[API] Request completed successfully')
    return NextResponse.json({
      success: true,
      application,
    })
  } catch (error: any) {
    console.error('[API] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      {
        error: error.message || '予期しないエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// GET /api/applications - 申請一覧を取得（管理者のみ）
export async function GET(request: NextRequest) {
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

  // URLパラメータから絞り込み条件を取得
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // pending, approved, rejected

  let query = supabase
    .from('tenant_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: applications, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications })
}
