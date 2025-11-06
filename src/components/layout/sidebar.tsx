'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signout } from '@/app/(auth)/actions'
import { LayoutDashboard, Building2, FileText, Receipt, LogOut, Shield, DollarSign, TrendingUp, Calculator, ChevronDown, ChevronRight, Briefcase, BookOpen, Settings, BarChart3, PieChart, ClipboardCheck, Wallet, Plus, CreditCard, Package, FileSearch, ClipboardList, Menu, X, Upload, Link as LinkIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Feature flags
const arFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_AR_MANAGEMENT === '1'
const apFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_AP === '1'
const expensesFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_EXPENSES === '1'
const accountingFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_ACCOUNTING_CORE === '1'
const reportsFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_REPORTS === '1'
const fixedAssetsFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_FIXED_ASSETS === '1'
const edocFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_EDOC === '1'
const auditFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_AUDIT === '1'
const bankImportFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_BANK_IMPORT === '1'
const bankApiFeatureEnabled = process.env.NEXT_PUBLIC_FEATURE_BANK_API === '1'

// ナビゲーション構造（階層化）
const navigationStructure = [
  {
    section: 'home',
    title: 'ホーム',
    items: [
      { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'accounting-operations',
    title: '経理',
    icon: Briefcase,
    subsections: [
      {
        title: '請求・入金',
        items: [
          { name: '企業管理', href: '/companies', icon: Building2 },
          { name: '見積書', href: '/quotes', icon: FileText },
          { name: '請求書', href: '/invoices', icon: Receipt },
          ...(arFeatureEnabled ? [
            { name: '売掛管理', href: '/ar/receivables', icon: DollarSign },
          ] : []),
        ],
      },
      {
        title: '経費精算',
        items: [
          ...(expensesFeatureEnabled ? [
            { name: '経費一覧', href: '/expenses/claims', icon: Wallet },
            { name: '新規経費申請', href: '/expenses/claims/new', icon: Plus },
            { name: '経費カテゴリ', href: '/expenses/categories', icon: Receipt },
          ] : []),
        ],
      },
      {
        title: '発注・支払',
        items: [
          ...(apFeatureEnabled ? [
            { name: '買掛管理', href: '/ap/bills', icon: TrendingUp },
          ] : []),
        ],
      },
    ],
  },
  {
    section: 'accounting-core',
    title: '会計',
    icon: BookOpen,
    enabled: accountingFeatureEnabled,
    subsections: [
      {
        title: '取引入力',
        items: [
          { name: '未承認仕訳', href: '/accounting/banks', icon: FileText },
          { name: '仕訳帳', href: '/accounting/journals', icon: FileText },
          ...(bankImportFeatureEnabled ? [
            { name: '銀行インポート', href: '/bank/import', icon: Upload },
          ] : []),
          ...(bankApiFeatureEnabled ? [
            { name: '銀行API連携', href: '/bank-api/connections', icon: LinkIcon },
          ] : []),
        ],
      },
      {
        title: '会計帳簿',
        items: [
          { name: '勘定科目', href: '/accounting/accounts', icon: Calculator },
          { name: '税率', href: '/accounting/tax-rates', icon: Receipt },
        ],
      },
      {
        title: '固定資産',
        items: [
          ...(fixedAssetsFeatureEnabled ? [
            { name: '固定資産台帳', href: '/assets', icon: Package },
          ] : []),
        ],
      },
      {
        title: '分析・レポート',
        items: [
          ...(reportsFeatureEnabled ? [
            { name: '総勘定元帳', href: '/reports/gl', icon: FileText },
            { name: '試算表', href: '/reports/tb', icon: BarChart3 },
            { name: '貸借対照表・損益計算書', href: '/reports/bspl', icon: PieChart },
            { name: '消費税レポート', href: '/reports/vat', icon: Receipt },
          ] : []),
        ],
      },
      {
        title: '決算申告',
        items: [
          { name: '会計期間', href: '/accounting/periods', icon: TrendingUp },
        ],
      },
      {
        title: 'コンプライアンス',
        items: [
          ...(edocFeatureEnabled ? [
            { name: '電子帳簿検索', href: '/edoc', icon: FileSearch },
          ] : []),
          ...(auditFeatureEnabled ? [
            { name: '監査ログ', href: '/audit', icon: ClipboardList },
          ] : []),
        ],
      },
    ],
  },
  {
    section: 'settings',
    title: '設定',
    items: [
      { name: '設定', href: '/settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['accounting-operations', 'accounting-core'])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  return (
    <>
      {/* モバイルメニューボタン */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md border"
        aria-label="メニュー"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* オーバーレイ（モバイルのみ） */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r shadow-sm flex flex-col z-40 transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* ロゴエリア */}
        <div className="p-6 border-b">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Receipt className="h-6 w-6 text-primary" />
            請求書管理
          </Link>
        </div>

      {/* ナビゲーションエリア */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {!isAdmin ? (
          <>
            {navigationStructure.map((section) => {
              // Feature flagのチェック
              if (section.enabled === false) return null

              // ホームと設定セクション（階層なし）
              if (section.section === 'home' || section.section === 'settings') {
                return section.items?.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })
              }

              // 階層構造のあるセクション（経理・会計）
              const isExpanded = expandedSections.includes(section.section)
              const SectionIcon = section.icon

              return (
                <div key={section.section} className="space-y-1">
                  <button
                    onClick={() => toggleSection(section.section)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold text-foreground hover:bg-accent transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {SectionIcon && <SectionIcon className="h-5 w-5" />}
                      {section.title}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && section.subsections && (
                    <div className="ml-2 space-y-1">
                      {section.subsections
                        .filter((subsection) => subsection.items.length > 0)
                        .map((subsection) => (
                        <div key={subsection.title} className="space-y-1">
                          <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {subsection.title}
                            </p>
                          </div>
                          {subsection.items.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                            const Icon = item.icon
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`}
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                <Icon className="h-4 w-4" />
                                {item.name}
                              </Link>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        ) : (
          <div className="space-y-1">
            <Link
              href="/admin/applications"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin/applications'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-600 hover:bg-amber-50 border border-amber-200'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <ClipboardCheck className="h-5 w-5" />
              申請管理
            </Link>
            <Link
              href="/admin/tenants"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin/tenants'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-600 hover:bg-amber-50 border border-amber-200'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Shield className="h-5 w-5" />
              企業コード管理
            </Link>
          </div>
        )}
      </nav>

      {/* フッターエリア */}
      <div className="p-4 border-t space-y-3">
        {companyName && !isAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-primary truncate">{companyName}</span>
          </div>
        )}
        {isAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg border border-amber-200">
            <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-600">システム管理者</span>
          </div>
        )}
        <form action={signout}>
          <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            ログアウト
          </Button>
        </form>
      </div>
    </aside>
    </>
  )
}
