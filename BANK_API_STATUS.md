# 銀行API連携機能 セットアップ状況

> **🔔 ステータス**: **今後実装予定**
> Moneytree LINK（月額¥30,000〜）の契約コストを考慮し、現在は機能を無効化しています。
> 実装コードはすべて完成しており、将来Moneytree契約時に即座に有効化できます。

---

## ✅ 完了済み

### 1. データベーススキーマ
- ✅ マイグレーションファイル作成済み (`database/bank-api-migration-complete.sql`)
- ⚠️ **Supabaseで実行が必要**（下記手順参照）

### 2. 環境変数
- ✅ Feature Flag有効化 (`NEXT_PUBLIC_FEATURE_BANK_API=1`)
- ✅ 暗号化キー生成・設定済み (`BANK_ENCRYPTION_KEY`)
- ⚠️ Moneytree APIキー未設定（下記で取得）

### 3. アプリケーションコード
- ✅ OAuth認証フロー実装済み
- ✅ トークン暗号化・復号化実装済み
- ✅ 銀行口座・取引同期機能実装済み
- ✅ UI実装済み (`/bank-api/connections`)
- ✅ RLSポリシー実装済み

---

## 📋 次のステップ

### ステップ1: データベースマイグレーション実行

1. Supabaseダッシュボードにアクセス
   - https://supabase.com/dashboard

2. プロジェクトを選択

3. 左メニュー → **SQL Editor**

4. 以下のファイルの内容をコピー&ペースト
   ```
   database/bank-api-migration-complete.sql
   ```

5. **Run** をクリック

6. 実行結果を確認
   ```
   table_name            | record_count
   ----------------------|-------------
   bank_api_providers    | 1
   bank_api_connections  | 0
   bank_api_accounts     | 0
   bank_api_transactions | 0
   ```

### ステップ2: Moneytree API取得（本番環境用）

> **重要**: Moneytree APIは法人契約が必要です。

#### 選択肢A: Moneytree契約（推奨・本番環境）

1. **Moneytree LINK公式サイト**にアクセス
   - https://link.getmoneytree.com/

2. 「お問い合わせ」から申し込み

3. 営業担当との商談
   - サービス説明
   - 料金確認（月額¥30,000〜）
   - 契約手続き

4. **Client ID・Secret**を取得

5. `.env.local`を更新
   ```bash
   MONEYTREE_CLIENT_ID=<取得したClient ID>
   MONEYTREE_CLIENT_SECRET=<取得したClient Secret>
   ```

6. Moneytree開発者ポータルでリダイレクトURI登録
   ```
   http://localhost:3000/api/bank-api/callback/moneytree
   ```

#### 選択肢B: 開発中は銀行CSVインポート機能を使用（代替案）

Moneytree契約前に機能を試したい場合:

1. サイドバー → **会計** → **取引入力** → **銀行インポート**

2. 銀行のCSVファイルをダウンロード

3. CSVをアップロード

4. 銀行取引が取り込まれる

---

## 🚀 動作確認（Moneytree契約後）

### 1. 開発サーバー再起動

```bash
# 環境変数反映のため
npm run dev
```

### 2. ログイン

通常のテナントアカウントでログイン

### 3. 銀行API連携ページにアクセス

サイドバー → **会計** → **取引入力** → **銀行API連携**

### 4. Moneytree接続

「Moneytreeと連携」ボタンをクリック

### 5. OAuth認証

1. Moneytreeログイン画面が表示される
2. Moneytreeアカウントでログイン
3. 銀行口座選択
4. 認可を承認

### 6. 同期確認

- 接続済みステータス表示
- 「同期」ボタンで銀行取引を取得
- 銀行口座一覧と未マッチング取引が表示される

---

## 🔒 本番環境デプロイ時の設定

### Vercel環境変数設定

Vercelダッシュボード → Settings → Environment Variables:

```bash
# Feature Flag
NEXT_PUBLIC_FEATURE_BANK_API=1
FEATURE_BANK_API=1

# 暗号化キー（新規生成推奨）
BANK_ENCRYPTION_KEY=<本番用の新しい64文字キー>

# Moneytree API（本番用）
MONEYTREE_CLIENT_ID=<本番用Client ID>
MONEYTREE_CLIENT_SECRET=<本番用Client Secret>
MONEYTREE_REDIRECT_URI=https://your-domain.vercel.app/api/bank-api/callback/moneytree
```

### Moneytree本番環境設定

Moneytree開発者ポータルで本番リダイレクトURIを登録:
```
https://your-domain.vercel.app/api/bank-api/callback/moneytree
```

---

## 📚 ドキュメント

- **セットアップガイド**: `BANK_API_SETUP.md`
- **マイグレーションSQL**: `database/bank-api-migration-complete.sql`
- **Moneytree公式ドキュメント**: https://docs.link.getmoneytree.com/

---

## ❓ よくある質問

### Q: Moneytree契約前に試せますか？

A: はい、以下の方法があります:
1. **銀行CSVインポート機能**を使用（`/bank/import`）
2. モックデータでUI確認（実装済みページを見るだけ）

### Q: Moneytree以外の銀行API連携サービスは？

A: freee会計API、マネーフォワードAPI などがあります。
   実装はアダプターパターンで設計済みのため、追加可能です。

### Q: 料金はいくらですか？

A: Moneytree LINKは月額¥30,000〜（プランにより変動）
   詳細は営業担当に要問い合わせ

### Q: セキュリティは大丈夫ですか？

A: はい、以下の対策済み:
- トークンはAES-256暗号化でDB保存
- RLS（Row Level Security）でテナント分離
- OAuth 2.0でCSRF保護
- 読み取り専用（支払い指示は不可）

---

## 📞 サポート

### Moneytreeサポート
- 公式サイト: https://link.getmoneytree.com/
- メール: support@getmoneytree.com

### システムサポート
- GitHubリポジトリのIssueで質問してください
