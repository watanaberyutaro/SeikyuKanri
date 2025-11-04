import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // パスワードリセットの場合は reset-password ページへ
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }

      // 通常のメール確認などはダッシュボードへ
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // エラーの場合はログインページへリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
