# Supabase Storage セットアップガイド

電子印（ハンコ）のアップロード機能を使用するには、Supabase Storageでバケットを作成する必要があります。

## セットアップ手順

### 1. Supabaseダッシュボードにアクセス

https://supabase.com/dashboard にアクセスし、プロジェクトを選択してください。

### 2. Storageバケットを作成

1. 左メニューから **Storage** をクリック
2. 右上の **Create a new bucket** ボタンをクリック
3. バケット設定を以下の通り入力：
   - **Name**: `company-seals`（必須：この名前を使用してください）
   - **Public bucket**: ✅ **ON**（チェックを入れる）
   - **File size limit**: 10MB（または空欄のまま）
   - **Allowed MIME types**: 空欄でOK（すべてのファイルタイプを許可）

4. **Save** をクリック

### 3. ポリシーの設定（必須）

バケットを作成した後、アップロード権限のためのポリシーを設定する必要があります。

#### 方法1: SQL Editorで設定（推奨）

1. Supabaseダッシュボードで **SQL Editor** をクリック
2. **New query** をクリック
3. プロジェクトルートにある `supabase-storage-policies.sql` の内容をコピー＆ペースト
4. **Run** をクリックして実行

#### 方法2: ダッシュボードで手動設定

1. **Storage** → **Policies** タブをクリック
2. **New policy** をクリック
3. 以下の4つのポリシーを作成：

**ポリシー1: アップロード許可**
- Policy name: `Allow authenticated users to upload company seals`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'company-seals'`

**ポリシー2: 更新許可**
- Policy name: `Allow authenticated users to update company seals`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'company-seals'`

**ポリシー3: 削除許可**
- Policy name: `Allow authenticated users to delete company seals`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'company-seals'`

**ポリシー4: 閲覧許可（Public）**
- Policy name: `Allow public access to company seals`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'company-seals'`

### 4. 動作確認

1. アプリケーションの **設定** → **設定編集** にアクセス
2. 電子印（ハンコ）セクションでファイルを選択してアップロード
3. 「ハンコをアップロードしました」のメッセージが表示されればOK

## トラブルシューティング

### エラー: "new row violates row-level security policy"

**原因**: Storageバケットのポリシーが設定されていない、または正しく設定されていない

**解決策**:

**方法1: SQLスクリプトで設定（推奨）**
1. Supabaseダッシュボードで **SQL Editor** を開く
2. プロジェクトルートの `supabase-storage-policies.sql` の内容を**全て**コピー
3. SQL Editorにペーストして **Run** をクリック
4. ページをリロードして再度アップロードを試す

**方法2: SQLでポリシーを確認**
1. Supabaseダッシュボードで **SQL Editor** を開く
2. `check-storage-policies.sql` の内容をコピーして実行
3. 以下の4つのポリシーが表示されるはずです：
   - `company-seals-insert` (INSERT, authenticated)
   - `company-seals-update` (UPDATE, authenticated)
   - `company-seals-delete` (DELETE, authenticated)
   - `company-seals-select` (SELECT, public)
4. 4つ全て表示されない場合は、方法1を再実行

**方法3: ダッシュボードで確認**
1. Supabaseダッシュボードで **Storage** → **Policies** タブを開く
2. 上記4つのポリシーが存在するか確認
3. 存在しない場合は、上記「3. ポリシーの設定」の手順に従って作成

**方法4: RLS設定を確認**
1. **Storage** → **Buckets** で `company-seals` バケットを選択
2. 右上の設定アイコンをクリック
3. 「Public bucket」が **ON** になっているか確認

### エラー: "An unexpected response was received from the server"

**原因**: `company-seals` バケットが作成されていない、または公開設定がOFFになっている

**解決策**:
1. Supabase Storage で `company-seals` バケットが存在するか確認
2. バケットの設定で「Public bucket」が **ON** になっているか確認

### エラー: "Bucket not found"

**原因**: バケット名が `company-seals` ではない

**解決策**: バケット名は必ず `company-seals` にしてください（小文字で）

### ファイルがアップロードできない

**原因**: ファイルサイズまたは形式の制限

**解決策**:
- ファイルサイズは 10MB 以下にしてください
- 対応形式: PNG, JPEG, GIF
- 透過PNG形式を推奨します（請求書PDF生成時に背景が透明になります）

## セキュリティ上の注意

- `company-seals` バケットはPublic設定のため、インターネット上の誰でもアクセス可能です
- 機密情報を含むファイルはアップロードしないでください
- アップロードされるファイルは企業の電子印（ハンコ）の画像のみを想定しています

## 参考リンク

- [Supabase Storage 公式ドキュメント](https://supabase.com/docs/guides/storage)
- [Storage Policies 設定ガイド](https://supabase.com/docs/guides/storage/security/access-control)
