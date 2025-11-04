'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateJournal(
  id: string,
  data: {
    journal_date: string
    memo?: string
    lines: Array<{
      id?: string
      account_id: string
      description?: string
      debit: number
      credit: number
      department?: string
      line_number: number
    }>
  }
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

  // 仕訳が編集可能か確認（請求書連携の仕訳は編集不可）
  const { data: journal } = await supabase
    .from('journals')
    .select('source_type, is_approved')
    .eq('id', id)
    .eq('tenant_id', profile?.tenant_id!)
    .single()

  if (!journal) {
    return { error: '仕訳が見つかりません' }
  }

  if (journal.source_type === 'invoice') {
    return { error: '請求書連携の仕訳は編集できません' }
  }

  if (journal.is_approved) {
    return { error: '承認済みの仕訳は編集できません' }
  }

  // 借方合計と貸方合計が一致するかチェック
  const totalDebit = data.lines.reduce((sum, line) => sum + Number(line.debit), 0)
  const totalCredit = data.lines.reduce((sum, line) => sum + Number(line.credit), 0)

  if (totalDebit !== totalCredit) {
    return { error: '借方合計と貸方合計が一致しません' }
  }

  if (totalDebit === 0) {
    return { error: '金額を入力してください' }
  }

  try {
    // 仕訳を更新
    const { error: journalError } = await supabase
      .from('journals')
      .update({
        journal_date: data.journal_date,
        memo: data.memo || null,
      })
      .eq('id', id)
      .eq('tenant_id', profile?.tenant_id!)

    if (journalError) {
      return { error: journalError.message }
    }

    // 既存の明細を削除
    await supabase.from('journal_lines').delete().eq('journal_id', id)

    // 新しい明細を作成
    const lines = data.lines.map((line) => ({
      journal_id: id,
      account_id: line.account_id,
      description: line.description || null,
      debit: line.debit,
      credit: line.credit,
      department: line.department || null,
      line_number: line.line_number,
    }))

    const { error: linesError } = await supabase.from('journal_lines').insert(lines)

    if (linesError) {
      return { error: linesError.message }
    }

    revalidatePath('/accounting/journals')
    redirect('/accounting/journals')
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteJournal(id: string) {
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

  // 仕訳が削除可能か確認
  const { data: journal } = await supabase
    .from('journals')
    .select('source_type, is_approved')
    .eq('id', id)
    .eq('tenant_id', profile?.tenant_id!)
    .single()

  if (!journal) {
    return { error: '仕訳が見つかりません' }
  }

  if (journal.source_type === 'invoice') {
    return { error: '請求書連携の仕訳は削除できません。請求書を削除してください。' }
  }

  if (journal.is_approved) {
    return { error: '承認済みの仕訳は削除できません' }
  }

  // 仕訳を削除（CASCADE により明細も自動削除）
  const { error } = await supabase
    .from('journals')
    .delete()
    .eq('id', id)
    .eq('tenant_id', profile?.tenant_id!)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/accounting/journals')
  return { success: true }
}
