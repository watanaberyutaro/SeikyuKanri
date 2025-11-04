'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateInvoiceStatus } from '@/app/invoices/actions'
import { useRouter } from 'next/navigation'

const statusLabels = {
  pending: '送付待ち',
  sent: '送付済み',
  paid: '入金済み',
}

const statusColors = {
  pending: 'text-yellow-800',
  sent: 'text-blue-800',
  paid: 'text-green-800',
}

type InvoiceStatusSelectProps = {
  invoiceId: string
  currentStatus: 'pending' | 'sent' | 'paid'
}

export function InvoiceStatusSelect({ invoiceId, currentStatus }: InvoiceStatusSelectProps) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: 'pending' | 'sent' | 'paid') => {
    // 入金済みを選択した場合は、入金日入力ダイアログを表示
    if (newStatus === 'paid') {
      setShowPaymentDialog(true)
      return
    }

    // その他のステータス変更は即座に実行
    setIsUpdating(true)
    try {
      const result = await updateInvoiceStatus(invoiceId, newStatus)
      if (result?.error) {
        alert(`エラー: ${result.error}`)
        return
      }
      setStatus(newStatus)
      router.refresh()
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePaymentConfirm = async () => {
    setIsUpdating(true)
    try {
      const result = await updateInvoiceStatus(invoiceId, 'paid', paymentDate)
      if (result?.error) {
        alert(`エラー: ${result.error}`)
        return
      }
      setStatus('paid')
      setShowPaymentDialog(false)
      router.refresh()
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <Select
        value={status}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className={`w-[140px] ${statusColors[status]}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending" className="text-yellow-800">
            {statusLabels.pending}
          </SelectItem>
          <SelectItem value="sent" className="text-blue-800">
            {statusLabels.sent}
          </SelectItem>
          <SelectItem value="paid" className="text-green-800">
            {statusLabels.paid}
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入金日の入力</DialogTitle>
            <DialogDescription>
              入金済みに変更します。入金日を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">入金日</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={isUpdating}
            >
              キャンセル
            </Button>
            <Button onClick={handlePaymentConfirm} disabled={isUpdating}>
              {isUpdating ? '更新中...' : '確定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
