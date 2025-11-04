# 請求書管理システム

Next.js + Supabase + Resend で構築した、モダンな請求書・見積書管理システムです。

## 主な機能

- **認証システム** - Supabase Auth によるユーザー認証
- **企業管理** - 請求先企業の登録・編集・削除
- **請求書管理** - 請求書の作成、編集、ステータス管理（送付待ち・送付済み・入金済み）
- **見積書管理** - 見積書の作成、編集、管理
- **ダッシュボード** - 売上統計の可視化
- **メール送信** - Resend を使用した請求書・見積書のメール送信
- **明細管理** - 動的な明細行の追加・削除、自動計算

## 技術スタック

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Resend
- **Deployment**: Vercel

## セットアップ

詳細なセットアップ手順は [SETUP.md](./SETUP.md) をご覧ください。

### クイックスタート

1. 依存パッケージをインストール:
```bash
npm install
```

2. 環境変数を設定:
```bash
cp .env.local.example .env.local
# .env.local を編集して必要な環境変数を設定
```

3. Supabase でデータベースを設定:
- `supabase-schema.sql` を実行

4. 開発サーバーを起動:
```bash
npm run dev
```

5. ブラウザで http://localhost:3000 を開く

## プロジェクト構成

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 認証関連ページ
│   │   ├── login/           # ログイン
│   │   └── signup/          # 新規登録
│   ├── dashboard/           # ダッシュボード
│   ├── companies/           # 企業管理
│   ├── invoices/            # 請求書管理
│   ├── quotes/              # 見積書管理
│   └── api/                 # API Routes
├── components/              # Reactコンポーネント
│   ├── ui/                  # shadcn/ui コンポーネント
│   ├── layout/              # レイアウトコンポーネント
│   ├── invoices/            # 請求書コンポーネント
│   └── quotes/              # 見積書コンポーネント
├── lib/                     # ユーティリティ
│   ├── supabase/            # Supabaseクライアント
│   ├── email.ts             # メール送信
│   └── utils.ts             # ユーティリティ関数
└── types/                   # 型定義
    └── database.types.ts    # データベース型定義
```

## データベーススキーマ

- **profiles** - ユーザープロフィール
- **companies** - 企業情報
- **invoices** - 請求書
- **invoice_items** - 請求書明細
- **quotes** - 見積書
- **quote_items** - 見積書明細

詳細は `supabase-schema.sql` を参照してください。

## デプロイ

### Vercel へのデプロイ

1. Vercel にプロジェクトをインポート
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `NEXT_PUBLIC_APP_URL`
3. デプロイ

## 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番環境起動
npm start

# 型チェック
npm run type-check
```

## ライセンス

MIT

## サポート

問題が発生した場合は、SETUP.md のトラブルシューティングセクションを参照してください。
