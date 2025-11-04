'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Receipt, CheckCircle2 } from 'lucide-react'

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    company_name: '',
    postal_code: '',
    address: '',
    phone: '',
    email: '',
    representative_name: '',
    representative_email: '',
    password: '',
    password_confirm: '',
    fiscal_year_end_month: 3, // デフォルト3月決算
    first_fiscal_year: new Date().getFullYear(),
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // パスワード検証
    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      setSubmitting(false)
      return
    }

    if (formData.password !== formData.password_confirm) {
      setError('パスワードが一致しません')
      setSubmitting(false)
      return
    }

    try {
      // password_confirmを除外
      const { password_confirm, ...submitData } = formData

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '申請の送信に失敗しました')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="rounded-full bg-green-100 w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-4">お申し込みありがとうございます！</h2>
            <p className="text-lg text-muted-foreground mb-6">
              お申し込みを受け付けました。
              <br />
              管理者による承認後、ご登録のメールアドレス宛に
              <br />
              ログイン情報をお送りいたします。
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              通常、1〜2営業日以内に承認が完了します。
              <br />
              しばらくお待ちください。
            </p>
            <Link href="/">
              <Button size="lg">トップページに戻る</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              請求書管理システム
            </span>
          </Link>
          <Link href="/login">
            <Button variant="outline">ログイン</Button>
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">新規お申し込み</h1>
            <p className="text-lg text-muted-foreground">
              以下のフォームに必要事項をご入力ください
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>企業情報</CardTitle>
              <CardDescription>
                登録する企業・事業所の情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 企業情報 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">
                      企業名 / 事業所名 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company_name"
                      required
                      placeholder="例: 株式会社サンプル"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">郵便番号</Label>
                      <Input
                        id="postal_code"
                        placeholder="例: 123-4567"
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData({ ...formData, postal_code: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        電話番号 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        placeholder="例: 03-1234-5678"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">所在地</Label>
                    <Input
                      id="address"
                      placeholder="例: 東京都渋谷区〇〇1-2-3"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      企業メールアドレス <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="例: info@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fiscal_year_end_month">
                        決算月 <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.fiscal_year_end_month.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, fiscal_year_end_month: parseInt(value) })
                        }
                      >
                        <SelectTrigger id="fiscal_year_end_month">
                          <SelectValue placeholder="決算月を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {month}月
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="first_fiscal_year">
                        会計年度 <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.first_fiscal_year.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, first_fiscal_year: parseInt(value) })
                        }
                      >
                        <SelectTrigger id="first_fiscal_year">
                          <SelectValue placeholder="会計年度を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}年度
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    ※ 決算月と会計年度を選択してください（例: 3月決算の場合は3月を選択）
                  </p>
                </div>

                {/* 代表者情報 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">代表者情報</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="representative_name">
                        代表者氏名 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="representative_name"
                        required
                        placeholder="例: 山田 太郎"
                        value={formData.representative_name}
                        onChange={(e) =>
                          setFormData({ ...formData, representative_name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="representative_email">
                        代表者メールアドレス <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="representative_email"
                        type="email"
                        required
                        placeholder="例: yamada@example.com"
                        value={formData.representative_email}
                        onChange={(e) =>
                          setFormData({ ...formData, representative_email: e.target.value })
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        ※ このメールアドレスがログインIDになります
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">
                        パスワード <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        placeholder="8文字以上"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        minLength={8}
                      />
                      <p className="text-sm text-muted-foreground">
                        ※ 8文字以上で設定してください
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password_confirm">
                        パスワード（確認） <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="password_confirm"
                        type="password"
                        required
                        placeholder="もう一度入力してください"
                        value={formData.password_confirm}
                        onChange={(e) =>
                          setFormData({ ...formData, password_confirm: e.target.value })
                        }
                        minLength={8}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
                  <p className="font-medium mb-1">ご注意</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>お申し込み後、管理者による承認が必要です</li>
                    <li>承認完了後、ログイン情報をメールでお送りします</li>
                    <li>通常1〜2営業日以内に承認が完了します</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? '送信中...' : '申し込む'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="text-primary hover:underline">
                こちらからログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
