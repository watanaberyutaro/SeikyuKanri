import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findMatches } from '@/lib/reconciliation/matching'

/**
 * GET /api/bank/reconcile?statement_id={uuid}
 *
 * 未突合の bank_rows とその突合候補を取得
 */
export async function GET(request: NextRequest) {
  try {
    // Feature flag チェック
    if (process.env.FEATURE_BANK_IMPORT !== '1') {
      return NextResponse.json(
        { error: 'この機能は無効化されています' },
        { status: 404 }
      )
    }

    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // プロフィール取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const statementId = searchParams.get('statement_id')

    if (!statementId) {
      return NextResponse.json({ error: 'statement_id は必須です' }, { status: 400 })
    }

    // ステートメントの存在確認
    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .select('*')
      .eq('id', statementId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (statementError || !statement) {
      return NextResponse.json({ error: 'ステートメントが見つかりません' }, { status: 404 })
    }

    // 未突合の bank_rows を取得
    const { data: unmatchedRows, error: rowsError } = await supabase
      .from('bank_rows')
      .select('*')
      .eq('statement_id', statementId)
      .eq('tenant_id', profile.tenant_id)
      .eq('matched', false)
      .order('txn_date', { ascending: true })

    if (rowsError) {
      console.error('Rows fetch error:', rowsError)
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
    }

    if (!unmatchedRows || unmatchedRows.length === 0) {
      return NextResponse.json({
        statement,
        unmatched_rows: [],
        total_unmatched: 0
      })
    }

    // 各行の突合候補を検索
    const rowsWithMatches = await Promise.all(
      unmatchedRows.map(async (row) => {
        const matches = await findMatches(supabase, profile.tenant_id, {
          id: row.id,
          txn_date: row.txn_date,
          amount: Number(row.amount),
          description: row.description,
          type: row.type as 'in' | 'out'
        })

        return {
          ...row,
          matches: matches || []
        }
      })
    )

    return NextResponse.json({
      statement,
      unmatched_rows: rowsWithMatches,
      total_unmatched: rowsWithMatches.length
    })
  } catch (error) {
    console.error('Reconcile GET error:', error)
    return NextResponse.json(
      {
        error: 'データ取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
