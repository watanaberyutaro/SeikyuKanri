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
import { FileText, Plus, Edit, Trash2, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JournalWithLines } from '@/types/accounting'
import { deleteJournal } from './actions'

interface AccountingPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
}

export default function JournalsPage() {
  const [journals, setJournals] = useState<JournalWithLines[]>([])
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [approvalFilter, setApprovalFilter] = useState<string>('approved') // 'all', 'approved', 'unapproved'
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchPeriods()
  }, [])

  useEffect(() => {
    fetchJournals()
  }, [selectedPeriod, approvalFilter])

  async function fetchPeriods() {
    try {
      const response = await fetch('/api/accounting/periods')
      const data = await response.json()
      setPeriods(data.periods || [])
    } catch (error) {
      console.error('Failed to fetch periods:', error)
    }
  }

  async function fetchJournals() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (selectedPeriod && selectedPeriod !== 'all') {
        params.append('period_id', selectedPeriod)
      }
      if (approvalFilter === 'approved') {
        params.append('approved', 'true')
      } else if (approvalFilter === 'unapproved') {
        params.append('approved', 'false')
      }
      const response = await fetch(`/api/journals?${params.toString()}`)
      const data = await response.json()
      setJournals(data.journals || [])
    } catch (error) {
      console.error('Failed to fetch journals:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, journalDate: string) {
    if (
      !confirm(
        `${new Date(journalDate).toLocaleDateString('ja-JP')}の仕訳を削除しますか？\n\nこの操作は取り消せません。`
      )
    ) {
      return
    }

    setDeleting(id)
    try {
      const result = await deleteJournal(id)

      if (result?.error) {
        alert(`エラー: ${result.error}`)
      } else {
        alert('仕訳を削除しました')
        await fetchJournals()
      }
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仕訳帳</h1>
          <p className="text-muted-foreground mt-1">仕訳の一覧・編集</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/30">
            <Button
              variant={approvalFilter === 'unapproved' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setApprovalFilter('unapproved')}
            >
              未承認のみ
            </Button>
            <Button
              variant={approvalFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setApprovalFilter('all')}
            >
              すべて
            </Button>
            <Button
              variant={approvalFilter === 'approved' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setApprovalFilter('approved')}
            >
              承認済みのみ
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="会計期間を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全期間</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({new Date(period.start_date).toLocaleDateString('ja-JP')} -
                      {new Date(period.end_date).toLocaleDateString('ja-JP')})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Link href="/accounting/journals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      {/* 仕訳一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>仕訳一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">読み込み中...</p>
          ) : journals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                仕訳が登録されていません
              </p>
              <Link href="/accounting/journals/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新規仕訳を作成
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[110px]">日付</TableHead>
                    <TableHead className="w-[180px]">借方科目</TableHead>
                    <TableHead className="text-right w-[120px]">借方金額</TableHead>
                    <TableHead className="w-[180px]">貸方科目</TableHead>
                    <TableHead className="text-right w-[120px]">貸方金額</TableHead>
                    <TableHead className="min-w-[200px]">摘要</TableHead>
                    <TableHead className="w-[130px]">ステータス</TableHead>
                    <TableHead className="w-[180px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.map((journal) => {
                    // 借方・貸方の科目を抽出
                    const debitLines = journal.lines.filter((l) => l.debit > 0)
                    const creditLines = journal.lines.filter((l) => l.credit > 0)

                    // 借方科目名（複数ある場合はカンマ区切り）
                    const debitAccounts = debitLines
                      .map((l) => l.account.name)
                      .join(' / ')

                    // 貸方科目名（複数ある場合はカンマ区切り）
                    const creditAccounts = creditLines
                      .map((l) => l.account.name)
                      .join(' / ')

                    // 借方合計
                    const debitTotal = debitLines.reduce((sum, l) => sum + Number(l.debit), 0)

                    // 貸方合計
                    const creditTotal = creditLines.reduce((sum, l) => sum + Number(l.credit), 0)

                    // 摘要（最初の明細の摘要 または メモ）
                    const description = journal.lines[0]?.description || journal.memo || '-'

                    return (
                      <TableRow
                        key={journal.id}
                        className="hover:bg-accent/50 transition-colors border-b"
                      >
                        <TableCell className="font-medium text-sm">
                          {new Date(journal.journal_date).toLocaleDateString('ja-JP')}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{debitAccounts}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className="text-blue-600 font-semibold">
                            ¥{debitTotal.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{creditAccounts}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className="text-red-600 font-semibold">
                            ¥{creditTotal.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="max-w-[200px] truncate" title={description}>
                            {description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {journal.is_approved ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                                承認済
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs">
                                未承認
                              </Badge>
                            )}
                            {journal.source_type === 'invoice' && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                                請求書
                              </Badge>
                            )}
                            {journal.source_type === 'fixed_asset' && (
                              <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                                固定資産
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-end">
                            {!journal.is_approved ? (
                              <>
                                <Link href={`/accounting/journals/${journal.id}/edit`}>
                                  <Button size="sm" variant="outline">
                                    <Edit className="h-3.5 w-3.5 mr-1" />
                                    編集
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(journal.id, journal.journal_date)}
                                  disabled={deleting === journal.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1 text-red-600" />
                                  {deleting === journal.id ? '削除中...' : '削除'}
                                </Button>
                              </>
                            ) : (
                              <Link href={`/accounting/journals/${journal.id}/edit`}>
                                <Button size="sm" variant="ghost">
                                  <FileText className="h-3.5 w-3.5 mr-1" />
                                  詳細
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 注意事項 */}
      {journals.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  仕訳帳について
                </p>
                <p className="text-sm text-blue-800">
                  仕訳帳では、登録されたすべての仕訳を確認・編集できます。
                  手動入力した仕訳は編集・削除が可能です。
                  自動生成された仕訳（請求書連携など）や承認済み仕訳は編集できません。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
