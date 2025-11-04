'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { resetPassword } from '../actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')

    const result = await resetPassword(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-md shadow-card-hover border-none">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">メールを送信しました</CardTitle>
              <CardDescription className="mt-2">
                パスワードリセット用のリンクをメールで送信しました。
                <br />
                メールをご確認ください。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-2">次のステップ:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>メールボックスを確認</li>
                  <li>リセットリンクをクリック</li>
                  <li>新しいパスワードを設定</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  ログインページに戻る
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md shadow-card-hover border-none">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">パスワードを忘れた方</CardTitle>
          <CardDescription>
            登録されているメールアドレスを入力してください。
            <br />
            パスワードリセット用のリンクをお送りします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="pl-10 h-11"
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  送信中...
                </span>
              ) : (
                'リセットリンクを送信'
              )}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                ログインページに戻る
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
