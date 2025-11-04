'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { Plus, Package, Trash2, FileText, TrendingUp } from 'lucide-react'
import { FixedAssetWithAccounts } from '@/types/fixed-assets'

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAssetWithAccounts[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'disposed'>('active')

  useEffect(() => {
    fetchAssets()
  }, [filter])

  async function fetchAssets() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('status', filter)
      }
      params.append('with_accounts', 'true')

      const response = await fetch(`/api/assets?${params.toString()}`)
      const data = await response.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('固定資産取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name}を削除しますか？\n\nこの操作は取り消せません。`)) {
      return
    }

    setDeleting(id)
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '削除に失敗しました')
      }

      alert('固定資産を削除しました')
      await fetchAssets()
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  // サマリー計算
  const summary = {
    total: assets.length,
    active: assets.filter((a) => a.status === 'active').length,
    disposed: assets.filter((a) => a.status === 'disposed').length,
    totalCost: assets
      .filter((a) => a.status === 'active')
      .reduce((sum, a) => sum + Number(a.acquisition_cost), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">固定資産台帳</h1>
          <p className="text-muted-foreground mt-1">固定資産の管理・償却処理</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/30">
            <Button
              variant={filter === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              使用中
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              すべて
            </Button>
            <Button
              variant={filter === 'disposed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('disposed')}
            >
              除却済み
            </Button>
          </div>
          <Link href="/assets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新規登録
            </Button>
          </Link>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総資産数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              使用中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.active}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              除却済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{summary.disposed}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              取得価額合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{summary.totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 資産一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>資産一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">読み込み中...</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">固定資産が登録されていません</p>
              <Link href="/assets/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新規登録
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>資産コード</TableHead>
                  <TableHead>資産名</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>取得日</TableHead>
                  <TableHead className="text-right">取得価額</TableHead>
                  <TableHead>償却方法</TableHead>
                  <TableHead>耐用年数</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono">{asset.asset_code}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.category || '-'}</TableCell>
                    <TableCell>
                      {new Date(asset.acquisition_date).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{Number(asset.acquisition_cost).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {asset.depreciation_method === 'straight' ? '定額法' : '定率法'}
                      </Badge>
                    </TableCell>
                    <TableCell>{Math.floor(asset.useful_life_months / 12)}年</TableCell>
                    <TableCell>
                      {asset.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-800">使用中</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          除却済み
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/assets/${asset.id}`}>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            詳細
                          </Button>
                        </Link>
                        {asset.status === 'active' && (
                          <Link href={`/assets/${asset.id}/schedule`}>
                            <Button size="sm" variant="outline">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              償却
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(asset.id, asset.name)}
                          disabled={deleting === asset.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1 text-red-600" />
                          {deleting === asset.id ? '削除中...' : '削除'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 注意事項 */}
      {assets.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">固定資産台帳について</p>
                <p className="text-sm text-blue-800">
                  固定資産の取得から除却までのライフサイクルを管理します。
                  償却スケジュールを生成して、会計コアと連携した仕訳起票が可能です。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
