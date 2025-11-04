import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateAuditLogInput } from '@/types/edoc-audit'

// POST /api/audit - 監査ログ記録
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
    .select('tenant_id, email, name')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 400 })
  }

  const body: CreateAuditLogInput = await request.json()

  // バリデーション
  if (!body.action || !body.entity_type) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  try {
    // リクエストコンテキストを取得
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // 監査ログを記録
    const { data: auditLog, error } = await supabase
      .from('audit_logs')
      .insert({
        tenant_id: profile.tenant_id,
        actor_user_id: user.id,
        actor_name: profile.name || undefined,
        actor_email: profile.email || user.email,
        action: body.action,
        entity_type: body.entity_type,
        entity_id: body.entity_id || null,
        entity_label: body.entity_label || null,
        before: body.before || null,
        after: body.after || null,
        changes: body.changes || null,
        ip: body.ip || ip || null,
        user_agent: body.user_agent || userAgent || null,
        request_id: body.request_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('監査ログ記録エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ auditLog }, { status: 201 })
  } catch (error: any) {
    console.error('監査ログ記録例外:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/audit - 監査ログ検索
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
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  const actorUserId = searchParams.get('actor_user_id')
  const action = searchParams.get('action')
  const entityType = searchParams.get('entity_type')
  const entityId = searchParams.get('entity_id')
  const limit = searchParams.get('limit') || '100'

  // クエリ構築
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))

  if (fromDate) {
    query = query.gte('created_at', fromDate)
  }

  if (toDate) {
    query = query.lte('created_at', toDate)
  }

  if (actorUserId) {
    query = query.eq('actor_user_id', actorUserId)
  }

  if (action) {
    query = query.eq('action', action)
  }

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  const { data: logs, error } = await query

  if (error) {
    console.error('監査ログ検索エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs })
}
