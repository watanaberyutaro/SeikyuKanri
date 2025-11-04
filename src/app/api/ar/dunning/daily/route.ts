import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/ar/dunning/daily - 日次督促チェック（Vercelスケジュール用）
export async function GET(request: NextRequest) {
  // Vercel Cronからのリクエストを検証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // 期限超過の請求書を取得（残高がある請求書のみ）
  const { data: overdueInvoices, error } = await supabase
    .from('ar_invoice_balance')
    .select('*')
    .gt('days_overdue', 0)
    .order('days_overdue', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 督促が必要な請求書を集計
  const suggestions = {
    '0-30': [] as string[],
    '31-60': [] as string[],
    '61-90': [] as string[],
    '90+': [] as string[],
  }

  for (const invoice of overdueInvoices || []) {
    suggestions[invoice.aging_bucket as keyof typeof suggestions].push(invoice.invoice_id)
  }

  // ログに記録（実際の送信は手動またはUIから実行）
  console.log('Daily dunning check:', {
    date: new Date().toISOString(),
    total_overdue: overdueInvoices?.length || 0,
    by_bucket: {
      '0-30': suggestions['0-30'].length,
      '31-60': suggestions['31-60'].length,
      '61-90': suggestions['61-90'].length,
      '90+': suggestions['90+'].length,
    },
  })

  return NextResponse.json({
    success: true,
    date: new Date().toISOString(),
    total_overdue: overdueInvoices?.length || 0,
    suggestions,
    note: '自動送信は無効です。UIから手動で送信してください。',
  })
}
