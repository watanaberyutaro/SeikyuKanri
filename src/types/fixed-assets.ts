// 固定資産管理の型定義

import { Account } from './accounting'

// 償却方法
export type DepreciationMethod = 'straight' | 'declining'

// 資産ステータス
export type AssetStatus = 'active' | 'disposed'

// 固定資産
export interface FixedAsset {
  id: string
  tenant_id: string
  user_id: string

  // 基本情報
  asset_code: string
  name: string
  description?: string
  category?: string

  // 取得情報
  acquisition_date: string
  acquisition_cost: number
  salvage_value: number

  // 償却情報
  depreciation_method: DepreciationMethod
  useful_life_months: number

  // 勘定科目紐付け
  account_asset?: string
  account_depr_exp?: string
  account_accum_depr?: string

  // ステータス
  status: AssetStatus
  disposal_date?: string
  disposal_reason?: string

  // 監査
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

// 固定資産（勘定科目情報付き）
export interface FixedAssetWithAccounts extends FixedAsset {
  asset_account?: Account
  depr_exp_account?: Account
  accum_depr_account?: Account
}

// 償却スケジュール
export interface DepreciationSchedule {
  id: string
  tenant_id: string
  user_id: string

  // 紐付け
  asset_id: string
  period_id?: string

  // 償却情報
  fiscal_year: number
  fiscal_month: number
  depreciation_amount: number
  accumulated_depreciation: number
  book_value: number

  // 仕訳連携
  posted: boolean
  posted_journal_id?: string
  posted_at?: string

  // 監査
  created_at: string
  updated_at: string
  created_by?: string
}

// 償却スケジュール（資産情報付き）
export interface DepreciationScheduleWithAsset extends DepreciationSchedule {
  asset: FixedAsset
}

// 固定資産作成入力
export interface CreateFixedAssetInput {
  asset_code: string
  name: string
  description?: string
  category?: string

  acquisition_date: string
  acquisition_cost: number
  salvage_value?: number

  depreciation_method: DepreciationMethod
  useful_life_months: number

  account_asset?: string
  account_depr_exp?: string
  account_accum_depr?: string
}

// 固定資産更新入力
export interface UpdateFixedAssetInput {
  name?: string
  description?: string
  category?: string

  acquisition_date?: string
  acquisition_cost?: number
  salvage_value?: number

  depreciation_method?: DepreciationMethod
  useful_life_months?: number

  account_asset?: string
  account_depr_exp?: string
  account_accum_depr?: string

  status?: AssetStatus
  disposal_date?: string
  disposal_reason?: string
}

// 償却スケジュール生成入力
export interface GenerateScheduleInput {
  asset_id: string
  start_date: string // 償却開始日
  end_date: string // 償却終了日
}

// 償却計算結果
export interface DepreciationCalculation {
  fiscal_year: number
  fiscal_month: number
  depreciation_amount: number
  accumulated_depreciation: number
  book_value: number
}

// 固定資産サマリー
export interface FixedAssetSummary {
  total_assets: number // 資産総数
  active_assets: number // 使用中の資産数
  disposed_assets: number // 除却済み資産数
  total_acquisition_cost: number // 取得価額合計
  total_accumulated_depreciation: number // 累計償却額合計
  total_book_value: number // 帳簿価額合計
}
