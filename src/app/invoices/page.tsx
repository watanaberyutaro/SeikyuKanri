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
import { Receipt, Plus, Eye, Edit, Building2, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { InvoiceStatusSelect } from '@/components/invoices/invoice-status-select'

export default async function InvoicesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*, client_companies(name)')
    .eq('user_id', user?.id!)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            請求書管理
          </h1>
          <p className="text-muted-foreground mt-2">請求書の作成と管理</p>
        </div>
        <Button className="gap-2 shadow-sm" asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            新規請求書作成
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
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            請求書一覧
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {invoices?.length || 0}件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">請求書番号</TableHead>
                    <TableHead className="font-semibold">件名</TableHead>
                    <TableHead className="font-semibold">請求先</TableHead>
                    <TableHead className="font-semibold">発行日</TableHead>
                    <TableHead className="font-semibold">金額</TableHead>
                    <TableHead className="font-semibold">ステータス</TableHead>
                    <TableHead className="text-right font-semibold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="font-medium">{invoice.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {(invoice.client_companies as any)?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(invoice.issue_date), 'yyyy/MM/dd')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-semibold">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          ¥{Number(invoice.total_amount).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusSelect
                          invoiceId={invoice.id}
                          currentStatus={invoice.status}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" className="gap-1 shadow-sm" asChild>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="h-3 w-3" />
                            詳細
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 shadow-sm" asChild>
                          <Link href={`/invoices/${invoice.id}/edit`}>
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
                <Receipt className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">請求書がまだありません</h3>
              <p className="text-sm text-muted-foreground mb-6">
                最初の請求書を作成して始めましょう
              </p>
              <Button className="gap-2" asChild>
                <Link href="/invoices/new">
                  <Plus className="h-4 w-4" />
                  新規請求書作成
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
