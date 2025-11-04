// 固定資産償却計算ロジック

import { DepreciationMethod, DepreciationCalculation } from '@/types/fixed-assets'

/**
 * 定率法の償却率を計算
 * @param usefulLifeYears 耐用年数（年）
 * @returns 償却率
 */
export function getDecliningBalanceRate(usefulLifeYears: number): number {
  // 定率法の償却率 = 1 / 耐用年数 × 2（200%定率法）
  return (1 / usefulLifeYears) * 2
}

/**
 * 償却保証額を計算（定率法）
 * @param acquisitionCost 取得価額
 * @param usefulLifeYears 耐用年数（年）
 * @returns 償却保証額
 */
export function getGuaranteeAmount(
  acquisitionCost: number,
  usefulLifeYears: number
): number {
  // 償却保証額 = 取得価額 × 保証率
  // 保証率は耐用年数に応じて設定（簡易的に0.1を使用）
  const guaranteeRate = 0.1
  return acquisitionCost * guaranteeRate
}

/**
 * 定額法による償却額を計算
 * @param acquisitionCost 取得価額
 * @param salvageValue 残存価額
 * @param usefulLifeMonths 耐用年数（月数）
 * @returns 月次償却額
 */
export function calculateStraightLineDepreciation(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeMonths: number
): number {
  // 償却額 = (取得価額 - 残存価額) / 耐用年数（月数）
  const depreciableAmount = acquisitionCost - salvageValue
  return Math.floor(depreciableAmount / usefulLifeMonths)
}

/**
 * 定率法による償却額を計算
 * @param bookValue 期首帳簿価額
 * @param salvageValue 残存価額
 * @param rate 償却率
 * @param guaranteeAmount 償却保証額
 * @returns 当期償却額
 */
export function calculateDecliningBalanceDepreciation(
  bookValue: number,
  salvageValue: number,
  rate: number,
  guaranteeAmount: number
): number {
  // 期首帳簿価額 × 償却率
  let depreciation = Math.floor(bookValue * rate)

  // 償却額が償却保証額を下回る場合は、残存簿価を均等償却
  if (depreciation < guaranteeAmount) {
    depreciation = Math.floor((bookValue - salvageValue) / 12) // 残りを12ヶ月で均等償却
  }

  return depreciation
}

/**
 * 償却スケジュールを生成
 * @param acquisitionCost 取得価額
 * @param salvageValue 残存価額
 * @param usefulLifeMonths 耐用年数（月数）
 * @param method 償却方法
 * @param startDate 償却開始日
 * @param endDate 償却終了日
 * @returns 償却スケジュールの配列
 */
export function generateDepreciationSchedule(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeMonths: number,
  method: DepreciationMethod,
  startDate: Date,
  endDate: Date
): DepreciationCalculation[] {
  const schedule: DepreciationCalculation[] = []
  let accumulatedDepreciation = 0
  let bookValue = acquisitionCost

  const usefulLifeYears = usefulLifeMonths / 12
  const rate = method === 'declining' ? getDecliningBalanceRate(usefulLifeYears) : 0
  const guaranteeAmount =
    method === 'declining' ? getGuaranteeAmount(acquisitionCost, usefulLifeYears) : 0

  const currentDate = new Date(startDate)
  const end = new Date(endDate)

  let monthCount = 0

  while (currentDate <= end && monthCount < usefulLifeMonths) {
    const fiscalYear = currentDate.getFullYear()
    const fiscalMonth = currentDate.getMonth() + 1

    let depreciationAmount = 0

    if (method === 'straight') {
      // 定額法
      depreciationAmount = calculateStraightLineDepreciation(
        acquisitionCost,
        salvageValue,
        usefulLifeMonths
      )

      // 最終月の調整（残存価額まで償却）
      if (monthCount === usefulLifeMonths - 1) {
        depreciationAmount = bookValue - salvageValue
      }
    } else {
      // 定率法
      depreciationAmount = calculateDecliningBalanceDepreciation(
        bookValue,
        salvageValue,
        rate,
        guaranteeAmount
      )

      // 最終月の調整（残存価額まで償却）
      if (bookValue - depreciationAmount < salvageValue) {
        depreciationAmount = bookValue - salvageValue
      }
    }

    // 償却額が0以下の場合はスキップ
    if (depreciationAmount <= 0) {
      break
    }

    accumulatedDepreciation += depreciationAmount
    bookValue -= depreciationAmount

    schedule.push({
      fiscal_year: fiscalYear,
      fiscal_month: fiscalMonth,
      depreciation_amount: depreciationAmount,
      accumulated_depreciation: accumulatedDepreciation,
      book_value: bookValue,
    })

    // 帳簿価額が残存価額以下になったら終了
    if (bookValue <= salvageValue) {
      break
    }

    // 次の月へ
    currentDate.setMonth(currentDate.getMonth() + 1)
    monthCount++
  }

  return schedule
}

/**
 * 償却計算のテストユーティリティ
 */
export function testDepreciationCalculation() {
  console.log('=== 償却計算テスト ===')

  // テストケース1: 定額法
  console.log('\n【定額法】')
  console.log('取得価額: ¥1,000,000')
  console.log('残存価額: ¥100,000')
  console.log('耐用年数: 5年（60ヶ月）')

  const straightSchedule = generateDepreciationSchedule(
    1000000,
    100000,
    60,
    'straight',
    new Date('2024-01-01'),
    new Date('2028-12-31')
  )

  console.log(`月次償却額: ¥${straightSchedule[0]?.depreciation_amount.toLocaleString()}`)
  console.log(`スケジュール件数: ${straightSchedule.length}件`)
  console.log(
    `最終帳簿価額: ¥${straightSchedule[straightSchedule.length - 1]?.book_value.toLocaleString()}`
  )

  // テストケース2: 定率法
  console.log('\n【定率法】')
  console.log('取得価額: ¥1,000,000')
  console.log('残存価額: ¥100,000')
  console.log('耐用年数: 5年（60ヶ月）')

  const decliningSchedule = generateDepreciationSchedule(
    1000000,
    100000,
    60,
    'declining',
    new Date('2024-01-01'),
    new Date('2028-12-31')
  )

  console.log(`初年度償却額: ¥${decliningSchedule[0]?.depreciation_amount.toLocaleString()}`)
  console.log(`スケジュール件数: ${decliningSchedule.length}件`)
  console.log(
    `最終帳簿価額: ¥${decliningSchedule[decliningSchedule.length - 1]?.book_value.toLocaleString()}`
  )

  console.log('\n=== テスト完了 ===')
}
