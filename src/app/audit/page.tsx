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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Eye, FileText, Edit, Trash2, CheckCircle, Download } from 'lucide-react'
import { AuditLog, AuditAction } from '@/types/edoc-audit'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // 検索フィルタ
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [action, setAction] = useState<string>('all')
  const [entityType, setEntityType] = useState<string>('all')
  const [actorUserId, setActorUserId] = useState('')

  // 初期ロード（最新100件）
  useEffect(() => {
    handleSearch()
  }, [])

  const handleSearch = async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      if (action && action !== 'all') params.append('action', action)
      if (entityType && entityType !== 'all') params.append('entity_type', entityType)
      if (actorUserId) params.append('actor_user_id', actorUserId)

      const res = await fetch(`/api/audit?${params.toString()}`)
      const data = await res.json()

      if (res.ok) {
        setLogs(data.logs || [])
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
    setFromDate('')
    setToDate('')
    setAction('all')
    setEntityType('all')
    setActorUserId('')
  }

  const getActionBadge = (action: AuditAction) => {
    const badges = {
      create: { label: '作成', variant: 'default' as const, icon: FileText },
      update: { label: '更新', variant: 'secondary' as const, icon: Edit },
      delete: { label: '削除', variant: 'destructive' as const, icon: Trash2 },
      approve: { label: '承認', variant: 'default' as const, icon: CheckCircle },
      download: { label: 'ダウンロード', variant: 'outline' as const, icon: Download },
      export: { label: 'エクスポート', variant: 'outline' as const, icon: Download },
      view: { label: '閲覧', variant: 'outline' as const, icon: Eye },
    }
    const badge = badges[action]
    if (!badge) return <Badge>{action}</Badge>
    return <Badge variant={badge.variant}>{badge.label}</Badge>
  }

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">監査ログ</h1>
        <p className="text-muted-foreground">
          システム内のすべての操作履歴を確認できます
        </p>
      </div>

      {/* 検索フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>検索条件</CardTitle>
          <CardDescription>期間、アクション、エンティティで検索できます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 期間（開始） */}
            <div className="space-y-2">
              <Label htmlFor="from-date">期間（開始）</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* 期間（終了） */}
            <div className="space-y-2">
              <Label htmlFor="to-date">期間（終了）</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* アクション */}
            <div className="space-y-2">
              <Label htmlFor="action">アクション</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="create">作成</SelectItem>
                  <SelectItem value="update">更新</SelectItem>
                  <SelectItem value="delete">削除</SelectItem>
                  <SelectItem value="approve">承認</SelectItem>
                  <SelectItem value="download">ダウンロード</SelectItem>
                  <SelectItem value="export">エクスポート</SelectItem>
                  <SelectItem value="view">閲覧</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* エンティティタイプ */}
            <div className="space-y-2">
              <Label htmlFor="entity-type">エンティティタイプ</Label>
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
                  <SelectItem value="journal">仕訳</SelectItem>
                  <SelectItem value="company">取引先</SelectItem>
                  <SelectItem value="fixed_asset">固定資産</SelectItem>
                </SelectContent>
              </Select>
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

      {/* 監査ログ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>監査ログ一覧</CardTitle>
          <CardDescription>{logs.length}件のログが見つかりました</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>アクション</TableHead>
                  <TableHead>エンティティ</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>IPアドレス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      検索結果がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.actor_name || '不明'}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.actor_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action as AuditAction)}
                      </TableCell>
                      <TableCell>{log.entity_type}</TableCell>
                      <TableCell>
                        <div className="truncate max-w-[200px]" title={log.entity_label || ''}>
                          {log.entity_label || log.entity_id || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{log.ip || '-'}</code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetail(log)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          詳細
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

      {/* 詳細ダイアログ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>監査ログ詳細</DialogTitle>
            <DialogDescription>操作の詳細情報と変更内容を確認できます</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>日時</Label>
                  <div className="text-sm">
                    {new Date(selectedLog.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>
                <div>
                  <Label>操作者</Label>
                  <div className="text-sm">
                    {selectedLog.actor_name} ({selectedLog.actor_email})
                  </div>
                </div>
                <div>
                  <Label>アクション</Label>
                  <div className="text-sm">
                    {getActionBadge(selectedLog.action as AuditAction)}
                  </div>
                </div>
                <div>
                  <Label>エンティティタイプ</Label>
                  <div className="text-sm">{selectedLog.entity_type}</div>
                </div>
                <div>
                  <Label>対象</Label>
                  <div className="text-sm">{selectedLog.entity_label || selectedLog.entity_id || '-'}</div>
                </div>
                <div>
                  <Label>IPアドレス</Label>
                  <div className="text-sm">
                    <code>{selectedLog.ip || '-'}</code>
                  </div>
                </div>
              </div>

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div>
                  <Label>User Agent</Label>
                  <div className="text-xs text-muted-foreground break-all">
                    {selectedLog.user_agent}
                  </div>
                </div>
              )}

              {/* 変更内容 */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <Label>変更内容</Label>
                  <div className="rounded-md bg-muted p-4 mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* 変更前 */}
              {selectedLog.before && Object.keys(selectedLog.before).length > 0 && (
                <div>
                  <Label>変更前</Label>
                  <div className="rounded-md bg-muted p-4 mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* 変更後 */}
              {selectedLog.after && Object.keys(selectedLog.after).length > 0 && (
                <div>
                  <Label>変更後</Label>
                  <div className="rounded-md bg-muted p-4 mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.after, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
