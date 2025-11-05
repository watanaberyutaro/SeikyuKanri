# マイグレーション 00026: 請求書・見積書番号の一意性制約修正

## 📋 概要

請求書番号（`invoice_number`）と見積書番号（`quote_number`）のUNIQUE制約を修正します。

### 問題

現在の制約では、**全テナント（全企業）で番号が一意**になっています：

```sql
-- 現在の制約
invoice_number TEXT NOT NULL UNIQUE  -- ❌ 全企業で一意
quote_number TEXT NOT NULL UNIQUE    -- ❌ 全企業で一意
```

**具体例：**
- 企業Aが `INV-2025-001` を使用
- 企業Bも `INV-2025-001` を使おうとするとエラー ❌

これでは各企業が独立して番号を採番できません。

### 解決策

**テナントごとに一意**になるよう複合UNIQUE制約に変更します：

```sql
-- 修正後の制約
UNIQUE (tenant_id, invoice_number)  -- ✅ テナントごとに一意
UNIQUE (tenant_id, quote_number)    -- ✅ テナントごとに一意
```

**修正後：**
- 企業A: `INV-2025-001`, `002`, `003`... ✅
- 企業B: `INV-2025-001`, `002`, `003`... ✅（独立して採番可能）

## 🚀 実行方法

### 1. Supabase SQL Editorを開く

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから **SQL Editor** をクリック

### 2. スクリプトを実行

1. **New query** をクリック
2. `00026_fix_invoice_quote_number_uniqueness.sql` の内容をコピー&ペースト
3. **Run** ボタンをクリック

### 3. 実行結果を確認

成功すると以下のようなメッセージが表示されます：

```
NOTICE: ========================================
NOTICE: 請求書・見積書番号の制約を修正開始
NOTICE: ========================================
NOTICE: ✓ invoices: 既存のUNIQUE制約を削除
NOTICE: ✓ invoices: (tenant_id, invoice_number) の複合UNIQUE制約を追加
NOTICE: ✓ invoices: インデックスを追加
NOTICE: ✓ quotes: 既存のUNIQUE制約を削除
NOTICE: ✓ quotes: (tenant_id, quote_number) の複合UNIQUE制約を追加
NOTICE: ✓ quotes: インデックスを追加
NOTICE: ========================================
NOTICE: ✅ 制約の修正が完了しました！
NOTICE: ========================================
```

## ⚠️ 注意事項

### データの整合性チェック

このマイグレーションを実行する前に、既存データに問題がないか確認してください：

```sql
-- 同一テナント内で重複している請求書番号をチェック
SELECT tenant_id, invoice_number, COUNT(*) as count
FROM invoices
GROUP BY tenant_id, invoice_number
HAVING COUNT(*) > 1;

-- 同一テナント内で重複している見積書番号をチェック
SELECT tenant_id, quote_number, COUNT(*) as count
FROM quotes
GROUP BY tenant_id, quote_number
HAVING COUNT(*) > 1;
```

**重複がある場合：**
1. 重複データを手動で修正してください
2. その後、このマイグレーションを実行してください

### ロールバック方法

万が一、元の制約に戻す必要がある場合：

```sql
-- invoices テーブル
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tenant_invoice_number_key;
ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);

-- quotes テーブル
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_tenant_quote_number_key;
ALTER TABLE quotes ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);
```

## ✅ 動作確認

マイグレーション後、以下で動作を確認できます：

### 1. 請求書番号の重複テスト

```sql
-- テナントAで INV-2025-001 を作成（成功するはず）
INSERT INTO invoices (tenant_id, user_id, company_id, invoice_number, title, issue_date, subtotal, tax_amount, total_amount)
VALUES ('<tenant_a_id>', '<user_id>', '<company_id>', 'INV-2025-001', 'テスト', '2025-01-01', 100, 10, 110);

-- テナントBでも INV-2025-001 を作成（成功するはず）
INSERT INTO invoices (tenant_id, user_id, company_id, invoice_number, title, issue_date, subtotal, tax_amount, total_amount)
VALUES ('<tenant_b_id>', '<user_id>', '<company_id>', 'INV-2025-001', 'テスト', '2025-01-01', 100, 10, 110);
```

### 2. 同一テナント内での重複テスト

```sql
-- 同じテナントで同じ番号（エラーになるはず）
INSERT INTO invoices (tenant_id, user_id, company_id, invoice_number, title, issue_date, subtotal, tax_amount, total_amount)
VALUES ('<tenant_a_id>', '<user_id>', '<company_id>', 'INV-2025-001', 'テスト', '2025-01-01', 100, 10, 110);
-- ERROR: duplicate key value violates unique constraint "invoices_tenant_invoice_number_key"
```

## 📊 影響範囲

### 修正対象

- `invoices` テーブル
- `quotes` テーブル

### アプリケーションコードへの影響

**影響なし**

採番ロジックは既に `tenant_id` でフィルタリングしているため、アプリケーションコードの変更は不要です：

```typescript
// src/app/api/invoices/next-number/route.ts
const { data: invoices } = await supabase
  .from('invoices')
  .select('invoice_number')
  .eq('tenant_id', profile.tenant_id)  // ← 既にフィルタ済み
  .like('invoice_number', `INV-${currentYear}-%`)
```

### パフォーマンスへの影響

**向上**

複合インデックス `(tenant_id, invoice_number)` を追加するため、クエリパフォーマンスが向上します。

## 🔗 関連ファイル

- マイグレーションSQL: `database/migrations/00026_fix_invoice_quote_number_uniqueness.sql`
- 採番ロジック: `src/app/api/invoices/next-number/route.ts`
- 元のスキーマ: `database/scripts/supabase-schema.sql`

## 📝 実行履歴

実行日時を記録してください：

- [ ] 実行日: `____年__月__日 __:__`
- [ ] 実行者: `________________`
- [ ] 結果: `□ 成功 / □ 失敗`
- [ ] 備考: `________________`
