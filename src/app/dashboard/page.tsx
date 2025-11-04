import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Receipt,
  Building2,
  Plus,
  ArrowRight,
  Wallet,
  AlertCircle,
  AlertTriangle,
  DollarSign,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { autoImportAccountsIfNeeded } from '@/app/accounting/accounts/actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 管理者チェック：管理者の場合は管理画面にリダイレクト
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, tenant_id')
      .eq('id', user.id)
      .single()

    if (profile?.is_admin) {
      redirect('/admin/tenants')
    }

    // 初回ログイン時に勘定科目を自動インポート
    if (profile?.tenant_id) {
      await autoImportAccountsIfNeeded()
    }
  }

  // 請求書の統計を取得
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status, total_amount, issue_date, due_date, invoice_number, payment_date')
    .eq('user_id', user?.id!)

  const pendingCount = invoices?.filter((i) => i.status === 'pending').length || 0
  const sentCount = invoices?.filter((i) => i.status === 'sent').length || 0
  const paidCount = invoices?.filter((i) => i.status === 'paid').length || 0

  const totalRevenue =
    invoices?.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.total_amount), 0) || 0

  const pendingRevenue =
    invoices
      ?.filter((i) => i.status === 'sent')
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0

  // やることリスト：期限が近い請求書（7日以内）
  const today = new Date()
  const upcomingDue = invoices
    ?.filter((i) => {
      if (!i.due_date || i.status !== 'sent') return false
      const dueDate = new Date(i.due_date)
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 7
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5) || []

  // 期限警告：期限を過ぎた請求書
  const overdue = invoices
    ?.filter((i) => {
      if (!i.due_date || i.status !== 'sent') return false
      const dueDate = new Date(i.due_date)
      return dueDate < today
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5) || []

  // 売上分析：今月の売上
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const thisMonthRevenue =
    invoices
      ?.filter((i) => {
        if (!i.payment_date) return false
        const paymentDate = new Date(i.payment_date)
        return paymentDate >= thisMonth && i.status === 'paid'
      })
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0

  // 前月の売上
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
  const lastMonthRevenue =
    invoices
      ?.filter((i) => {
        if (!i.payment_date) return false
        const paymentDate = new Date(i.payment_date)
        return paymentDate >= lastMonth && paymentDate <= lastMonthEnd && i.status === 'paid'
      })
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0

  const growthRate =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            ダッシュボード
          </h1>
          <p className="text-muted-foreground mt-2">経理・会計管理システムへようこそ</p>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-card hover:shadow-card-hover transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総売上</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">¥{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {paidCount}件の入金済み請求書
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card hover:shadow-card-hover transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未収金</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">¥{pendingRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {sentCount}件の送付済み請求書
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card hover:shadow-card-hover transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今月の売上</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">¥{thisMonthRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              {growthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
              )}
              前月比 {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card hover:shadow-card-hover transition-shadow overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">期限超過</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{overdue.length}件</div>
            <p className="text-xs text-muted-foreground mt-2">要確認の請求書</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* やることリスト */}
        <Card className="border-none shadow-card hover:shadow-card-hover transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              やることリスト
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDue.length > 0 ? (
              <div className="space-y-3">
                {upcomingDue.map((invoice) => {
                  const dueDate = new Date(invoice.due_date!)
                  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={invoice.invoice_number} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          期限: {invoice.due_date}（{diffDays}日後）
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">¥{Number(invoice.total_amount).toLocaleString()}</p>
                        <Badge variant="outline" className="mt-1 bg-blue-100 text-blue-800">
                          {diffDays <= 3 ? '急ぎ' : '近日'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
                <Link href="/invoices">
                  <Button variant="ghost" className="w-full gap-2 group">
                    すべて見る
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  期限が近い請求書はありません
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 期限警告 */}
        <Card className="border-none shadow-card hover:shadow-card-hover transition-all border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              期限超過の警告
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.length > 0 ? (
              <div className="space-y-3">
                {overdue.map((invoice) => {
                  const dueDate = new Date(invoice.due_date!)
                  const diffDays = Math.abs(Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
                  return (
                    <div key={invoice.invoice_number} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-red-600 font-medium">
                          期限: {invoice.due_date}（{diffDays}日超過）
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">¥{Number(invoice.total_amount).toLocaleString()}</p>
                        <Badge variant="outline" className="mt-1 bg-red-100 text-red-800">
                          要確認
                        </Badge>
                      </div>
                    </div>
                  )
                })}
                <Link href="/invoices">
                  <Button variant="ghost" className="w-full gap-2 group">
                    すべて見る
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  期限超過の請求書はありません
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* クイックアクション */}
      <Card className="border-none shadow-card hover:shadow-card-hover transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            クイックアクション
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/invoices/new" className="block">
            <Button className="w-full justify-start gap-2 h-12" variant="outline">
              <Receipt className="h-4 w-4" />
              新規請求書作成
            </Button>
          </Link>
          <Link href="/quotes/new" className="block">
            <Button className="w-full justify-start gap-2 h-12" variant="outline">
              <FileText className="h-4 w-4" />
              新規見積書作成
            </Button>
          </Link>
          <Link href="/companies/new" className="block">
            <Button className="w-full justify-start gap-2 h-12" variant="outline">
              <Building2 className="h-4 w-4" />
              新規企業登録
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
