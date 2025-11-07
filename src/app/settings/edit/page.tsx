'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Upload, Trash2, Save } from 'lucide-react'
import { updateTenantSettings, uploadCompanySeal, deleteCompanySeal } from '../actions'
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
  bank_name?: string
  bank_branch?: string
  bank_account_type?: string
  bank_account_number?: string
  bank_account_holder?: string
}

export default function SettingsEditPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<TenantSettings>({
    company_name: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [migrationStatus, setMigrationStatus] = useState<{
    has_migration: boolean
    missing_columns: string[]
  } | null>(null)

  useEffect(() => {
    checkMigration()
    fetchSettings()
  }, [])

  async function checkMigration() {
    try {
      const response = await fetch('/api/check-migration')
      if (response.ok) {
        const data = await response.json()
        setMigrationStatus(data)
        if (!data.has_migration) {
          console.warn('Migration not applied:', data)
        }
      }
    } catch (error) {
      console.error('Failed to check migration:', error)
    }
  }

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
          bank_name: tenant.bank_name || '',
          bank_branch: tenant.bank_branch || '',
          bank_account_type: tenant.bank_account_type || '',
          bank_account_number: tenant.bank_account_number || '',
          bank_account_holder: tenant.bank_account_holder || '',
        })
        setPreviewUrl(tenant.company_seal_url || null)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateTenantSettings({
        company_name: settings.company_name,
        invoice_registration_number: settings.invoice_registration_number,
        postal_code: settings.postal_code,
        address: settings.address,
        phone: settings.phone,
        representative_name: settings.representative_name,
        email: settings.email,
        website: settings.website,
        description: settings.description,
        bank_name: settings.bank_name,
        bank_branch: settings.bank_branch,
        bank_account_type: settings.bank_account_type,
        bank_account_number: settings.bank_account_number,
        bank_account_holder: settings.bank_account_holder,
      })

      if (result?.error) {
        alert(`エラー: ${result.error}`)
        console.error('Save error:', result.error)
      } else {
        alert('設定を保存しました')
        // ページを強制的にリロード
        router.push('/settings')
        router.refresh()
      }
    } catch (error: any) {
      console.error('Save exception:', error)
      alert(`エラー: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('seal', file)

      const result = await uploadCompanySeal(formData)

      console.log('Upload result:', result)

      if (result?.error) {
        console.error('Upload error:', result)

        // より詳細なエラーメッセージを表示
        if (result.error.includes('バケット') || result.error.includes('bucket')) {
          alert(
            `エラー: ${result.error}\n\n` +
            `Supabaseダッシュボードで「company-seals」バケットを作成してください。\n` +
            `詳細は上部の黄色い注意書きを確認してください。`
          )
        } else {
          alert(`エラー: ${result.error}`)
        }
      } else if (result?.url) {
        alert('ハンコをアップロードしました')
        setPreviewUrl(result.url)
        setSettings({ ...settings, company_seal_url: result.url })
      }
    } catch (error: any) {
      console.error('Upload exception:', error)
      alert(
        `エラー: ${error.message}\n\n` +
        `予期しないエラーが発生しました。ブラウザのコンソール（F12）を確認してください。`
      )
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  async function handleDeleteSeal() {
    if (!confirm('ハンコを削除しますか？')) return

    setDeleting(true)
    try {
      const result = await deleteCompanySeal()

      if (result?.error) {
        alert(`エラー: ${result.error}`)
      } else {
        alert('ハンコを削除しました')
        setPreviewUrl(null)
        setSettings({ ...settings, company_seal_url: '' })
      }
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setDeleting(false)
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
          <h1 className="text-3xl font-bold">設定編集</h1>
          <p className="text-muted-foreground mt-1">企業情報とシステム設定を編集</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings">キャンセル</Link>
        </Button>
      </div>

      {/* マイグレーション警告 */}
      {migrationStatus && !migrationStatus.has_migration && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Building2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-900">
                  データベースマイグレーションが必要です
                </p>
                <p className="text-sm text-red-800">
                  設定を保存するには、以下のSQLをSupabase SQL Editorで実行してください:
                </p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS invoice_registration_number TEXT,
ADD COLUMN IF NOT EXISTS company_seal_url TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;`}
                </pre>
                <p className="text-sm text-red-800">
                  不足しているカラム: {migrationStatus.missing_columns.join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 企業情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            企業情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">
                企業名 <span className="text-red-600">*</span>
              </Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) =>
                  setSettings({ ...settings, company_name: e.target.value })
                }
                placeholder="株式会社サンプル"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_registration_number">
                インボイス登録番号
              </Label>
              <Input
                id="invoice_registration_number"
                value={settings.invoice_registration_number || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    invoice_registration_number: e.target.value,
                  })
                }
                placeholder="T1234567890123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">郵便番号</Label>
              <Input
                id="postal_code"
                value={settings.postal_code || ''}
                onChange={(e) =>
                  setSettings({ ...settings, postal_code: e.target.value })
                }
                placeholder="123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                value={settings.phone || ''}
                onChange={(e) =>
                  setSettings({ ...settings, phone: e.target.value })
                }
                placeholder="03-1234-5678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={settings.address || ''}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
              placeholder="東京都渋谷区..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="representative_name">代表者名</Label>
              <Input
                id="representative_name"
                value={settings.representative_name || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    representative_name: e.target.value,
                  })
                }
                placeholder="山田 太郎"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ''}
                onChange={(e) =>
                  setSettings({ ...settings, email: e.target.value })
                }
                placeholder="info@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">ウェブサイト</Label>
            <Input
              id="website"
              type="url"
              value={settings.website || ''}
              onChange={(e) =>
                setSettings({ ...settings, website: e.target.value })
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">企業説明・備考</Label>
            <Textarea
              id="description"
              value={settings.description || ''}
              onChange={(e) =>
                setSettings({ ...settings, description: e.target.value })
              }
              placeholder="企業の説明や特記事項を入力してください"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* 振込先口座情報 */}
      <Card>
        <CardHeader>
          <CardTitle>振込先口座情報</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            請求書に記載される振込先口座情報を設定してください
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">銀行名</Label>
              <Input
                id="bank_name"
                value={settings.bank_name || ''}
                onChange={(e) =>
                  setSettings({ ...settings, bank_name: e.target.value })
                }
                placeholder="例: 三菱UFJ銀行"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_branch">支店名</Label>
              <Input
                id="bank_branch"
                value={settings.bank_branch || ''}
                onChange={(e) =>
                  setSettings({ ...settings, bank_branch: e.target.value })
                }
                placeholder="例: 渋谷支店"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account_type">口座種別</Label>
              <Input
                id="bank_account_type"
                value={settings.bank_account_type || ''}
                onChange={(e) =>
                  setSettings({ ...settings, bank_account_type: e.target.value })
                }
                placeholder="例: 普通"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account_number">口座番号</Label>
              <Input
                id="bank_account_number"
                value={settings.bank_account_number || ''}
                onChange={(e) =>
                  setSettings({ ...settings, bank_account_number: e.target.value })
                }
                placeholder="例: 1234567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_account_holder">口座名義</Label>
            <Input
              id="bank_account_holder"
              value={settings.bank_account_holder || ''}
              onChange={(e) =>
                setSettings({ ...settings, bank_account_holder: e.target.value })
              }
              placeholder="例: カ）サンプルカイシャ"
            />
          </div>
        </CardContent>
      </Card>

      {/* 電子印（ハンコ） */}
      <Card>
        <CardHeader>
          <CardTitle>電子印（ハンコ）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-900 mb-2">
              ⚠️ 初回セットアップが必要です
            </p>
            <p className="text-sm text-yellow-800 mb-2">
              電子印をアップロードするには、Supabase Storageでバケットとポリシーを設定する必要があります。
            </p>
            <details className="text-sm text-yellow-800">
              <summary className="cursor-pointer font-medium mb-2">セットアップ手順（2ステップ）</summary>

              <div className="mt-2 mb-3">
                <p className="font-semibold mb-1">ステップ1: バケットを作成</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Supabaseダッシュボードにアクセス: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">https://supabase.com/dashboard</a></li>
                  <li>プロジェクトを選択</li>
                  <li>左メニューから「Storage」をクリック</li>
                  <li>「Create a new bucket」をクリック</li>
                  <li>バケット名に「<strong>company-seals</strong>」と入力</li>
                  <li>「Public bucket」をONにする</li>
                  <li>「Save」をクリック</li>
                </ol>
              </div>

              <div className="mt-2 mb-2">
                <p className="font-semibold mb-1">ステップ2: ポリシーを設定（重要）</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>「SQL Editor」タブをクリック</li>
                  <li>プロジェクトルートの「<strong>supabase-storage-policies.sql</strong>」を開く</li>
                  <li>内容をコピーしてSQL Editorにペースト</li>
                  <li>「Run」をクリックして実行</li>
                </ol>
              </div>

              <p className="text-xs mt-2">
                詳細は <strong>STORAGE_SETUP.md</strong> を参照してください
              </p>
            </details>
          </div>

          <p className="text-sm text-muted-foreground">
            請求書などに押印する電子印の画像をアップロードできます。
            <br />
            対応形式: PNG, JPEG, GIF（最大10MB）
          </p>

          {previewUrl && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">現在のハンコ</p>
              <div className="flex items-start gap-4">
                <div className="border rounded bg-white p-4">
                  <img
                    src={previewUrl}
                    alt="Company Seal"
                    className="max-w-[200px] max-h-[200px] object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSeal}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                  {deleting ? '削除中...' : '削除'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="seal">
              {previewUrl ? '新しいハンコをアップロード' : 'ハンコをアップロード'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="seal"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && (
                <span className="text-sm text-muted-foreground">
                  アップロード中...
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/settings">キャンセル</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving || !settings.company_name}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>

      {/* 注意事項 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">設定について</p>
              <p className="text-sm text-blue-800">
                企業名は必須項目です。その他の項目は任意ですが、請求書などに表示される情報のため、正確に入力してください。
                <br />
                電子印は請求書PDF生成時に使用されます。透過PNG形式を推奨します。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
