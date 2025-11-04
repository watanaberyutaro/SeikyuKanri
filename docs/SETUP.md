# 請求書管理システム セットアップガイド

## 必要な環境

- Node.js 18.x以上
- Supabaseアカウント
- Resendアカウント（メール送信用）
- Vercelアカウント（デプロイ用）

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にログインし、新しいプロジェクトを作成
2. プロジェクトが作成されたら、Settings > APIから以下の情報を取得：
   - Project URL
   - anon/public key
   - service_role key（管理者権限、取り扱い注意）

### 2. データベースのセットアップ

1. Supabaseダッシュボードで SQL Editor を開く
2. `supabase-schema.sql` の内容をコピーして実行
3. テーブルとポリシーが正しく作成されたことを確認

### 3. 環境変数の設定

1. `.env.local.example` を `.env.local` にコピー
2. 以下の環境変数を設定：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<Your Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Your Supabase Anon Key>
SUPABASE_SERVICE_ROLE_KEY=<Your Supabase Service Role Key>

# Resend
RESEND_API_KEY=<Your Resend API Key>

# アプリケーション
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Resendのセットアップ

1. [Resend](https://resend.com)にアカウントを作成
2. API Keyを作成
3. ドメイン認証を設定（本番環境用）
4. API Keyを `.env.local` に追加

### 5. 依存パッケージのインストール

```bash
npm install
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 7. Vercelへのデプロイ

1. [Vercel](https://vercel.com)にログイン
2. GitHubリポジトリと連携
3. 環境変数を設定（.env.localと同じ内容）
4. デプロイを実行

## 主な機能

- ✅ ユーザー認証（Supabase Auth）
- ✅ 企業管理（登録・編集・削除）
- ✅ 請求書作成・管理
- ✅ 見積書作成・管理
- ✅ ステータス管理（送付待ち・送付済み・入金済み）
- ✅ 売上ダッシュボード
- ✅ メール送信（Resend）

## プロジェクト構成

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   │   ├── login/         # ログイン
│   │   └── signup/        # 新規登録
│   ├── dashboard/         # ダッシュボード
│   ├── companies/         # 企業管理
│   ├── invoices/          # 請求書管理
│   ├── quotes/            # 見積書管理
│   └── api/               # API Routes
├── components/            # Reactコンポーネント
│   └── ui/               # shadcn/ui コンポーネント
├── lib/                   # ユーティリティ
│   └── supabase/         # Supabaseクライアント
└── types/                 # 型定義

supabase-schema.sql        # データベーススキーマ
```

## トラブルシューティング

### データベース接続エラー
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトが起動しているか確認

### 認証エラー
- Supabaseダッシュボードで Email Auth が有効になっているか確認
- RLS（Row Level Security）ポリシーが正しく設定されているか確認

### メール送信エラー
- Resend API Keyが正しく設定されているか確認
- 送信元メールアドレスが認証されているか確認

## 開発のヒント

- TypeScript の型チェック: `npm run build`
- コードフォーマット: Prettier / ESLint を使用
- コミット前にビルドエラーがないことを確認

## サポート

問題が発生した場合は、以下を確認してください：
1. Supabaseのログ
2. ブラウザの開発者ツール（Console）
3. Next.jsのサーバーログ
