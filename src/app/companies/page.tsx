import Link from 'next/link'
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
import { DeleteCompanyButton } from './delete-button'
import { Building2, Plus, Mail, Phone, User, AlertCircle } from 'lucide-react'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: companies, error } = await supabase
    .from('client_companies')
    .select('*')
    .eq('user_id', user?.id!)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            企業管理
          </h1>
          <p className="text-muted-foreground mt-2">登録企業の管理</p>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link href="/companies/new">
            <Plus className="h-4 w-4" />
            新規企業登録
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          エラー: {error.message}
        </div>
      )}

      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            登録企業一覧
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {companies?.length || 0}件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {companies && companies.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">企業名</TableHead>
                    <TableHead className="font-semibold">担当者</TableHead>
                    <TableHead className="font-semibold">メール</TableHead>
                    <TableHead className="font-semibold">電話番号</TableHead>
                    <TableHead className="text-right font-semibold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company, index) => (
                    <TableRow
                      key={company.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {company.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {company.contact_person ? (
                            <>
                              <User className="h-4 w-4 text-muted-foreground" />
                              {company.contact_person}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {company.email ? (
                            <>
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {company.email}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {company.phone ? (
                            <>
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              {company.phone}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" className="shadow-sm" asChild>
                          <Link href={`/companies/${company.id}/edit`}>
                            編集
                          </Link>
                        </Button>
                        <DeleteCompanyButton id={company.id} name={company.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Building2 className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">登録されている企業がありません</h3>
              <p className="text-sm text-muted-foreground mb-6">
                最初の企業を登録して始めましょう
              </p>
              <Button className="gap-2" asChild>
                <Link href="/companies/new">
                  <Plus className="h-4 w-4" />
                  新規企業登録
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
