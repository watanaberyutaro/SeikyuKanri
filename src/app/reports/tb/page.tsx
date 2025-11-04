'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { TrialBalance } from '@/types/reports'
import { createClient } from '@/lib/supabase/client'

type Period = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
}

export default function TrialBalancePage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [report, setReport] = useState<TrialBalance | null>(null)
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
        // 最初の期間を自動選択
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
      const response = await fetch(`/api/reports/tb?period_id=${selectedPeriodId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'レポートの取得に失敗しました')
      }

      const data = await response.json()
      setReport(data.trial_balance)
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">試算表</h1>
        <p className="text-muted-foreground mt-2">
          会計期間ごとの勘定科目残高を一覧で確認できます
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
        <Card>
          <CardHeader>
            <CardTitle>{report.period_name}</CardTitle>
            <CardDescription>
              {report.start_date} 〜 {report.end_date} (基準日: {report.as_of})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>科目コード</TableHead>
                    <TableHead>科目名</TableHead>
                    <TableHead className="text-right">期首残高</TableHead>
                    <TableHead className="text-right">借方</TableHead>
                    <TableHead className="text-right">貸方</TableHead>
                    <TableHead className="text-right">期末残高</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.entries.map((entry) => (
                      <TableRow key={entry.account_id}>
                        <TableCell className="font-mono">{entry.account_code}</TableCell>
                        <TableCell style={getIndentStyle(entry.level)}>
                          {entry.account_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.opening_balance !== 0
                            ? `¥${entry.opening_balance.toLocaleString()}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.debit_amount > 0
                            ? `¥${entry.debit_amount.toLocaleString()}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit_amount > 0
                            ? `¥${entry.credit_amount.toLocaleString()}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.closing_balance !== 0
                            ? `¥${entry.closing_balance.toLocaleString()}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* 合計行 */}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={3} className="text-right">
                      合計
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{report.total_debit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{report.total_credit.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">借方合計</div>
                <div className="text-xl font-bold text-blue-600">
                  ¥{report.total_debit.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">貸方合計</div>
                <div className="text-xl font-bold text-purple-600">
                  ¥{report.total_credit.toLocaleString()}
                </div>
              </div>
            </div>

            {Math.abs(report.total_debit - report.total_credit) > 0.01 && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                <strong>警告:</strong> 借方と貸方の合計が一致しません。仕訳に誤りがある可能性があります。
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
