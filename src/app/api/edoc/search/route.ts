import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/edoc/search - 電子文書検索
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

  // クエリパラメータ
  const searchParams = request.nextUrl.searchParams
  const entityType = searchParams.get('entity_type')
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  const counterparty = searchParams.get('counterparty')
  const documentNumber = searchParams.get('document_number')
  const minAmount = searchParams.get('min_amount')
  const maxAmount = searchParams.get('max_amount')
  const limit = searchParams.get('limit') || '100'

  // クエリ構築
  let query = supabase
    .from('edocuments')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_latest', true) // 最新版のみ
    .order('issued_at', { ascending: false })
    .limit(parseInt(limit))

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  if (fromDate) {
    query = query.gte('issued_at', fromDate)
  }

  if (toDate) {
    query = query.lte('issued_at', toDate)
  }

  if (counterparty) {
    query = query.ilike('counterparty', `%${counterparty}%`)
  }

  if (documentNumber) {
    query = query.ilike('document_number', `%${documentNumber}%`)
  }

  if (minAmount) {
    query = query.gte('total_amount', parseFloat(minAmount))
  }

  if (maxAmount) {
    query = query.lte('total_amount', parseFloat(maxAmount))
  }

  const { data: edocs, error } = await query

  if (error) {
    console.error('電子文書検索エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ edocs })
}
