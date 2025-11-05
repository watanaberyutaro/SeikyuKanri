'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function BankImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload')

  // Upload step
  const [file, setFile] = useState<File | null>(null)
  const [accountName, setAccountName] = useState('')

  // Mapping step
  const [csvPreview, setCsvPreview] = useState<string[][]>([])
  const [hasHeader, setHasHeader] = useState(true)
  const [dateColumn, setDateColumn] = useState<string>('0')
  const [descriptionColumn, setDescriptionColumn] = useState<string>('1')
  const [amountColumn, setAmountColumn] = useState<string>('2')
  const [typeColumn, setTypeColumn] = useState<string>('-1')

  // Result step
  const [importResult, setImportResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ファイル選択
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    // プレビューのためにファイルを読み込み
    try {
      const text = await selectedFile.text()
      const lines = text.split(/\r?\n/).filter(line => line.trim())
      const delimiter = text.includes('\t') ? '\t' : ','

      const preview = lines.slice(0, 10).map(line => {
        // 簡易CSVパーサー
        const cells: string[] = []
        let cell = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cell += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === delimiter && !inQuotes) {
            cells.push(cell.trim())
            cell = ''
          } else {
            cell += char
          }
        }
        cells.push(cell.trim())
        return cells
      })

      setCsvPreview(preview)
    } catch (err) {
      setError('ファイルの読み込みに失敗しました')
      console.error(err)
    }
  }

  // 次へ（マッピング画面へ）
  const handleNext = () => {
    if (!file || !accountName) {
      setError('ファイルと口座名を入力してください')
      return
    }
    setStep('mapping')
    setError(null)
  }

  // インポート実行
  const handleImport = async () => {
    if (!file) return

    setIsImporting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('account_name', accountName)
      formData.append('date_column', dateColumn)
      formData.append('description_column', descriptionColumn)
      formData.append('amount_column', amountColumn)
      formData.append('type_column', typeColumn)
      formData.append('has_header', hasHeader.toString())

      const response = await fetch('/api/bank/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'インポートに失敗しました')
      }

      setImportResult(result)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'インポート中にエラーが発生しました')
    } finally {
      setIsImporting(false)
    }
  }

  // リコンサイル画面へ
  const handleGoToReconcile = () => {
    if (importResult?.statement_id) {
      router.push(`/bank/reconcile?statement_id=${importResult.statement_id}`)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">銀行取引データインポート</h1>
        <p className="text-muted-foreground">
          CSV/TSVファイルから銀行取引データを取り込み、請求書と突合します
        </p>
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="ml-2 font-medium">ファイル選択</span>
        </div>
        <ArrowRight className="mx-4 text-muted-foreground" />
        <div className={`flex items-center ${step === 'mapping' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="ml-2 font-medium">カラム設定</span>
        </div>
        <ArrowRight className="mx-4 text-muted-foreground" />
        <div className={`flex items-center ${step === 'result' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'result' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="ml-2 font-medium">完了</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: ファイルアップロード */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>CSVファイルをアップロード</CardTitle>
            <CardDescription>
              銀行やクレジットカードからダウンロードしたCSV/TSVファイルを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="account-name">口座名 *</Label>
              <Input
                id="account-name"
                placeholder="例: 三菱UFJ銀行 普通預金"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">ファイル *</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        クリックしてファイルを選択
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        CSV, TSV形式に対応
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <Label>プレビュー（最初の10行）</Label>
                <div className="border rounded-lg overflow-auto max-h-64">
                  <table className="w-full text-sm">
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className={i === 0 ? 'bg-muted font-medium' : ''}>
                          {row.map((cell, j) => (
                            <td key={j} className="border-r border-b p-2 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button onClick={handleNext} className="w-full" disabled={!file || !accountName}>
              次へ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: カラムマッピング */}
      {step === 'mapping' && csvPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>カラム設定</CardTitle>
            <CardDescription>
              各データ項目がどのカラムに対応するかを設定してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="has-header"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="has-header" className="font-normal cursor-pointer">
                1行目はヘッダー行
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>取引日 *</Label>
                <Select value={dateColumn} onValueChange={setDateColumn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview[0]?.map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        カラム {index + 1}: {csvPreview[0][index]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>摘要 *</Label>
                <Select value={descriptionColumn} onValueChange={setDescriptionColumn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview[0]?.map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        カラム {index + 1}: {csvPreview[0][index]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>金額 *</Label>
                <Select value={amountColumn} onValueChange={setAmountColumn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview[0]?.map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        カラム {index + 1}: {csvPreview[0][index]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>入出金区分（オプション）</Label>
                <Select value={typeColumn} onValueChange={setTypeColumn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">なし（金額の符号で判定）</SelectItem>
                    {csvPreview[0]?.map((_, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        カラム {index + 1}: {csvPreview[0][index]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>プレビュー</Label>
              <div className="border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="border-r border-b p-2 text-left">取引日</th>
                      <th className="border-r border-b p-2 text-left">摘要</th>
                      <th className="border-r border-b p-2 text-right">金額</th>
                      {typeColumn !== '-1' && (
                        <th className="border-b p-2 text-left">区分</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(hasHeader ? 1 : 0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="border-r border-b p-2">{row[parseInt(dateColumn)]}</td>
                        <td className="border-r border-b p-2">{row[parseInt(descriptionColumn)]}</td>
                        <td className="border-r border-b p-2 text-right">{row[parseInt(amountColumn)]}</td>
                        {typeColumn !== '-1' && (
                          <td className="border-b p-2">{row[parseInt(typeColumn)]}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                戻る
              </Button>
              <Button onClick={handleImport} className="flex-1" disabled={isImporting}>
                {isImporting ? 'インポート中...' : 'インポート実行'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 結果 */}
      {step === 'result' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              インポート完了
            </CardTitle>
            <CardDescription>
              銀行取引データのインポートが完了しました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">総行数</p>
                <p className="text-2xl font-bold">{importResult.total_rows}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">成功</p>
                <p className="text-2xl font-bold text-green-600">{importResult.success_count}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">重複スキップ</p>
                <p className="text-2xl font-bold text-yellow-600">{importResult.duplicate_count}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">エラー</p>
                <p className="text-2xl font-bold text-red-600">{importResult.error_count}</p>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <Label>エラー詳細</Label>
                <div className="border rounded-lg p-4 bg-red-50 max-h-40 overflow-auto">
                  <ul className="text-sm space-y-1 text-red-900">
                    {importResult.errors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload')
                  setFile(null)
                  setAccountName('')
                  setCsvPreview([])
                  setImportResult(null)
                }}
                className="flex-1"
              >
                続けてインポート
              </Button>
              <Button onClick={handleGoToReconcile} className="flex-1">
                突合画面へ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
