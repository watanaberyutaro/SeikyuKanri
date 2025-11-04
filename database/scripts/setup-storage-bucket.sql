-- ========================================
-- Supabase Storage Bucket Setup
-- ========================================
-- 経費精算の領収書アップロード用のストレージバケットとポリシーを設定
--
-- 実行方法:
-- 1. Supabaseダッシュボードにログイン
-- 2. SQL Editorを開く
-- 3. このスクリプトを実行
--
-- または、Storageダッシュボードから手動で設定
-- 詳細は docs/STORAGE_SETUP.md を参照
-- ========================================

-- ストレージバケットの作成
-- public=trueでファイルに公開URLでアクセス可能
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- ストレージポリシーの設定
-- ========================================

-- 既存のポリシーを削除（再実行時のエラー回避）
DROP POLICY IF EXISTS "Tenant users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their tenant receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their tenant receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their tenant receipts" ON storage.objects;

-- INSERT: 認証済みユーザーが自分のテナント配下にファイルをアップロード
CREATE POLICY "Tenant users can upload receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- SELECT: 認証済みユーザーが自分のテナントのファイルを閲覧
CREATE POLICY "Users can view their tenant receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- UPDATE: 認証済みユーザーが自分のテナントのファイルを更新
CREATE POLICY "Users can update their tenant receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- DELETE: 認証済みユーザーが自分のテナントのファイルを削除
CREATE POLICY "Users can delete their tenant receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- ========================================
-- 動作確認用クエリ（オプション）
-- ========================================

-- バケットが正しく作成されたか確認
-- SELECT * FROM storage.buckets WHERE id = 'expense-receipts';

-- ポリシーが正しく設定されたか確認
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%receipt%';

-- ファイル一覧を確認（アップロード後）
-- SELECT * FROM storage.objects WHERE bucket_id = 'expense-receipts' ORDER BY created_at DESC LIMIT 10;
