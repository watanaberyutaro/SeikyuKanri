'use client'

import { Card, CardContent } from '@/components/ui/card'

type InvoiceItem = {
  description: string
  transaction_date?: string
  quantity: number
  unit?: string
  unit_price: number
  amount: number
  tax_rate_id?: string
  withholding_tax_rate?: number
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
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border text-xs">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left font-medium">摘要</th>
                <th className="border p-2 text-center font-medium w-24">取引日</th>
                <th className="border p-2 text-center font-medium w-16">数量</th>
                <th className="border p-2 text-center font-medium w-16">単位</th>
                <th className="border p-2 text-right font-medium w-24">単価</th>
                <th className="border p-2 text-center font-medium w-20">税率</th>
                <th className="border p-2 text-center font-medium w-20">源泉徴収</th>
                <th className="border p-2 text-right font-medium w-28">金額</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(item => item.description).length > 0 ? (
                items
                  .filter((item) => item.description)
                  .map((item, index) => (
                    <tr key={index}>
                      <td className="border p-2">{item.description}</td>
                      <td className="border p-2 text-center">
                        {item.transaction_date
                          ? new Date(item.transaction_date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="border p-2 text-center">
                        {item.quantity}
                      </td>
                      <td className="border p-2 text-center">
                        {item.unit || '-'}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        ¥{item.unit_price.toLocaleString()}
                      </td>
                      <td className="border p-2 text-center">
                        {item.tax_rate_id ? '10%' : '-'}
                      </td>
                      <td className="border p-2 text-center">
                        {item.withholding_tax_rate ? `${item.withholding_tax_rate}%` : '-'}
                      </td>
                      <td className="border p-2 text-right font-mono">
                        ¥{item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={8} className="border p-8 text-center text-muted-foreground italic">
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

        {/* 振込先口座情報 */}
        {tenantInfo && (tenantInfo.bank_name || tenantInfo.bank_branch || tenantInfo.bank_account_type || tenantInfo.bank_account_number || tenantInfo.bank_account_holder) && (
          <div className="border-t pt-4 mt-6">
            <div className="text-sm font-medium mb-2">お振込先</div>
            <div className="text-sm space-y-1 bg-muted/30 p-3 rounded">
              {tenantInfo.bank_name && (
                <div>
                  <span className="text-muted-foreground">銀行名:</span>
                  <span className="ml-2 font-medium">{tenantInfo.bank_name}</span>
                </div>
              )}
              {tenantInfo.bank_branch && (
                <div>
                  <span className="text-muted-foreground">支店名:</span>
                  <span className="ml-2 font-medium">{tenantInfo.bank_branch}</span>
                </div>
              )}
              {tenantInfo.bank_account_type && (
                <div>
                  <span className="text-muted-foreground">口座種別:</span>
                  <span className="ml-2 font-medium">{tenantInfo.bank_account_type}</span>
                </div>
              )}
              {tenantInfo.bank_account_number && (
                <div>
                  <span className="text-muted-foreground">口座番号:</span>
                  <span className="ml-2 font-medium">{tenantInfo.bank_account_number}</span>
                </div>
              )}
              {tenantInfo.bank_account_holder && (
                <div>
                  <span className="text-muted-foreground">口座名義:</span>
                  <span className="ml-2 font-medium">{tenantInfo.bank_account_holder}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
