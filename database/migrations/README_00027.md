# マイグレーション 00027: 銀行CSVインポート・リコンサイル機能

## 概要

銀行やクレジットカードの取引明細（CSV/TSV）をインポートし、既存のAR（売掛金）やAP（買掛金）と突合するためのリコンサイル層を追加します。

**重要**: 既存の `payments`（AR入金）や `payouts`（AP支払）テーブルは一切変更しません。新しい「リコンサイル層」として `bank_statements` と `bank_rows` を追加し、アダプタパターンで既存システムと統合します。

## 機能フラグ

この機能は環境変数 `FEATURE_BANK_IMPORT=1` で制御されます。

## 新規テーブル

### 1. bank_statements（取込ファイル単位）

取り込んだCSV/TSVファイルのメタデータを管理します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| tenant_id | UUID | テナントID |
| user_id | UUID | ユーザーID |
| account_name | TEXT | 口座名（例：三菱UFJ銀行 普通預金） |
| statement_date | DATE | 明細日付（通常は取り込み日） |
| raw_file_url | TEXT | アップロードされたファイルのURL |
| file_name | TEXT | ファイル名 |
| row_count | INTEGER | インポートされた行数 |
| matched_count | INTEGER | 突合済みの行数 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### 2. bank_rows（個別取引行）

CSV/TSVから取り込んだ個別取引データを保存します。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| tenant_id | UUID | テナントID |
| user_id | UUID | ユーザーID |
| statement_id | UUID | bank_statements への外部キー |
| txn_date | DATE | 取引日 |
| description | TEXT | 摘要・取引内容 |
| amount | NUMERIC(18,2) | 金額（絶対値） |
| type | TEXT | 'in'（入金） または 'out'（出金） |
| hash | CHAR(64) | 重複防止用ハッシュ（UNIQUE） |
| matched | BOOLEAN | 突合済みフラグ |
| matched_target_type | TEXT | 'invoice', 'bill', 'payment', 'payout' |
| matched_target_id | UUID | 突合対象のID |
| matched_at | TIMESTAMPTZ | 突合日時 |
| notes | TEXT | メモ |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

## 重複防止メカニズム

`hash` カラムは以下の情報から生成されるSHA-256ハッシュです：

```
txn_date + amount + normalized_description + type
```

- `normalized_description`: 全角→半角、空白除去、小文字化
- UNIQUE制約により、同じ取引の重複インポートを防止

関数: `generate_bank_row_hash(txn_date, amount, description, type)`

## 突合ロジック

### 突合候補の検索条件

1. **金額の一致**: 完全一致
2. **日付の範囲**: ±N日（デフォルト: ±7日）
3. **相手先名**: 正規化した文字列の部分一致

### 突合対象

#### AR（売掛金）の場合
- **type**: 'in'（入金）
- **matched_target_type**: 'invoice'（請求書）
- **処理**: `adapters/ar.ts` の `registerIncomingPayment()` を使用
  - `payments` レコードを作成
  - `payment_allocations` で請求書に消込

#### AP（買掛金）の場合
- **type**: 'out'（出金）
- **matched_target_type**: 'bill'（請求書）
- **処理**:
  - `payouts` レコードを作成
  - `ap_allocations` で請求書に消込

## API エンドポイント

### 1. CSVインポート

```
POST /api/bank/import
```

**リクエスト**:
- CSV/TSVファイル
- カラムマッピング情報
- 口座名

**レスポンス**:
- `statement_id`
- インポート件数
- 重複スキップ件数

### 2. 突合候補取得

```
GET /api/bank/reconcile?statement_id={uuid}
```

**レスポンス**:
- 未突合の `bank_rows` リスト
- 各行の突合候補（invoices または bills）

### 3. 突合確定

```
POST /api/bank/reconcile/confirm
```

**リクエスト**:
```json
{
  "bank_row_id": "uuid",
  "target_type": "invoice | bill",
  "target_id": "uuid"
}
```

**処理**:
- AR: `adapters/ar.ts` 経由で入金・消込
- AP: `payouts` + `ap_allocations` で消込
- `bank_rows.matched = true` に更新

## 実行手順

1. **Supabase SQL Editor** で本マイグレーションを実行

2. **.env.local** に環境変数を追加
   ```
   NEXT_PUBLIC_FEATURE_BANK_IMPORT=1
   ```

3. **アプリケーション側の実装**
   - `src/lib/adapters/ar.ts`
   - `src/app/api/bank/import/route.ts`
   - `src/app/api/bank/reconcile/route.ts`
   - `src/app/bank/import/page.tsx`
   - `src/app/bank/reconcile/page.tsx`

## ロールバック

```sql
DROP TABLE IF EXISTS bank_rows CASCADE;
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP FUNCTION IF EXISTS generate_bank_row_hash(DATE, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_bank_statement_stats();
```

## 注意事項

- **既存テーブルへの影響なし**: `payments`, `payment_allocations`, `payouts`, `ap_allocations` は一切変更しません
- **二重計上防止**:
  - ハッシュベースの重複防止
  - `matched` フラグでの突合済みチェック
  - アダプタ層でのトランザクション制御
- **テスト必須項目**:
  - 同じCSVの複数回インポート（重複防止）
  - 突合候補の精度（金額・日付・相手先名）
  - AR/AP消込後の残高整合性
  - 既存の入金・支払機能への非影響

## 関連ファイル

- マイグレーション: `database/migrations/00027_add_bank_import.sql`
- ARアダプタ: `src/lib/adapters/ar.ts`（新規作成）
- インポートAPI: `src/app/api/bank/import/route.ts`（新規作成）
- リコンサイルAPI: `src/app/api/bank/reconcile/route.ts`（新規作成）
- インポートUI: `src/app/bank/import/page.tsx`（新規作成）
- リコンサイルUI: `src/app/bank/reconcile/page.tsx`（新規作成）
