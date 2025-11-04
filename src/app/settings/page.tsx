'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TenantSettings {
  company_name: string
  invoice_registration_number?: string
  postal_code?: string
  address?: string
  phone?: string
  representative_name?: string
  email?: string
  website?: string
  description?: string
  company_seal_url?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings>({
    company_name: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) return

      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()

      if (tenant) {
        setSettings({
          company_name: tenant.company_name || '',
          invoice_registration_number: tenant.invoice_registration_number || '',
          postal_code: tenant.postal_code || '',
          address: tenant.address || '',
          phone: tenant.phone || '',
          representative_name: tenant.representative_name || '',
          email: tenant.email || '',
          website: tenant.website || '',
          description: tenant.description || '',
          company_seal_url: tenant.company_seal_url || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">設定</h1>
          <p className="text-muted-foreground mt-1">企業情報とシステム設定</p>
        </div>
        <Button asChild>
          <Link href="/settings/edit">
            <Edit className="h-4 w-4 mr-2" />
            編集
          </Link>
        </Button>
      </div>

      {/* 企業情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            企業情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">企業名</div>
              <div className="text-base">{settings.company_name || '未設定'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">インボイス登録番号</div>
              <div className="text-base">{settings.invoice_registration_number || '未設定'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">郵便番号</div>
              <div className="text-base">{settings.postal_code || '未設定'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">電話番号</div>
              <div className="text-base">{settings.phone || '未設定'}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">住所</div>
            <div className="text-base">{settings.address || '未設定'}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">代表者名</div>
              <div className="text-base">{settings.representative_name || '未設定'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">メールアドレス</div>
              <div className="text-base">{settings.email || '未設定'}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">ウェブサイト</div>
            <div className="text-base">{settings.website || '未設定'}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">企業説明・備考</div>
            <div className="text-base whitespace-pre-wrap">{settings.description || '未設定'}</div>
          </div>
        </CardContent>
      </Card>

      {/* 電子印（ハンコ） */}
      <Card>
        <CardHeader>
          <CardTitle>電子印（ハンコ）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.company_seal_url ? (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">登録済みのハンコ</p>
              <div className="border rounded bg-white p-4 inline-block">
                <img
                  src={settings.company_seal_url}
                  alt="Company Seal"
                  className="max-w-[200px] max-h-[200px] object-contain"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              電子印が登録されていません。編集画面からアップロードしてください。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">設定について</p>
              <p className="text-sm text-blue-800">
                企業情報は請求書などに表示されます。
                編集ボタンから設定内容を変更できます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
