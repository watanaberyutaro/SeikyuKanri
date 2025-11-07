'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download } from 'lucide-react'
import { ARAgingByCustomer } from '@/types/ar'

export default function AgingPage() {
  const [aging, setAging] = useState<ARAgingByCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAging()
  }, [])

  async function fetchAging() {
    try {
      const response = await fetch('/api/ar/aging?view=customer')
      const data = await response.json()
      setAging(data.aging || [])
    } catch (error) {
      console.error('Failed to fetch aging:', error)
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    const headers = ['顧客名', '0-30日', '31-60日', '61-90日', '90日以上', '合計']
    const rows = aging.map((a) => [
      a.customer_name,
      Number(a.current).toLocaleString(),
      Number(a.b31_60).toLocaleString(),
      Number(a.b61_90).toLocaleString(),
      Number(a.b90_plus).toLocaleString(),
      Number(a.total).toLocaleString(),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `aging_report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const totals = aging.reduce(
    (acc, a) => ({
      current: acc.current + Number(a.current),
      b31_60: acc.b31_60 + Number(a.b31_60),
      b61_90: acc.b61_90 + Number(a.b61_90),
      b90_plus: acc.b90_plus + Number(a.b90_plus),
      total: acc.total + Number(a.total),
    }),
    { current: 0, b31_60: 0, b61_90: 0, b90_plus: 0, total: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">売掛年齢表</h1>
          <p className="text-muted-foreground mt-1">顧客別の債権年齢分析</p>
        </div>
        <Button onClick={exportCSV} className="gap-2" disabled={aging.length === 0}>
          <Download className="h-4 w-4" />
          CSVエクスポート
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>顧客別年齢表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">読み込み中...</p>
          ) : aging.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">データがありません</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>顧客名</TableHead>
                  <TableHead className="text-right">0-30日</TableHead>
                  <TableHead className="text-right">31-60日</TableHead>
                  <TableHead className="text-right">61-90日</TableHead>
                  <TableHead className="text-right">90日以上</TableHead>
                  <TableHead className="text-right">合計</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aging.map((a) => (
                  <TableRow key={a.customer_id}>
                    <TableCell className="font-medium">{a.customer_name}</TableCell>
                    <TableCell className="text-right">
                      ¥{Number(a.current).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{Number(a.b31_60).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{Number(a.b61_90).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      ¥{Number(a.b90_plus).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ¥{Number(a.total).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {/* 合計行 */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>合計</TableCell>
                  <TableCell className="text-right">
                    ¥{totals.current.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{totals.b31_60.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{totals.b61_90.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    ¥{totals.b90_plus.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{totals.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
