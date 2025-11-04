'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TenantApplication } from '@/types/tenant-application'
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<TenantApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedApp, setSelectedApp] = useState<TenantApplication | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showLoginInfoDialog, setShowLoginInfoDialog] = useState(false)
  const [loginInfo, setLoginInfo] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const url =
        filter === 'all'
          ? '/api/applications'
          : `/api/applications?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filter])

  const handleApprove = async () => {
    if (!selectedApp) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/applications/${selectedApp.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '承認に失敗しました')
      }

      // ログイン情報を保存してダイアログを表示
      setLoginInfo(data.login_info)
      setShowApproveDialog(false)
      setShowLoginInfoDialog(true)
      setSelectedApp(null)
      setNotes('')
      fetchApplications()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedApp) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/applications/${selectedApp.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '却下に失敗しました')
      }

      alert('申請を却下しました。')
      setShowRejectDialog(false)
      setSelectedApp(null)
      setNotes('')
      fetchApplications()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            承認待ち
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            承認済み
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            却下
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">申請管理</h1>
        <p className="text-muted-foreground">企業登録申請の承認・却下を行います</p>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          承認待ち
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => setFilter('approved')}
        >
          承認済み
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
        >
          却下
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          すべて
        </Button>
      </div>

      {/* 申請一覧 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>申請がありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{app.company_name}</CardTitle>
                    <CardDescription>
                      申請日: {new Date(app.created_at).toLocaleDateString('ja-JP')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">企業情報</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">電話:</span> {app.phone}
                      </p>
                      <p>
                        <span className="font-medium">メール:</span> {app.email}
                      </p>
                      {app.postal_code && (
                        <p>
                          <span className="font-medium">郵便番号:</span> {app.postal_code}
                        </p>
                      )}
                      {app.address && (
                        <p>
                          <span className="font-medium">所在地:</span> {app.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">代表者情報</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">氏名:</span> {app.representative_name}
                      </p>
                      <p>
                        <span className="font-medium">メール:</span> {app.representative_email}
                      </p>
                    </div>
                  </div>
                </div>

                {app.notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">メモ</p>
                    <p className="text-sm bg-muted p-2 rounded">{app.notes}</p>
                  </div>
                )}

                {app.status === 'approved' && app.approved_at && (
                  <div className="text-sm text-muted-foreground">
                    承認日時: {new Date(app.approved_at).toLocaleString('ja-JP')}
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedApp(app)
                        setNotes('')
                        setShowApproveDialog(true)
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      承認
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedApp(app)
                        setNotes('')
                        setShowRejectDialog(true)
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      却下
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 承認ダイアログ */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申請を承認</DialogTitle>
            <DialogDescription>
              この申請を承認すると、企業とユーザーアカウントが自動作成され、申請者にメールが送信されます。
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedApp.company_name}</p>
                <p className="text-sm text-muted-foreground">
                  代表者: {selectedApp.representative_name} ({selectedApp.representative_email})
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approve-notes">メモ（任意）</Label>
                <Textarea
                  id="approve-notes"
                  placeholder="承認に関するメモを入力..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? '処理中...' : '承認する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 却下ダイアログ */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申請を却下</DialogTitle>
            <DialogDescription>
              この申請を却下します。申請者にメール通知は送信されません。
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedApp.company_name}</p>
                <p className="text-sm text-muted-foreground">
                  代表者: {selectedApp.representative_name} ({selectedApp.representative_email})
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reject-notes">却下理由（任意）</Label>
                <Textarea
                  id="reject-notes"
                  placeholder="却下理由を入力..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? '処理中...' : '却下する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ログイン情報ダイアログ */}
      <Dialog open={showLoginInfoDialog} onOpenChange={setShowLoginInfoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              承認完了
            </DialogTitle>
            <DialogDescription>
              申請が承認され、企業とユーザーアカウントが作成されました。
            </DialogDescription>
          </DialogHeader>

          {loginInfo && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 mb-3">
                  以下のログイン情報を申請者にお伝えください
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-green-200">
                    <span className="text-sm text-green-700">企業名:</span>
                    <span className="text-sm font-medium text-green-900">
                      {loginInfo.company_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-green-200">
                    <span className="text-sm text-green-700">代表者:</span>
                    <span className="text-sm font-medium text-green-900">
                      {loginInfo.representative_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-green-200">
                    <span className="text-sm text-green-700">企業コード:</span>
                    <span className="text-lg font-bold text-green-900">
                      {loginInfo.company_code}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-green-700">メールアドレス:</span>
                    <span className="text-sm font-medium text-green-900">
                      {loginInfo.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>パスワード:</strong> 申請時に設定されたパスワード
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  ※ セキュリティのため、パスワードは表示されません
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLoginInfoDialog(false)
                setLoginInfo(null)
              }}
              className="flex-1"
            >
              閉じる
            </Button>
            <Button
              onClick={() => {
                window.open('/login', '_blank')
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              ログインページを開く
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
