'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react'
import { Account, JournalWithLines } from '@/types/accounting'
import { updateJournal } from '../../actions'

interface JournalLine {
  id: string
  account_id: string
  debit: number
  credit: number
  description: string
}

export default function EditJournalPage() {
  const router = useRouter()
  const params = useParams()
  const journalId = params.id as string

  const [accounts, setAccounts] = useState<Account[]>([])
  const [journal, setJournal] = useState<JournalWithLines | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // フォームの状態
  const [journalDate, setJournalDate] = useState('')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([])

  useEffect(() => {
    fetchData()
  }, [journalId])

  async function fetchData() {
    try {
      // 勘定科目を取得
      const accountsRes = await fetch('/api/accounts')
      const accountsData = await accountsRes.json()
      setAccounts(accountsData.accounts || [])

      // 仕訳データを取得
      const journalRes = await fetch(`/api/journals/${journalId}`)
      const journalData = await journalRes.json()

      if (journalData.journal) {
        const j = journalData.journal
        setJournal(j)
        setJournalDate(j.journal_date)
        setMemo(j.memo || '')
        setLines(
          j.lines.map((line: any, index: number) => ({
            id: String(index + 1),
            account_id: line.account_id,
            debit: Number(line.debit),
            credit: Number(line.credit),
            description: line.description || '',
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      alert('データの読み込みに失敗しました')
      router.push('/accounting/journals')
    } finally {
      setLoading(false)
    }
  }

  const addLine = () => {
    const newId = String(Math.max(...lines.map((l) => Number(l.id))) + 1)
    setLines([
      ...lines,
      { id: newId, account_id: '', debit: 0, credit: 0, description: '' },
    ])
  }

  const removeLine = (id: string) => {
    if (lines.length <= 2) {
      alert('最低2行は必要です')
      return
    }
    setLines(lines.filter((line) => line.id !== id))
  }

  const updateLine = (
    id: string,
    field: keyof JournalLine,
    value: string | number
  ) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    )
  }

  // 借方・貸方の合計計算
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0)
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0)
  const isBalanced = totalDebit === totalCredit && totalDebit > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // バリデーション
    if (!isBalanced) {
      alert('借方合計と貸方合計が一致していません')
      return
    }

    if (lines.some((line) => !line.account_id)) {
      alert('すべての明細行で勘定科目を選択してください')
      return
    }

    if (lines.every((line) => line.debit === 0 && line.credit === 0)) {
      alert('金額を入力してください')
      return
    }

    setSubmitting(true)

    try {
      const result = await updateJournal(journalId, {
        journal_date: journalDate,
        memo: memo || undefined,
        lines: lines.map((line, index) => ({
          account_id: line.account_id,
          debit: Number(line.debit),
          credit: Number(line.credit),
          description: line.description || undefined,
          line_number: index + 1,
        })),
      })

      if (result?.error) {
        alert(`エラー: ${result.error}`)
      }
      // 成功時はServer Actionがredirectするので、ここには来ない
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">仕訳編集</h1>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">仕訳編集</h1>
        <p className="text-red-600">仕訳が見つかりません</p>
      </div>
    )
  }

  // 請求書連携の仕訳は編集不可
  if (journal.source_type === 'invoice') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">仕訳編集</h1>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-900">編集できません</p>
                <p className="text-sm text-yellow-800">
                  請求書連携の仕訳は編集できません。請求書を編集してください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button onClick={() => router.back()}>戻る</Button>
      </div>
    )
  }

  // 承認済みの仕訳は編集不可
  if (journal.is_approved) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">仕訳編集</h1>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-900">編集できません</p>
                <p className="text-sm text-yellow-800">
                  承認済みの仕訳は編集できません。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button onClick={() => router.back()}>戻る</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仕訳編集</h1>
          <p className="text-muted-foreground mt-1">
            {new Date(journal.journal_date).toLocaleDateString('ja-JP')}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="journal_date">仕訳日付 *</Label>
                <Input
                  id="journal_date"
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo">摘要</Label>
              <Textarea
                id="memo"
                placeholder="仕訳の説明を入力（任意）"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 仕訳明細 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>仕訳明細</CardTitle>
              <Button type="button" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                明細行を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">勘定科目 *</TableHead>
                    <TableHead className="w-[200px]">摘要</TableHead>
                    <TableHead className="w-[150px] text-right">借方</TableHead>
                    <TableHead className="w-[150px] text-right">貸方</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Select
                          value={line.account_id}
                          onValueChange={(value) =>
                            updateLine(line.id, 'account_id', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="科目を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                [{account.code}] {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="摘要"
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.id, 'description', e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="text-right"
                          value={line.debit || ''}
                          onChange={(e) =>
                            updateLine(
                              line.id,
                              'debit',
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                          disabled={line.credit > 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="text-right"
                          value={line.credit || ''}
                          onChange={(e) =>
                            updateLine(
                              line.id,
                              'credit',
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                          disabled={line.debit > 0}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 2}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* 合計行 */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2} className="text-right">
                      合計
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      ¥{totalDebit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ¥{totalCredit.toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* バランスチェック */}
            <div className="mt-4">
              {!isBalanced && totalDebit !== totalCredit && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    借方合計と貸方合計が一致していません（差額: ¥
                    {Math.abs(totalDebit - totalCredit).toLocaleString()}）
                  </span>
                </div>
              )}
              {isBalanced && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                  <AlertCircle className="h-4 w-4" />
                  <span>借方合計と貸方合計が一致しています</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 更新ボタン */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={!isBalanced || submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? '更新中...' : '仕訳を更新'}
          </Button>
        </div>
      </form>
    </div>
  )
}
