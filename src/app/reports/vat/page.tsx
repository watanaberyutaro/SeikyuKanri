'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { VATReport } from '@/types/reports'

export default function VATReportPage() {
  const [fromDate, setFromDate] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-01-01`
  })
  const [toDate, setToDate] = useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [report, setReport] = useState<VATReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateReport = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError('期間を選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reports/vat?from=${fromDate}&to=${toDate}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'レポートの取得に失敗しました')
      }

      const data = await response.json()
      setReport(data.report)
    } catch (err: any) {
      setError(err.message)
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  // 初期表示時に自動的にレポートを生成
  useEffect(() => {
    handleGenerateReport()
  }, [handleGenerateReport])

  const getCategoryBadge = (category: string) => {
    const badgeMap = {
      standard: <Badge>標準税率</Badge>,
      reduced: <Badge variant="secondary">軽減税率</Badge>,
      exempt: <Badge variant="outline">非課税</Badge>,
      non_taxable: <Badge variant="outline">不課税</Badge>,
    }
    return badgeMap[category as keyof typeof badgeMap] || <Badge>{category}</Badge>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">消費税レポート</h1>
        <p className="text-muted-foreground mt-2">
          課税売上と課税仕入の消費税額を確認できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>レポート条件</CardTitle>
          <CardDescription>期間を選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始日</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>終了日</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? 'レポート生成中...' : 'レポート生成'}
          </Button>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>消費税集計</CardTitle>
              <CardDescription>
                {report.from_date} 〜 {report.to_date}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>税率区分</TableHead>
                      <TableHead>税率</TableHead>
                      <TableHead className="text-right">課税売上（税抜）</TableHead>
                      <TableHead className="text-right">課税売上（消費税）</TableHead>
                      <TableHead className="text-right">課税仕入（税抜）</TableHead>
                      <TableHead className="text-right">課税仕入（消費税）</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          期間内に課税取引がありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.entries.map((entry) => (
                        <TableRow key={entry.tax_rate_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {entry.tax_rate_name}
                              {getCategoryBadge(entry.tax_category)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{entry.tax_rate}%</TableCell>
                          <TableCell className="text-right">
                            {entry.taxable_sales_base > 0
                              ? `¥${entry.taxable_sales_base.toLocaleString()}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.taxable_sales_tax > 0
                              ? `¥${entry.taxable_sales_tax.toLocaleString()}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.taxable_purchases_base > 0
                              ? `¥${entry.taxable_purchases_base.toLocaleString()}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.taxable_purchases_tax > 0
                              ? `¥${entry.taxable_purchases_tax.toLocaleString()}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {/* 合計行 */}
                    <TableRow className="bg-muted font-bold">
                      <TableCell colSpan={2} className="text-right">
                        合計
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{report.total_sales_base.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{report.total_sales_tax.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{report.total_purchases_base.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{report.total_purchases_tax.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>納付税額サマリー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">課税売上に係る消費税額</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ¥{report.total_sales_tax.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">課税仕入に係る消費税額</div>
                  <div className="text-2xl font-bold text-purple-600">
                    ¥{report.total_purchases_tax.toLocaleString()}
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${report.net_vat_payable >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div className="text-sm text-muted-foreground mb-1">
                    {report.net_vat_payable >= 0 ? '納付税額' : '還付税額'}
                  </div>
                  <div className={`text-2xl font-bold ${report.net_vat_payable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ¥{Math.abs(report.net_vat_payable).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-bold mb-2">計算式</h3>
                <p className="text-sm">
                  納付税額 = 課税売上に係る消費税額 - 課税仕入に係る消費税額
                </p>
                <p className="text-sm mt-1 font-mono">
                  = ¥{report.total_sales_tax.toLocaleString()} - ¥{report.total_purchases_tax.toLocaleString()} = ¥{report.net_vat_payable.toLocaleString()}
                </p>
              </div>

              {report.net_vat_payable < 0 && (
                <div className="bg-green-50 text-green-800 p-4 rounded-lg">
                  <strong>還付:</strong> 課税仕入が課税売上を上回っているため、還付申請が可能です。
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
