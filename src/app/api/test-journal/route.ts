import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createInvoiceIssuedJournal,
  saveJournal,
} from '@/lib/accounting/invoice-journal'

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
    return NextResponse.json(
      { error: 'テナント情報が見つかりません' },
      { status: 400 }
    )
  }

  console.log('🧪 テスト開始')
  console.log('  - User ID:', user.id)
  console.log('  - Tenant ID:', profile.tenant_id)

  // 勘定科目を確認
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name')
    .eq('tenant_id', profile.tenant_id)
    .in('code', ['1101', '1110', '4100'])
    .eq('is_active', true)

  console.log('📋 勘定科目:', accounts)

  if (!accounts || accounts.length < 3) {
    return NextResponse.json({
      error: '必要な勘定科目が見つかりません',
      accounts: accounts || [],
      required: ['1101 現金', '1110 売掛金', '4100 売上高'],
    })
  }

  // テスト用の請求書データ
  const testInvoiceData = {
    id: '00000000-0000-0000-0000-000000000000',
    invoice_number: 'TEST-2024-001',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: null,
    total_amount: 10000,
    status: 'sent' as const,
    payment_date: null,
    company: { name: 'テスト株式会社' },
  }

  console.log('📊 テスト請求書データ:', testInvoiceData)

  // 仕訳を生成
  const journal = await createInvoiceIssuedJournal(
    testInvoiceData,
    supabase,
    profile.tenant_id,
    user.id
  )

  console.log('📄 生成された仕訳:', journal)

  if (!journal) {
    return NextResponse.json({
      error: '仕訳の生成に失敗しました',
      accounts,
    })
  }

  // 仕訳を保存
  const journalId = await saveJournal(
    journal,
    supabase,
    profile.tenant_id,
    user.id
  )

  console.log('✅ 仕訳ID:', journalId)

  if (!journalId) {
    return NextResponse.json({
      error: '仕訳の保存に失敗しました',
      journal,
    })
  }

  return NextResponse.json({
    success: true,
    message: 'テスト仕訳を作成しました',
    journalId,
    journal,
    accounts,
  })
}
