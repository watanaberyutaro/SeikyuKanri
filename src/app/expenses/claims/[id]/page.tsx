'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Send, CheckCircle2, XCircle, DollarSign, Trash2, Eye, FileText } from 'lucide-react'
import { ExpenseClaimWithDetails, ExpenseClaimStatus } from '@/types/expense'
import Image from 'next/image'

export default function ExpenseClaimDetailPage() {
  const router = useRouter()
  const params = useParams()
  const claimId = params.id as string

  const [claim, setClaim] = useState<ExpenseClaimWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // ダイアログステート
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showReimburseDialog, setShowReimburseDialog] = useState(false)
  const [comment, setComment] = useState('')

  // 画像表示用ダイアログ
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)

  useEffect(() => {
    fetchClaim()
  }, [claimId])

  const fetchClaim = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/expenses/claims?id=${claimId}`)
      const data = await response.json()

      if (response.ok && data.claims && data.claims.length > 0) {
        setClaim(data.claims[0])
      }
    } catch (error) {
      console.error('Failed to fetch claim:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/expenses/claims/${claimId}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '提出に失敗しました')
      }

      alert('経費申請を提出しました')
      setShowSubmitDialog(false)
      fetchClaim()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/expenses/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '承認に失敗しました')
      }

      alert('経費申請を承認しました')
      setShowApproveDialog(false)
      setComment('')
      fetchClaim()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/expenses/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '却下に失敗しました')
      }

      alert('経費申請を却下しました')
      setShowRejectDialog(false)
      setComment('')
      fetchClaim()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReimburse = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/expenses/claims/${claimId}/reimburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentDate: new Date().toISOString().split('T')[0] }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '精算に失敗しました')
      }

      const data = await response.json()
      alert(data.message || '経費を精算しました')
      setShowReimburseDialog(false)
      fetchClaim()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewImage = (url: string) => {
    setSelectedImage(url)
    setImageDialogOpen(true)
  }

  const getStatusBadge = (status: ExpenseClaimStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">下書き</Badge>
      case 'submitted':
        return <Badge className="bg-blue-600">申請済み</Badge>
      case 'approved':
        return <Badge className="bg-green-600">承認済み</Badge>
      case 'reimbursed':
        return <Badge className="bg-purple-600">精算済み</Badge>
      case 'rejected':
        return <Badge variant="destructive">却下</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12 text-muted-foreground">申請が見つかりません</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">経費申請詳細</h1>
            <p className="text-muted-foreground">
              申請日: {claim.submit_date ? new Date(claim.submit_date).toLocaleDateString('ja-JP') : '未提出'}
            </p>
          </div>
          {getStatusBadge(claim.status)}
        </div>
      </div>

      {/* 申請情報 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>申請情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">申請者</span>
            <span className="font-medium">{claim.employee_email || '不明'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">合計金額</span>
            <span className="text-2xl font-bold">¥{claim.total_amount.toLocaleString()}</span>
          </div>
          {claim.notes && (
            <div>
              <span className="text-sm text-muted-foreground">メモ</span>
              <p className="mt-1 p-3 bg-muted rounded-md">{claim.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 経費明細 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>経費明細</CardTitle>
          <CardDescription>{claim.items?.length || 0}件の明細</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {claim.items && claim.items.length > 0 ? (
              claim.items.map((item: any, index: number) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{item.merchant}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.spent_on).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <span className="text-lg font-bold">¥{parseFloat(item.amount).toLocaleString()}</span>
                  </div>

                  {item.description && (
                    <p className="text-sm mb-2">{item.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    {item.category && (
                      <div>
                        <span className="font-medium">カテゴリ:</span> {item.category.name}
                      </div>
                    )}
                    {item.account && (
                      <div>
                        <span className="font-medium">勘定科目:</span> {item.account.code} - {item.account.name}
                      </div>
                    )}
                    {item.tax_rate && (
                      <div>
                        <span className="font-medium">税区分:</span> {item.tax_rate.name}
                      </div>
                    )}
                  </div>

                  {item.attachment_url && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewImage(item.attachment_url)}
                        className="text-xs"
                      >
                        {item.attachment_url.toLowerCase().endsWith('.pdf') ? (
                          <>
                            <FileText className="h-3 w-3 mr-1" />
                            PDF閲覧
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            領収書を見る
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">明細がありません</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 承認履歴 */}
      {claim.approvals && claim.approvals.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>承認履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {claim.approvals.map((approval: any) => (
                <div key={approval.id} className="border-l-2 border-primary pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{approval.approver?.email || '不明'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(approval.decided_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <Badge variant={approval.status === 'approved' ? 'default' : 'destructive'}>
                      {approval.status === 'approved' ? '承認' : '却下'}
                    </Badge>
                  </div>
                  {approval.comment && (
                    <p className="text-sm mt-2 text-muted-foreground">{approval.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 justify-end">
        {claim.status === 'draft' && (
          <Button onClick={() => setShowSubmitDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            申請する
          </Button>
        )}

        {claim.status === 'submitted' && (
          <>
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              却下
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowApproveDialog(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              承認
            </Button>
          </>
        )}

        {claim.status === 'approved' && (
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowReimburseDialog(true)}>
            <DollarSign className="h-4 w-4 mr-2" />
            精算
          </Button>
        )}
      </div>

      {/* 提出確認ダイアログ */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費申請の提出</DialogTitle>
            <DialogDescription>
              この経費申請を提出しますか？提出後は編集できなくなります。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={actionLoading}>
              提出する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 承認ダイアログ */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費申請の承認</DialogTitle>
            <DialogDescription>
              この経費申請を承認しますか？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">コメント（任意）</label>
              <Textarea
                placeholder="承認コメントを入力..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              キャンセル
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              承認する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 却下ダイアログ */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費申請の却下</DialogTitle>
            <DialogDescription>
              この経費申請を却下しますか？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">却下理由（任意）</label>
              <Textarea
                placeholder="却下理由を入力..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              却下する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 精算ダイアログ */}
      <Dialog open={showReimburseDialog} onOpenChange={setShowReimburseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費の精算</DialogTitle>
            <DialogDescription>
              この経費を精算しますか？会計コアがONの場合、仕訳が自動起票されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReimburseDialog(false)}>
              キャンセル
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleReimburse}
              disabled={actionLoading}
            >
              精算する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 画像表示ダイアログ */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>領収書</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full">
              {selectedImage.toLowerCase().endsWith('.pdf') ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">PDFファイルです</p>
                  <Button
                    onClick={() => window.open(selectedImage, '_blank')}
                    variant="outline"
                  >
                    新しいタブで開く
                  </Button>
                </div>
              ) : (
                <div className="relative w-full h-auto">
                  <Image
                    src={selectedImage}
                    alt="領収書"
                    width={800}
                    height={600}
                    className="w-full h-auto object-contain rounded-lg"
                    unoptimized
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
