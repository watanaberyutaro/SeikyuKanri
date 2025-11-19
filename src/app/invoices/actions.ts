'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createInvoiceIssuedJournal,
  createInvoicePaymentJournal,
  saveJournal,
} from '@/lib/accounting/invoice-journal'

type InvoiceFormData = {
  company_id: string
  invoice_number: string
  title: string
  issue_date: string
  due_date?: string
  status: 'pending' | 'sent' | 'paid'
  payment_date?: string
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

export async function createInvoice(data: InvoiceFormData) {
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
  const tax_amount = Math.floor(subtotal * 0.1) // 10%消費税
  const total_amount = subtotal + tax_amount

  // 請求書を作成
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      tenant_id: profile?.tenant_id,
      company_id: data.company_id,
      invoice_number: data.invoice_number,
      title: data.title,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      payment_date: data.payment_date || null,
      status: data.status,
      subtotal,
      tax_amount,
      total_amount,
      notes: data.notes || null,
      terms: data.terms || null,
    })
    .select()
    .single()

  if (invoiceError) {
    return { error: invoiceError.message }
  }

  // 明細を作成
  const items = data.items.map((item, index) => ({
    invoice_id: invoice.id,
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

  const { error: itemsError } = await supabase.from('invoice_items').insert(items)

  if (itemsError) {
    return { error: itemsError.message }
  }

  // 新規作成時は仕訳を生成しない
  // ステータスを pending → sent に変更したときに updateInvoiceStatus で仕訳が自動生成される
  console.log('📝 請求書作成: ステータス =', data.status)
  console.log('💡 仕訳は送信済みにステータス変更時に自動生成されます')

  revalidatePath('/invoices')
  redirect('/invoices')
}

export async function updateInvoice(id: string, data: InvoiceFormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  // 小計、税額、合計を計算
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0)
  const tax_amount = Math.floor(subtotal * 0.1)
  const total_amount = subtotal + tax_amount

  // 請求書を更新
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      company_id: data.company_id,
      invoice_number: data.invoice_number,
      title: data.title,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      payment_date: data.payment_date || null,
      status: data.status,
      subtotal,
      tax_amount,
      total_amount,
      notes: data.notes || null,
      terms: data.terms || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (invoiceError) {
    return { error: invoiceError.message }
  }

  // 既存の明細を削除
  await supabase.from('invoice_items').delete().eq('invoice_id', id)

  // 新しい明細を作成
  const items = data.items.map((item, index) => ({
    invoice_id: id,
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

  const { error: itemsError } = await supabase.from('invoice_items').insert(items)

  if (itemsError) {
    return { error: itemsError.message }
  }

  revalidatePath('/invoices')
  redirect('/invoices')
}

export async function updateInvoiceStatus(
  id: string,
  status: 'pending' | 'sent' | 'paid',
  payment_date?: string
) {
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

  // 既存の請求書を取得
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, company:client_companies(name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) {
    return { error: '請求書が見つかりません' }
  }

  const oldStatus = invoice.status

  const updateData: any = { status }
  if (status === 'paid' && payment_date) {
    updateData.payment_date = payment_date
  }

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  // 仕訳を自動生成
  try {
    // pending -> sent: 売上仕訳を生成
    if (oldStatus === 'pending' && status === 'sent') {
      const invoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total_amount: Number(invoice.total_amount),
        status,
        payment_date: invoice.payment_date,
        company: { name: invoice.company.name },
      }

      const journal = await createInvoiceIssuedJournal(
        invoiceData,
        supabase,
        profile?.tenant_id!,
        user.id
      )

      if (journal) {
        const journalId = await saveJournal(journal, supabase, profile?.tenant_id!, user.id)
        console.log('✅ 売上仕訳を自動生成しました:', journalId)
      } else {
        console.error('❌ 売上仕訳の生成に失敗しました')
      }
    }

    // sent -> paid: 入金仕訳を生成
    if (oldStatus === 'sent' && status === 'paid') {
      const invoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total_amount: Number(invoice.total_amount),
        status,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        company: { name: invoice.company.name },
      }

      const journal = await createInvoicePaymentJournal(
        invoiceData,
        supabase,
        profile?.tenant_id!,
        user.id
      )

      if (journal) {
        const journalId = await saveJournal(journal, supabase, profile?.tenant_id!, user.id)
        console.log('✅ 入金仕訳を自動生成しました:', journalId)
      } else {
        console.error('❌ 入金仕訳の生成に失敗しました')
      }
    }
  } catch (error) {
    console.error('❌ 仕訳自動生成エラー:', error)
  }

  revalidatePath('/invoices')
  return { success: true }
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/invoices')
  return { success: true }
}
