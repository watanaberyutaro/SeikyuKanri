import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SendDunningInput } from '@/types/ar'

// POST /api/ar/dunning/send - 督促送信
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

  const body: SendDunningInput = await request.json()

  // バリデーション
  if (!body.invoice_ids || body.invoice_ids.length === 0 || !body.rule_id) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 督促ルールを取得
  const { data: rule, error: ruleError } = await supabase
    .from('dunning_rules')
    .select('*')
    .eq('id', body.rule_id)
    .eq('tenant_id', profile.tenant_id)
    .eq('user_id', user.id)
    .single()

  if (ruleError || !rule) {
    return NextResponse.json({ error: '督促ルールが見つかりません' }, { status: 404 })
  }

  if (!rule.enabled) {
    return NextResponse.json({ error: 'この督促ルールは無効です' }, { status: 400 })
  }

  // 請求書を取得
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select(`
      *,
      company:client_companies(id, name, email)
    `)
    .in('id', body.invoice_ids)
    .eq('tenant_id', profile.tenant_id)
    .eq('user_id', user.id)

  if (invoicesError || !invoices || invoices.length === 0) {
    return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
  }

  const results = []

  // ドライランモードの場合は送信せずにプレビューのみ返す
  if (body.dry_run) {
    for (const invoice of invoices) {
      const preview = {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.company?.name,
        customer_email: invoice.company?.email,
        subject: rule.subject
          .replace('{invoice_number}', invoice.invoice_number)
          .replace('{company_name}', invoice.company?.name || ''),
        body: rule.body
          .replace('{invoice_number}', invoice.invoice_number)
          .replace('{company_name}', invoice.company?.name || '')
          .replace('{total_amount}', invoice.total_amount.toLocaleString())
          .replace('{due_date}', invoice.due_date || '未設定'),
      }
      results.push(preview)
    }

    return NextResponse.json({ dry_run: true, previews: results })
  }

  // 実際の送信処理
  for (const invoice of invoices) {
    let result = 'success'
    let channel: 'email' | 'none' = 'none'

    // メール送信が有効な場合
    if (rule.send_email && invoice.company?.email) {
      channel = 'email'

      // TODO: 実際のメール送信処理をここに実装
      // 環境変数 ENABLE_EMAIL_SENDING で制御
      if (process.env.ENABLE_EMAIL_SENDING === '1') {
        try {
          // SendGrid等のメール送信処理
          // await sendEmail({
          //   to: invoice.company.email,
          //   bcc: rule.bcc,
          //   subject: rule.subject.replace(...),
          //   body: rule.body.replace(...),
          // })
          result = 'メール送信機能は未実装です（ENABLE_EMAIL_SENDING=1で有効化）'
        } catch (error) {
          result = `送信失敗: ${error}`
        }
      } else {
        result = 'メール送信は無効です（ENABLE_EMAIL_SENDING=0）'
      }
    }

    // ログを記録
    await supabase.from('dunning_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      invoice_id: invoice.id,
      rule_id: rule.id,
      sent_at: new Date().toISOString(),
      channel,
      result,
    })

    results.push({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      channel,
      result,
    })
  }

  return NextResponse.json({ success: true, results })
}
