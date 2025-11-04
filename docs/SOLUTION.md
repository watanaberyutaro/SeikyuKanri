# データ取得問題の解決方法

## 📋 問題の概要

現在、Supabaseからデータが取得できない状態です。

**症状:**
- 認証は成功している
- クエリはエラーなく実行されている
- しかし、データは空配列 `[]` で返ってくる

**原因:**
RLS（Row Level Security）ポリシーは正しく設定されていますが、以下のいずれかの理由でデータが取得できていません：

1. データベースに請求書データが存在しない
2. データのuser_idが現在ログイン中のユーザーIDと一致していない
3. データは別のユーザーによって作成されている

## 🚀 解決手順

### ステップ1: 診断ツールを使う（最も簡単な方法）

#### 1-1. Service Role Keyを設定

`.env.local`ファイルに以下を追加：

```bash
# Supabaseダッシュボードから取得
# https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...（実際のキー）
```

**Service Role Keyの取得方法:**
1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニュー > Settings > API
4. 「service_role」セクションの「secret」キーをコピー

⚠️ **重要:** このキーは機密情報です。本番環境では使用せず、`.env.local`に保存してください（gitignoreに含まれています）。

#### 1-2. 開発サーバーを起動

```bash
npm run dev
```

#### 1-3. 診断ツールにアクセス

ブラウザで以下のURLを開く：

```
http://localhost:3002/debug
```

または、ログイン後のナビゲーションバー右上にある **「診断」** ボタンをクリック

#### 1-4. 診断を実行

「診断を実行」ボタンをクリックすると、以下の情報が表示されます：

- ✅ 現在の認証状態
- 📊 データベース内の全データ（RLSバイパス）
- 🔍 現在のユーザーに紐づくデータ（RLS適用後）
- 💡 問題の診断結果と推奨アクション
- ⚠️ user_idが一致しないデータの一覧

#### 1-5. 推奨アクションに従う

診断ツールが表示する推奨アクションに従ってください。

**パターンA: データは存在するがuser_idが一致しない場合**

診断結果に表示されるSQLをSupabase SQL Editorで実行：

```sql
UPDATE invoices SET user_id = '6308c00e-408b-454c-8260-9e82d14d833d';
UPDATE companies SET user_id = '6308c00e-408b-454c-8260-9e82d14d833d';
UPDATE quotes SET user_id = '6308c00e-408b-454c-8260-9e82d14d833d';
```

**パターンB: データが存在しない場合**

テストデータを作成してください（手順は下記参照）。

### ステップ2: テストデータを作成（データが存在しない場合）

Supabase SQL Editorで以下のSQLを実行：

```sql
-- 1. まず企業を作成
INSERT INTO companies (user_id, name, email, postal_code, address, phone, contact_person)
VALUES (
  '6308c00e-408b-454c-8260-9e82d14d833d',
  '株式会社サンプル',
  'sample@example.com',
  '150-0001',
  '東京都渋谷区神宮前1-2-3',
  '03-1234-5678',
  '山田太郎'
)
RETURNING id;

-- 2. 上記で取得したcompany_idを使って請求書を作成
-- （company_idは上記のRETURNING idで表示されたUUIDを使用）
INSERT INTO invoices (
  user_id,
  company_id,
  invoice_number,
  title,
  issue_date,
  due_date,
  status,
  subtotal,
  tax_amount,
  total_amount,
  notes
)
VALUES (
  '6308c00e-408b-454c-8260-9e82d14d833d',
  '（ここに上記で取得したcompany_id）',
  'INV-2025-0001',
  'Webサイト制作費用',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  'pending',
  500000,
  50000,
  550000,
  'テスト請求書です'
);

-- 3. さらにテストデータを追加（オプション）
INSERT INTO invoices (
  user_id,
  company_id,
  invoice_number,
  title,
  issue_date,
  due_date,
  status,
  subtotal,
  tax_amount,
  total_amount
)
VALUES
(
  '6308c00e-408b-454c-8260-9e82d14d833d',
  '（上記のcompany_id）',
  'INV-2025-0002',
  'システム保守費用',
  CURRENT_DATE - INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '20 days',
  'sent',
  300000,
  30000,
  330000
),
(
  '6308c00e-408b-454c-8260-9e82d14d833d',
  '（上記のcompany_id）',
  'INV-2025-0003',
  'コンサルティング費用',
  CURRENT_DATE - INTERVAL '60 days',
  CURRENT_DATE - INTERVAL '30 days',
  'paid',
  800000,
  80000,
  880000
);
```

### ステップ3: 動作確認

1. ダッシュボードページをリロード
2. データが表示されることを確認
3. 請求書一覧、企業一覧も確認

## 🔧 作成した診断ツールについて

今回、以下のツールを作成しました：

### 1. 診断APIエンドポイント
**場所:** `/src/app/api/debug/route.ts`

RLSをバイパスして全データを取得し、現在のユーザーのデータと比較します。

### 2. 管理者クライアント
**場所:** `/src/lib/supabase/admin.ts`

Service Role Keyを使用してRLSをバイパスできるSupabaseクライアントです。

### 3. 診断UIページ
**場所:** `/src/app/debug/page.tsx`

診断結果を見やすく表示するUIページです。開発モード時のみナビゲーションバーに「診断」ボタンが表示されます。

## 📝 デバッグログの見方

コンソールに以下のようなログが出力されています：

```
=== Dashboard Debug ===
User ID: 6308c00e-408b-454c-8260-9e82d14d833d
All Invoices (no filter): []
Filtered Invoices: []
Error: null
======================
```

- `User ID`: 現在ログイン中のユーザーID
- `All Invoices (no filter)`: フィルタなしでのクエリ結果（RLS適用）
- `Filtered Invoices`: user_idでフィルタしたクエリ結果
- `Error`: エラー内容（nullの場合は正常）

両方とも`[]`（空配列）の場合は、データベースに該当するデータが存在しないか、user_idが一致していません。

## ✅ 解決後の確認

データが正しく表示されたら、以下のデバッグコードを削除できます：

### `/src/app/dashboard/page.tsx` から削除:
```tsx
// デバッグ: ユーザー情報を確認
console.log('=== Dashboard Debug ===')
console.log('User ID:', user?.id)
console.log('User:', user)

// 全ての請求書を取得してみる（user_idフィルタなし）- デバッグ用
const { data: allInvoices, error: allError } = await supabase
  .from('invoices')
  .select('id, user_id, status, total_amount')

console.log('All Invoices (no filter):', allInvoices)
console.log('All Invoices Error:', allError)

// ... その他のconsole.log ...
console.log('======================\n')
```

エラー表示部分も削除可能：
```tsx
{error && (
  <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm">
    <strong>データ取得エラー:</strong> {error.message}
    <br />
    <small>詳細: {JSON.stringify(error, null, 2)}</small>
  </div>
)}
```

## 🆘 まだ解決しない場合

以下を確認してください：

1. **Supabaseプロジェクトの確認**
   - 正しいプロジェクトに接続されているか
   - `.env.local`のURLとキーが正しいか

2. **RLSポリシーの確認**
   - Supabaseダッシュボード > Table Editor > invoicesテーブル > View Policies
   - 「Users can view own invoices」ポリシーが存在するか
   - ポリシー内容: `auth.uid() = user_id`

3. **スキーマの再実行**
   ```bash
   # Supabase SQL Editorでsupabase-schema.sqlを再実行
   ```

4. **ブラウザキャッシュのクリア**
   - ブラウザのキャッシュとCookieを削除
   - シークレットモードで再度ログイン

## 📚 参考情報

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- `DEBUG.md` - より詳細なデバッグ手順
- `supabase-schema.sql` - データベーススキーマ定義

---

問題が解決したら、この文書と`DEBUG.md`は削除または保管してください。
