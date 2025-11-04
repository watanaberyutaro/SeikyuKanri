import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, Shield } from 'lucide-react'
import Link from 'next/link'

export default async function AdminTenantsPage() {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 管理者チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  // 全テナントを取得
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  // 各テナントのユーザー数を取得
  const tenantsWithUserCount = await Promise.all(
    (tenants || []).map(async (tenant) => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      return { ...tenant, userCount: count || 0 }
    })
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              企業コード管理
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">システム管理者用：テナント企業の管理</p>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link href="/admin/tenants/new">
            <Plus className="h-4 w-4" />
            新規企業追加
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            登録企業一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>企業コード</TableHead>
                <TableHead>企業名</TableHead>
                <TableHead>ユーザー数</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>登録日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsWithUserCount.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    企業が登録されていません
                  </TableCell>
                </TableRow>
              ) : (
                tenantsWithUserCount.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-mono font-medium">
                      {tenant.company_code}
                    </TableCell>
                    <TableCell className="font-medium">{tenant.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.userCount} 人</Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.is_active ? (
                        <Badge className="bg-green-500">有効</Badge>
                      ) : (
                        <Badge variant="destructive">無効</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString('ja-JP')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
