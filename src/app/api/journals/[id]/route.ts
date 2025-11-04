import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/journals/[id] - 仕訳詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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

  // 仕訳を取得
  const { data: journal, error } = await supabase
    .from('journals')
    .select(`
      *,
      period:accounting_periods(id, name, status),
      lines:journal_lines(
        *,
        account:accounts(id, code, name, type),
        tax_rate:tax_rates(id, name, rate)
      )
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '仕訳が見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ journal })
}

// DELETE /api/journals/[id] - 仕訳削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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

  // 仕訳を取得して期間ロックをチェック
  const { data: journal } = await supabase
    .from('journals')
    .select('journal_date, period:accounting_periods(status)')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (journal?.period && (journal.period as any).status === 'locked') {
    return NextResponse.json(
      { error: '会計期間がロックされているため削除できません' },
      { status: 400 }
    )
  }

  // 仕訳を削除（CASCADE設定により明細も自動削除される）
  const { error } = await supabase
    .from('journals')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
