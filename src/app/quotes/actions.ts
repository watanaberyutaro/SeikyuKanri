'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type QuoteFormData = {
  company_id: string
  quote_number: string
  title: string
  issue_date: string
  expiry_date?: string
  notes?: string
  terms?: string
  items: Array<{
    description: string
    transaction_date?: string
    quantity: number
    unit?: string
    unit_price: number
    amount: number
    tax_rate_id?: string
    withholding_tax_rate?: number
  }>
}

export async function createQuote(data: QuoteFormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  // ユーザーのtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  // 小計、税額、合計を計算
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0)
  const tax_amount = Math.floor(subtotal * 0.1)
  const total_amount = subtotal + tax_amount

  // 見積書を作成
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: user.id,
      tenant_id: profile?.tenant_id,
      company_id: data.company_id,
      quote_number: data.quote_number,
      title: data.title,
      issue_date: data.issue_date,
      expiry_date: data.expiry_date || null,
      subtotal,
      tax_amount,
      total_amount,
      notes: data.notes || null,
      terms: data.terms || null,
    })
    .select()
    .single()

  if (quoteError) {
    return { error: quoteError.message }
  }

  // 明細を作成
  const items = data.items.map((item, index) => ({
    quote_id: quote.id,
    description: item.description,
    transaction_date: item.transaction_date || null,
    quantity: item.quantity,
    unit: item.unit || null,
    unit_price: item.unit_price,
    amount: item.amount,
    tax_rate_id: item.tax_rate_id || null,
    withholding_tax_rate: item.withholding_tax_rate || 0,
    sort_order: index,
  }))

  const { error: itemsError } = await supabase.from('quote_items').insert(items)

  if (itemsError) {
    return { error: itemsError.message }
  }

  revalidatePath('/quotes')
  redirect('/quotes')
}

export async function updateQuote(id: string, data: QuoteFormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0)
  const tax_amount = Math.floor(subtotal * 0.1)
  const total_amount = subtotal + tax_amount

  const { error: quoteError } = await supabase
    .from('quotes')
    .update({
      company_id: data.company_id,
      quote_number: data.quote_number,
      title: data.title,
      issue_date: data.issue_date,
      expiry_date: data.expiry_date || null,
      subtotal,
      tax_amount,
      total_amount,
      notes: data.notes || null,
      terms: data.terms || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (quoteError) {
    return { error: quoteError.message }
  }

  await supabase.from('quote_items').delete().eq('quote_id', id)

  const items = data.items.map((item, index) => ({
    quote_id: id,
    description: item.description,
    transaction_date: item.transaction_date || null,
    quantity: item.quantity,
    unit: item.unit || null,
    unit_price: item.unit_price,
    amount: item.amount,
    tax_rate_id: item.tax_rate_id || null,
    withholding_tax_rate: item.withholding_tax_rate || 0,
    sort_order: index,
  }))

  const { error: itemsError } = await supabase.from('quote_items').insert(items)

  if (itemsError) {
    return { error: itemsError.message }
  }

  revalidatePath('/quotes')
  redirect('/quotes')
}

export async function deleteQuote(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const { error } = await supabase.from('quotes').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/quotes')
  return { success: true }
}
