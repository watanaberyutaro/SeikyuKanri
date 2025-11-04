import Link from 'next/link'
import { Receipt } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* ヘッダー */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Receipt className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              請求書管理システム
            </span>
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex items-center justify-center p-4 pt-12">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="w-full max-w-md relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
