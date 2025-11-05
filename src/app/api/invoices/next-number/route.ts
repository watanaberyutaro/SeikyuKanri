import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/invoices/next-number - 次の請求書番号を生成
export async function GET(request: NextRequest) {
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

  // 現在の年を取得
  const currentYear = new Date().getFullYear()

  // 今年の請求書を全て取得して、番号の最大値を見つける
  const { data: invoices } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('tenant_id', profile.tenant_id)
    .like('invoice_number', `INV-${currentYear}-%`)

  let nextNumber = 1

  if (invoices && invoices.length > 0) {
    // 各請求書番号から連番を抽出して最大値を見つける
    const numbers = invoices
      .map((inv) => {
        const match = inv.invoice_number.match(/INV-\d{4}-(\d+)/)
        return match && match[1] ? parseInt(match[1], 10) : 0
      })
      .filter((num) => num > 0)

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }

  // 連番を3桁でゼロ埋め
  const paddedNumber = String(nextNumber).padStart(3, '0')
  const nextInvoiceNumber = `INV-${currentYear}-${paddedNumber}`

  return NextResponse.json({ invoice_number: nextInvoiceNumber })
}
