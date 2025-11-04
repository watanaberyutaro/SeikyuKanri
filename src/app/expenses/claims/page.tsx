'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, FileText, Clock, CheckCircle2, XCircle, DollarSign, Search } from 'lucide-react'
import { ExpenseClaimWithDetails, ExpenseClaimStatus } from '@/types/expense'

export default function ExpenseClaimsPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<ExpenseClaimWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ExpenseClaimStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('status', filter)
      }

      const response = await fetch(`/api/expenses/claims?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setClaims(data.claims || [])
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClaims()
  }, [filter])

  const getStatusBadge = (status: ExpenseClaimStatus) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            下書き
          </Badge>
        )
      case 'submitted':
        return (
          <Badge variant="default" className="gap-1 bg-blue-600">
            <Clock className="h-3 w-3" />
            申請済み
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            承認済み
          </Badge>
        )
      case 'reimbursed':
        return (
          <Badge variant="default" className="gap-1 bg-purple-600">
            <DollarSign className="h-3 w-3" />
            精算済み
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            却下
          </Badge>
        )
      default:
        return null
    }
  }

  const filteredClaims = claims.filter((claim) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        claim.employee_email?.toLowerCase().includes(query) ||
        claim.notes?.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">経費精算</h1>
            <p className="text-muted-foreground">経費申請の一覧と管理</p>
          </div>
          <Button onClick={() => router.push('/expenses/claims/new')} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            新規申請
          </Button>
        </div>

        {/* 検索バー */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="申請者やメモで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            すべて
          </Button>
          <Button
            variant={filter === 'draft' ? 'default' : 'outline'}
            onClick={() => setFilter('draft')}
            size="sm"
          >
            下書き
          </Button>
          <Button
            variant={filter === 'submitted' ? 'default' : 'outline'}
            onClick={() => setFilter('submitted')}
            size="sm"
          >
            申請済み
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
            size="sm"
          >
            承認済み
          </Button>
          <Button
            variant={filter === 'reimbursed' ? 'default' : 'outline'}
            onClick={() => setFilter('reimbursed')}
            size="sm"
          >
            精算済み
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilter('rejected')}
            size="sm"
          >
            却下
          </Button>
        </div>
      </div>

      {/* 申請一覧 */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
      ) : filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>経費申請がありません</p>
            <Button
              onClick={() => router.push('/expenses/claims/new')}
              className="mt-4"
              variant="outline"
            >
              新規申請を作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredClaims.map((claim) => (
            <Card
              key={claim.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/expenses/claims/${claim.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      申請日: {claim.submit_date ? new Date(claim.submit_date).toLocaleDateString('ja-JP') : '未提出'}
                    </CardTitle>
                    <CardDescription>
                      申請者: {claim.employee_email || '不明'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(claim.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      明細数: {claim.items?.length || 0}件
                    </p>
                    {claim.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        メモ: {claim.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ¥{claim.total_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">合計金額</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
