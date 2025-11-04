import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type SendInvoiceEmailParams = {
  to: string
  invoiceNumber: string
  companyName: string
  totalAmount: number
  dueDate?: string
  pdfUrl?: string
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  companyName,
  totalAmount,
  dueDate,
  pdfUrl,
}: SendInvoiceEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@yourdomain.com', // Resendで認証済みのドメインに変更
      to: [to],
      subject: `請求書 ${invoiceNumber} のお送りについて`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>請求書をお送りします</h2>
          <p>${companyName} 御中</p>
          <p>いつもお世話になっております。</p>
          <p>請求書を送付いたしますので、ご確認のほどよろしくお願いいたします。</p>

          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>請求書番号:</strong> ${invoiceNumber}</p>
            <p><strong>請求金額:</strong> ¥${totalAmount.toLocaleString()}</p>
            ${dueDate ? `<p><strong>お支払い期限:</strong> ${dueDate}</p>` : ''}
          </div>

          ${pdfUrl ? `<p><a href="${pdfUrl}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">請求書をダウンロード</a></p>` : ''}

          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>
      `,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { error: 'メール送信に失敗しました' }
  }
}

type SendQuoteEmailParams = {
  to: string
  quoteNumber: string
  companyName: string
  totalAmount: number
  expiryDate?: string
  pdfUrl?: string
}

export async function sendQuoteEmail({
  to,
  quoteNumber,
  companyName,
  totalAmount,
  expiryDate,
  pdfUrl,
}: SendQuoteEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: [to],
      subject: `お見積書 ${quoteNumber} のご送付`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>お見積書をお送りします</h2>
          <p>${companyName} 御中</p>
          <p>いつもお世話になっております。</p>
          <p>お見積書を送付いたしますので、ご確認のほどよろしくお願いいたします。</p>

          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>見積書番号:</strong> ${quoteNumber}</p>
            <p><strong>お見積金額:</strong> ¥${totalAmount.toLocaleString()}</p>
            ${expiryDate ? `<p><strong>有効期限:</strong> ${expiryDate}</p>` : ''}
          </div>

          ${pdfUrl ? `<p><a href="${pdfUrl}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">見積書をダウンロード</a></p>` : ''}

          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            ご不明な点やご質問がございましたら、お気軽にお問い合わせください。
          </p>
        </div>
      `,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { error: 'メール送信に失敗しました' }
  }
}
