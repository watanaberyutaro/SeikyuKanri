'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Calculator, FileText, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { FixedAsset, DepreciationSchedule } from '@/types/fixed-assets'

export default function AssetSchedulePage() {
  const router = useRouter()
  const params = useParams()
  const assetId = params.id as string

  const [asset, setAsset] = useState<FixedAsset | null>(null)
  const [schedules, setSchedules] = useState<DepreciationSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState<string | null>(null)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchAsset()
    fetchSchedules()
  }, [assetId])

  async function fetchAsset() {
    try {
      const response = await fetch(`/api/assets/${assetId}`)
      const data = await response.json()
      setAsset(data.asset)

      // デフォルトの開始日・終了日を設定
      if (data.asset) {
        setStartDate(data.asset.acquisition_date)
        const end = new Date(data.asset.acquisition_date)
        end.setMonth(end.getMonth() + data.asset.useful_life_months)
        setEndDate(end.toISOString().split('T')[0])
      }
    } catch (error) {
      console.error('資産取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSchedules() {
    try {
      const response = await fetch(`/api/assets/${assetId}/schedule`)
      const data = await response.json()
      setSchedules(data.schedules || [])
    } catch (error) {
      console.error('スケジュール取得エラー:', error)
    }
  }

  async function handleGenerate() {
    if (!startDate || !endDate) {
      alert('償却開始日と終了日を入力してください')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch(`/api/assets/${assetId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'スケジュール生成に失敗しました')
      }

      const data = await response.json()
      alert(`${data.count}件の償却スケジュールを生成しました`)
      await fetchSchedules()
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  async function handlePost(scheduleId: string, year: number, month: number) {
    const journalDate = `${year}-${String(month).padStart(2, '0')}-01`

    if (!confirm(`${year}年${month}月の償却仕訳を起票しますか？`)) {
      return
    }

    setPosting(scheduleId)
    try {
      const response = await fetch(`/api/assets/${assetId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: scheduleId, journal_date: journalDate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '仕訳起票に失敗しました')
      }

      alert('償却仕訳を起票しました')
      await fetchSchedules()
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setPosting(null)
    }
  }

  if (loading || !asset) {
    return <div className="p-8">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">償却スケジュール</h1>
          <p className="text-muted-foreground mt-1">{asset.name}</p>
        </div>
      </div>

      {/* 資産情報 */}
      <Card>
        <CardHeader>
          <CardTitle>資産情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">資産コード</p>
              <p className="font-mono">{asset.asset_code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">取得価額</p>
              <p className="font-mono">¥{Number(asset.acquisition_cost).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">残存価額</p>
              <p className="font-mono">¥{Number(asset.salvage_value).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">償却方法</p>
              <Badge>{asset.depreciation_method === 'straight' ? '定額法' : '定率法'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* スケジュール生成 */}
      <Card>
        <CardHeader>
          <CardTitle>スケジュール生成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>償却開始日</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>償却終了日</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            <Calculator className="h-4 w-4 mr-2" />
            {generating ? 'generating...' : '償却スケジュールを生成'}
          </Button>
        </CardContent>
      </Card>

      {/* スケジュール一覧 */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>償却スケジュール一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年月</TableHead>
                  <TableHead className="text-right">償却額</TableHead>
                  <TableHead className="text-right">累計償却額</TableHead>
                  <TableHead className="text-right">帳簿価額</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      {schedule.fiscal_year}年{schedule.fiscal_month}月
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{Number(schedule.depreciation_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{Number(schedule.accumulated_depreciation).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¥{Number(schedule.book_value).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {schedule.posted ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          起票済み
                        </Badge>
                      ) : (
                        <Badge variant="outline">未起票</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!schedule.posted && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handlePost(schedule.id, schedule.fiscal_year, schedule.fiscal_month)
                          }
                          disabled={posting === schedule.id}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {posting === schedule.id ? '起票中...' : '仕訳起票'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
