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
import { format } from 'date-fns'
import { FileText, Plus, Eye, Edit, Building2, Calendar, DollarSign, Clock, AlertCircle } from 'lucide-react'

export default async function QuotesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*, client_companies(name)')
    .eq('user_id', user?.id!)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            見積書管理
          </h1>
          <p className="text-muted-foreground mt-2">見積書の作成と管理</p>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link href="/quotes/new">
            <Plus className="h-4 w-4" />
            新規見積書作成
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
              <FileText className="h-5 w-5 text-primary" />
            </div>
            見積書一覧
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {quotes?.length || 0}件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotes && quotes.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">見積書番号</TableHead>
                    <TableHead className="font-semibold">件名</TableHead>
                    <TableHead className="font-semibold">見積先</TableHead>
                    <TableHead className="font-semibold">発行日</TableHead>
                    <TableHead className="font-semibold">有効期限</TableHead>
                    <TableHead className="font-semibold">金額</TableHead>
                    <TableHead className="text-right font-semibold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium">
                        {quote.quote_number}
                      </TableCell>
                      <TableCell className="font-medium">{quote.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {(quote.client_companies as any)?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(quote.issue_date), 'yyyy/MM/dd')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {quote.expiry_date ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(quote.expiry_date), 'yyyy/MM/dd')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-semibold">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          ¥{Number(quote.total_amount).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" className="gap-1 shadow-sm" asChild>
                          <Link href={`/quotes/${quote.id}`}>
                            <Eye className="h-3 w-3" />
                            詳細
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 shadow-sm" asChild>
                          <Link href={`/quotes/${quote.id}/edit`}>
                            <Edit className="h-3 w-3" />
                            編集
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">見積書がまだありません</h3>
              <p className="text-sm text-muted-foreground mb-6">
                最初の見積書を作成して始めましょう
              </p>
              <Button className="gap-2" asChild>
                <Link href="/quotes/new">
                  <Plus className="h-4 w-4" />
                  新規見積書作成
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
