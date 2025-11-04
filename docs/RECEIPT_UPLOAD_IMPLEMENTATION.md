# 領収書アップロード機能 実装ガイド

経費精算システムに領収書・レシートのアップロード機能を実装しました。

## 実装概要

### 主な機能

- 画像・PDFファイルのアップロード（JPG、PNG、GIF、WEBP、PDF対応）
- ファイルサイズ制限（最大10MB）
- アップロード済みファイルのプレビュー表示
- ファイルの削除・再アップロード
- 電子帳簿保存法対応（SHA-256ハッシュによる改ざん検知）
- テナント別のファイル管理
- モバイル対応UI

### 技術スタック

- **ストレージ**: Supabase Storage
- **バックエンド**: Next.js 15 API Routes
- **フロントエンド**: React + Next.js
- **UIコンポーネント**: shadcn/ui
- **認証**: Supabase Auth
- **セキュリティ**: RLS (Row Level Security) + SHA-256ハッシュ

## 実装ファイル

### 1. API Route (`/src/app/api/expenses/upload/route.ts`)

ファイルアップロードを処理するAPIエンドポイント。

**主な処理:**
- 認証チェック
- ファイル形式・サイズの検証
- Supabase Storageへのアップロード
- SHA-256ハッシュの計算
- 電子文書テーブル(`edocuments`)への登録

**エンドポイント:**
- `POST /api/expenses/upload`

**リクエスト形式:**
- Content-Type: `multipart/form-data`
- Body: `file` (File)

**レスポンス:**
```json
{
  "success": true,
  "url": "https://...supabase.co/storage/v1/object/public/expense-receipts/...",
  "fileName": "receipt.jpg",
  "fileSize": 123456,
  "hash": "a1b2c3d4..."
}
```

**セキュリティ機能:**
- ファイルサイズ制限: 10MB
- 許可された形式のみ: `image/*`, `application/pdf`
- テナント別のフォルダ分離: `{tenant_id}/{timestamp}_{random}.{ext}`
- SHA-256ハッシュによる改ざん検知

### 2. フォーム (`/src/app/expenses/claims/new/page.tsx`)

経費申請の新規作成フォームにアップロード機能を追加。

**追加機能:**
- ファイル選択UI
- アップロード進捗表示
- プレビュー表示（画像・PDF）
- ファイル削除機能

**主な変更点:**
```typescript
// 新規追加の状態管理
const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

// アップロード処理
const handleFileUpload = async (index: number, file: File | null) => {
  // FormDataでファイルを送信
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/expenses/upload', {
    method: 'POST',
    body: formData,
  })

  // URLを状態に保存
  newItems[index].attachment_url = data.url
}
```

### 3. ストレージセットアップスクリプト (`/database/scripts/setup-storage-bucket.sql`)

Supabase Storageバケットとポリシーを設定するSQLスクリプト。

**設定内容:**
- バケット名: `expense-receipts`
- 公開設定: `public = true`
- ファイルサイズ制限: 10MB
- 許可されたMIMEタイプ: 画像とPDF

**ポリシー:**
- INSERT: テナントユーザーがアップロード可能
- SELECT: テナントユーザーが閲覧可能
- UPDATE: テナントユーザーが更新可能
- DELETE: テナントユーザーが削除可能

## セットアップ手順

### 1. Supabase Storageバケットの作成

**方法A: ダッシュボードから手動作成**

詳細は `docs/STORAGE_SETUP.md` を参照

**方法B: SQLスクリプトで一括作成**

```bash
# Supabase SQL Editorで以下のスクリプトを実行
database/scripts/setup-storage-bucket.sql
```

### 2. 動作確認

1. アプリケーションにログイン
2. 経費精算 > 新規経費申請に移動
3. 領収書・レシート欄でファイルを選択
4. アップロードが成功し、プレビューが表示されることを確認

### 3. 電子文書テーブルの確認

```sql
-- アップロードされた領収書を確認
SELECT
  id,
  original_filename,
  file_size,
  file_hash,
  created_at
FROM edocuments
WHERE document_type = 'receipt'
ORDER BY created_at DESC;
```

## 使用方法

### 基本的な流れ

1. **経費申請ページにアクセス**
   - `/expenses/claims/new` に移動

2. **経費明細を入力**
   - 支払日、支払先、金額などを入力

3. **領収書をアップロード**
   - 「領収書・レシート」セクションでファイルを選択
   - ファイルが自動的にアップロードされる
   - プレビューが表示される

4. **申請を提出**
   - 「申請する」ボタンをクリック

### UI機能

#### アップロード前
- ファイル選択欄が表示される
- 対応形式: JPG、PNG、GIF、WEBP、PDF
- 最大サイズ: 10MB

#### アップロード中
- ローディングアイコンが表示される
- 「アップロード中...」メッセージ

#### アップロード後
- プレビュー表示（画像またはPDFアイコン）
- ファイル名表示
- 閲覧ボタン（新しいタブで開く）
- 削除ボタン（再アップロード可能）

## 電子帳簿保存法対応

### SHA-256ハッシュによる改ざん検知

アップロード時にファイルのSHA-256ハッシュを計算し、`edocuments`テーブルに保存。

```typescript
// ハッシュ計算
const hash = crypto.createHash('sha256').update(buffer).digest('hex')

// データベースに保存
await supabase.from('edocuments').insert({
  file_hash: hash,
  // ...
})
```

### 改ざん検知の実装

ファイルの完全性を検証する場合:

```typescript
// 保存されたファイルを取得
const response = await fetch(fileUrl)
const arrayBuffer = await response.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)

// 現在のハッシュを計算
const currentHash = crypto.createHash('sha256').update(buffer).digest('hex')

// 保存されたハッシュと比較
if (currentHash !== savedHash) {
  console.error('ファイルが改ざんされている可能性があります')
}
```

### バージョン管理

`edocuments`テーブルの`version`カラムでバージョン管理が可能。
ファイルを更新する場合は、新しいバージョンとして保存。

## セキュリティ

### ファイルアップロードのセキュリティ

1. **認証チェック**
   - Supabase Authで認証されたユーザーのみアップロード可能

2. **ファイル形式の検証**
   - MIMEタイプのホワイトリスト方式
   - 許可: `image/*`, `application/pdf`

3. **ファイルサイズ制限**
   - 最大10MB

4. **テナント分離**
   - ファイル名に`tenant_id`を含める
   - RLSポリシーでテナント別にアクセス制御

5. **ファイル名のサニタイズ**
   - タイムスタンプ + ランダム文字列で一意なファイル名を生成
   - ディレクトリトラバーサル攻撃を防止

### Row Level Security (RLS)

Supabase Storageのポリシー:

```sql
-- アップロード: 自分のテナント配下のみ
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

## トラブルシューティング

### エラー: "Bucket not found"

**原因:** ストレージバケットが作成されていない

**解決方法:**
1. Supabaseダッシュボードでストレージバケットを確認
2. `database/scripts/setup-storage-bucket.sql` を実行

### エラー: "Permission denied"

**原因:** RLSポリシーが設定されていない、またはtenant_idがnull

**解決方法:**
1. ポリシーが正しく設定されているか確認
2. `profiles`テーブルに`tenant_id`が設定されているか確認

### アップロードが遅い

**原因:** ファイルサイズが大きい、ネットワークが遅い

**解決方法:**
1. ファイルサイズを確認（10MB以下）
2. 画像を圧縮
3. ネットワーク接続を確認

### プレビューが表示されない

**原因:** 公開URLが正しくない、バケットがpublicでない

**解決方法:**
1. バケットの公開設定を確認（`public = true`）
2. URLが正しいか確認
3. ブラウザのコンソールでエラーを確認

## 今後の拡張案

### 1. 画像圧縮

大きな画像を自動的に圧縮してアップロード

```typescript
import imageCompression from 'browser-image-compression'

const compressedFile = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
})
```

### 2. OCR機能

領収書から金額や日付を自動抽出

```typescript
// Google Cloud Vision APIなどを使用
const result = await fetch('/api/ocr', {
  method: 'POST',
  body: JSON.stringify({ imageUrl }),
})
```

### 3. 複数ファイルアップロード

ドラッグ&ドロップで複数ファイルを一括アップロード

### 4. ウイルススキャン

アップロード時にウイルススキャンを実行（本番環境）

## 関連ドキュメント

- [STORAGE_SETUP.md](./STORAGE_SETUP.md) - ストレージセットアップ詳細
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - プロジェクト構造
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)

## まとめ

領収書アップロード機能により、以下が可能になりました:

✅ 経費申請時に領収書画像・PDFを添付
✅ モバイルからの撮影・アップロード
✅ 電子帳簿保存法に対応した改ざん検知
✅ テナント別のセキュアなファイル管理
✅ 直感的なUI/UX

これにより、経費精算のペーパーレス化とデジタル化が実現できます。
