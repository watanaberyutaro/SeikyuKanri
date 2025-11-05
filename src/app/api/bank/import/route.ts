import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBankRowHash } from '@/lib/reconciliation/matching'

/**
 * CSV/TSVファイルをパース
 */
function parseCSV(content: string, delimiter: string = ','): string[][] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  return lines.map((line) => {
    // 簡易的なCSVパーサー（引用符対応）
    const cells: string[] = []
    let cell = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // エスケープされた引用符
          cell += '"'
          i++
        } else {
          // 引用符の開始/終了
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        // セル区切り
        cells.push(cell.trim())
        cell = ''
      } else {
        cell += char
      }
    }

    cells.push(cell.trim())
    return cells
  })
}

/**
 * ファイルの区切り文字を自動判定
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/)[0] || ''

  // TSV（タブ）をチェック
  if (firstLine.includes('\t')) {
    return '\t'
  }

  // CSV（カンマ）をデフォルト
  return ','
}

/**
 * POST /api/bank/import
 *
 * CSV/TSVファイルをアップロードして銀行取引データをインポート
 */
export async function POST(request: NextRequest) {
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

    // FormDataを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const accountName = formData.get('account_name') as string
    const dateColumn = parseInt(formData.get('date_column') as string)
    const descriptionColumn = parseInt(formData.get('description_column') as string)
    const amountColumn = parseInt(formData.get('amount_column') as string)
    const typeColumn = parseInt(formData.get('type_column') as string) || -1
    const hasHeader = formData.get('has_header') === 'true'

    if (!file || !accountName) {
      return NextResponse.json(
        { error: 'ファイルと口座名は必須です' },
        { status: 400 }
      )
    }

    // ファイル内容を読み取り
    const content = await file.text()
    const delimiter = detectDelimiter(content)
    const rows = parseCSV(content, delimiter)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'ファイルが空です' }, { status: 400 })
    }

    // ヘッダー行をスキップ
    const dataRows = hasHeader ? rows.slice(1) : rows

    if (dataRows.length === 0) {
      return NextResponse.json({ error: 'データ行がありません' }, { status: 400 })
    }

    // bank_statement を作成
    const { data: statement, error: statementError } = await supabase
      .from('bank_statements')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        account_name: accountName,
        statement_date: new Date().toISOString().split('T')[0],
        file_name: file.name,
        row_count: 0,
        matched_count: 0
      })
      .select('id')
      .single()

    if (statementError || !statement) {
      console.error('Statement creation error:', statementError)
      return NextResponse.json(
        { error: 'ステートメントの作成に失敗しました' },
        { status: 500 }
      )
    }

    // データ行を処理
    const bankRowsToInsert: any[] = []
    let successCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]

      try {
        // カラムデータを取得
        const txnDateStr = row[dateColumn]?.trim()
        const description = row[descriptionColumn]?.trim() || '(no description)'
        const amountStr = row[amountColumn]?.trim()

        if (!txnDateStr || !amountStr) {
          errors.push(`行${i + 1}: 日付または金額が欠けています`)
          continue
        }

        // 日付をパース（YYYY-MM-DD形式に変換）
        let txnDate: string
        try {
          // 日付フォーマットを柔軟に処理
          const dateParsed = new Date(txnDateStr)
          if (isNaN(dateParsed.getTime())) {
            throw new Error('Invalid date')
          }
          txnDate = dateParsed.toISOString().split('T')[0]
        } catch {
          errors.push(`行${i + 1}: 日付フォーマットが不正です: ${txnDateStr}`)
          continue
        }

        // 金額をパース
        const amountParsed = parseFloat(amountStr.replace(/,/g, ''))
        if (isNaN(amountParsed)) {
          errors.push(`行${i + 1}: 金額フォーマットが不正です: ${amountStr}`)
          continue
        }

        // 入出金タイプを判定
        let type: 'in' | 'out'
        const amount = Math.abs(amountParsed)

        if (typeColumn >= 0 && row[typeColumn]) {
          // typeColumnが指定されている場合
          const typeStr = row[typeColumn].trim().toLowerCase()
          if (typeStr.includes('入金') || typeStr === 'in' || typeStr === 'credit') {
            type = 'in'
          } else if (typeStr.includes('出金') || typeStr === 'out' || typeStr === 'debit') {
            type = 'out'
          } else if (amountParsed >= 0) {
            type = 'in'
          } else {
            type = 'out'
          }
        } else {
          // 金額の符号で判定
          type = amountParsed >= 0 ? 'in' : 'out'
        }

        // ハッシュを生成
        const hash = await generateBankRowHash(txnDate, amount, description, type)

        // 重複チェック
        const { data: existingRow } = await supabase
          .from('bank_rows')
          .select('id')
          .eq('hash', hash)
          .eq('tenant_id', profile.tenant_id)
          .single()

        if (existingRow) {
          duplicateCount++
          continue
        }

        // bank_rows に追加
        bankRowsToInsert.push({
          tenant_id: profile.tenant_id,
          user_id: user.id,
          statement_id: statement.id,
          txn_date: txnDate,
          description: description,
          amount: amount,
          type: type,
          hash: hash,
          matched: false
        })

        successCount++
      } catch (error) {
        errors.push(`行${i + 1}: ${error instanceof Error ? error.message : '不明なエラー'}`)
      }
    }

    // バッチ挿入
    if (bankRowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('bank_rows').insert(bankRowsToInsert)

      if (insertError) {
        console.error('Batch insert error:', insertError)
        return NextResponse.json(
          { error: 'データの挿入に失敗しました', details: insertError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      statement_id: statement.id,
      total_rows: dataRows.length,
      success_count: successCount,
      duplicate_count: duplicateCount,
      error_count: errors.length,
      errors: errors.slice(0, 10) // 最初の10件のエラーのみ返す
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      {
        error: 'インポート中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/bank/import?statement_id={uuid}
 *
 * インポート済みのステートメント情報を取得
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

    if (statementId) {
      // 特定のステートメントを取得
      const { data: statement, error } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('id', statementId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !statement) {
        return NextResponse.json({ error: 'ステートメントが見つかりません' }, { status: 404 })
      }

      return NextResponse.json({ statement })
    } else {
      // 全ステートメントを取得
      const { data: statements, error } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
      }

      return NextResponse.json({ statements })
    }
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json(
      {
        error: 'データ取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
