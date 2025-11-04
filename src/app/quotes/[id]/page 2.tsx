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
import { notFound } from 'next/navigation'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quote } = await supabase.from('quotes').select('*, companies(*)').eq('id', id).single()

  if (!quote) {
    notFound()
  }

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order')

  const company = quote.companies as any

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">見積書詳細</h1>
          <p className="text-gray-600 mt-1">{quote.quote_number}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/quotes">
            <Button variant="outline">一覧に戻る</Button>
          </Link>
          <Link href={`/quotes/${id}/edit`}>
            <Button>編集</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">見積書番号</p>
              <p className="font-medium">{quote.quote_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">件名</p>
              <p className="font-medium">{quote.title}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">見積先</p>
              <p className="font-medium">{company?.name}</p>
              {company?.contact_person && (
                <p className="text-sm text-gray-600">{company.contact_person} 様</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">発行日</p>
              <p className="font-medium">{format(new Date(quote.issue_date), 'yyyy年MM月dd日')}</p>
              {quote.expiry_date && (
                <>
                  <p className="text-sm text-gray-600 mt-2">有効期限</p>
                  <p className="font-medium">
                    {format(new Date(quote.expiry_date), 'yyyy年MM月dd日')}
                  </p>
                </>
              )}
            </div>
          </div>
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
                  <TableCell className="text-right">
                    ¥{Number(item.unit_price).toLocaleString()}
                  </TableCell>
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
                  <span className="font-medium">¥{Number(quote.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">消費税(10%):</span>
                  <span className="font-medium">¥{Number(quote.tax_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>合計:</span>
                  <span>¥{Number(quote.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(quote.notes || quote.terms) && (
        <Card>
          <CardHeader>
            <CardTitle>その他</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.notes && (
              <div>
                <p className="text-sm text-gray-600 mb-1">備考</p>
                <p className="whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div>
                <p className="text-sm text-gray-600 mb-1">取引条件</p>
                <p className="whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
