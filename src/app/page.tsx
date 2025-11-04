import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Receipt, Building2, TrendingUp, Shield, CheckCircle2, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              請求書管理システム
            </span>
          </div>
          <div className="flex gap-3">
            <Link href="/apply">
              <Button size="lg" variant="default">
                新規お申し込み
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                ログイン
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            請求業務を<span className="text-primary">シンプル</span>に。
            <br />
            経営を<span className="text-primary">スマート</span>に。
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            見積書・請求書発行から売掛・買掛管理、会計処理まで。
            <br />
            中小企業の経理業務を一元管理できるクラウドシステム。
          </p>
          <div className="flex gap-4 justify-center pt-6">
            <Link href="/apply">
              <Button size="lg" className="text-lg px-8 py-6">
                今すぐ無料で始める
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                機能を見る
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="container mx-auto px-4 py-20 bg-white">
        <h2 className="text-4xl font-bold text-center mb-12">主な機能</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="rounded-full bg-blue-100 w-16 h-16 flex items-center justify-center mb-4">
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">請求書管理</h3>
              <p className="text-muted-foreground">
                見積書・請求書をかんたん作成。PDF出力やメール送信にも対応。テンプレートで作業効率アップ。
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="rounded-full bg-green-100 w-16 h-16 flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">売掛・買掛管理</h3>
              <p className="text-muted-foreground">
                入金管理や支払管理を自動化。期限超過アラートで未回収リスクを軽減します。
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="rounded-full bg-purple-100 w-16 h-16 flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">会計・レポート</h3>
              <p className="text-muted-foreground">
                仕訳入力から試算表、貸借対照表まで。リアルタイムで経営状況を把握できます。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* メリットセクション */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-b from-blue-50 to-white">
        <h2 className="text-4xl font-bold text-center mb-12">選ばれる理由</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">かんたん操作</h3>
              <p className="text-muted-foreground">
                直感的なUIで、ITに詳しくなくてもすぐに使いこなせます。
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">クラウドで安心</h3>
              <p className="text-muted-foreground">
                データは自動バックアップ。いつでもどこでもアクセス可能。
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">マルチテナント対応</h3>
              <p className="text-muted-foreground">
                企業ごとにデータを完全分離。セキュリティも万全です。
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">充実のサポート</h3>
              <p className="text-muted-foreground">
                導入から運用まで、専任スタッフが丁寧にサポートします。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 機能詳細セクション */}
      <section className="container mx-auto px-4 py-20 bg-white">
        <h2 className="text-4xl font-bold text-center mb-12">機能一覧</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { icon: Receipt, title: '見積書作成', desc: '柔軟なテンプレートで素早く作成' },
            { icon: Receipt, title: '請求書発行', desc: 'PDF出力・メール送信対応' },
            { icon: Building2, title: '企業管理', desc: '取引先情報を一元管理' },
            { icon: TrendingUp, title: '売掛管理', desc: '入金状況をリアルタイム把握' },
            { icon: TrendingUp, title: '買掛管理', desc: '支払予定を見える化' },
            { icon: BarChart3, title: '仕訳入力', desc: '複式簿記に完全対応' },
            { icon: BarChart3, title: '試算表', desc: '期間ごとの残高を確認' },
            { icon: BarChart3, title: '決算書', desc: '貸借対照表・損益計算書' },
            { icon: Shield, title: 'セキュリティ', desc: 'データ暗号化・RLS対応' },
          ].map((item, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex gap-3">
                <item.icon className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTAセクション */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold">今すぐ始めましょう</h2>
          <p className="text-xl opacity-90">
            請求書管理システムで、経理業務の効率化を実現。
            <br />
            まずは無料でお試しください。
          </p>
          <Link href="/apply">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6 mt-4">
              無料で申し込む
            </Button>
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 請求書管理システム. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
