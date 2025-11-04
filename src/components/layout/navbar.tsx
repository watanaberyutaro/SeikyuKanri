'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signout } from '@/app/(auth)/actions'
import { LayoutDashboard, Building2, FileText, Receipt, LogOut, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: '企業管理', href: '/companies', icon: Building2 },
  { name: '請求書', href: '/invoices', icon: Receipt },
  { name: '見積書', href: '/quotes', icon: FileText },
]

export function Navbar() {
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function fetchCompanyName() {
      const supabase = createClient()

      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // プロフィールからtenant_idとis_adminを取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, is_admin')
        .eq('id', user.id)
        .single()

      if (!profile) return

      // 管理者フラグを設定
      setIsAdmin(profile.is_admin || false)

      // テナント情報を取得
      if (profile.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('company_name')
          .eq('id', profile.tenant_id)
          .single()

        if (tenant) {
          setCompanyName(tenant.company_name)
        }
      }
    }

    fetchCompanyName()
  }, [])

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                <Receipt className="h-6 w-6 text-primary" />
                請求書管理
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              {!isAdmin && navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
              {isAdmin && (
                <Link
                  href="/admin/tenants"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname?.startsWith('/admin')
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-amber-600 hover:bg-amber-50 border border-amber-200'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  企業コード管理
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {companyName && !isAdmin && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{companyName}</span>
              </div>
            )}
            {isAdmin && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-200">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">システム管理者</span>
              </div>
            )}
            <form action={signout}>
              <Button type="submit" variant="ghost" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
