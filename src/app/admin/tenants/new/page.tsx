'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { createTenant } from '../actions'

export default function NewTenantPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await createTenant(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      router.push('/admin/tenants')
    }
  }

  // ランダムな企業コードを生成
  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const part2 = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('')
    return `${part1}-${part2}`
  }

  function handleGenerate() {
    const codeInput = document.getElementById('company_code') as HTMLInputElement
    if (codeInput) {
      codeInput.value = generateCode()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/admin/tenants">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">新規企業追加</h1>
          <p className="text-muted-foreground mt-1">新しいテナント企業を登録します</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>企業情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="company_code">企業コード *</Label>
              <div className="flex gap-2">
                <Input
                  id="company_code"
                  name="company_code"
                  placeholder="ABC-1234"
                  required
                  disabled={loading}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  自動生成
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ユーザーがサインアップ時に入力する企業コードです
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">企業名 *</Label>
              <Input
                id="company_name"
                name="company_name"
                placeholder="株式会社サンプル"
                required
                disabled={loading}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? '登録中...' : '企業を登録'}
              </Button>
              <Link href="/admin/tenants" className="flex-1">
                <Button type="button" variant="outline" disabled={loading} className="w-full">
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
