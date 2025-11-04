import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceEmail } from '@/lib/email'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 請求書と企業情報を取得
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, companies(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    const company = invoice.companies as any

    if (!company.email) {
      return NextResponse.json({ error: '企業のメールアドレスが登録されていません' }, { status: 400 })
    }

    // メール送信
    const result = await sendInvoiceEmail({
      to: company.email,
      invoiceNumber: invoice.invoice_number,
      companyName: company.name,
      totalAmount: Number(invoice.total_amount),
      dueDate: invoice.due_date ? format(new Date(invoice.due_date), 'yyyy年MM月dd日') : undefined,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // ステータスを「送付済み」に更新
    await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoiceId)

    return NextResponse.json({ success: true, message: 'メールを送信しました' })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 })
  }
}
