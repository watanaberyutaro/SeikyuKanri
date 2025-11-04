'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, Plus, Pencil } from 'lucide-react'
import { AccountingPeriod, PeriodStatus } from '@/types/accounting'

const statusLabels: Record<PeriodStatus, string> = {
  open: '開いている',
  closed: '締められた',
  locked: 'ロック済み',
}

const statusColors: Record<PeriodStatus, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-yellow-100 text-yellow-800',
  locked: 'bg-red-100 text-red-800',
}

type PeriodFormData = {
  name: string
  fiscal_year: number
  start_date: string
  end_date: string
  description: string
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<AccountingPeriod | null>(null)
  const [formData, setFormData] = useState<PeriodFormData>({
    name: '',
    fiscal_year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPeriods()
  }, [])

  async function fetchPeriods() {
    try {
      const response = await fetch('/api/periods')
      const data = await response.json()
      setPeriods(data.periods || [])
    } catch (error) {
      console.error('Failed to fetch periods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPeriod = () => {
    setEditingPeriod(null)
    setFormData({
      name: '',
      fiscal_year: new Date().getFullYear(),
      start_date: `${new Date().getFullYear()}-04-01`,
      end_date: `${new Date().getFullYear() + 1}-03-31`,
      description: '',
    })
    setError(null)
    setShowDialog(true)
  }

  const handleEditPeriod = (period: AccountingPeriod) => {
    setEditingPeriod(period)
    setFormData({
      name: period.name,
      fiscal_year: period.fiscal_year || new Date().getFullYear(),
      start_date: period.start_date,
      end_date: period.end_date,
      description: period.description || '',
    })
    setError(null)
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const url = editingPeriod ? `/api/periods/${editingPeriod.id}` : '/api/periods'
      const method = editingPeriod ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存に失敗しました')
      }

      setShowDialog(false)
      fetchPeriods()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">会計期間</h1>
          <p className="text-muted-foreground mt-1">会計年度と期間の管理</p>
        </div>
        <Button onClick={handleAddPeriod}>
          <Plus className="h-4 w-4 mr-2" />
          会計期間を追加
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総期間数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periods.length}件</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">開いている</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {periods.filter((p) => p.status === 'open').length}件
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">締められた</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {periods.filter((p) => p.status === 'closed').length}件
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ロック済み</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {periods.filter((p) => p.status === 'locked').length}件
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 期間一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>会計期間一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">読み込み中...</p>
          ) : periods.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                会計期間が登録されていません
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                「会計期間を追加」ボタンから会計年度を設定してください
              </p>
              <Button onClick={handleAddPeriod}>
                <Plus className="h-4 w-4 mr-2" />
                会計期間を追加
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期間名</TableHead>
                  <TableHead>事業年度</TableHead>
                  <TableHead>開始日</TableHead>
                  <TableHead>終了日</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell>
                      {period.fiscal_year ? (
                        <span className="font-mono">{period.fiscal_year}年度</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{period.start_date}</TableCell>
                    <TableCell>{period.end_date}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[period.status]}
                      >
                        {statusLabels[period.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {period.description || '-'}
                    </TableCell>
                    <TableCell>
                      {period.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPeriod(period)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 注意事項 */}
      {periods.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <TrendingUp className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-900">
                  会計期間のロックについて
                </p>
                <p className="text-sm text-yellow-800">
                  「ロック済み」の期間では、仕訳の登録・変更・削除ができません。
                  期末処理が完了したら、必ず期間をロックしてください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 会計期間作成・編集ダイアログ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? '会計期間を編集' : '会計期間を追加'}
            </DialogTitle>
            <DialogDescription>
              会計期間の情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">期間名</Label>
              <Input
                id="name"
                placeholder="例: 2025年度"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscal_year">事業年度</Label>
              <Input
                id="fiscal_year"
                type="number"
                placeholder="例: 2025"
                value={formData.fiscal_year}
                onChange={(e) =>
                  setFormData({ ...formData, fiscal_year: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">開始日</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">終了日</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                placeholder="例: 第10期"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : editingPeriod ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
