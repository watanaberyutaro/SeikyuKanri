'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createInvoice } from '../actions'
import { createCompanyInline } from '@/app/companies/actions'
import { Button } from '@/components/ui/button'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { InvoicePreview } from '@/components/invoices/invoice-preview'
import { createClient } from '@/lib/supabase/client'

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

type TenantInfo = {
  company_name: string
  invoice_registration_number?: string
  postal_code?: string
  address?: string
  phone?: string
  email?: string
  company_seal_url?: string
  bank_name?: string
  bank_branch?: string
  bank_account_type?: string
  bank_account_number?: string
  bank_account_holder?: string
}

type CompanyInfo = {
  name: string
  postal_code?: string
  address?: string
  contact_person?: string
  phone?: string
  email?: string
}

export default function NewInvoicePage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; postal_code?: string; address?: string; contact_person?: string; phone?: string; email?: string }>>([])
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | undefined>()
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('')

  // プレビュー用の状態
  const [previewData, setPreviewData] = useState<{
    company_id: string
    invoice_number: string
    title: string
    issue_date: string
    due_date?: string
    items: InvoiceItem[]
    notes?: string
    terms?: string
  }>({
    company_id: '',
    invoice_number: '',
    title: '',
    issue_date: new Date().toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
  })

  useEffect(() => {
    async function fetchData() {
      setLoadingData(true)
      try {
        const supabase = createClient()

        // 企業データを取得
        const { data: companiesData } = await supabase
          .from('client_companies')
          .select('id, name, postal_code, address, contact_person, phone, email')
          .order('name')
        setCompanies(companiesData || [])

        // 次の請求書番号を取得
        const nextNumberResponse = await fetch('/api/invoices/next-number')
        if (nextNumberResponse.ok) {
          const { invoice_number } = await nextNumberResponse.json()
          setNextInvoiceNumber(invoice_number)
          setPreviewData(prev => ({
            ...prev,
            invoice_number,
          }))
        }

        // テナント情報を取得
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

          if (profile?.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('company_name, invoice_registration_number, postal_code, address, phone, email, company_seal_url, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder')
              .eq('id', profile.tenant_id)
              .single()

            if (tenant) {
              setTenantInfo({
                company_name: tenant.company_name,
                invoice_registration_number: tenant.invoice_registration_number || undefined,
                postal_code: tenant.postal_code || undefined,
                address: tenant.address || undefined,
                phone: tenant.phone || undefined,
                email: tenant.email || undefined,
                company_seal_url: tenant.company_seal_url || undefined,
                bank_name: tenant.bank_name || undefined,
                bank_branch: tenant.bank_branch || undefined,
                bank_account_type: tenant.bank_account_type || undefined,
                bank_account_number: tenant.bank_account_number || undefined,
                bank_account_holder: tenant.bank_account_holder || undefined,
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  async function handleSubmit(data: any) {
    setLoading(true)
    setError(null)

    const result = await createInvoice(data)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const handleCreateCompany = async (companyData: {
    name: string
    postal_code?: string
    address?: string
    contact_person?: string
    phone?: string
    email?: string
  }) => {
    const newCompany = await createCompanyInline(companyData)

    // 企業リストを更新
    setCompanies(prev => [...prev, {
      id: newCompany.id,
      name: newCompany.name,
      postal_code: companyData.postal_code,
      address: companyData.address,
      contact_person: companyData.contact_person,
      phone: companyData.phone,
      email: companyData.email,
    }])

    return newCompany
  }

  const handleFormChange = (data: {
    company_id: string
    invoice_number: string
    title: string
    issue_date: string
    due_date?: string
    items: InvoiceItem[]
    notes?: string
    terms?: string
  }) => {
    setPreviewData(data)
  }

  // 選択された企業の情報を取得
  const selectedCompany = companies.find(c => c.id === previewData.company_id)
  const companyInfo: CompanyInfo | undefined = selectedCompany ? {
    name: selectedCompany.name,
    postal_code: selectedCompany.postal_code,
    address: selectedCompany.address,
    contact_person: selectedCompany.contact_person,
    phone: selectedCompany.phone,
    email: selectedCompany.email,
  } : undefined

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">新規請求書作成</h1>
            <p className="text-gray-600 mt-1">請求書情報を入力してください</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/invoices">戻る</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6">
          {error}
        </div>
      )}

      {/* 2カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: フォーム */}
        <div>
          <InvoiceForm
            companies={companies.map(c => ({ id: c.id, name: c.name }))}
            initialData={{
              company_id: '',
              invoice_number: nextInvoiceNumber,
              title: '',
              issue_date: new Date().toISOString().split('T')[0],
              status: 'pending',
              items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
            }}
            onSubmit={handleSubmit}
            onChange={handleFormChange}
            onCreateCompany={handleCreateCompany}
            loading={loading}
          />
        </div>

        {/* 右側: プレビュー */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-900">プレビュー</h2>
            <p className="text-sm text-gray-600">入力内容がリアルタイムで反映されます</p>
          </div>
          <div className="origin-top scale-75">
            <InvoicePreview
              tenantInfo={tenantInfo}
              companyInfo={companyInfo}
              invoiceNumber={previewData.invoice_number}
              title={previewData.title}
              issueDate={previewData.issue_date}
              dueDate={previewData.due_date}
              items={previewData.items}
              notes={previewData.notes}
              terms={previewData.terms}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
