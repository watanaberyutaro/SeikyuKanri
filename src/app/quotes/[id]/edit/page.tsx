'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { updateQuote } from '../../actions'
import { Button } from '@/components/ui/button'
import { QuoteForm } from '@/components/quotes/quote-form'
import { createClient } from '@/lib/supabase/client'

export default function EditQuotePage() {
  const params = useParams()
  const id = params.id as string
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [quote, setQuote] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: companiesData } = await supabase
        .from('client_companies')
        .select('id, name')
        .order('name')

      const { data: quoteData } = await supabase.from('quotes').select('*').eq('id', id).single()

      const { data: itemsData } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', id)
        .order('sort_order')

      setCompanies(companiesData || [])

      if (quoteData && itemsData) {
        setQuote({
          company_id: quoteData.company_id,
          quote_number: quoteData.quote_number,
          title: quoteData.title,
          issue_date: quoteData.issue_date,
          expiry_date: quoteData.expiry_date || '',
          notes: quoteData.notes || '',
          terms: quoteData.terms || '',
          items: itemsData.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            amount: Number(item.amount),
          })),
        })
      }
    }

    fetchData()
  }, [id])

  async function handleSubmit(data: any) {
    setLoading(true)
    setError(null)

    const result = await updateQuote(id, data)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  if (!quote) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">見積書編集</h1>
          <p className="text-gray-600 mt-1">見積書情報を更新してください</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/quotes">戻る</Link>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <QuoteForm companies={companies} initialData={quote} onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}
