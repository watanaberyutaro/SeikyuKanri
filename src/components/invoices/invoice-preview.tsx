'use client'

import { Card, CardContent } from '@/components/ui/card'

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
}

type CompanyInfo = {
  name: string
  postal_code?: string
  address?: string
  contact_person?: string
  phone?: string
  email?: string
}

type InvoicePreviewProps = {
  tenantInfo?: TenantInfo
  companyInfo?: CompanyInfo
  invoiceNumber: string
  title: string
  issueDate: string
  dueDate?: string
  items: InvoiceItem[]
  notes?: string
  terms?: string
}

export function InvoicePreview({
  tenantInfo,
  companyInfo,
  invoiceNumber,
  title,
  issueDate,
  dueDate,
  items,
  notes,
  terms,
}: InvoicePreviewProps) {
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTax = () => {
    return Math.floor(calculateSubtotal() * 0.1)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="p-8 bg-white">
        {/* ヘッダー */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">請求書</h2>

          {/* 請求先情報と自社情報を横に並べる */}
          <div className="flex justify-between mb-6">
            {/* 請求先情報（左側） */}
            <div className="flex-1">
              {companyInfo ? (
                <>
                  <div className="text-lg font-bold mb-2">{companyInfo.name} 御中</div>
                  {companyInfo.postal_code && (
                    <div className="text-sm text-muted-foreground">
                      〒{companyInfo.postal_code}
                    </div>
                  )}
                  {companyInfo.address && (
                    <div className="text-sm text-muted-foreground mb-1">
                      {companyInfo.address}
                    </div>
                  )}
                  {companyInfo.contact_person && (
                    <div className="text-sm text-muted-foreground">
                      {companyInfo.contact_person} 様
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground italic">請求先を選択してください</div>
              )}
            </div>

            {/* 自社情報（右側） */}
            <div className="flex-1 text-right">
              {tenantInfo ? (
                <>
                  <div className="font-bold mb-2">{tenantInfo.company_name}</div>
                  {tenantInfo.postal_code && (
                    <div className="text-sm text-muted-foreground">
                      〒{tenantInfo.postal_code}
                    </div>
                  )}
                  {tenantInfo.address && (
                    <div className="text-sm text-muted-foreground mb-1">
                      {tenantInfo.address}
                    </div>
                  )}
                  {tenantInfo.phone && (
                    <div className="text-sm text-muted-foreground">
                      TEL: {tenantInfo.phone}
                    </div>
                  )}
                  {tenantInfo.email && (
                    <div className="text-sm text-muted-foreground">
                      {tenantInfo.email}
                    </div>
                  )}
                  {tenantInfo.invoice_registration_number && (
                    <div className="text-xs text-muted-foreground mt-2">
                      登録番号: {tenantInfo.invoice_registration_number}
                    </div>
                  )}
                  {/* 電子印 */}
                  {tenantInfo.company_seal_url && (
                    <div className="mt-3 flex justify-end">
                      <img
                        src={tenantInfo.company_seal_url}
                        alt="Company Seal"
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground italic text-sm">
                  設定から企業情報を登録してください
                </div>
              )}
            </div>
          </div>

          {/* 請求書情報 */}
          <div className="border-t border-b py-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">請求書番号:</span>
                <span className="ml-2 font-medium">
                  {invoiceNumber || '未入力'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">発行日:</span>
                <span className="ml-2 font-medium">
                  {issueDate
                    ? new Date(issueDate).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '未入力'}
                </span>
              </div>
              {dueDate && (
                <div>
                  <span className="text-muted-foreground">支払期限:</span>
                  <span className="ml-2 font-medium">
                    {new Date(dueDate).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 件名 */}
          {title && (
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-1">件名</div>
              <div className="font-medium">{title}</div>
            </div>
          )}
        </div>

        {/* 明細テーブル */}
        <div className="mb-6">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left text-sm font-medium">品目・内容</th>
                <th className="border p-2 text-center text-sm font-medium w-20">数量</th>
                <th className="border p-2 text-right text-sm font-medium w-28">単価</th>
                <th className="border p-2 text-right text-sm font-medium w-32">金額</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(item => item.description).length > 0 ? (
                items
                  .filter((item) => item.description)
                  .map((item, index) => (
                    <tr key={index}>
                      <td className="border p-2 text-sm">{item.description}</td>
                      <td className="border p-2 text-center text-sm">
                        {item.quantity}
                      </td>
                      <td className="border p-2 text-right text-sm font-mono">
                        ¥{item.unit_price.toLocaleString()}
                      </td>
                      <td className="border p-2 text-right text-sm font-mono">
                        ¥{item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={4} className="border p-8 text-center text-muted-foreground italic">
                    明細を入力してください
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 合計金額 */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">小計</span>
              <span className="font-mono">¥{calculateSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">消費税 (10%)</span>
              <span className="font-mono">¥{calculateTax().toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-3 bg-muted px-3 rounded mt-2">
              <span className="font-bold">合計金額</span>
              <span className="text-xl font-bold font-mono">
                ¥{calculateTotal().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 支払条件 */}
        {terms && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">支払条件</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap border-l-4 border-primary/20 pl-3 py-2">
              {terms}
            </div>
          </div>
        )}

        {/* 備考 */}
        {notes && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-1">備考</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap border-l-4 border-primary/20 pl-3 py-2">
              {notes}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
