import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RegisterEDocumentInput } from '@/types/edoc-audit'

// POST /api/edoc/register - 電子文書登録
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

  const body: RegisterEDocumentInput = await request.json()

  // バリデーション
  if (
    !body.entity_type ||
    !body.entity_id ||
    !body.file_name ||
    !body.storage_url ||
    !body.sha256 ||
    !body.issued_at
  ) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // SHA-256ハッシュの形式チェック（64文字の16進数）
  if (!/^[a-f0-9]{64}$/i.test(body.sha256)) {
    return NextResponse.json({ error: '無効なSHA-256ハッシュ形式です' }, { status: 400 })
  }

  try {
    // 既存の最新版を取得してバージョン番号を決定
    const { data: existingDocs } = await supabase
      .from('edocuments')
      .select('version')
      .eq('tenant_id', profile.tenant_id)
      .eq('entity_type', body.entity_type)
      .eq('entity_id', body.entity_id)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existingDocs && existingDocs.length > 0 ? existingDocs[0].version + 1 : 1

    // 電子文書を登録
    const { data: edoc, error } = await supabase
      .from('edocuments')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        file_name: body.file_name,
        file_size: body.file_size,
        mime_type: body.mime_type,
        storage_url: body.storage_url,
        sha256: body.sha256.toLowerCase(),
        version: nextVersion,
        is_latest: true,
        issued_at: body.issued_at,
        counterparty: body.counterparty || null,
        total_amount: body.total_amount || null,
        document_number: body.document_number || null,
        searchable: body.searchable || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('電子文書登録エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ edoc }, { status: 201 })
  } catch (error: any) {
    console.error('電子文書登録例外:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
