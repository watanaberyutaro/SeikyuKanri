'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BSPLReport, BSPLSection } from '@/types/reports'
import { createClient } from '@/lib/supabase/client'

type Period = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
}

export default function BSPLPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [report, setReport] = useState<BSPLReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 会計期間一覧を取得
  useEffect(() => {
    async function fetchPeriods() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('id, name, start_date, end_date, status')
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Failed to fetch periods:', error)
        return
      }

      if (data && data.length > 0) {
        setPeriods(data)
        setSelectedPeriodId(data[0].id)
      }
    }

    fetchPeriods()
  }, [])

  const handleGenerateReport = useCallback(async () => {
    if (!selectedPeriodId) {
      setError('会計期間を選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reports/bspl?period_id=${selectedPeriodId}`)

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
  }, [selectedPeriodId])

  // 期間が選択されたら自動的にレポートを生成
  useEffect(() => {
    if (selectedPeriodId) {
      handleGenerateReport()
    }
  }, [selectedPeriodId, handleGenerateReport])

  const getIndentStyle = (level: number) => {
    return { paddingLeft: `${level * 1.5}rem` }
  }

  const renderSection = (section: BSPLSection) => (
    <div key={section.section_name} className="mb-6">
      <h3 className="font-bold text-lg mb-3 pb-2 border-b">{section.section_name}</h3>
      <Table>
        <TableBody>
          {section.accounts.map((account) => (
            <TableRow key={account.account_id}>
              <TableCell className="font-mono w-32">{account.account_code}</TableCell>
              <TableCell style={getIndentStyle(account.level)}>
                {account.account_name}
              </TableCell>
              <TableCell className="text-right w-48">
                {account.amount !== 0 ? `¥${account.amount.toLocaleString()}` : '-'}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted font-bold">
            <TableCell colSpan={2} className="text-right">
              {section.section_name} 小計
            </TableCell>
            <TableCell className="text-right">
              ¥{section.subtotal.toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">貸借対照表・損益計算書</h1>
        <p className="text-muted-foreground mt-2">
          財務状況と経営成績を確認できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>レポート条件</CardTitle>
          <CardDescription>会計期間を選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>会計期間</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="期間を選択" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} ({period.start_date} 〜 {period.end_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <Tabs defaultValue="bs" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bs">貸借対照表</TabsTrigger>
            <TabsTrigger value="pl">損益計算書</TabsTrigger>
          </TabsList>

          <TabsContent value="bs">
            <Card>
              <CardHeader>
                <CardTitle>貸借対照表 (Balance Sheet)</CardTitle>
                <CardDescription>
                  {report.balance_sheet.period_name} (基準日: {report.balance_sheet.as_of})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 資産の部 */}
                <div>
                  <h2 className="text-xl font-bold mb-4">資産の部</h2>
                  {report.balance_sheet.assets.map(renderSection)}
                  <div className="p-4 bg-blue-50 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">資産合計</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ¥{report.balance_sheet.total_assets.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 負債の部 */}
                <div>
                  <h2 className="text-xl font-bold mb-4">負債の部</h2>
                  {report.balance_sheet.liabilities.map(renderSection)}
                  <div className="p-4 bg-purple-50 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">負債合計</span>
                      <span className="text-2xl font-bold text-purple-600">
                        ¥{report.balance_sheet.total_liabilities.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 純資産の部 */}
                <div>
                  <h2 className="text-xl font-bold mb-4">純資産の部</h2>
                  {report.balance_sheet.equity.map(renderSection)}
                  <div className="p-4 bg-green-50 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">純資産合計</span>
                      <span className="text-2xl font-bold text-green-600">
                        ¥{report.balance_sheet.total_equity.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 貸借対照表検証 */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">負債・純資産合計</span>
                    <span className="text-xl font-bold">
                      ¥{(report.balance_sheet.total_liabilities + report.balance_sheet.total_equity).toLocaleString()}
                    </span>
                  </div>
                  {Math.abs(report.balance_sheet.total_assets - (report.balance_sheet.total_liabilities + report.balance_sheet.total_equity)) > 0.01 && (
                    <div className="mt-2 text-sm text-destructive">
                      警告: 資産合計と負債・純資産合計が一致しません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pl">
            <Card>
              <CardHeader>
                <CardTitle>損益計算書 (Profit & Loss)</CardTitle>
                <CardDescription>
                  {report.profit_and_loss.period_name} ({report.profit_and_loss.start_date} 〜 {report.profit_and_loss.end_date})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 収益の部 */}
                <div>
                  <h2 className="text-xl font-bold mb-4">収益の部</h2>
                  {report.profit_and_loss.revenue.map(renderSection)}
                  <div className="p-4 bg-blue-50 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">売上高</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ¥{report.profit_and_loss.total_revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 費用の部 */}
                <div>
                  <h2 className="text-xl font-bold mb-4">費用の部</h2>
                  {report.profit_and_loss.expenses.map(renderSection)}
                  <div className="p-4 bg-purple-50 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">費用合計</span>
                      <span className="text-2xl font-bold text-purple-600">
                        ¥{report.profit_and_loss.total_expenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 利益計算 */}
                <div className="space-y-3 pt-4 border-t-2">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">売上総利益</span>
                      <span className="text-2xl font-bold text-green-600">
                        ¥{report.profit_and_loss.gross_profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-green-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">営業利益</span>
                      <span className="text-2xl font-bold text-green-700">
                        ¥{report.profit_and_loss.operating_profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xl">当期純利益</span>
                      <span className={`text-3xl font-bold ${report.profit_and_loss.net_profit >= 0 ? 'text-green-800' : 'text-red-600'}`}>
                        ¥{report.profit_and_loss.net_profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
