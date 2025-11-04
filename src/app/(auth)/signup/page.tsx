'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Receipt, Mail, Lock, User, ArrowRight, AlertCircle, Info, Building2 } from 'lucide-react'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="space-y-3 text-center pb-6">
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Receipt className="h-10 w-10 text-primary" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          新規登録
        </CardTitle>
        <CardDescription className="text-base">
          企業コードをお持ちの方のみ登録できます
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="company_code" className="text-sm font-medium">
              企業コード
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company_code"
                name="company_code"
                type="text"
                placeholder="ABC-1234"
                className="pl-10 h-11"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              管理者から提供された企業コードを入力してください
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-sm font-medium">
              氏名
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="山田 太郎"
                className="pl-10 h-11"
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@example.com"
                className="pl-10 h-11"
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              パスワード
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                className="pl-10 h-11"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              6文字以上で入力してください
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button
            type="submit"
            className="w-full h-11 gap-2 shadow-md hover:shadow-lg transition-all"
            disabled={loading}
          >
            {loading ? (
              <>登録中...</>
            ) : (
              <>
                登録
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              ログイン
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
