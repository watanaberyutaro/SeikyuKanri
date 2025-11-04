'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Upload, ArrowLeft, Save, Send, Loader2, X, Eye } from 'lucide-react'
import { ExpenseCategory } from '@/types/expense'
import Image from 'next/image'

type ExpenseItemForm = {
  id?: string
  spent_on: string
  merchant: string
  description: string
  amount: string
  tax_rate_id: string
  account_id: string
  category_id: string
  attachment_url: string
  attachment_file_name?: string
}

export default function NewExpenseClaimPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ExpenseItemForm[]>([
    {
      spent_on: new Date().toISOString().split('T')[0],
      merchant: '',
      description: '',
      amount: '',
      tax_rate_id: '',
      account_id: '',
      category_id: '',
      attachment_url: '',
      attachment_file_name: '',
    },
  ])

  // マスタデータ
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [taxRates, setTaxRates] = useState<any[]>([])

  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      const [categoriesRes, accountsRes, taxRatesRes] = await Promise.all([
        fetch('/api/expenses/categories'),
        fetch('/api/accounts'),
        fetch('/api/tax-rates'),
      ])

      const [categoriesData, accountsData, taxRatesData] = await Promise.all([
        categoriesRes.json(),
        accountsRes.json(),
        taxRatesRes.json(),
      ])

      setCategories(categoriesData.categories || [])
      setAccounts(accountsData.accounts || [])
      setTaxRates(taxRatesData.taxRates || [])
    } catch (error) {
      console.error('Failed to fetch master data:', error)
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        spent_on: new Date().toISOString().split('T')[0],
        merchant: '',
        description: '',
        amount: '',
        tax_rate_id: '',
        account_id: '',
        category_id: '',
        attachment_url: '',
        attachment_file_name: '',
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleFileUpload = async (index: number, file: File | null) => {
    if (!file) return

    setUploadingIndex(index)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/expenses/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      // アップロード成功
      const newItems = [...items]
      newItems[index].attachment_url = data.url
      newItems[index].attachment_file_name = data.fileName
      setItems(newItems)
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'アップロードに失敗しました')
    } finally {
      setUploadingIndex(null)
    }
  }

  const removeAttachment = (index: number) => {
    const newItems = [...items]
    newItems[index].attachment_url = ''
    newItems[index].attachment_file_name = ''
    setItems(newItems)
  }

  const updateItem = (index: number, field: keyof ExpenseItemForm, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // カテゴリ選択時にデフォルトの勘定科目と税率を設定
    if (field === 'category_id' && value) {
      const category = categories.find((c) => c.id === value)
      if (category) {
        if (category.default_account_id) {
          newItems[index].account_id = category.default_account_id
        }
        if (category.tax_rate_id) {
          newItems[index].tax_rate_id = category.tax_rate_id
        }
      }
    }

    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  }

  const handleSaveDraft = async () => {
    await saveClaim('draft')
  }

  const handleSubmit = async () => {
    await saveClaim('submit')
  }

  const saveClaim = async (action: 'draft' | 'submit') => {
    setLoading(true)
    try {
      // バリデーション
      if (action === 'submit') {
        if (items.length === 0 || !items[0].merchant) {
          alert('明細を1件以上追加してください')
          setLoading(false)
          return
        }

        for (const item of items) {
          if (!item.spent_on || !item.merchant || !item.amount) {
            alert('すべての明細の必須項目を入力してください')
            setLoading(false)
            return
          }
        }
      }

      // 申請を作成
      const claimResponse = await fetch('/api/expenses/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!claimResponse.ok) {
        throw new Error('申請の作成に失敗しました')
      }

      const { claim } = await claimResponse.json()

      // 明細を作成
      for (const item of items) {
        if (!item.merchant || !item.amount) continue

        await fetch('/api/expenses/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claim_id: claim.id,
            spent_on: item.spent_on,
            merchant: item.merchant,
            description: item.description || null,
            amount: parseFloat(item.amount),
            tax_rate_id: item.tax_rate_id || null,
            account_id: item.account_id || null,
            category_id: item.category_id || null,
            attachment_url: item.attachment_url || null,
          }),
        })
      }

      // 提出する場合はステータスを更新
      if (action === 'submit') {
        await fetch(`/api/expenses/claims/${claim.id}/submit`, {
          method: 'POST',
        })
      }

      alert(action === 'submit' ? '経費申請を提出しました' : '下書きを保存しました')
      router.push('/expenses/claims')
    } catch (error: any) {
      console.error('Save claim error:', error)
      alert(error.message || '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-3xl font-bold mb-2">新規経費申請</h1>
        <p className="text-muted-foreground">経費の明細を入力して申請してください</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>申請情報</CardTitle>
          <CardDescription>経費申請全体に関するメモを入力できます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">メモ（任意）</Label>
            <Textarea
              id="notes"
              placeholder="例: 2024年1月分の出張経費"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>経費明細</CardTitle>
              <CardDescription>領収書ごとに明細を追加してください</CardDescription>
            </div>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              明細追加
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 relative">
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`spent_on_${index}`}>
                    支払日 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`spent_on_${index}`}
                    type="date"
                    value={item.spent_on}
                    onChange={(e) => updateItem(index, 'spent_on', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`merchant_${index}`}>
                    支払先 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`merchant_${index}`}
                    placeholder="例: JR東日本"
                    value={item.merchant}
                    onChange={(e) => updateItem(index, 'merchant', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`amount_${index}`}>
                    金額 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`amount_${index}`}
                    type="number"
                    placeholder="0"
                    value={item.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`category_${index}`}>カテゴリ</Label>
                  <Select
                    value={item.category_id}
                    onValueChange={(value) => updateItem(index, 'category_id', value)}
                  >
                    <SelectTrigger id={`category_${index}`}>
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`account_${index}`}>勘定科目</Label>
                  <Select
                    value={item.account_id}
                    onValueChange={(value) => updateItem(index, 'account_id', value)}
                  >
                    <SelectTrigger id={`account_${index}`}>
                      <SelectValue placeholder="勘定科目を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.type === 'expense')
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`tax_rate_${index}`}>税区分</Label>
                  <Select
                    value={item.tax_rate_id}
                    onValueChange={(value) => updateItem(index, 'tax_rate_id', value)}
                  >
                    <SelectTrigger id={`tax_rate_${index}`}>
                      <SelectValue placeholder="税区分を選択" />
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

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor={`description_${index}`}>摘要</Label>
                  <Input
                    id={`description_${index}`}
                    placeholder="例: 東京駅→大阪駅"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor={`attachment_${index}`}>領収書・レシート</Label>

                  {!item.attachment_url ? (
                    <>
                      <div className="flex gap-2">
                        <Input
                          id={`attachment_${index}`}
                          type="file"
                          accept="image/*,application/pdf"
                          className="flex-1"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileUpload(index, file)
                            }
                          }}
                          disabled={uploadingIndex === index}
                        />
                        {uploadingIndex === index && (
                          <Button variant="outline" disabled>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            アップロード中...
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        JPG、PNG、GIF、WEBP、PDFファイルをアップロードできます（最大10MB）
                      </p>
                    </>
                  ) : (
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {item.attachment_url.toLowerCase().endsWith('.pdf') ? (
                              <div className="h-10 w-10 bg-red-100 rounded flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600">PDF</span>
                              </div>
                            ) : (
                              <div className="relative h-10 w-10 rounded overflow-hidden bg-gray-100">
                                <Image
                                  src={item.attachment_url}
                                  alt="領収書"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.attachment_file_name || '領収書'}
                            </p>
                            <p className="text-xs text-muted-foreground">アップロード済み</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(item.attachment_url, '_blank')}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 合計金額 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">合計金額</span>
            <span className="text-3xl font-bold">¥{calculateTotal().toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button variant="secondary" onClick={handleSaveDraft} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          下書き保存
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Send className="h-4 w-4 mr-2" />
          申請する
        </Button>
      </div>
    </div>
  )
}
