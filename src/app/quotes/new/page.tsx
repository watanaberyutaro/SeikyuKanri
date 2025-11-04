'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createQuote } from '../actions'
import { Button } from '@/components/ui/button'
import { QuoteForm } from '@/components/quotes/quote-form'
import { createClient } from '@/lib/supabase/client'

export default function NewQuotePage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    async function fetchCompanies() {
      const supabase = createClient()
      const { data } = await supabase.from('client_companies').select('id, name').order('name')
      setCompanies(data || [])
    }

    fetchCompanies()
  }, [])

  async function handleSubmit(data: any) {
    setLoading(true)
    setError(null)

    const result = await createQuote(data)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">新規見積書作成</h1>
          <p className="text-gray-600 mt-1">見積書情報を入力してください</p>
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

      <QuoteForm companies={companies} onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}
