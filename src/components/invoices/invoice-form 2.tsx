'use client'

import { useState } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

type InvoiceFormProps = {
  companies: Array<{ id: string; name: string }>
  initialData?: {
    company_id: string
    invoice_number: string
    title: string
    issue_date: string
    due_date?: string
    payment_date?: string
    status: 'pending' | 'sent' | 'paid'
    notes?: string
    terms?: string
    items: InvoiceItem[]
  }
  onSubmit: (data: any) => Promise<void>
  loading: boolean
}

export function InvoiceForm({ companies, initialData, onSubmit, loading }: InvoiceFormProps) {
  const [companyId, setCompanyId] = useState(initialData?.company_id || '')
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_number || '')
  const [title, setTitle] = useState(initialData?.title || '')
  const [issueDate, setIssueDate] = useState(initialData?.issue_date || '')
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [paymentDate, setPaymentDate] = useState(initialData?.payment_date || '')
  const [status, setStatus] = useState<'pending' | 'sent' | 'paid'>(initialData?.status || 'pending')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [terms, setTerms] = useState(initialData?.terms || '')
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items || [{ description: '', quantity: 1, unit_price: 0, amount: 0 }]
  )

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // 数量または単価が変更された場合、金額を再計算
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price
    }

    setItems(newItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTax = () => {
    return Math.floor(calculateSubtotal() * 0.1)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSubmit({
      company_id: companyId,
      invoice_number: invoiceNumber,
      title,
      issue_date: issueDate,
      due_date: dueDate || undefined,
      payment_date: paymentDate || undefined,
      status,
      notes: notes || undefined,
      terms: terms || undefined,
      items: items.filter((item) => item.description),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_id">請求先企業 *</Label>
              <Select value={companyId} onValueChange={setCompanyId} required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="企業を選択" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_number">請求書番号 *</Label>
              <Input
                id="invoice_number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                disabled={loading}
                placeholder="INV-2025-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">件名 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              placeholder="2025年1月分業務委託費"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">発行日 *</Label>
              <Input
                id="issue_date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">支払期限</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">ステータス *</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">送付待ち</SelectItem>
                  <SelectItem value="sent">送付済み</SelectItem>
                  <SelectItem value="paid">入金済み</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === 'paid' && (
            <div className="space-y-2">
              <Label htmlFor="payment_date">入金日</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>明細</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={loading}>
            + 明細追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="品目・内容"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="w-24 space-y-2">
                <Input
                  type="number"
                  placeholder="数量"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                  disabled={loading}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="w-32 space-y-2">
                <Input
                  type="number"
                  placeholder="単価"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                  disabled={loading}
                  min="0"
                />
              </div>
              <div className="w-32 space-y-2">
                <Input value={`¥${item.amount.toLocaleString()}`} disabled />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeItem(index)}
                disabled={loading || items.length === 1}
              >
                削除
              </Button>
            </div>
          ))}

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">小計:</span>
                  <span className="font-medium">¥{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">消費税(10%):</span>
                  <span className="font-medium">¥{calculateTax().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>合計:</span>
                  <span>¥{calculateTotal().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>その他</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">備考</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="その他のメモ..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">支払条件</Label>
            <Textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="振込手数料はご負担ください..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  )
}
