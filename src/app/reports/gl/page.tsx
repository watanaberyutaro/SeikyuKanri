'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GLReport } from '@/types/reports'
import { createClient } from '@/lib/supabase/client'

type Account = {
  id: string
  code: string
  name: string
  type: string
}

export default function GLReportPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
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
  const [report, setReport] = useState<GLReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 勘定科目一覧を取得
  useEffect(() => {
    async function fetchAccounts() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, type')
        .order('code', { ascending: true })

      if (error) {
        console.error('Failed to fetch accounts:', error)
        return
      }

      if (data && data.length > 0) {
        setAccounts(data)
        // 最初の勘定科目を自動選択
        setSelectedAccountId(data[0].id)
      }
    }

    fetchAccounts()
  }, [])

  const handleGenerateReport = useCallback(async () => {
    if (!selectedAccountId || !fromDate || !toDate) {
      setError('勘定科目と期間を選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/reports/gl?account_id=${selectedAccountId}&from=${fromDate}&to=${toDate}`
      )

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
  }, [selectedAccountId, fromDate, toDate])

  // 勘定科目が選択されたら自動的にレポートを生成
  useEffect(() => {
    if (selectedAccountId && fromDate && toDate) {
      handleGenerateReport()
    }
  }, [selectedAccountId, fromDate, toDate, handleGenerateReport])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">総勘定元帳</h1>
        <p className="text-muted-foreground mt-2">
          勘定科目ごとの取引履歴と残高を確認できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>レポート条件</CardTitle>
          <CardDescription>勘定科目と期間を選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>勘定科目</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="科目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
        <Card>
          <CardHeader>
            <CardTitle>
              {report.account_code} - {report.account_name}
            </CardTitle>
            <CardDescription>
              {fromDate} 〜 {toDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-medium">期首残高</span>
              <span className="text-lg font-bold">
                ¥{report.opening_balance.toLocaleString()}
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>摘要</TableHead>
                    <TableHead className="text-right">借方</TableHead>
                    <TableHead className="text-right">貸方</TableHead>
                    <TableHead className="text-right">残高</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        期間内に取引がありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.entries.map((entry, index) => (
                      <TableRow key={`${entry.journal_id}-${index}`}>
                        <TableCell>{entry.journal_date}</TableCell>
                        <TableCell>
                          <div>
                            {entry.description}
                            {entry.memo && (
                              <div className="text-sm text-muted-foreground">
                                {entry.memo}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.debit > 0 ? `¥${entry.debit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit > 0 ? `¥${entry.credit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ¥{entry.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
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
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">期末残高</div>
                <div className="text-xl font-bold text-green-600">
                  ¥{report.closing_balance.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
