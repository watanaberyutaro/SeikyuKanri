# Supabase Storage セットアップガイド

経費精算の領収書アップロード機能で使用するSupabase Storageの設定手順です。

## ストレージバケットの作成

### 1. Supabaseダッシュボードにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 左メニューから「Storage」を選択

### 2. バケットの作成

「Create a new bucket」ボタンをクリックして、以下の設定でバケットを作成：

#### バケット設定

- **Name**: `expense-receipts`
- **Public bucket**: `ON` (チェックを入れる)
- **File size limit**: `10MB`
- **Allowed MIME types**:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/pdf`

### 3. バケットポリシーの設定

バケット作成後、セキュリティポリシーを設定します。

#### 手順

1. 作成した `expense-receipts` バケットを選択
2. 「Policies」タブを開く
3. 以下のポリシーを追加

#### アップロードポリシー (INSERT)

```sql
-- 認証済みユーザーが自分のテナント配下にファイルをアップロードできる
CREATE POLICY "Users can upload their own receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**注**: 実際の実装では、ファイル名が `{tenant_id}/{timestamp}_{random}.{ext}` の形式なので、
tenant_idベースでの制御が必要な場合は以下のようにカスタマイズ：

```sql
-- より厳密なテナントベースのポリシー
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
```

#### 閲覧ポリシー (SELECT)

```sql
-- 認証済みユーザーが自分のテナントのファイルを閲覧できる
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
```

#### 削除ポリシー (DELETE)

```sql
-- 認証済みユーザーが自分のテナントのファイルを削除できる
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
```

## 代替方法: SQLエディタで一括設定

Supabase DashboardのSQL Editorで以下のスクリプトを実行することもできます：

```sql
-- ストレージバケットの作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- アップロードポリシー
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

-- 閲覧ポリシー
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

-- 削除ポリシー
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
```

## 動作確認

### 1. アップロード機能のテスト

1. アプリケーションにログイン
2. 経費精算 > 新規経費申請に移動
3. 領収書・レシート欄でファイルを選択
4. アップロードが成功することを確認
5. プレビューが表示されることを確認

### 2. Supabaseダッシュボードでの確認

1. Storage > expense-receipts を開く
2. テナントIDのフォルダが作成されていることを確認
3. アップロードされたファイルが表示されることを確認

### 3. 電子文書テーブルの確認

```sql
-- アップロードされた領収書が登録されているか確認
SELECT
  id,
  document_type,
  original_filename,
  file_size,
  mime_type,
  file_hash,
  created_at
FROM edocuments
WHERE document_type = 'receipt'
ORDER BY created_at DESC
LIMIT 10;
```

## トラブルシューティング

### アップロードエラー: "Bucket not found"

- バケット名が `expense-receipts` であることを確認
- バケットが作成されていることをStorageダッシュボードで確認

### アップロードエラー: "Permission denied"

- ポリシーが正しく設定されているか確認
- ユーザーが認証されているか確認
- profilesテーブルにtenant_idが設定されているか確認

### ファイルが表示されない

- バケットのPublic設定がONになっているか確認
- ブラウザのコンソールでエラーを確認
- ファイルのURLが正しいか確認

## セキュリティ考慮事項

### ファイルサイズ制限

API側で10MBに制限していますが、Supabase側でも制限を設定することを推奨します。

### ファイル形式の検証

API側でMIMEタイプをチェックしていますが、実際のファイル内容の検証も検討してください。

### ウイルススキャン

本番環境では、アップロードされたファイルのウイルススキャンを実装することを推奨します。

### 電子帳簿保存法対応

- アップロード時にSHA-256ハッシュを計算し、edocumentsテーブルに保存
- ファイルの改ざん検知が可能
- 保存期間は法令に従って設定（通常7年）

## 関連ファイル

- API実装: `/src/app/api/expenses/upload/route.ts`
- フロントエンド: `/src/app/expenses/claims/new/page.tsx`
- 型定義: `/src/types/edoc-audit.ts`
- マイグレーション: `/database/migrations/00025_add_edoc_audit.sql`

## 参考リンク

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [File Upload Best Practices](https://supabase.com/docs/guides/storage/uploads)
