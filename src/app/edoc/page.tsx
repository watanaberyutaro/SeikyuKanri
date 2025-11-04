'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Download, FileText, ExternalLink } from 'lucide-react'
import { EDocument, EntityType } from '@/types/edoc-audit'

export default function EDocSearchPage() {
  const [documents, setDocuments] = useState<EDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  // 検索フィルタ
  const [entityType, setEntityType] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // 初期ロード（最新100件）
  useEffect(() => {
    handleSearch()
  }, [])

  const handleSearch = async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (entityType && entityType !== 'all') params.append('entity_type', entityType)
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      if (counterparty) params.append('counterparty', counterparty)
      if (documentNumber) params.append('document_number', documentNumber)
      if (minAmount) params.append('min_amount', minAmount)
      if (maxAmount) params.append('max_amount', maxAmount)

      const res = await fetch(`/api/edoc/search?${params.toString()}`)
      const data = await res.json()

      if (res.ok) {
        setDocuments(data.edocs || [])
      } else {
        alert(data.error || '検索に失敗しました')
      }
    } catch (error) {
      console.error('検索エラー:', error)
      alert('検索に失敗しました')
    } finally {
      setSearching(false)
    }
  }

  const handleClear = () => {
    setEntityType('all')
    setFromDate('')
    setToDate('')
    setCounterparty('')
    setDocumentNumber('')
    setMinAmount('')
    setMaxAmount('')
  }

  const getEntityTypeBadge = (type: EntityType) => {
    const badges = {
      invoice: { label: '請求書', variant: 'default' as const },
      quote: { label: '見積書', variant: 'secondary' as const },
      bill: { label: '領収書', variant: 'outline' as const },
      receipt: { label: 'レシート', variant: 'outline' as const },
      expense: { label: '経費', variant: 'destructive' as const },
      contract: { label: '契約書', variant: 'default' as const },
    }
    const badge = badges[type]
    return <Badge variant={badge.variant}>{badge.label}</Badge>
  }

  const handleDownload = (doc: EDocument) => {
    window.open(doc.storage_url, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">電子帳簿検索</h1>
        <p className="text-muted-foreground">電子取引データを検索・閲覧できます</p>
      </div>

      {/* 検索フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>検索条件</CardTitle>
          <CardDescription>
            取引日付、金額、取引先名、文書番号などで検索できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 文書種別 */}
            <div className="space-y-2">
              <Label htmlFor="entity-type">文書種別</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger id="entity-type">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="invoice">請求書</SelectItem>
                  <SelectItem value="quote">見積書</SelectItem>
                  <SelectItem value="bill">領収書</SelectItem>
                  <SelectItem value="receipt">レシート</SelectItem>
                  <SelectItem value="expense">経費</SelectItem>
                  <SelectItem value="contract">契約書</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 取引日（開始） */}
            <div className="space-y-2">
              <Label htmlFor="from-date">取引日（開始）</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* 取引日（終了） */}
            <div className="space-y-2">
              <Label htmlFor="to-date">取引日（終了）</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* 取引先名 */}
            <div className="space-y-2">
              <Label htmlFor="counterparty">取引先名</Label>
              <Input
                id="counterparty"
                placeholder="部分一致"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
              />
            </div>

            {/* 文書番号 */}
            <div className="space-y-2">
              <Label htmlFor="document-number">文書番号</Label>
              <Input
                id="document-number"
                placeholder="部分一致"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>

            {/* 金額（最小） */}
            <div className="space-y-2">
              <Label htmlFor="min-amount">金額（最小）</Label>
              <Input
                id="min-amount"
                type="number"
                placeholder="円"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            {/* 金額（最大） */}
            <div className="space-y-2">
              <Label htmlFor="max-amount">金額（最大）</Label>
              <Input
                id="max-amount"
                type="number"
                placeholder="円"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSearch} disabled={searching}>
              <Search className="h-4 w-4 mr-2" />
              {searching ? '検索中...' : '検索'}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 検索結果 */}
      <Card>
        <CardHeader>
          <CardTitle>検索結果</CardTitle>
          <CardDescription>{documents.length}件の文書が見つかりました</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>種別</TableHead>
                  <TableHead>取引日</TableHead>
                  <TableHead>取引先</TableHead>
                  <TableHead>文書番号</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>ファイル名</TableHead>
                  <TableHead>バージョン</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      検索結果がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{getEntityTypeBadge(doc.entity_type)}</TableCell>
                      <TableCell>
                        {new Date(doc.issued_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>{doc.counterparty || '-'}</TableCell>
                      <TableCell>{doc.document_number || '-'}</TableCell>
                      <TableCell className="text-right">
                        {doc.total_amount
                          ? `¥${Number(doc.total_amount).toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]" title={doc.file_name}>
                            {doc.file_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{doc.version}</Badge>
                        {doc.is_latest && (
                          <Badge variant="default" className="ml-1">
                            最新
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          開く
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
