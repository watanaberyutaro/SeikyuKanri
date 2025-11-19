'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

type InvoiceItem = {
  id: string
  description: string
  transaction_date?: string
  quantity: number
  unit?: string
  unit_price: number
  amount: number
  tax_rate_id?: string
  withholding_tax_rate?: number
}

type Company = {
  id: string
  name: string
  postal_code?: string
  address?: string
  contact_person?: string
  phone?: string
  email?: string
}

type Invoice = {
  id: string
  invoice_number: string
  title: string
  issue_date: string
  due_date?: string
  payment_date?: string
  status: 'pending' | 'sent' | 'paid'
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
  terms?: string
  client_companies: Company
}

type TenantInfo = {
  company_name: string
  invoice_registration_number?: string
  postal_code?: string
  address?: string
  phone?: string
  email?: string
  company_seal_url?: string
}

type InvoicePDFProps = {
  invoice: Invoice
  items: InvoiceItem[]
  tenantInfo?: TenantInfo
}

export function InvoicePDF({ invoice, items, tenantInfo }: InvoicePDFProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const generatePDF = async () => {
    if (!contentRef.current) return

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          // Override all potentially problematic CSS colors
          const style = clonedDoc.createElement('style')
          style.textContent = `
            * {
              color: #000000 !important;
              background-color: transparent !important;
              border-color: #000000 !important;
            }
            .bg-gray-100 {
              background-color: #f3f4f6 !important;
            }
            table, th, td {
              border-color: #000000 !important;
            }
            .border-black {
              border-color: #000000 !important;
            }
          `
          clonedDoc.head.appendChild(style)
        }
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${invoice.invoice_number}.pdf`)
    } catch (error) {
      console.error('PDF生成エラー:', error)
      alert('PDF生成に失敗しました。ブラウザを更新してもう一度お試しください。')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div>
      <Button onClick={generatePDF} className="mb-4">
        PDF出力
      </Button>

      <div ref={contentRef} className="bg-white p-8 min-h-[297mm] w-[210mm] mx-auto" style={{ fontFamily: 'serif' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">請求書</h1>
          <p className="text-lg">{invoice.invoice_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-lg font-bold mb-4">請求先</h2>
            <div className="space-y-1">
              <p className="text-xl font-bold">{invoice.client_companies.name} 様</p>
              {invoice.client_companies.postal_code && (
                <p>〒{invoice.client_companies.postal_code}</p>
              )}
              {invoice.client_companies.address && (
                <p>{invoice.client_companies.address}</p>
              )}
              {invoice.client_companies.contact_person && (
                <p>{invoice.client_companies.contact_person} 様</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4">請求元</h2>
            <div className="space-y-1">
              <p className="font-bold">{tenantInfo?.company_name || '株式会社サンプル'}</p>
              {tenantInfo?.postal_code && <p>〒{tenantInfo.postal_code}</p>}
              {tenantInfo?.address && <p>{tenantInfo.address}</p>}
              {tenantInfo?.phone && <p>TEL: {tenantInfo.phone}</p>}
              {tenantInfo?.email && <p>Email: {tenantInfo.email}</p>}
              {tenantInfo?.invoice_registration_number && (
                <p className="text-sm">登録番号: {tenantInfo.invoice_registration_number}</p>
              )}
              {tenantInfo?.company_seal_url && (
                <div className="mt-2">
                  <img
                    src={tenantInfo.company_seal_url}
                    alt="Company Seal"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p><span className="font-bold">件名:</span> {invoice.title}</p>
            <p><span className="font-bold">発行日:</span> {formatDate(invoice.issue_date)}</p>
            {invoice.due_date && (
              <p><span className="font-bold">支払期限:</span> {formatDate(invoice.due_date)}</p>
            )}
          </div>

          <div className="text-right">
            <div className="border-2 border-black p-4 inline-block">
              <p className="text-sm mb-2">請求金額</p>
              <p className="text-2xl font-bold">¥{invoice.total_amount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">摘要</th>
                <th className="border border-black p-1 text-center w-20">取引日</th>
                <th className="border border-black p-1 text-center w-12">数量</th>
                <th className="border border-black p-1 text-center w-12">単位</th>
                <th className="border border-black p-1 text-right w-20">単価</th>
                <th className="border border-black p-1 text-center w-12">税率</th>
                <th className="border border-black p-1 text-center w-16">源泉徴収</th>
                <th className="border border-black p-1 text-right w-24">金額</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black p-1">{item.description}</td>
                  <td className="border border-black p-1 text-center">
                    {item.transaction_date
                      ? new Date(item.transaction_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td className="border border-black p-1 text-center">{item.quantity}</td>
                  <td className="border border-black p-1 text-center">{item.unit || '-'}</td>
                  <td className="border border-black p-1 text-right">¥{Number(item.unit_price).toLocaleString()}</td>
                  <td className="border border-black p-1 text-center">
                    {item.tax_rate_id ? '10%' : '-'}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {item.withholding_tax_rate ? `${item.withholding_tax_rate}%` : '-'}
                  </td>
                  <td className="border border-black p-1 text-right">¥{Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className="border border-black p-1 text-right font-bold">小計</td>
                <td className="border border-black p-1 text-right font-bold">¥{invoice.subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={7} className="border border-black p-1 text-right font-bold">消費税(10%)</td>
                <td className="border border-black p-1 text-right font-bold">¥{invoice.tax_amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={7} className="border border-black p-1 text-right font-bold bg-gray-100">合計</td>
                <td className="border border-black p-1 text-right font-bold bg-gray-100">¥{invoice.total_amount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div className="space-y-4">
            {invoice.notes && (
              <div>
                <h3 className="font-bold mb-2">備考</h3>
                <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h3 className="font-bold mb-2">支払条件</h3>
                <p className="whitespace-pre-wrap text-sm">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}