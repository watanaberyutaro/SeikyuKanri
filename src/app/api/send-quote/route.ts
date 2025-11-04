import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteEmail } from '@/lib/email'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const { quoteId } = await request.json()

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 見積書と企業情報を取得
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, companies(*)')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: '見積書が見つかりません' }, { status: 404 })
    }

    const company = quote.companies as any

    if (!company.email) {
      return NextResponse.json({ error: '企業のメールアドレスが登録されていません' }, { status: 400 })
    }

    // メール送信
    const result = await sendQuoteEmail({
      to: company.email,
      quoteNumber: quote.quote_number,
      companyName: company.name,
      totalAmount: Number(quote.total_amount),
      expiryDate: quote.expiry_date
        ? format(new Date(quote.expiry_date), 'yyyy年MM月dd日')
        : undefined,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'メールを送信しました' })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 })
  }
}
