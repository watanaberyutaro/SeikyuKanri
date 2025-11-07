'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Copy } from 'lucide-react'

type InvoiceItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  tax_rate_id?: string
}

type TaxRate = {
  id: string
  name: string
  rate: number
}

// Sortable Item Component
function SortableInvoiceItem({
  item,
  taxRates,
  loading,
  onUpdate,
  onRemove,
  onDuplicate,
  canRemove,
}: {
  item: InvoiceItem
  taxRates: TaxRate[]
  loading: boolean
  onUpdate: (id: string, field: keyof InvoiceItem, value: string | number) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  canRemove: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-2"
    >
      <div className="flex gap-2 items-start">
        {/* Drag Handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing mt-2 text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1 space-y-2">
          <Input
            placeholder="品目・内容"
            value={item.description}
            onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="w-24 space-y-2">
          <Input
            type="number"
            placeholder="数量"
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, 'quantity', Number(e.target.value))}
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
            onChange={(e) => onUpdate(item.id, 'unit_price', Number(e.target.value))}
            disabled={loading}
            min="0"
          />
        </div>
        <div className="w-40 space-y-2">
          <Select
            value={item.tax_rate_id}
            onValueChange={(value) => onUpdate(item.id, 'tax_rate_id', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="税区分" />
            </SelectTrigger>
            <SelectContent>
              {taxRates.map((taxRate) => (
                <SelectItem key={taxRate.id} value={taxRate.id}>
                  {taxRate.name} ({taxRate.rate}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32 space-y-2">
          <Input value={`¥${item.amount.toLocaleString()}`} disabled />
        </div>

        {/* Duplicate Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDuplicate(item.id)}
          disabled={loading}
          title="この項目を複製"
        >
          <Copy className="w-4 h-4" />
        </Button>

        {/* Delete Button */}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onRemove(item.id)}
          disabled={loading || !canRemove}
        >
          削除
        </Button>
      </div>
    </div>
  )
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
  onChange?: (data: {
    company_id: string
    invoice_number: string
    title: string
    issue_date: string
    due_date?: string
    items: InvoiceItem[]
    notes?: string
    terms?: string
  }) => void
  onCreateCompany?: (companyData: {
    name: string
    postal_code?: string
    address?: string
    contact_person?: string
    phone?: string
    email?: string
  }) => Promise<{ id: string; name: string }>
  loading: boolean
  showAutoNumberButton?: boolean
}

export function InvoiceForm({ companies, initialData, onSubmit, onChange, onCreateCompany, loading, showAutoNumberButton = true }: InvoiceFormProps) {
  const [companyId, setCompanyId] = useState(initialData?.company_id || '')
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_number || '')
  const [generatingNumber, setGeneratingNumber] = useState(false)
  const [title, setTitle] = useState(initialData?.title || '')
  const [issueDate, setIssueDate] = useState(initialData?.issue_date || new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [paymentDate, setPaymentDate] = useState(initialData?.payment_date || '')
  const [status, setStatus] = useState<'pending' | 'sent' | 'paid'>(initialData?.status || 'pending')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [terms, setTerms] = useState(initialData?.terms || '')
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items.map(item => ({
      ...item,
      id: item.id || crypto.randomUUID()
    })) || [{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, amount: 0 }]
  )

  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyPostalCode, setNewCompanyPostalCode] = useState('')
  const [newCompanyAddress, setNewCompanyAddress] = useState('')
  const [newCompanyContactPerson, setNewCompanyContactPerson] = useState('')
  const [newCompanyPhone, setNewCompanyPhone] = useState('')
  const [newCompanyEmail, setNewCompanyEmail] = useState('')
  const [creatingCompany, setCreatingCompany] = useState(false)

  // 税率マスタ
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])

  // 税率マスタを取得
  useEffect(() => {
    async function fetchTaxRates() {
      try {
        const response = await fetch('/api/tax-rates')
        if (response.ok) {
          const data = await response.json()
          setTaxRates(data.taxRates || [])
        }
      } catch (error) {
        console.error('Failed to fetch tax rates:', error)
      }
    }
    fetchTaxRates()
  }, [])

  // フォームの状態が変わったときにonChangeを呼び出す
  useEffect(() => {
    if (onChange) {
      onChange({
        company_id: companyId,
        invoice_number: invoiceNumber,
        title,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        items,
        notes: notes || undefined,
        terms: terms || undefined,
      })
    }
  }, [companyId, invoiceNumber, title, issueDate, dueDate, items, notes, terms])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addItem = () => {
    // デフォルトで10%の税率を選択
    const defaultTaxRate = taxRates.find(tr => tr.rate === 10)
    setItems([...items, {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
      tax_rate_id: defaultTaxRate?.id || ''
    }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const duplicateItem = (id: string) => {
    const itemToDuplicate = items.find(item => item.id === id)
    if (itemToDuplicate) {
      const newItem = {
        ...itemToDuplicate,
        id: crypto.randomUUID()
      }
      const index = items.findIndex(item => item.id === id)
      const newItems = [...items]
      newItems.splice(index + 1, 0, newItem)
      setItems(newItems)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        // 数量または単価が変更された場合、金額を再計算
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.amount = updatedItem.quantity * updatedItem.unit_price
        }
        return updatedItem
      }
      return item
    })

    setItems(newItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTax = () => {
    return items.reduce((sum, item) => {
      const taxRate = taxRates.find(tr => tr.id === item.tax_rate_id)
      const rate = taxRate ? taxRate.rate / 100 : 0
      return sum + Math.floor(item.amount * rate)
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleGenerateNumber = async () => {
    setGeneratingNumber(true)
    try {
      const response = await fetch('/api/invoices/next-number')
      if (response.ok) {
        const { invoice_number } = await response.json()
        setInvoiceNumber(invoice_number)
      } else {
        alert('請求書番号の生成に失敗しました')
      }
    } catch (error) {
      console.error('Failed to generate invoice number:', error)
      alert('請求書番号の生成に失敗しました')
    } finally {
      setGeneratingNumber(false)
    }
  }

  const handleCreateCompany = async () => {
    if (!onCreateCompany || !newCompanyName.trim()) return

    setCreatingCompany(true)
    try {
      const newCompany = await onCreateCompany({
        name: newCompanyName.trim(),
        postal_code: newCompanyPostalCode || undefined,
        address: newCompanyAddress || undefined,
        contact_person: newCompanyContactPerson || undefined,
        phone: newCompanyPhone || undefined,
        email: newCompanyEmail || undefined,
      })

      setCompanyId(newCompany.id)
      setShowNewCompanyDialog(false)
      setNewCompanyName('')
      setNewCompanyPostalCode('')
      setNewCompanyAddress('')
      setNewCompanyContactPerson('')
      setNewCompanyPhone('')
      setNewCompanyEmail('')
    } catch (error) {
      console.error('企業作成に失敗しました:', error)
    } finally {
      setCreatingCompany(false)
    }
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
              <div className="flex gap-2">
                <Select
                  value={companyId}
                  onValueChange={(value) => {
                    if (value === "__create_new__") {
                      setShowNewCompanyDialog(true)
                    } else {
                      setCompanyId(value)
                    }
                  }}
                  required
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="企業を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {onCreateCompany && (
                      <SelectItem value="__create_new__" className="text-blue-600 font-medium">
                        + 新規企業を追加
                      </SelectItem>
                    )}
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {onCreateCompany && (
                  <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" disabled={loading}>
                        + 新規
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>新規企業追加</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new_company_name">企業名 *</Label>
                          <Input
                            id="new_company_name"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            placeholder="株式会社サンプル"
                            disabled={creatingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_company_postal_code">郵便番号</Label>
                          <Input
                            id="new_company_postal_code"
                            value={newCompanyPostalCode}
                            onChange={(e) => setNewCompanyPostalCode(e.target.value)}
                            placeholder="123-4567"
                            disabled={creatingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_company_address">住所</Label>
                          <Input
                            id="new_company_address"
                            value={newCompanyAddress}
                            onChange={(e) => setNewCompanyAddress(e.target.value)}
                            placeholder="東京都渋谷区..."
                            disabled={creatingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_company_contact_person">担当者</Label>
                          <Input
                            id="new_company_contact_person"
                            value={newCompanyContactPerson}
                            onChange={(e) => setNewCompanyContactPerson(e.target.value)}
                            placeholder="田中 太郎"
                            disabled={creatingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_company_phone">電話番号</Label>
                          <Input
                            id="new_company_phone"
                            value={newCompanyPhone}
                            onChange={(e) => setNewCompanyPhone(e.target.value)}
                            placeholder="03-1234-5678"
                            disabled={creatingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_company_email">メールアドレス</Label>
                          <Input
                            id="new_company_email"
                            type="email"
                            value={newCompanyEmail}
                            onChange={(e) => setNewCompanyEmail(e.target.value)}
                            placeholder="info@sample.co.jp"
                            disabled={creatingCompany}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewCompanyDialog(false)}
                            disabled={creatingCompany}
                          >
                            キャンセル
                          </Button>
                          <Button
                            type="button"
                            onClick={handleCreateCompany}
                            disabled={creatingCompany || !newCompanyName.trim()}
                          >
                            {creatingCompany ? '作成中...' : '作成'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_number">請求書番号 *</Label>
              <div className="flex gap-2">
                <Input
                  id="invoice_number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="INV-2025-001"
                  className="flex-1"
                />
                {showAutoNumberButton && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateNumber}
                    disabled={loading || generatingNumber}
                  >
                    {generatingNumber ? '生成中...' : '自動採番'}
                  </Button>
                )}
              </div>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableInvoiceItem
                  key={item.id}
                  item={item}
                  taxRates={taxRates}
                  loading={loading}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onDuplicate={duplicateItem}
                  canRemove={items.length > 1}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">小計:</span>
                  <span className="font-medium">¥{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">消費税:</span>
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
