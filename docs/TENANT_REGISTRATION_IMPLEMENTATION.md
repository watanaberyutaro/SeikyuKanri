# テナント申請システム実装完了

## 概要

新規登録機能を本格実装しました。従来の管理者が手動で企業を登録する方式から、ユーザーが申請フォームから申し込み、管理者が承認する方式に変更しました。

## 実装内容

### 1. データベース

**新規テーブル: `tenant_applications`**
- 企業登録申請を管理するテーブル
- 状態: `pending`(承認待ち), `approved`(承認済み), `rejected`(却下)
- マイグレーションファイル: `database/migrations/00008_add_tenant_applications.sql`

### 2. ページ

#### a) ランディングページ (`/src/app/page.tsx`)
- システムの紹介LP
- ヘッダーに「新規お申し込み」「ログイン」ボタン
- 機能紹介、選ばれる理由、機能一覧セクション
- CTAセクションとフッター

#### b) 申請フォーム (`/src/app/apply/page.tsx`)
- 企業情報入力フォーム
  - 企業名/事業所名 (必須)
  - 郵便番号
  - 所在地
  - 電話番号 (必須)
  - 企業メールアドレス (必須)
- 代表者情報入力フォーム
  - 代表者氏名 (必須)
  - 代表者メールアドレス (必須) ※ログインIDになる
- 送信後、承認待ち画面を表示

#### c) 管理者承認画面 (`/src/app/admin/applications/page.tsx`)
- 申請一覧表示（承認待ち/承認済み/却下でフィルタリング可能）
- 各申請の詳細情報表示
- 承認/却下ボタン
- メモ入力機能

### 3. API エンドポイント

#### a) 申請作成 (`/src/app/api/applications/route.ts`)
- `POST /api/applications` - 新規申請を作成
  - バリデーション
  - 重複チェック
  - データベースに保存
  - 管理者にメール通知（実装予定）

- `GET /api/applications` - 申請一覧取得（管理者のみ）
  - 状態でフィルタリング可能

#### b) 承認処理 (`/src/app/api/applications/[id]/approve/route.ts`)
- `POST /api/applications/[id]/approve` - 申請を承認
  1. 6桁の企業コードを生成
  2. テナント（企業）レコードを作成
  3. 12桁の一時パスワードを生成
  4. Supabase Authでユーザーアカウントを作成
  5. プロフィールにtenant_idを設定
  6. 申請ステータスを`approved`に更新
  7. 申請者にログイン情報をメール送信（実装予定）

#### c) 却下処理 (`/src/app/api/applications/[id]/reject/route.ts`)
- `POST /api/applications/[id]/reject` - 申請を却下
  - 申請ステータスを`rejected`に更新
  - メモを保存

### 4. ナビゲーション

**サイドバー更新 (`/src/components/layout/sidebar.tsx`)**
- 管理者メニューに「申請管理」リンクを追加
- `/admin/applications` へのナビゲーション

### 5. 型定義

**`/src/types/tenant-application.ts`**
- `TenantApplication` - 申請データ型
- `TenantApplicationStatus` - ステータス型
- `CreateTenantApplicationInput` - 作成入力型
- `UpdateTenantApplicationInput` - 更新入力型

## データベースマイグレーション

以下の手順でマイグレーションを実行してください：

### 方法1: Supabase Dashboard（推奨）

1. Supabase Dashboard (https://supabase.com) にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 「New query」をクリック
5. `database/migrations/00008_add_tenant_applications.sql` の内容をコピー&ペースト
6. 「Run」ボタンをクリック

### 方法2: Supabase CLI

```bash
# Supabase CLIがインストールされている場合
supabase db push database/migrations/00008_add_tenant_applications.sql
```

### 方法3: psqlコマンド

```bash
# PostgreSQLクライアントを使用
psql -h [YOUR_SUPABASE_HOST] -U postgres -d postgres < database/migrations/00008_add_tenant_applications.sql
```

## 動作フロー

### ユーザー側

1. トップページ (`/`) にアクセス
2. 「新規お申し込み」ボタンをクリック
3. 申請フォーム (`/apply`) で企業情報と代表者情報を入力
4. 「申し込む」ボタンをクリック
5. 承認待ち画面が表示される
6. 管理者承認後、メールでログイン情報が届く（実装予定）
7. 受け取った企業コード、メールアドレス、仮パスワードでログイン

### 管理者側

1. 管理者アカウントでログイン
2. サイドバーの「申請管理」をクリック
3. 承認待ちの申請一覧を確認
4. 各申請の詳細を確認
5. 「承認」ボタンをクリック
6. 自動的に以下が実行される：
   - 企業コード生成
   - テナント作成
   - ユーザーアカウント作成
   - 一時パスワード生成
   - 申請者へメール送信（実装予定）

## 今後の実装予定

### メール通知機能

現在、メール送信部分はコメントアウトされています。以下のいずれかを実装してください：

#### オプション1: Resend

```bash
npm install resend
```

環境変数:
```
RESEND_API_KEY=your_api_key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

#### オプション2: SendGrid

```bash
npm install @sendgrid/mail
```

環境変数:
```
SENDGRID_API_KEY=your_api_key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

#### オプション3: Supabase Edge Function

Supabase Edge Functionを使用してメール送信を実装することも可能です。

## セキュリティ考慮事項

1. **RLS (Row Level Security)**
   - 申請テーブルは誰でも作成可能（認証不要）
   - 閲覧・更新は管理者のみ

2. **パスワード生成**
   - 12桁の英数字記号でランダム生成
   - 初回ログイン後、変更を推奨

3. **企業コード**
   - 6桁の英数字でランダム生成
   - 重複チェックは現在未実装（必要に応じて追加）

4. **バリデーション**
   - 必須項目チェック
   - メールアドレス形式チェック
   - 重複申請チェック

## テスト手順

1. マイグレーションを実行
2. トップページ (`http://localhost:3000/`) にアクセス
3. 「新規お申し込み」をクリック
4. 申請フォームを入力して送信
5. 管理者アカウントでログイン
6. 「申請管理」で申請を確認
7. 承認ボタンをクリック
8. テナントとユーザーが作成されたことを確認

## ファイル一覧

```
database/migrations/
  00008_add_tenant_applications.sql

src/types/
  tenant-application.ts

src/app/
  page.tsx (LP)
  apply/page.tsx (申請フォーム)
  admin/applications/page.tsx (管理者承認画面)
  api/applications/route.ts (申請API)
  api/applications/[id]/approve/route.ts (承認API)
  api/applications/[id]/reject/route.ts (却下API)

src/components/layout/
  sidebar.tsx (更新)
```

## 完了！

新規テナント登録システムの実装が完了しました。データベースマイグレーションを実行後、すぐに使用できます。
