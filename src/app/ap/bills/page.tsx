'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, AlertCircle, TrendingDown } from 'lucide-react'
import { BillBalance } from '@/types/ap'

export default function APBillsPage() {
  const [balances, setBalances] = useState<BillBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBalances()
  }, [])

  async function fetchBalances() {
    try {
      const response = await fetch('/api/ap/aging?view=bill')
      const data = await response.json()
      setBalances(data.balances || [])
    } catch (error) {
      console.error('Failed to fetch balances:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalBalance = balances.reduce((sum, b) => sum + Number(b.balance), 0)
  const overdueCount = balances.filter((b) => b.days_overdue > 0).length

  function getBucketBadge(bucket: string) {
    const colors = {
      '0-30': 'bg-green-100 text-green-800',
      '31-60': 'bg-yellow-100 text-yellow-800',
      '61-90': 'bg-orange-100 text-orange-800',
      '90+': 'bg-red-100 text-red-800',
    }
    return colors[bucket as keyof typeof colors] || ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">買掛管理</h1>
        <p className="text-muted-foreground mt-1">未払請求書の残高と支払状況を管理</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総未払残高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {balances.length}件の未払請求書
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">期限超過</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}件</div>
            <p className="text-xs text-muted-foreground mt-1">支払が必要な請求書</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均遅延日数</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balances.length > 0
                ? Math.round(
                    balances.reduce((sum, b) => sum + b.days_overdue, 0) / balances.length
                  )
                : 0}
              日
            </div>
            <p className="text-xs text-muted-foreground mt-1">期限超過からの平均</p>
          </CardContent>
        </Card>
      </div>

      {/* 請求書一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>未払請求書一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">読み込み中...</p>
          ) : balances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              未払の請求書はありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>請求書番号</TableHead>
                  <TableHead>仕入先</TableHead>
                  <TableHead>請求日</TableHead>
                  <TableHead>期日</TableHead>
                  <TableHead className="text-right">請求額</TableHead>
                  <TableHead className="text-right">支払額</TableHead>
                  <TableHead className="text-right">残高</TableHead>
                  <TableHead>遅延日数</TableHead>
                  <TableHead>年齢区分</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((balance) => (
                  <TableRow key={balance.bill_id}>
                    <TableCell className="font-medium">
                      {balance.bill_number}
                    </TableCell>
                    <TableCell>{balance.vendor_name}</TableCell>
                    <TableCell>{balance.bill_date}</TableCell>
                    <TableCell>{balance.due_date || '-'}</TableCell>
                    <TableCell className="text-right">
                      ¥{Number(balance.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{Number(balance.allocated_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ¥{Number(balance.balance).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {balance.days_overdue > 0 ? (
                        <span className="text-destructive font-medium">
                          {balance.days_overdue}日
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getBucketBadge(balance.aging_bucket)}
                      >
                        {balance.aging_bucket}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        支払登録
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
