import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }

    // プロフィール情報を取得（tenant_id取得）
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 400 })
    }

    // FormDataからファイルを取得
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ファイルサイズは10MB以下にしてください' }, { status: 400 })
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: '許可されていないファイル形式です。JPG、PNG、GIF、WEBP、PDFのみアップロード可能です'
      }, { status: 400 })
    }

    // ファイル名を安全な形式に変換
    const timestamp = Date.now()
    const randomString = crypto.randomBytes(8).toString('hex')
    const extension = file.name.split('.').pop()
    const safeFileName = `${profile.tenant_id}/${timestamp}_${randomString}.${extension}`

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('expense-receipts')
      .upload(safeFileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'ファイルのアップロードに失敗しました' }, { status: 500 })
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('expense-receipts')
      .getPublicUrl(safeFileName)

    // ファイルのハッシュ値を計算（電子帳簿保存法対応）
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')

    // 電子文書テーブルに登録（オプショナル）
    // マイグレーション00025が実行され、RLSポリシーが設定されている場合のみ動作
    // 一時的なentity_idとして、UUIDを生成（後で経費申請作成時に更新）
    const tempEntityId = crypto.randomUUID()

    const { error: edocError } = await supabase
      .from('edocuments')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        entity_type: 'receipt',
        entity_id: tempEntityId, // 一時ID（経費申請作成時に更新される）
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_url: publicUrl,
        sha256: hash,
        version: 1,
        issued_at: new Date().toISOString(), // 現在時刻
        created_by: user.id,
      })

    if (edocError) {
      // 電子文書登録は失敗してもアップロード自体は成功とする
      // ストレージバケット設定後に正常動作する
      console.warn('⚠️ 電子文書登録エラー（ファイルアップロードは成功）:', edocError)
      console.warn('ℹ️ database/scripts/setup-storage-bucket.sql を実行してストレージバケットとRLSポリシーを設定してください')
    } else {
      console.log('✅ 電子文書登録成功:', { file_path: safeFileName, hash })
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      hash,
    })

  } catch (error) {
    console.error('アップロードエラー:', error)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}
