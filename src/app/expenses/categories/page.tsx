'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Edit, FolderOpen } from 'lucide-react'
import { ExpenseCategory } from '@/types/expense'

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [taxRates, setTaxRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    default_account_id: '',
    tax_rate_id: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
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
      setTaxRates(taxRatesData.tax_rates || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!formData.name) {
      alert('カテゴリ名を入力してください')
      return
    }

    try {
      const response = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          default_account_id: formData.default_account_id || null,
          tax_rate_id: formData.tax_rate_id || null,
        }),
      })

      if (!response.ok) {
        throw new Error('カテゴリの作成に失敗しました')
      }

      alert('カテゴリを作成しました')
      setShowDialog(false)
      setFormData({ name: '', default_account_id: '', tax_rate_id: '' })
      fetchData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">経費カテゴリ管理</h1>
            <p className="text-muted-foreground">
              経費の分類を管理します（交通費、宿泊費など）
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            カテゴリ追加
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>カテゴリがありません</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4" variant="outline">
              最初のカテゴリを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category: any) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <CardDescription>
                  作成日: {new Date(category.created_at).toLocaleDateString('ja-JP')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {category.default_account && (
                    <div>
                      <span className="text-muted-foreground">デフォルト勘定科目:</span>
                      <p className="font-medium">
                        {category.default_account.code} - {category.default_account.name}
                      </p>
                    </div>
                  )}
                  {category.tax_rate && (
                    <div>
                      <span className="text-muted-foreground">デフォルト税率:</span>
                      <p className="font-medium">
                        {category.tax_rate.name} ({category.tax_rate.rate}%)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* カテゴリ作成ダイアログ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>経費カテゴリを追加</DialogTitle>
            <DialogDescription>
              新しい経費カテゴリを作成します。デフォルトの勘定科目と税率を設定できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                カテゴリ名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例: 交通費"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_account">デフォルト勘定科目（任意）</Label>
              <Select
                value={formData.default_account_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, default_account_id: value })
                }
              >
                <SelectTrigger id="default_account">
                  <SelectValue placeholder="勘定科目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.account_type === 'expense')
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                このカテゴリで経費を入力する際のデフォルト勘定科目
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_rate">デフォルト税率（任意）</Label>
              <Select
                value={formData.tax_rate_id}
                onValueChange={(value) => setFormData({ ...formData, tax_rate_id: value })}
              >
                <SelectTrigger id="tax_rate">
                  <SelectValue placeholder="税率を選択" />
                </SelectTrigger>
                <SelectContent>
                  {taxRates.map((taxRate) => (
                    <SelectItem key={taxRate.id} value={taxRate.id}>
                      {taxRate.name} ({taxRate.rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                このカテゴリで経費を入力する際のデフォルト税率
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreateCategory}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
