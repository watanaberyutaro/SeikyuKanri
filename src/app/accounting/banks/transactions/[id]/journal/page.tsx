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
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface BankTransaction {
  id: string
  transaction_date: string
  description: string
  amount: number
  bank_account: {
    id: string
    name: string
    account_id: string | null
  }
}

interface Account {
  id: string
  code: string
  name: string
  account_type: string
}

interface JournalLine {
  account_id: string
  debit: number
  credit: number
  description: string
  department: string
}

export default function CreateJournalFromTransactionPage() {
  const router = useRouter()
  const params = useParams()
  const transactionId = params.id as string

  const [transaction, setTransaction] = useState<BankTransaction | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [journalDate, setJournalDate] = useState('')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: '', debit: 0, credit: 0, description: '', department: '' },
    { account_id: '', debit: 0, credit: 0, description: '', department: '' },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [transactionId])

  async function fetchData() {
    setLoading(true)
    try {
      // 取引情報を取得
      const txResponse = await fetch(`/api/accounting/bank-transactions/${transactionId}`)
      const txData = await txResponse.json()

      if (txData.transaction) {
        setTransaction(txData.transaction)
        setJournalDate(txData.transaction.transaction_date)
        setMemo(txData.transaction.description)

        // 取引金額から仕訳を事前入力
        const amount = Math.abs(txData.transaction.amount)
        const bankAccountId = txData.transaction.bank_account.account_id

        if (txData.transaction.amount > 0) {
          // 入金: 借方=銀行口座、貸方=未定
          setLines([
            {
              account_id: bankAccountId || '',
              debit: amount,
              credit: 0,
              description: txData.transaction.description,
              department: '',
            },
            {
              account_id: '',
              debit: 0,
              credit: amount,
              description: txData.transaction.description,
              department: '',
            },
          ])
        } else {
          // 出金: 借方=未定、貸方=銀行口座
          setLines([
            {
              account_id: '',
              debit: amount,
              credit: 0,
              description: txData.transaction.description,
              department: '',
            },
            {
              account_id: bankAccountId || '',
              debit: 0,
              credit: amount,
              description: txData.transaction.description,
              department: '',
            },
          ])
        }
      }

      // 勘定科目を取得
      const accountsResponse = await fetch('/api/accounts')
      const accountsData = await accountsResponse.json()
      setAccounts(accountsData.accounts || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      alert('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const addLine = () => {
    setLines([
      ...lines,
      { account_id: '', debit: 0, credit: 0, description: '', department: '' },
    ])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 2) return
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setLines(newLines)
  }

  const calculateTotalDebit = () => {
    return lines.reduce((sum, line) => sum + Number(line.debit || 0), 0)
  }

  const calculateTotalCredit = () => {
    return lines.reduce((sum, line) => sum + Number(line.credit || 0), 0)
  }

  const isBalanced = () => {
    return calculateTotalDebit() === calculateTotalCredit() && calculateTotalDebit() > 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isBalanced()) {
      alert('借方と貸方の合計が一致していません')
      return
    }

    if (lines.some((line) => !line.account_id)) {
      alert('すべての明細で勘定科目を選択してください')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journal_date: journalDate,
          memo: memo || undefined,
          source: `Bank:${transaction?.bank_account.name}`,
          source_type: 'bank_transaction',
          source_id: transactionId,
          is_approved: false,
          lines: lines.map((line) => ({
            account_id: line.account_id,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            description: line.description || undefined,
            department: line.department || undefined,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '仕訳の作成に失敗しました')
      }

      // 取引を仕訳済みにする
      await fetch(`/api/accounting/bank-transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_reconciled: true,
          journal_id: data.journal.id,
        }),
      })

      alert('仕訳を作成しました')
      router.push('/accounting/banks')
    } catch (error: any) {
      console.error('Failed to create journal:', error)
      alert(`エラー: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-center py-8">読み込み中...</p>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-center py-8">取引が見つかりませんでした</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仕訳作成</h1>
          <p className="text-muted-foreground mt-1">銀行取引から仕訳を作成</p>
        </div>
        <Link href="/accounting/banks">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>
      </div>

      {/* 取引情報 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">日付:</span>
              <span className="text-sm">
                {new Date(transaction.transaction_date).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">口座:</span>
              <span className="text-sm">{transaction.bank_account.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">摘要:</span>
              <span className="text-sm">{transaction.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">金額:</span>
              <span className={`text-sm font-mono ${transaction.amount > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {transaction.amount > 0 ? '+' : ''}¥{Math.abs(transaction.amount).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>仕訳情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="journal_date">仕訳日 *</Label>
                <Input
                  id="journal_date"
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">メモ</Label>
              <Textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={saving}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>仕訳明細</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              明細追加
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>勘定科目 *</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead className="text-right">借方</TableHead>
                  <TableHead className="text-right">貸方</TableHead>
                  <TableHead>部門</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={line.account_id}
                        onValueChange={(value) => updateLine(index, 'account_id', value)}
                        disabled={saving}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="勘定科目を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="摘要"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(index, 'debit', Number(e.target.value))}
                        disabled={saving}
                        min="0"
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(index, 'credit', Number(e.target.value))}
                        disabled={saving}
                        min="0"
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="部門"
                        value={line.department}
                        onChange={(e) => updateLine(index, 'department', e.target.value)}
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={saving || lines.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-bold text-right">
                    合計
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-blue-600">
                    ¥{calculateTotalDebit().toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-600">
                    ¥{calculateTotalCredit().toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={2}>
                    {!isBalanced() && (
                      <span className="text-sm text-red-600">
                        借方と貸方が一致していません
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/accounting/banks">
            <Button type="button" variant="outline" disabled={saving}>
              キャンセル
            </Button>
          </Link>
          <Button type="submit" disabled={saving || !isBalanced()}>
            {saving ? '作成中...' : '仕訳を作成'}
          </Button>
        </div>
      </form>
    </div>
  )
}
