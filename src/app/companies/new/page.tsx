'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createCompany } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewCompanyPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await createCompany(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">新規企業登録</h1>
          <p className="text-gray-600 mt-1">企業情報を入力してください</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/companies">戻る</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>企業情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">企業名 *</Label>
              <Input
                id="name"
                name="name"
                required
                disabled={loading}
                placeholder="株式会社サンプル"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">郵便番号</Label>
              <Input
                id="postal_code"
                name="postal_code"
                disabled={loading}
                placeholder="123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">住所</Label>
              <Input
                id="address"
                name="address"
                disabled={loading}
                placeholder="東京都渋谷区..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  name="phone"
                  disabled={loading}
                  placeholder="03-1234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  disabled={loading}
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">担当者名</Label>
              <Input
                id="contact_person"
                name="contact_person"
                disabled={loading}
                placeholder="山田 太郎"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                name="notes"
                disabled={loading}
                placeholder="その他のメモ..."
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" disabled={loading} asChild>
                <Link href="/companies">
                  キャンセル
                </Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? '登録中...' : '登録'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
