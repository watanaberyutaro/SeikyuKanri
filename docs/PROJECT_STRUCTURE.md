# プロジェクト構造

## ディレクトリ構成

```
SeikyuKanri/
├── database/
│   ├── migrations/        # データベースマイグレーションファイル
│   ├── scripts/          # データベーススクリプト
│   │   └── dev/         # 開発・検証用スクリプト
│   └── templates/       # テンプレートファイル
├── docs/                # ドキュメント
├── scripts/             # ユーティリティスクリプト
└── src/                # ソースコード
    ├── app/            # Next.js App Router
    ├── components/     # Reactコンポーネント
    ├── lib/            # ライブラリ・ユーティリティ
    └── types/          # TypeScript型定義
```

## データベースファイル

### マイグレーション (`database/migrations/`)

番号順に実行するマイグレーションファイル：

- **00001~00011**: 基本機能（AR管理、会計コア、経費精算など）
- **00024**: 固定資産管理機能
- **00025**: 電子帳簿保存法対応・監査ログ機能

### スクリプト (`database/scripts/`)

セットアップ・メンテナンス用のスクリプト：

- `reset-tenant-data.sql` - テナントデータリセット
- `add-admin-role.sql` - 管理者ロール追加
- `create-admin-account.sql` - 管理者アカウント作成
- `fix-*.sql` - ポリシー修正スクリプト
- `supabase-*.sql` - Supabaseスキーマ

### 開発スクリプト (`database/scripts/dev/`)

開発・検証用のスクリプト（本番では不要）：

- `00012~00023`: マスターデータ挿入・検証スクリプト

## ドキュメント (`docs/`)

- `ACCOUNTING_SETUP.md` - 会計機能セットアップガイド
- `AR_MANAGEMENT_README.md` - 売掛管理機能説明
- `MASTER_DATA_SETUP.md` - マスターデータセットアップ
- `TENANT_REGISTRATION_IMPLEMENTATION.md` - テナント登録実装
- `PASSWORD_RESET_SETUP.md` - パスワードリセット設定
- `SETUP.md` - 初期セットアップガイド
- `SOLUTION.md` - 技術的なソリューション説明
- `STORAGE_SETUP.md` - Supabase Storageセットアップガイド（領収書アップロード）
- `PROJECT_STRUCTURE.md` - このファイル

## ソースコード構成

### アプリケーション (`src/app/`)

- `(auth)/` - 認証関連ページ
- `accounting/` - 会計機能
- `admin/` - 管理者機能
- `ap/` - 買掛管理
- `ar/` - 売掛管理
- `assets/` - 固定資産管理
- `audit/` - 監査ログ
- `companies/` - 企業管理
- `dashboard/` - ダッシュボード
- `edoc/` - 電子帳簿検索
- `expenses/` - 経費精算
- `invoices/` - 請求書
- `quotes/` - 見積書
- `reports/` - レポート
- `settings/` - 設定

### コンポーネント (`src/components/`)

- `layout/` - レイアウトコンポーネント
- `ui/` - UIコンポーネント（shadcn/ui）

### ライブラリ (`src/lib/`)

- `supabase/` - Supabaseクライアント
- `edoc/` - 電子文書関連ユーティリティ
- `fixed-assets/` - 固定資産計算ロジック
- `utils.ts` - 汎用ユーティリティ

### 型定義 (`src/types/`)

- `database.ts` - データベース型
- `edoc-audit.ts` - 電子文書・監査ログ型
- `fixed-assets.ts` - 固定資産型

## 機能フラグ

環境変数でON/OFFを制御：

```bash
NEXT_PUBLIC_FEATURE_AR_MANAGEMENT=1      # 売掛管理
NEXT_PUBLIC_FEATURE_AP=1                  # 買掛管理
NEXT_PUBLIC_FEATURE_EXPENSES=1            # 経費精算
NEXT_PUBLIC_FEATURE_ACCOUNTING_CORE=1     # 会計コア
NEXT_PUBLIC_FEATURE_REPORTS=1             # レポート
NEXT_PUBLIC_FEATURE_FIXED_ASSETS=1        # 固定資産
NEXT_PUBLIC_FEATURE_EDOC=1                # 電子帳簿
NEXT_PUBLIC_FEATURE_AUDIT=1               # 監査ログ
```

## マイグレーション実行順序

1. 基本マイグレーション（00001~00011）を順番に実行
2. 必要に応じて追加機能マイグレーション（00024, 00025）を実行
3. セットアップスクリプト（`database/scripts/`）を必要に応じて実行

## 開発フロー

1. **機能開発**
   - `src/` 配下でコードを実装
   - 必要に応じて型定義を `src/types/` に追加

2. **データベース変更**
   - マイグレーションファイルを `database/migrations/` に作成
   - 番号を連番で命名（例: `00026_add_new_feature.sql`）

3. **ドキュメント更新**
   - 機能追加時は `docs/` にドキュメントを追加
   - `PROJECT_STRUCTURE.md` も必要に応じて更新

4. **環境変数追加**
   - 新機能には feature flag を追加
   - `.env.local.example` を更新

## 注意事項

- **マイグレーション**: 一度実行したマイグレーションは変更しない
- **番号順**: マイグレーションファイルは番号順に実行される
- **開発スクリプト**: `database/scripts/dev/` は本番環境では不要
- **バックアップ**: データベース変更前は必ずバックアップを取る
