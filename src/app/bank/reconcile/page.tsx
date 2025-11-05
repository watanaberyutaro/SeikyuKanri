'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

type BankRow = {
  id: string
  txn_date: string
  description: string
  amount: number
  type: 'in' | 'out'
  matched: boolean
  matches?: any[]
}

type Statement = {
  id: string
  account_name: string
  statement_date: string
  row_count: number
  matched_count: number
}

export default function BankReconcilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statementId = searchParams.get('statement_id')

  const [statement, setStatement] = useState<Statement | null>(null)
  const [unmatchedRows, setUnmatchedRows] = useState<BankRow[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // データ取得
  useEffect(() => {
    if (!statementId) {
      setError('statement_id が指定されていません')
      setLoading(false)
      return
    }

    fetchReconcileData()
  }, [statementId])

  const fetchReconcileData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/bank/reconcile?statement_id=${statementId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'データの取得に失敗しました')
      }

      setStatement(data.statement)
      setUnmatchedRows(data.unmatched_rows || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // 突合確定
  const handleConfirmMatch = async (bankRowId: string, targetType: 'invoice' | 'bill', targetId: string) => {
    try {
      setReconciling(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/bank/reconcile/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_row_id: bankRowId,
          target_type: targetType,
          target_id: targetId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '突合に失敗しました')
      }

      // 成功メッセージを表示
      setSuccessMessage('突合が完了しました')

      // 未突合リストから削除
      setUnmatchedRows(prev => prev.filter(row => row.id !== bankRowId))

      // 次の行へ
      if (currentIndex >= unmatchedRows.length - 1) {
        // 最後の行の場合は前の行へ
        setCurrentIndex(Math.max(0, currentIndex - 1))
      }

      // ステートメント情報を更新
      if (statement) {
        setStatement({
          ...statement,
          matched_count: statement.matched_count + 1
        })
      }

      // 2秒後にメッセージをクリア
      setTimeout(() => setSuccessMessage(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '突合中にエラーが発生しました')
    } finally {
      setReconciling(false)
    }
  }

  // スキップ
  const handleSkip = () => {
    if (currentIndex < unmatchedRows.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // 戻る
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const currentRow = unmatchedRows[currentIndex]
  const progress = statement ? (statement.matched_count / statement.row_count) * 100 : 0

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!statement) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>ステートメントが見つかりません</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">銀行取引の突合</h1>
        <p className="text-muted-foreground">
          {statement.account_name} - {statement.statement_date}
        </p>
      </div>

      {/* 進捗バー */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">進捗状況</span>
              <span className="font-medium">
                {statement.matched_count} / {statement.row_count} 件
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {unmatchedRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">突合完了</h2>
            <p className="text-muted-foreground mb-6">
              全ての取引の突合が完了しました
            </p>
            <Button onClick={() => router.push('/bank/import')}>
              インポート画面に戻る
            </Button>
          </CardContent>
        </Card>
      ) : currentRow ? (
        <div className="space-y-6">
          {/* 現在の銀行取引 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  銀行取引 ({currentIndex + 1} / {unmatchedRows.length})
                </CardTitle>
                <Badge variant={currentRow.type === 'in' ? 'default' : 'secondary'}>
                  {currentRow.type === 'in' ? '入金' : '出金'}
                </Badge>
              </div>
              <CardDescription>突合する取引を選択してください</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">取引日</p>
                  <p className="font-medium">{currentRow.txn_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">摘要</p>
                  <p className="font-medium">{currentRow.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">金額</p>
                  <p className="text-lg font-bold">
                    ¥{currentRow.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 突合候補 */}
          <Card>
            <CardHeader>
              <CardTitle>突合候補</CardTitle>
              <CardDescription>
                {currentRow.matches && currentRow.matches.length > 0
                  ? `${currentRow.matches.length} 件の候補が見つかりました`
                  : '候補が見つかりませんでした'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentRow.matches && currentRow.matches.length > 0 ? (
                <div className="space-y-3">
                  {currentRow.matches.map((match: any, index: number) => {
                    const isInvoice = 'invoice_id' in match
                    const targetType = isInvoice ? 'invoice' : 'bill'
                    const targetId = isInvoice ? match.invoice_id : match.bill_id

                    return (
                      <div
                        key={index}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                スコア: {match.score}
                              </Badge>
                              {match.score >= 150 && (
                                <Badge className="bg-green-600">
                                  高精度
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">番号</p>
                                <p className="font-medium">
                                  {isInvoice ? match.invoice_number : match.bill_number}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  {isInvoice ? '顧客' : '仕入先'}
                                </p>
                                <p className="font-medium">
                                  {isInvoice ? match.company_name : match.vendor_name}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">日付</p>
                                <p className="font-medium">
                                  {isInvoice ? match.issue_date : match.bill_date}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">金額</p>
                                <p className="font-medium">
                                  ¥{match.total_amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleConfirmMatch(currentRow.id, targetType, targetId)}
                            disabled={reconciling}
                            size="sm"
                          >
                            {reconciling ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                処理中...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                確定
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>自動マッチングで候補が見つかりませんでした</p>
                  <p className="text-sm mt-2">手動で処理するか、スキップしてください</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ナビゲーション */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              前へ
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={currentIndex >= unmatchedRows.length - 1}
              className="flex-1"
            >
              スキップ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push('/bank/import')}
              variant="ghost"
            >
              中断
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
