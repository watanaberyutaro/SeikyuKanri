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

type QuoteItem = {
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

type QuoteFormProps = {
  companies: Array<{ id: string; name: string }>
  initialData?: {
    company_id: string
    quote_number: string
    title: string
    issue_date: string
    expiry_date?: string
    notes?: string
    terms?: string
    items: QuoteItem[]
  }
  onSubmit: (data: any) => Promise<void>
  onCreateCompany?: (companyData: {
    name: string
    postal_code?: string
    address?: string
    contact_person?: string
    phone?: string
    email?: string
  }) => Promise<{ id: string; name: string }>
  loading: boolean
}

export function QuoteForm({ companies, initialData, onSubmit, loading }: QuoteFormProps) {
  const [companyId, setCompanyId] = useState(initialData?.company_id || '')
  const [quoteNumber, setQuoteNumber] = useState(initialData?.quote_number || '')
  const [title, setTitle] = useState(initialData?.title || '')
  const [issueDate, setIssueDate] = useState(initialData?.issue_date || '')
  const [expiryDate, setExpiryDate] = useState(initialData?.expiry_date || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [terms, setTerms] = useState(initialData?.terms || '')
  const [items, setItems] = useState<QuoteItem[]>(
    initialData?.items || [{ description: '', quantity: 1, unit_price: 0, amount: 0 }]
  )

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

  const addItem = () => {
    // デフォルトで10%の税率を選択
    const defaultTaxRate = taxRates.find(tr => tr.rate === 10)
    setItems([...items, {
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
      tax_rate_id: defaultTaxRate?.id || ''
    }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSubmit({
      company_id: companyId,
      quote_number: quoteNumber,
      title,
      issue_date: issueDate,
      expiry_date: expiryDate || undefined,
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
              <Label htmlFor="company_id">見積先企業 *</Label>
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
              <Label htmlFor="quote_number">見積書番号 *</Label>
              <Input
                id="quote_number"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                required
                disabled={loading}
                placeholder="QUO-2025-001"
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
              placeholder="Webサイト制作のお見積り"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="expiry_date">有効期限</Label>
              <Input
                id="expiry_date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
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
            <div key={index} className="space-y-2">
              <div className="flex gap-2 items-start">
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
                <div className="w-40 space-y-2">
                  <Select
                    value={item.tax_rate_id}
                    onValueChange={(value) => updateItem(index, 'tax_rate_id', value)}
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
            <Label htmlFor="terms">取引条件</Label>
            <Textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="見積有効期限: 発行日より30日間..."
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
