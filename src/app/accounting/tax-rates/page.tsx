'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Receipt } from 'lucide-react'
import { TaxRate, TaxRateCategory } from '@/types/accounting'

const categoryLabels: Record<TaxRateCategory, string> = {
  standard: '標準税率',
  reduced: '軽減税率',
  exempt: '非課税',
  'non-tax': '対象外',
}

const categoryColors: Record<TaxRateCategory, string> = {
  standard: 'bg-blue-100 text-blue-800',
  reduced: 'bg-green-100 text-green-800',
  exempt: 'bg-gray-100 text-gray-800',
  'non-tax': 'bg-gray-100 text-gray-800',
}

export default function TaxRatesPage() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTaxRates()
  }, [])

  async function fetchTaxRates() {
    try {
      const response = await fetch('/api/tax-rates')
      const data = await response.json()
      setTaxRates(data.taxRates || [])
    } catch (error) {
      console.error('Failed to fetch tax rates:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupedTaxRates = taxRates.reduce((acc, rate) => {
    if (!acc[rate.category]) {
      acc[rate.category] = []
    }
    acc[rate.category].push(rate)
    return acc
  }, {} as Record<TaxRateCategory, TaxRate[]>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">税率</h1>
        <p className="text-muted-foreground mt-1">消費税率マスタの管理</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総税率数</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxRates.length}件</div>
            <p className="text-xs text-muted-foreground mt-1">
              有効: {taxRates.filter((t) => t.is_active).length}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">標準税率</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {taxRates.filter((t) => t.category === 'standard').length}件
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">軽減税率</CardTitle>
            <Receipt className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {taxRates.filter((t) => t.category === 'reduced').length}件
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">非課税</CardTitle>
            <Receipt className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {taxRates.filter((t) => t.category === 'exempt').length}件
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 税率一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>税率一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">読み込み中...</p>
          ) : taxRates.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                税率が登録されていません
              </p>
              <p className="text-sm text-muted-foreground">
                勘定科目ページから初期科目をインポートしてください
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(['standard', 'reduced', 'exempt', 'non-tax'] as TaxRateCategory[]).map(
                (category) =>
                  groupedTaxRates[category] && groupedTaxRates[category].length > 0 && (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-3">
                        {categoryLabels[category]}
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>税率名</TableHead>
                            <TableHead>税率</TableHead>
                            <TableHead>適用開始日</TableHead>
                            <TableHead>適用終了日</TableHead>
                            <TableHead>状態</TableHead>
                            <TableHead>説明</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedTaxRates[category].map((rate) => (
                            <TableRow key={rate.id}>
                              <TableCell className="font-medium">
                                {rate.name}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono font-bold text-lg">
                                  {rate.rate}%
                                </span>
                              </TableCell>
                              <TableCell>{rate.applies_from}</TableCell>
                              <TableCell>
                                {rate.applies_to || (
                                  <span className="text-muted-foreground">継続中</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {rate.is_active ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-100 text-green-800"
                                  >
                                    有効
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100">
                                    無効
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {rate.description || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
