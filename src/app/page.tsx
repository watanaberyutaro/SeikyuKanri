import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Receipt, Building2, TrendingUp, Shield, CheckCircle2, BarChart3,
  Zap, Clock, Users, Star, ArrowRight, Sparkles, Lock,
  HeadphonesIcon, Globe, ChevronDown, Check, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#fffff8]">
      {/* ヘッダー */}
      <header className="border-b bg-[#fffff8]/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 md:py-5 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <Receipt className="h-7 w-7 md:h-9 md:w-9 text-primary" />
              <Sparkles className="h-4 w-4 text-[#90cd76] absolute -top-1 -right-1" />
            </div>
            <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-[#2c3744] via-[#2c3744] to-[#90cd76] bg-clip-text text-transparent">
              EnT
            </span>
          </div>
          <div className="flex gap-2 md:gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" className="md:text-base shadow-lg hover:shadow-xl transition-all" variant="default">
                  ダッシュボード
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/apply" className="hidden sm:block">
                  <Button size="sm" className="md:text-base bg-gradient-to-r from-[#2c3744] to-[#90cd76] hover:from-[#2c3744] hover:to-[#90cd76] shadow-lg hover:shadow-xl transition-all">
                    無料で始める
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="sm" className="md:text-base" variant="outline">
                    ログイン
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2c3744] via-[#fffff8] to-[#90cd76]">
        {/* 背景装飾 */}
        <div className="absolute inset-0 bg-grid-[#2c3744]/10 [mask-image:linear-gradient(0deg,rgba(255,255,248,1),rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2c3744]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#90cd76]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32 text-center relative">
          <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
            {/* バッジ */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2c3744]/20 rounded-full text-[#2c3744] text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              中小企業の経理業務を革新するクラウドシステム
            </div>

            {/* メインコピー */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
              <span className="block">効率的な経理業務の</span>
              <span className="block bg-gradient-to-r from-[#2c3744] via-[#90cd76] to-[#2c3744] bg-clip-text text-transparent animate-gradient">
                入口（EnTrance）
              </span>
              <span className="block text-3xl sm:text-4xl md:text-5xl mt-2">へようこそ</span>
            </h1>

            {/* サブコピー */}
            <p className="text-lg sm:text-xl md:text-2xl text-[#2c3744]/70 max-w-3xl mx-auto leading-relaxed">
              請求書作成から会計処理まで、楽しく効率的に。
              <br className="hidden md:block" />
              <span className="font-semibold text-[#2c3744]">EnT</span>は、感動体験を届ける経理システムです。
            </p>

            {/* 統計数字 */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto pt-6">
              <div className="p-4 bg-[#fffff8]/80 backdrop-blur rounded-2xl shadow-lg">
                <div className="text-3xl md:text-4xl font-bold text-[#2c3744]">80%</div>
                <div className="text-xs md:text-sm text-[#2c3744]/70 mt-1">業務時間削減</div>
              </div>
              <div className="p-4 bg-[#fffff8]/80 backdrop-blur rounded-2xl shadow-lg">
                <div className="text-3xl md:text-4xl font-bold text-[#90cd76]">99.9%</div>
                <div className="text-xs md:text-sm text-[#2c3744]/70 mt-1">稼働率保証</div>
              </div>
              <div className="p-4 bg-[#fffff8]/80 backdrop-blur rounded-2xl shadow-lg">
                <div className="text-3xl md:text-4xl font-bold text-[#2c3744]">24h</div>
                <div className="text-xs md:text-sm text-[#2c3744]/70 mt-1">サポート体制</div>
              </div>
            </div>

            {/* CTAボタン */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 max-w-md sm:max-w-none mx-auto">
              <Link href="/apply" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-[#2c3744] to-[#90cd76] hover:from-[#2c3744] hover:to-[#90cd76] shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all group"
                >
                  今すぐ無料で始める
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#features" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-lg px-8 py-6 border-2 hover:bg-[#2c3744]/20 transition-all"
                >
                  詳しく見る
                  <ChevronDown className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* 信頼性アピール */}
            <p className="text-sm text-[#2c3744]/60 pt-4">
              ✓ クレジットカード不要  ✓ いつでも解約可能  ✓ 初期費用0円
            </p>
          </div>
        </div>
      </section>

      {/* EnTの3つの意味 */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#2c3744] to-[#90cd76] bg-clip-text text-transparent">
              EnT
            </span>
            に込めた想い
          </h2>
          <p className="text-lg md:text-xl text-[#2c3744]/70 max-w-2xl mx-auto">
            3つの意味が、貴社のビジネスを次のステージへと導きます
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-[#2c3744] hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="pt-8 pb-6">
              <div className="rounded-2xl bg-gradient-to-br from-[#2c3744] to-[#2c3744] w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <ArrowRight className="h-8 w-8 text-[#fffff8]" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#2c3744]">
                EnTrance
              </h3>
              <p className="text-lg font-semibold text-[#90cd76] mb-3">
                入口
              </p>
              <p className="text-[#2c3744]/70 leading-relaxed">
                貴社の効率的な経理業務への入口となります。
                <br />
                EnTから始まる、業務改革の第一歩。
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-[#90cd76] hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="pt-8 pb-6">
              <div className="rounded-2xl bg-gradient-to-br from-[#90cd76] to-[#90cd76] w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles className="h-8 w-8 text-[#fffff8]" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#90cd76]">
                EnchanT
              </h3>
              <p className="text-lg font-semibold text-[#90cd76] mb-3">
                魔法をかける
              </p>
              <p className="text-[#2c3744]/70 leading-relaxed">
                煩雑な経理業務に魔法をかけ、組織を強化します。
                <br />
                業務効率化だけでなく、新たな価値を創造。
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-[#c94826] hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="pt-8 pb-6">
              <div className="rounded-2xl bg-gradient-to-br from-[#c94826] to-[#c94826] w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Star className="h-8 w-8 text-[#fffff8]" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#c94826]">
                EnTertainment
              </h3>
              <p className="text-lg font-semibold text-[#c94826] mb-3">
                楽しみと感動を
              </p>
              <p className="text-[#2c3744]/70 leading-relaxed">
                経理業務を楽しく、やりがいのあるものに変えていきます。
                <br />
                ゲーミフィケーションで、モチベーションアップ。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ソーシャルプルーフ */}
      <section className="bg-gradient-to-r from-[#2c3744] to-[#90cd76] py-6 md:py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-[#fffff8]/90">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm md:text-base font-medium">1,000社以上が導入</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-[#90cd76] text-[#90cd76]" />
              <span className="text-sm md:text-base font-medium">満足度 4.8/5.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm md:text-base font-medium">SSL/TLS暗号化通信</span>
            </div>
          </div>
        </div>
      </section>

      {/* 主要機能セクション */}
      <section id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#2c3744] to-[#90cd76] bg-clip-text text-transparent">
              すべての経理業務
            </span>
            を、ひとつに
          </h2>
          <p className="text-lg md:text-xl text-[#2c3744]/70 max-w-2xl mx-auto">
            請求書作成から会計処理まで、経理に必要な機能をオールインワンで提供
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {[
            {
              icon: Receipt,
              title: '請求書・見積書作成',
              desc: '美しいPDFを自動生成。カスタマイズ可能なテンプレートで、わずか30秒で作成完了',
              color: 'blue',
              gradient: 'from-[#2c3744] to-[#2c3744]'
            },
            {
              icon: Zap,
              title: '自動仕訳生成',
              desc: '請求書から仕訳を自動作成。手入力の手間を省き、入力ミスをゼロに',
              color: 'yellow',
              gradient: 'from-[#90cd76] to-[#c94826]'
            },
            {
              icon: TrendingUp,
              title: '売掛・買掛管理',
              desc: '入金状況をリアルタイムで可視化。期限超過アラートで回収漏れを防止',
              color: 'green',
              gradient: 'from-[#90cd76] to-[#90cd76]'
            },
            {
              icon: BarChart3,
              title: 'リアルタイム分析',
              desc: '試算表・BS/PLを瞬時に生成。経営判断に必要なデータがいつでも確認可能',
              color: 'purple',
              gradient: 'from-[#c94826] to-[#c94826]'
            },
            {
              icon: Clock,
              title: 'ワークフロー管理',
              desc: '承認フローを柔軟に設定。経費精算から決裁まで、スムーズに処理',
              color: 'cyan',
              gradient: 'from-[#90cd76] to-[#2c3744]'
            },
            {
              icon: Shield,
              title: 'エンタープライズセキュリティ',
              desc: 'データ暗号化・RLS対応。金融機関レベルのセキュリティで大切なデータを保護',
              color: 'red',
              gradient: 'from-[#c94826] to-[#c94826]'
            }
          ].map((feature, index) => (
            <Card
              key={index}
              className="border-2 hover:border-[#2c3744] hover:shadow-2xl transition-all duration-300 group overflow-hidden"
            >
              <CardContent className="pt-8 pb-6">
                <div className={`rounded-2xl bg-gradient-to-br ${feature.gradient} w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="h-8 w-8 text-[#fffff8]" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-[#2c3744] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[#2c3744]/70 leading-relaxed">
                  {feature.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* メリットセクション - Before/After */}
      <section className="bg-gradient-to-br from-[#2c3744] to-[#2c3744] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-[#fffff8]">
              導入で変わる、<span className="text-[#90cd76]">あなたの働き方</span>
            </h2>
            <p className="text-lg md:text-xl text-[#fffff8]/80">
              従来の経理業務から解放され、本来の業務に集中できます
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before */}
            <Card className="border-2 border-[#c94826] bg-[#fffff8]">
              <CardContent className="pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-full bg-[#c94826]/20 p-3">
                    <X className="h-6 w-6 text-[#c94826]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#c94826]">Before</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    '請求書作成に1件30分以上',
                    'Excelでの手入力ミスが頻発',
                    '入金確認に膨大な時間',
                    '決算時期は深夜残業が常態化',
                    'データ紛失のリスク'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <X className="h-5 w-5 text-[#c94826] flex-shrink-0 mt-0.5" />
                      <span className="text-[#2c3744]">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* After */}
            <Card className="border-2 border-[#90cd76] bg-[#fffff8] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#90cd76] text-[#fffff8] px-4 py-1 text-sm font-bold rounded-bl-lg">
                おすすめ
              </div>
              <CardContent className="pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-full bg-[#90cd76]/20 p-3">
                    <Check className="h-6 w-6 text-[#90cd76]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#90cd76]">After</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    '請求書作成が30秒で完了',
                    '自動仕訳で入力ミスゼロ',
                    '入金状況が一目で把握',
                    '決算書をワンクリックで生成',
                    'クラウドで完全バックアップ'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#90cd76] flex-shrink-0 mt-0.5" />
                      <span className="text-[#2c3744] font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* セキュリティ・信頼性 */}
      <section className="bg-gradient-to-br from-[#2c3744] to-[#2c3744] text-[#fffff8] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              エンタープライズレベルの<br />セキュリティと信頼性
            </h2>
            <p className="text-lg md:text-xl text-[#2c3744]">
              大切な企業データを、最高水準のセキュリティで保護します
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
            {[
              { icon: Lock, title: 'データ暗号化', desc: 'AES-256による暗号化' },
              { icon: Shield, title: 'SSL/TLS通信', desc: '安全な通信環境' },
              { icon: Globe, title: 'バックアップ', desc: '99.99%データ保全率' },
              { icon: HeadphonesIcon, title: '24時間サポート', desc: '専門スタッフが対応' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2c3744]/20/50 backdrop-blur mb-4">
                  <item.icon className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-[#2c3744]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            よくある質問
          </h2>
          <p className="text-lg md:text-xl text-[#2c3744]/70">
            お客様からよく寄せられる質問にお答えします
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {[
            {
              q: 'サービスの料金体系について',
              a: 'ご利用料金は、貴社の規模、必要な機能、ユーザー数などに応じて個別にお見積りさせていただきます。営業担当より最適なプランをご提案いたしますので、まずはお問い合わせください。'
            },
            {
              q: 'データの移行は難しいですか？',
              a: 'CSVファイルによるデータインポート機能を提供しており、既存システムからスムーズに移行できます。また、専任スタッフがサポートいたしますので、ご安心ください。'
            },
            {
              q: '複数ユーザーで使用できますか？',
              a: 'はい、可能です。ユーザー数に応じたプランをご用意しており、チーム全体で効率的に業務を進められます。権限設定も柔軟に行えます。'
            },
            {
              q: 'セキュリティは大丈夫ですか？',
              a: 'SSL/TLS通信とAES-256暗号化により、金融機関レベルのセキュリティを実現しています。データは全て暗号化され、定期的なバックアップも実施しています。'
            }
          ].map((faq, i) => (
            <Card key={i} className="border-2 hover:border-[#2c3744] transition-all">
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-3 flex items-start gap-2">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2c3744]/20 text-[#2c3744] text-sm">
                    Q
                  </span>
                  {faq.q}
                </h3>
                <p className="text-[#2c3744]/70 pl-8 leading-relaxed">
                  {faq.a}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 最終CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2c3744] via-[#90cd76] to-[#2c3744] py-16 md:py-24">
        <div className="absolute inset-0 bg-grid-[#fffff8]/[0.05] -z-10" />
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#fffff8] leading-tight">
              今すぐ始めて、<br />
              <span className="text-[#90cd76]">経理業務を革新</span>しましょう
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-[#fffff8]/90 max-w-2xl mx-auto">
              効率的な経理業務への入口として、まずはEnTから。
              <br />
              楽しみと感動を届ける経理システムを、今すぐ体験してください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 max-w-md sm:max-w-none mx-auto">
              <Link href="/apply" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto text-lg px-10 py-7 bg-[#fffff8] text-[#2c3744] hover:bg-[#2c3744]/20 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all font-bold"
                >
                  無料で申し込む
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-lg px-10 py-7 border-2 border-[#fffff8] text-[#fffff8] hover:bg-[#fffff8]/10 transition-all"
                >
                  ログインはこちら
                </Button>
              </Link>
            </div>
            <p className="text-[#2c3744] text-sm pt-4">
              ✓ 最短3分で登録完了  ✓ すぐに使い始められます  ✓ サポート完全無料
            </p>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-[#2c3744] text-[#fffff8]/80 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="h-6 w-6 text-[#90cd76]" />
                <span className="text-[#fffff8] font-bold">EnT</span>
              </div>
              <p className="text-sm leading-relaxed">
                中小企業の経理業務を革新する、次世代クラウドシステム
              </p>
            </div>
            <div>
              <h4 className="text-[#fffff8] font-bold mb-4">製品</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-[#fffff8] transition-colors">機能一覧</a></li>
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">料金プラン</a></li>
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">導入事例</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#fffff8] font-bold mb-4">サポート</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">ヘルプセンター</a></li>
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">お問い合わせ</a></li>
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">システムステータス</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#fffff8] font-bold mb-4">企業情報</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">会社概要</a></li>
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">プライバシーポリシー</a></li>
                <li><a href="#" className="hover:text-[#fffff8] transition-colors">利用規約</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#fffff8]/20 pt-8 text-center text-sm">
            <p>&copy; 2025 EnT. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
