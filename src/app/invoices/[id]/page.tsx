import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InvoicePDF } from '@/components/invoices/invoice-pdf'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'

const statusLabels = {
  pending: '送付待ち',
  sent: '送付済み',
  paid: '入金済み',
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, client_companies(*)')
    .eq('id', id)
    .single()

  if (!invoice) {
    notFound()
  }

  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order')

  // テナント情報を取得
  const { data: { user } } = await supabase.auth.getUser()
  let tenantInfo = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profile?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('company_name, invoice_registration_number, postal_code, address, phone, email, company_seal_url')
        .eq('id', profile.tenant_id)
        .single()

      if (tenant) {
        tenantInfo = {
          company_name: tenant.company_name,
          invoice_registration_number: tenant.invoice_registration_number || undefined,
          postal_code: tenant.postal_code || undefined,
          address: tenant.address || undefined,
          phone: tenant.phone || undefined,
          email: tenant.email || undefined,
          company_seal_url: tenant.company_seal_url || undefined,
        }
      }
    }
  }

  const company = invoice.client_companies as any

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">請求書詳細</h1>
          <p className="text-gray-600 mt-1">{invoice.invoice_number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/invoices">一覧に戻る</Link>
          </Button>
          <Button asChild>
            <Link href={`/invoices/${id}/edit`}>編集</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <InvoicePDF invoice={invoice} items={items || []} tenantInfo={tenantInfo || undefined} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>基本情報</CardTitle>
            <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
              {statusLabels[invoice.status as keyof typeof statusLabels]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">請求書番号</p>
              <p className="font-medium">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">件名</p>
              <p className="font-medium">{invoice.title}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">請求先</p>
              <p className="font-medium">{company?.name}</p>
              {company?.contact_person && (
                <p className="text-sm text-gray-600">{company.contact_person} 様</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">発行日</p>
              <p className="font-medium">{format(new Date(invoice.issue_date), 'yyyy年MM月dd日')}</p>
              {invoice.due_date && (
                <>
                  <p className="text-sm text-gray-600 mt-2">支払期限</p>
                  <p className="font-medium">{format(new Date(invoice.due_date), 'yyyy年MM月dd日')}</p>
                </>
              )}
            </div>
          </div>

          {invoice.payment_date && (
            <div>
              <p className="text-sm text-gray-600">入金日</p>
              <p className="font-medium">{format(new Date(invoice.payment_date), 'yyyy年MM月dd日')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>明細</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品目・内容</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">単価</TableHead>
                <TableHead className="text-right">金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">¥{Number(item.unit_price).toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{Number(item.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t mt-4 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">小計:</span>
                  <span className="font-medium">¥{Number(invoice.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">消費税(10%):</span>
                  <span className="font-medium">¥{Number(invoice.tax_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>合計:</span>
                  <span>¥{Number(invoice.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(invoice.notes || invoice.terms) && (
        <Card>
          <CardHeader>
            <CardTitle>その他</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.notes && (
              <div>
                <p className="text-sm text-gray-600 mb-1">備考</p>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-sm text-gray-600 mb-1">支払条件</p>
                <p className="whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
