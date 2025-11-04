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
import { FileText, CheckCircle, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { JournalWithLines } from '@/types/accounting'
import { deleteJournal } from '../journals/actions'

export default function UnapprovedJournalsPage() {
  const [journals, setJournals] = useState<JournalWithLines[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchJournals()
  }, [])

  async function fetchJournals() {
    setLoading(true)
    try {
      const response = await fetch('/api/journals?approved=false&limit=100')
      const data = await response.json()
      console.log('未承認仕訳データ:', data.journals)
      setJournals(data.journals || [])
    } catch (error) {
      console.error('Failed to fetch journals:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(journalId: string) {
    console.log('🔵 承認ボタンクリック:', journalId)

    if (!confirm('この仕訳を承認しますか？')) {
      console.log('⚠️ 承認キャンセル')
      return
    }

    console.log('🟢 承認処理開始')
    setApproving(journalId)

    try {
      console.log('📡 APIリクエスト送信:', `/api/journals/${journalId}/approve`)
      const response = await fetch(`/api/journals/${journalId}/approve`, {
        method: 'POST',
      })

      console.log('📥 APIレスポンス:', response.status, response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ APIエラー:', errorData)
        throw new Error(errorData.error || '承認に失敗しました')
      }

      const result = await response.json()
      console.log('✅ 承認成功:', result)

      alert('仕訳を承認しました')
      await fetchJournals()
    } catch (error: any) {
      console.error('❌ 承認エラー:', error)
      alert(`エラー: ${error.message}`)
    } finally {
      setApproving(null)
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

  const unapprovedCount = journals.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">未承認仕訳</h1>
          <p className="text-muted-foreground mt-1">承認待ちの仕訳を確認・承認</p>
        </div>
      </div>

      {/* 未承認仕訳一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>
            承認待ち仕訳
            {unapprovedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unapprovedCount}件
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">読み込み中...</p>
          ) : journals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                承認待ちの仕訳はありません
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {journals.map((journal) => (
                <div
                  key={journal.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {new Date(journal.journal_date).toLocaleDateString('ja-JP')}
                        </span>
                        {journal.source_type === 'invoice' && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            請求書連携
                          </Badge>
                        )}
                        {journal.source_type === 'bank_transaction' && (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            銀行取引
                          </Badge>
                        )}
                        {!journal.source_type && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            手動入力
                          </Badge>
                        )}
                      </div>
                      {journal.memo && (
                        <p className="text-sm text-muted-foreground">{journal.memo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {journal.source && (
                        <span className="text-sm text-muted-foreground font-mono mr-2">
                          {journal.source}
                        </span>
                      )}
                      <Link href={`/accounting/journals/${journal.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(journal.id, journal.journal_date)}
                        disabled={deleting === journal.id}
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-red-600" />
                        {deleting === journal.id ? '削除中...' : '削除'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(journal.id)}
                        disabled={approving === journal.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {approving === journal.id ? '承認中...' : '承認'}
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>勘定科目</TableHead>
                        <TableHead>摘要</TableHead>
                        <TableHead className="text-right">借方</TableHead>
                        <TableHead className="text-right">貸方</TableHead>
                        <TableHead>部門</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {journal.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{line.account.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {line.account.code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {line.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {line.debit > 0 ? (
                              <span className="text-blue-600">
                                ¥{Number(line.debit).toLocaleString()}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {line.credit > 0 ? (
                              <span className="text-red-600">
                                ¥{Number(line.credit).toLocaleString()}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {line.department || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="font-bold text-right">
                          合計
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-blue-600">
                          ¥
                          {journal.lines
                            .reduce((sum, l) => sum + Number(l.debit), 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-600">
                          ¥
                          {journal.lines
                            .reduce((sum, l) => sum + Number(l.credit), 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                未承認仕訳について
              </p>
              <p className="text-sm text-blue-800">
                請求書や銀行取引から自動作成された仕訳は、承認されるまで仕訳帳に表示されません。
                内容を確認して「承認」ボタンをクリックすると、仕訳帳に移動します。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
