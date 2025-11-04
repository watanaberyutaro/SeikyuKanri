import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VATReport, VATEntry } from '@/types/reports'

// GET /api/reports/vat?from=2024-01-01&to=2024-12-31
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')

  if (!fromDate || !toDate) {
    return NextResponse.json(
      { error: 'from, to パラメータが必要です' },
      { status: 400 }
    )
  }

  try {
    // 税率マスタを取得
    const { data: taxRates, error: taxRatesError } = await supabase
      .from('tax_rates')
      .select('id, name, rate, category')
      .eq('tenant_id', profile.tenant_id)
      .order('rate', { ascending: false })

    if (taxRatesError) {
      return NextResponse.json({ error: taxRatesError.message }, { status: 500 })
    }

    if (!taxRates || taxRates.length === 0) {
      return NextResponse.json({ error: '税率が見つかりません' }, { status: 404 })
    }

    // 勘定科目を取得（収益・費用の判定用）
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, type')
      .eq('tenant_id', profile.tenant_id)

    const accountTypeMap = new Map<string, string>()
    if (accounts) {
      for (const account of accounts) {
        accountTypeMap.set(account.id, account.type)
      }
    }

    // 期間内の仕訳明細を取得（税率付き）
    const { data: lines, error: linesError } = await supabase
      .from('journal_lines')
      .select(`
        id,
        account_id,
        tax_rate_id,
        debit,
        credit,
        tax_amount,
        journals!inner(journal_date)
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('journals.journal_date', fromDate)
      .lte('journals.journal_date', toDate)
      .not('tax_rate_id', 'is', null)

    if (linesError) {
      return NextResponse.json({ error: linesError.message }, { status: 500 })
    }

    // 税率ごとに集計
    const vatMap = new Map<string, {
      tax_rate: typeof taxRates[number]
      taxable_sales_base: number
      taxable_sales_tax: number
      taxable_purchases_base: number
      taxable_purchases_tax: number
    }>()

    // 初期化
    for (const taxRate of taxRates) {
      vatMap.set(taxRate.id, {
        tax_rate: taxRate,
        taxable_sales_base: 0,
        taxable_sales_tax: 0,
        taxable_purchases_base: 0,
        taxable_purchases_tax: 0,
      })
    }

    // 集計処理
    if (lines) {
      for (const line of lines) {
        if (!line.tax_rate_id) continue

        const entry = vatMap.get(line.tax_rate_id)
        if (!entry) continue

        const accountType = accountTypeMap.get(line.account_id)
        const debit = Number(line.debit) || 0
        const credit = Number(line.credit) || 0
        const taxAmount = Number(line.tax_amount) || 0

        // 売上（収益科目の貸方）
        if (accountType === 'revenue' && credit > 0) {
          entry.taxable_sales_base += credit
          entry.taxable_sales_tax += taxAmount
        }

        // 仕入（費用科目の借方）
        if (accountType === 'expense' && debit > 0) {
          entry.taxable_purchases_base += debit
          entry.taxable_purchases_tax += taxAmount
        }
      }
    }

    // VATEntry 配列に変換
    const entries: VATEntry[] = []
    let totalSalesBase = 0
    let totalSalesTax = 0
    let totalPurchasesBase = 0
    let totalPurchasesTax = 0

    for (const [taxRateId, entry] of vatMap) {
      // 取引がない税率は除外
      if (
        entry.taxable_sales_base === 0 &&
        entry.taxable_sales_tax === 0 &&
        entry.taxable_purchases_base === 0 &&
        entry.taxable_purchases_tax === 0
      ) {
        continue
      }

      entries.push({
        tax_rate_id: taxRateId,
        tax_rate_name: entry.tax_rate.name,
        tax_rate: entry.tax_rate.rate,
        tax_category: entry.tax_rate.category,
        taxable_sales_base: entry.taxable_sales_base,
        taxable_sales_tax: entry.taxable_sales_tax,
        taxable_purchases_base: entry.taxable_purchases_base,
        taxable_purchases_tax: entry.taxable_purchases_tax,
      })

      totalSalesBase += entry.taxable_sales_base
      totalSalesTax += entry.taxable_sales_tax
      totalPurchasesBase += entry.taxable_purchases_base
      totalPurchasesTax += entry.taxable_purchases_tax
    }

    // 納付税額（売上税 - 仕入税）
    const netVATPayable = totalSalesTax - totalPurchasesTax

    const report: VATReport = {
      from_date: fromDate,
      to_date: toDate,
      entries,
      total_sales_base: totalSalesBase,
      total_sales_tax: totalSalesTax,
      total_purchases_base: totalPurchasesBase,
      total_purchases_tax: totalPurchasesTax,
      net_vat_payable: netVATPayable,
    }

    return NextResponse.json({ report })
  } catch (error: any) {
    console.error('VAT Report Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
