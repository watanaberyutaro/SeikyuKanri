'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calculator, Upload } from 'lucide-react'
import { Account, AccountType } from '@/types/accounting'
import { importAccounts, autoImportAccountsIfNeeded } from './actions'

const accountTypeLabels: Record<AccountType, string> = {
  asset: '資産',
  liability: '負債',
  equity: '純資産',
  revenue: '収益',
  expense: '費用',
  contra: '評価勘定',
}

const accountTypeColors: Record<AccountType, string> = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-purple-100 text-purple-800',
  revenue: 'bg-green-100 text-green-800',
  expense: 'bg-orange-100 text-orange-800',
  contra: 'bg-gray-100 text-gray-800',
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    setLoading(true)
    try {
      // 勘定科目を取得
      const response = await fetch('/api/accounts')
      const data = await response.json()
      const fetchedAccounts = data.accounts || []

      // 勘定科目が0件の場合、自動インポートを実行
      if (fetchedAccounts.length === 0) {
        console.log('勘定科目が0件のため、自動インポートを試行します...')
        const importResult = await autoImportAccountsIfNeeded()

        if (importResult.imported) {
          console.log('✅ 自動インポート成功:', importResult.message)
          // 再度取得
          const response2 = await fetch('/api/accounts')
          const data2 = await response2.json()
          setAccounts(data2.accounts || [])
        } else if (importResult.error) {
          console.error('❌ 自動インポート失敗:', importResult.error)
          setAccounts(fetchedAccounts)
        } else {
          setAccounts(fetchedAccounts)
        }
      } else {
        setAccounts(fetchedAccounts)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!confirm('初期科目テンプレート（58科目 + 5税率）をインポートします。\\n\\n実行しますか？')) {
      return
    }

    setImporting(true)
    try {
      const result = await importAccounts()

      if (result.error) {
        alert(`❌ エラー: ${result.error}`)
      } else if (result.success) {
        alert(`✅ ${result.message}`)
        await fetchAccounts()
      }
    } catch (error: any) {
      alert(`❌ エラー: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = []
    }
    acc[account.type].push(account)
    return acc
  }, {} as Record<AccountType, Account[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">勘定科目</h1>
          <p className="text-muted-foreground mt-1">勘定科目マスタの管理</p>
        </div>
        <Button onClick={handleImport} disabled={importing || loading}>
          <Upload className="h-4 w-4 mr-2" />
          {importing ? '処理中...' : '初期科目をインポート'}
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総科目数</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}科目</div>
            <p className="text-xs text-muted-foreground mt-1">
              有効: {accounts.filter((a) => a.is_active).length}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">資産科目</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {accounts.filter((a) => a.type === 'asset').length}科目
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">費用科目</CardTitle>
            <Calculator className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {accounts.filter((a) => a.type === 'expense').length}科目
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 科目一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>勘定科目一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                勘定科目が登録されていません
              </p>
              <Button onClick={handleImport} disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? '処理中...' : '初期科目をインポート'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {(['asset', 'liability', 'equity', 'revenue', 'expense', 'contra'] as AccountType[]).map(
                (type) =>
                  groupedAccounts[type] && groupedAccounts[type].length > 0 && (
                    <div key={type}>
                      <h3 className="text-lg font-semibold mb-3">
                        {accountTypeLabels[type]}
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>コード</TableHead>
                            <TableHead>科目名</TableHead>
                            <TableHead>税区分</TableHead>
                            <TableHead>状態</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedAccounts[type].map((account) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-mono">
                                {account.code}
                              </TableCell>
                              <TableCell className="font-medium">
                                {account.name}
                              </TableCell>
                              <TableCell>
                                {account.tax_category ? (
                                  <Badge variant="outline">
                                    {account.tax_category === 'standard' && '課税'}
                                    {account.tax_category === 'reduced' && '軽減'}
                                    {account.tax_category === 'exempt' && '非課税'}
                                    {account.tax_category === 'non-tax' && '対象外'}
                                  </Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                {account.is_active ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-100 text-green-800"
                                  >
                                    有効
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100">
                                    無効
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
