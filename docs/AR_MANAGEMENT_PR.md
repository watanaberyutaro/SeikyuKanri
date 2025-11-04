# 売掛管理機能の追加

## 概要
既存の請求書管理システムに売掛管理（AR Management）機能を追加しました。
この機能は `FEATURE_AR_MANAGEMENT` フラグで制御され、既存の請求・見積機能には一切影響しません。

## 変更内容

### データベース
- ✅ 4つの新規テーブル追加（payments, payment_allocations, dunning_rules, dunning_logs）
- ✅ 2つのビュー追加（ar_aging_by_customer, ar_invoice_balance）
- ✅ 配分整合性チェックトリガー
- ✅ RLSポリシー完備

### API
- ✅ `/api/payments` - 入金CRUD
- ✅ `/api/allocations` - 配分管理
- ✅ `/api/ar/aging` - 年齢表取得
- ✅ `/api/ar/dunning/send` - 督促送信（ドライランモード対応）
- ✅ `/api/ar/dunning/daily` - 日次自動チェック（Vercel Cron）

### UI
- ✅ `/ar/receivables` - 売掛管理ページ
- ✅ `/ar/aging` - 年齢表ページ（CSVエクスポート付き）
- ✅ サイドバーにメニュー追加（Feature flag制御）

### その他
- ✅ 型定義（TypeScript）
- ✅ Feature flag管理
- ✅ Vercel Cron設定
- ✅ 環境変数サンプル更新
- ✅ ドキュメント作成

## 主な機能

### 1. 入金管理
- 入金の登録・閲覧・削除
- 顧客別入金履歴
- 入金方法とメモの記録

### 2. 消込（配分）管理
- 入金の請求書への配分
- 部分入金・複数請求書への配分対応
- トランザクション整合性保証（入金額・請求額を超えないチェック）

### 3. 売掛年齢表
- 顧客別年齢表（0-30/31-60/61-90/90+日）
- 請求別残高一覧（期限超過日数表示）
- CSVエクスポート

### 4. 督促管理
- 年齢区分別督促ルール
- メールテンプレート管理
- ドライランモード（送信前プレビュー）
- 送信履歴の監査ログ
- 日次自動チェック（提案のみ、自動送信はOFF）

## セットアップ

### 1. データベースマイグレーション
```sql
-- Supabase SQLエディタで実行
-- 00001_add_ar_management.sql
```

### 2. 環境変数
```env
NEXT_PUBLIC_FEATURE_AR_MANAGEMENT=1  # 機能を有効化
FEATURE_AR_MANAGEMENT=1
ENABLE_EMAIL_SENDING=0  # メール送信（未実装）
CRON_SECRET=your_random_secret
```

### 3. Vercel設定
- 環境変数を設定
- Cronジョブは自動設定（vercel.json）

## テスト項目

### ✅ 完了したテスト
- [x] 入金登録・取得・削除
- [x] 配分の整合性チェック（入金額超過、請求額超過）
- [x] 年齢表の正確性（境界値含む）
- [x] 督促ドライランモード
- [x] RLSポリシー（テナント分離）
- [x] Feature flag制御
- [x] 既存機能への影響なし

### 🔄 今後のテスト
- [ ] E2Eテスト（入金→配分→残高ゼロまでの流れ）
- [ ] 並行処理時の競合テスト
- [ ] パフォーマンステスト（大量データ）

## 既存機能への影響

**影響なし** - 以下の理由により既存機能は完全に保護されています：

1. **新規テーブルのみ** - 既存テーブルは一切変更なし
2. **Feature flag制御** - `FEATURE_AR_MANAGEMENT=0` で完全に無効化可能
3. **新規ルートのみ** - `/ar/*` 配下のみ追加
4. **独立したAPI** - 既存APIには一切手を加えていない

## スクリーンショット

（実装後に追加予定）

## 今後の拡張予定

- [ ] 入金・消込モーダルUI
- [ ] 督促送信モーダルUI
- [ ] SendGrid/Resend連携
- [ ] 請求詳細に入金/消込タブ追加
- [ ] 自動配分アルゴリズム（FIFO/LIFO）
- [ ] 相殺処理
- [ ] 年齢表のMaterialized View化

## レビューポイント

1. **セキュリティ**
   - RLSポリシーの確認
   - API認証の確認
   - Cron認証（CRON_SECRET）の確認

2. **データ整合性**
   - 配分整合性トリガーのロジック
   - 負残高防止

3. **パフォーマンス**
   - ビューのクエリ効率
   - インデックス設計

4. **コード品質**
   - TypeScript型定義
   - エラーハンドリング
   - コメント

## 関連ドキュメント

- `AR_MANAGEMENT_README.md` - 詳細な使用方法とAPI仕様
- `00001_add_ar_management.sql` - データベーススキーマ
- `.env.local.example` - 環境変数サンプル

## チェックリスト

- [x] コード実装完了
- [x] 型定義追加
- [x] API実装
- [x] UI実装
- [x] Feature flag設定
- [x] データベーススキーマ
- [x] RLSポリシー
- [x] ドキュメント作成
- [x] 環境変数サンプル更新
- [ ] E2Eテスト
- [ ] レビュー完了
- [ ] QA完了
