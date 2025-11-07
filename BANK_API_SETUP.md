# 銀行API連携機能 セットアップガイド

## 概要

このシステムは**Moneytree LINK API**を使用して、日本の主要銀行と自動連携します。

### 対応金融機関（例）
- 三菱UFJ銀行
- 三井住友銀行
- みずほ銀行
- ゆうちょ銀行
- その他多数の地方銀行・信用金庫

---

## 1. Moneytree APIキーの取得

### ステップ1: Moneytree LINK申し込み

1. **Moneytree LINK公式サイト**にアクセス
   - https://link.getmoneytree.com/

2. **お問い合わせ / デモ申し込み**
   - 企業名、担当者情報を入力
   - 「法人向けAPI連携サービスに興味がある」と記入

3. **営業担当との商談**
   - サービス内容説明
   - 料金プラン確認（月額料金 + API呼び出し料金）
   - 契約手続き

### ステップ2: 開発者アカウント作成

契約後、Moneytreeから以下が提供されます:

- **Client ID**: OAuth認証用のクライアントID
- **Client Secret**: OAuth認証用のシークレットキー
- **開発者ポータルへのアクセス権**

### 料金目安（2024年時点）

- **初期費用**: 要問い合わせ
- **月額費用**: ¥30,000〜（プランにより変動）
- **API呼び出し**: 従量課金

> **注意**: 個人開発者向けの無料プランはありません。法人契約が必要です。

---

## 2. データベースマイグレーション

### Supabaseダッシュボードで実行

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. **SQL Editor**を開く
4. `database/bank-api-migration-complete.sql`の内容を貼り付け
5. **Run**をクリック

### 実行内容
- ✅ `bank_api_*` テーブル作成
- ✅ トークン暗号化関数作成
- ✅ RLSポリシー設定
- ✅ Moneytreeプロバイダー登録

---

## 3. 環境変数の設定

### 開発環境（`.env.local`）

```bash
# Feature Flag
NEXT_PUBLIC_FEATURE_BANK_API=1
FEATURE_BANK_API=1

# 銀行API設定（Moneytree）
BANK_ENCRYPTION_KEY=your_strong_encryption_passphrase_at_least_32_chars
MONEYTREE_CLIENT_ID=your_moneytree_client_id_from_dashboard
MONEYTREE_CLIENT_SECRET=your_moneytree_client_secret_from_dashboard
MONEYTREE_REDIRECT_URI=http://localhost:3000/api/bank-api/callback/moneytree
```

### 本番環境（Vercel）

Vercelダッシュボード → Settings → Environment Variables で設定:

```bash
NEXT_PUBLIC_FEATURE_BANK_API=1
FEATURE_BANK_API=1
BANK_ENCRYPTION_KEY=<強力なパスフレーズ32文字以上>
MONEYTREE_CLIENT_ID=<MoneyreeダッシュボードのClient ID>
MONEYTREE_CLIENT_SECRET=<MoneyreeダッシュボードのClient Secret>
MONEYTREE_REDIRECT_URI=https://your-domain.com/api/bank-api/callback/moneytree
```

> **重要**: `BANK_ENCRYPTION_KEY`は32文字以上のランダムな文字列を使用してください。

生成例:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Moneytree ダッシュボード設定

### リダイレクトURIの登録

Moneytree開発者ポータルで以下のURIを登録:

**開発環境**:
```
http://localhost:3000/api/bank-api/callback/moneytree
```

**本番環境**:
```
https://your-domain.vercel.app/api/bank-api/callback/moneytree
```

> **注意**: URIが完全に一致しないとOAuth認証が失敗します。

---

## 5. 動作確認

### 1. ログイン

通常のテナントアカウントでログイン（管理者ではなく）

### 2. 銀行API連携ページにアクセス

サイドバー → **会計** → **取引入力** → **銀行API連携**

### 3. Moneytree接続

「Moneytreeと連携」ボタンをクリック

### 4. OAuth認証

1. Moneytreeログイン画面が表示される
2. Moneytreeアカウントでログイン（テスト用アカウント）
3. 銀行口座選択
4. 認可を承認

### 5. 同期確認

- システムに戻ると、接続済みステータス表示
- 「同期」ボタンで銀行取引を取得
- 銀行口座一覧と未マッチング取引が表示される

---

## 6. トラブルシューティング

### エラー: "Provider not found"

**原因**: データベースマイグレーションが未実行

**解決策**:
```sql
-- Supabase SQL Editorで実行
SELECT * FROM bank_api_providers WHERE name = 'moneytree';
```
結果が空の場合、マイグレーションを再実行

### エラー: "Token decryption failed"

**原因**: `BANK_ENCRYPTION_KEY`が設定されていない

**解決策**:
1. `.env.local`に`BANK_ENCRYPTION_KEY`を追加
2. 開発サーバー再起動: `npm run dev`

### エラー: "State mismatch"

**原因**: OAuth CSRF保護エラー（セッション切れ）

**解決策**: ブラウザのCookieをクリアして再試行

### エラー: "Invalid redirect_uri"

**原因**: Moneytreeダッシュボードに登録したURIと不一致

**解決策**: `.env.local`の`MONEYTREE_REDIRECT_URI`とMonet reeダッシュボードの登録URIを完全に一致させる

---

## 7. 開発中の代替手段

Moneytree契約前に機能を試したい場合:

### オプション1: モックデータを使用

```typescript
// src/app/api/bank-api/sync/route.ts
// 開発モードでモックデータを返す
if (process.env.NODE_ENV === 'development') {
  return NextResponse.json({
    success: true,
    accounts_synced: 2,
    transactions_synced: 10,
    new_transactions: 5
  })
}
```

### オプション2: 銀行CSVインポート機能を使用

既に実装済みの`/bank/import`ページで、銀行のCSVファイルをアップロードできます。

---

## 8. セキュリティ上の注意

### トークン暗号化

- アクセストークンとリフレッシュトークンは**AES-256暗号化**でデータベース保存
- 暗号化キーは環境変数で管理（Gitにコミットしない）

### RLS（Row Level Security）

- すべての銀行データはテナント分離
- ユーザーは自分のテナントのデータのみアクセス可能

### CSRF保護

- OAuth認証時に`state`パラメータで保護
- リダイレクト後にstate検証

---

## 9. 本番運用チェックリスト

- [ ] Moneytree LINK契約完了
- [ ] Client ID・Secret取得
- [ ] Vercel環境変数設定
- [ ] Supabaseマイグレーション実行
- [ ] Moneytreeダッシュボードにリダイレクト URI登録
- [ ] 本番環境でOAuth認証テスト
- [ ] 同期機能テスト
- [ ] RLSポリシー確認
- [ ] エラーログ監視設定

---

## サポート

### Moneytree公式ドキュメント
- https://docs.link.getmoneytree.com/

### Moneytreeサポート
- support@getmoneytree.com

### システムサポート
- プロジェクトのIssueで質問してください
