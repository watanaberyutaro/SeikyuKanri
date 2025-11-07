-- Supabase Storage のポリシー設定
-- company-seals バケット用のストレージポリシー

-- 既存のポリシーを削除（エラーが出ても問題ありません）
DROP POLICY IF EXISTS "Allow authenticated users to upload company seals" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update company seals" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete company seals" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to company seals" ON storage.objects;
DROP POLICY IF EXISTS "company-seals-insert" ON storage.objects;
DROP POLICY IF EXISTS "company-seals-update" ON storage.objects;
DROP POLICY IF EXISTS "company-seals-delete" ON storage.objects;
DROP POLICY IF EXISTS "company-seals-select" ON storage.objects;

-- 1. 認証済みユーザーがファイルをアップロードできるようにする（INSERT）
CREATE POLICY "company-seals-insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-seals');

-- 2. 認証済みユーザーがファイルを更新できるようにする（UPDATE）
CREATE POLICY "company-seals-update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company-seals')
WITH CHECK (bucket_id = 'company-seals');

-- 3. 認証済みユーザーがファイルを削除できるようにする（DELETE）
CREATE POLICY "company-seals-delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'company-seals');

-- 4. すべてのユーザーがファイルを閲覧できるようにする（SELECT）
CREATE POLICY "company-seals-select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-seals');
