// 監査ログユーティリティ

import { CreateAuditLogInput } from '@/types/edoc-audit'

/**
 * 監査ログを記録
 * @param input 監査ログ入力
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch (error) {
    console.error('監査ログ記録エラー:', error)
    // エラーでも処理は継続（ロギング失敗は致命的エラーにしない）
  }
}

/**
 * 変更差分を計算
 * @param before 変更前
 * @param after 変更後
 * @returns 差分オブジェクト
 */
export function calculateChanges(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, any> {
  const changes: Record<string, any> = {}

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    if (before[key] !== after[key]) {
      changes[key] = {
        from: before[key],
        to: after[key],
      }
    }
  }

  return changes
}
