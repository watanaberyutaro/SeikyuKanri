'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

type QuoteItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
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

type Quote = {
  id: string
  quote_number: string
  title: string
  issue_date: string
  expiry_date?: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
  terms?: string
  client_companies: Company
}

type QuotePDFProps = {
  quote: Quote
  items: QuoteItem[]
}

export function QuotePDF({ quote, items }: QuotePDFProps) {
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

      pdf.save(`${quote.quote_number}.pdf`)
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
          <h1 className="text-3xl font-bold mb-2">見積書</h1>
          <p className="text-lg">{quote.quote_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-lg font-bold mb-4">見積先</h2>
            <div className="space-y-1">
              <p className="text-xl font-bold">{quote.client_companies.name} 様</p>
              {quote.client_companies.postal_code && (
                <p>〒{quote.client_companies.postal_code}</p>
              )}
              {quote.client_companies.address && (
                <p>{quote.client_companies.address}</p>
              )}
              {quote.client_companies.contact_person && (
                <p>{quote.client_companies.contact_person} 様</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4">見積元</h2>
            <div className="space-y-1">
              <p className="font-bold">株式会社サンプル</p>
              <p>〒123-4567</p>
              <p>東京都渋谷区サンプル1-2-3</p>
              <p>TEL: 03-1234-5678</p>
              <p>Email: info@sample.co.jp</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p><span className="font-bold">件名:</span> {quote.title}</p>
            <p><span className="font-bold">発行日:</span> {formatDate(quote.issue_date)}</p>
            {quote.expiry_date && (
              <p><span className="font-bold">有効期限:</span> {formatDate(quote.expiry_date)}</p>
            )}
          </div>

          <div className="text-right">
            <div className="border-2 border-black p-4 inline-block">
              <p className="text-sm mb-2">見積金額</p>
              <p className="text-2xl font-bold">¥{quote.total_amount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">品目・内容</th>
                <th className="border border-black p-2 text-center w-20">数量</th>
                <th className="border border-black p-2 text-right w-32">単価</th>
                <th className="border border-black p-2 text-right w-32">金額</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black p-2">{item.description}</td>
                  <td className="border border-black p-2 text-center">{item.quantity}</td>
                  <td className="border border-black p-2 text-right">¥{Number(item.unit_price).toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">¥{Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="border border-black p-2 text-right font-bold">小計</td>
                <td className="border border-black p-2 text-right font-bold">¥{quote.subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border border-black p-2 text-right font-bold">消費税(10%)</td>
                <td className="border border-black p-2 text-right font-bold">¥{quote.tax_amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border border-black p-2 text-right font-bold bg-gray-100">合計</td>
                <td className="border border-black p-2 text-right font-bold bg-gray-100">¥{quote.total_amount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {(quote.notes || quote.terms) && (
          <div className="space-y-4">
            {quote.notes && (
              <div>
                <h3 className="font-bold mb-2">備考</h3>
                <p className="whitespace-pre-wrap text-sm">{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div>
                <h3 className="font-bold mb-2">取引条件</h3>
                <p className="whitespace-pre-wrap text-sm">{quote.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}