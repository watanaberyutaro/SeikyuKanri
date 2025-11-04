'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PaymentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId?: string
  invoiceNumber?: string
  remainingBalance?: number
  onSuccess?: () => void
}

export function PaymentModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  remainingBalance = 0,
  onSuccess,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const receivedOn = formData.get('received_on') as string
    const amount = parseFloat(formData.get('amount') as string)
    const method = formData.get('method') as string
    const memo = formData.get('memo') as string

    try {
      // 入金を登録
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received_on: receivedOn,
          amount,
          method,
          memo,
        }),
      })

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || '入金登録に失敗しました')
      }

      // 請求書への配分を登録
      if (invoiceId && amount > 0) {
        const allocationResponse = await fetch('/api/allocations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_id: paymentData.payment.id,
            invoice_id: invoiceId,
            allocated_amount: Math.min(amount, remainingBalance),
          }),
        })

        const allocationData = await allocationResponse.json()

        if (!allocationResponse.ok) {
          throw new Error(allocationData.error || '配分登録に失敗しました')
        }
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()

      // フォームをリセット
      e.currentTarget.reset()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>入金登録</DialogTitle>
            <DialogDescription>
              {invoiceNumber ? `請求書: ${invoiceNumber}` : '入金情報を入力してください'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="received_on">入金日 *</Label>
              <Input
                id="received_on"
                name="received_on"
                type="date"
                required
                disabled={loading}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">入金額 *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                disabled={loading}
                defaultValue={remainingBalance > 0 ? remainingBalance : ''}
                placeholder="0"
              />
              {remainingBalance > 0 && (
                <p className="text-xs text-muted-foreground">
                  残高: ¥{remainingBalance.toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">入金方法</Label>
              <Select name="method" disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">銀行振込</SelectItem>
                  <SelectItem value="cash">現金</SelectItem>
                  <SelectItem value="credit_card">クレジットカード</SelectItem>
                  <SelectItem value="check">小切手</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">メモ</Label>
              <Textarea
                id="memo"
                name="memo"
                disabled={loading}
                placeholder="入金に関するメモ"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '登録中...' : '登録'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
