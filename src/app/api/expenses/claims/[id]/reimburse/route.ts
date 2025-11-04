import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/expenses/claims/[id]/reimburse - 経費を精算（会計連携）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // プロフィールからtenant_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  const { id: claimId } = await params

  try {
    const body = await request.json()
    const paymentDate = body.paymentDate || new Date().toISOString().split('T')[0]

    // 申請を取得（明細も含む）
    const { data: claim, error: fetchError } = await supabase
      .from('expense_claims')
      .select(`
        *,
        items:expense_items(
          id,
          spent_on,
          merchant,
          description,
          amount,
          account_id,
          tax_rate_id,
          account:accounts(id, code, name),
          tax_rate:tax_rates(id, name, rate)
        )
      `)
      .eq('id', claimId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !claim) {
      return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
    }

    // ステータスチェック
    if (claim.status !== 'approved') {
      return NextResponse.json(
        { error: '承認済みの申請のみ精算できます' },
        { status: 400 }
      )
    }

    // 会計コアがONの場合は仕訳を起票
    const isAccountingEnabled = process.env.FEATURE_ACCOUNTING === '1'
    let journalEntryId: string | null = null

    if (isAccountingEnabled) {
      try {
        // 未払金勘定を取得（負債勘定、通常は2XXXコード）
        const { data: payableAccount } = await supabase
          .from('accounts')
          .select('id, code, name')
          .eq('tenant_id', profile.tenant_id)
          .eq('account_type', 'liability')
          .ilike('name', '%未払%')
          .single()

        if (!payableAccount) {
          return NextResponse.json(
            { error: '未払金勘定が見つかりません。勘定科目を設定してください' },
            { status: 400 }
          )
        }

        // 仕訳ヘッダーを作成
        const { data: journalEntry, error: jeError } = await supabase
          .from('journal_entries')
          .insert({
            tenant_id: profile.tenant_id,
            entry_date: paymentDate,
            description: `経費精算: ${claim.employee_user_id || ''}`,
            reference_type: 'expense_claim',
            reference_id: claimId,
            created_by: user.id,
          })
          .select()
          .single()

        if (jeError || !journalEntry) {
          console.error('Journal entry creation error:', jeError)
          return NextResponse.json(
            { error: '仕訳の作成に失敗しました' },
            { status: 500 }
          )
        }

        journalEntryId = journalEntry.id

        // 仕訳明細を作成（各経費明細ごとに）
        const lineItems: any[] = []
        let totalDebit = 0

        for (const item of claim.items || []) {
          if (!item.account_id) {
            // 勘定科目が未設定の明細はスキップ
            console.warn(`Expense item ${item.id} has no account_id`)
            continue
          }

          // 借方: 経費科目（旅費交通費など）
          lineItems.push({
            tenant_id: profile.tenant_id,
            journal_entry_id: journalEntry.id,
            account_id: item.account_id,
            debit: item.amount,
            credit: 0,
            tax_rate_id: item.tax_rate_id || null,
            description: item.description || item.merchant,
          })

          totalDebit += parseFloat(item.amount.toString())
        }

        // 貸方: 未払金
        lineItems.push({
          tenant_id: profile.tenant_id,
          journal_entry_id: journalEntry.id,
          account_id: payableAccount.id,
          debit: 0,
          credit: totalDebit,
          tax_rate_id: null,
          description: '経費精算',
        })

        // 仕訳明細を一括作成
        const { error: lineError } = await supabase
          .from('journal_entry_lines')
          .insert(lineItems)

        if (lineError) {
          console.error('Journal entry lines creation error:', lineError)
          // 仕訳ヘッダーを削除してロールバック
          await supabase
            .from('journal_entries')
            .delete()
            .eq('id', journalEntry.id)

          return NextResponse.json(
            { error: '仕訳明細の作成に失敗しました' },
            { status: 500 }
          )
        }
      } catch (accountingError: any) {
        console.error('Accounting integration error:', accountingError)
        return NextResponse.json(
          { error: `会計連携エラー: ${accountingError.message}` },
          { status: 500 }
        )
      }
    }

    // ステータスを reimbursed に更新
    const { data: updatedClaim, error: updateError } = await supabase
      .from('expense_claims')
      .update({
        status: 'reimbursed',
      })
      .eq('id', claimId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (updateError) {
      console.error('Claim reimburse error:', updateError)
      // 仕訳が作成された場合は削除
      if (journalEntryId) {
        await supabase
          .from('journal_entries')
          .delete()
          .eq('id', journalEntryId)
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      journal_entry_id: journalEntryId,
      message: isAccountingEnabled
        ? '経費を精算し、仕訳を起票しました'
        : '経費を精算しました',
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
