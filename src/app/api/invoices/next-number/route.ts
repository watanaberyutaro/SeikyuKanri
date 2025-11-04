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

  // 今年の最新の請求書番号を取得（invoice_numberでソート）
  const { data: latestInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('tenant_id', profile.tenant_id)
    .like('invoice_number', `INV-${currentYear}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1

  if (latestInvoice?.invoice_number) {
    // 既存の番号から連番を抽出（例: INV-2025-001 → 001）
    const match = latestInvoice.invoice_number.match(/INV-\d{4}-(\d+)/)
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  // 連番を3桁でゼロ埋め
  const paddedNumber = String(nextNumber).padStart(3, '0')
  const nextInvoiceNumber = `INV-${currentYear}-${paddedNumber}`

  return NextResponse.json({ invoice_number: nextInvoiceNumber })
}
