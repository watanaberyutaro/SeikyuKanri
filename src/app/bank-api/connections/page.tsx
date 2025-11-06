'use client'

/**
 * Bank API Connections Management Page
 *
 * Manages Moneytree OAuth connections and displays sync status
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRouter, useSearchParams } from 'next/navigation'

export default function BankAPIConnectionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connection, setConnection] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Check for success/error messages from OAuth callback
    const error = searchParams.get('error')
    const success = searchParams.get('success')

    if (error) {
      setMessage({ type: 'error', text: `接続エラー: ${error}` })
    } else if (success === 'connected') {
      setMessage({ type: 'success', text: 'Moneytreeへの接続に成功しました！' })
    }

    loadConnectionData()
  }, [searchParams])

  const loadConnectionData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Get provider ID
      const { data: provider } = await supabase
        .from('bank_api_providers')
        .select('id')
        .eq('name', 'moneytree')
        .single()

      if (!provider) {
        throw new Error('Provider not found')
      }

      // Get user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) throw new Error('Tenant not found')

      // Get connection
      const { data: conn } = await supabase
        .from('bank_api_connections')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('provider_id', provider.id)
        .eq('status', 'active')
        .single()

      setConnection(conn)

      if (conn) {
        // Load accounts
        const accountsRes = await fetch('/api/bank-api/accounts')
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData.accounts || [])
        }

        // Load unmatched transactions
        const txnsRes = await fetch('/api/bank-api/transactions?matched=false&direction=in&limit=50')
        if (txnsRes.ok) {
          const txnsData = await txnsRes.json()
          setTransactions(txnsData.transactions || [])
        }
      }
    } catch (error) {
      console.error('Failed to load connection data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    window.location.href = '/api/bank-api/connect/moneytree'
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/bank-api/sync', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const result = await response.json()

      setMessage({
        type: 'success',
        text: `同期完了！口座: ${result.accounts_synced}, 取引: ${result.transactions_inserted}件 (重複: ${result.transactions_duplicated}件)`
      })

      // Reload data
      await loadConnectionData()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '同期に失敗しました'
      })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">銀行API連携</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ダッシュボードに戻る
        </Button>
      </div>

      {message && (
        <Card className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <CardContent className="pt-6">
            <p className={message.type === 'error' ? 'text-red-600' : 'text-green-600'}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>接続状態</CardTitle>
          <CardDescription>Moneytree OAuth接続の管理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="default">接続済み</Badge>
                <span className="text-sm text-muted-foreground">
                  最終更新: {new Date(connection.updated_at).toLocaleString('ja-JP')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? '同期中...' : 'データを同期'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Moneytreeに接続して、銀行口座データを自動取得できます。
              </p>
              <Button onClick={handleConnect}>Moneytreeに接続</Button>
            </>
          )}
        </CardContent>
      </Card>

      {connection && accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>連携口座</CardTitle>
            <CardDescription>同期された銀行口座一覧</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>口座名</TableHead>
                  <TableHead>銀行名</TableHead>
                  <TableHead>口座番号</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>残高</TableHead>
                  <TableHead>最終同期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>{account.bank_name || '-'}</TableCell>
                    <TableCell>{account.account_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {account.account_type === 'checking' && '普通'}
                        {account.account_type === 'savings' && '貯蓄'}
                        {account.account_type === 'other' && 'その他'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.current_balance
                        ? `¥${Number(account.current_balance).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {account.last_synced_at
                        ? new Date(account.last_synced_at).toLocaleString('ja-JP')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {connection && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>未消込取引</CardTitle>
            <CardDescription>請求書と照合されていない入金取引</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>取引日</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>口座</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{txn.txn_date}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className="font-semibold">
                      ¥{Number(txn.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>{txn.bank_api_accounts?.account_name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length > 20 && (
              <p className="text-sm text-muted-foreground mt-4">
                {transactions.length - 20}件の取引が省略されています
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
