import { Target, Trophy, Users, CheckCircle, Star, Heart, Compass } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'
import { AnimatedGrid, AnimatedGridItem } from './animations/AnimatedGrid'

const problemList = [
  '3-5 min wasted per order on copy-paste (1.5hrs daily for 20 orders)',
  'Merchants focus on Revenue, not Net Profit → realize losses too late',
  'Facebook CPM spikes turn "profitable" products into loss-makers overnight',
  'Data scattered across Messenger, Excel, courier portals, Facebook Ads'
];

const statsCards = [
  { value: '300K+', label: 'ACTIVE F-COMMERCE PAGES IN BD', bg: '#ebfdf5', color: '#009688' },
  { value: '80%', label: 'TRANSACTIONS VIA MESSENGER/WHATSAPP', bg: '#ecfeff', color: '#0891b2' },
  { value: '৳13B', label: 'PROJECTED MARKET BY 2027', bg: '#ecfeff', color: '#0891b2' },
  { value: '60%', label: 'FAILURE RATE IN YEAR 1', bg: '#fff1f2', color: '#f43f5e' }
];

const microStats = [
  { icon: 'Users', value: '1000+', label: 'Users' },
  { icon: 'CheckCircle', value: '95%', label: 'Accuracy' },
  { icon: 'Star', value: '4.9/5', label: 'Rating' }
];

const microStatIconMap = { Users, CheckCircle, Star }

function About() {
  return (
    <AnimatedSection id="about" className="bg-[#f0fdfa] py-20 px-6 lg:px-16">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <span className="inline-block bg-[#dcfce7] rounded-full px-4 py-1.5 text-[#059669] text-sm font-semibold">
            About MunafaOS
          </span>

          <h2
            className="font-extrabold text-5xl mt-6"
            style={{ letterSpacing: '-1.2px' }}
          >
            <span className="block text-[#0f172a]">Built for Bangladesh's</span>
            <span className="block text-[#059669]">F-Commerce</span>
            <span className="block text-[#059669]">Revolution</span>
          </h2>

          <p className="text-[#475569] text-base leading-relaxed mt-6">
            Bangladesh is witnessing an unprecedented digital retail revolution. With{' '}
            <span className="font-bold text-[#1e293b]">300,000+ active F-commerce businesses</span>,
            the market is projected to reach{' '}
            <span className="font-bold text-[#1e293b]">৳13 billion by 2027</span>. Unlike Western
            markets dominated by Amazon, Bangladesh's economy is driven by "F-Commerce" (Facebook
            Commerce).
          </p>

          <p className="text-[#475569] text-base leading-relaxed mt-4">
            But there's a dark side:{' '}
            <span className="font-bold text-[#dc2626]">
              60% of F-commerce businesses fail in Year 1
            </span>{' '}
            due to two "invisible killers" — Manual Data Entry Hell and Profit Blindness. MunafaOS
            is the antidote.
          </p>

          <div className="bg-[rgba(255,255,255,0.6)] border border-[rgba(0,150,136,0.2)] rounded-2xl p-[33px] shadow-sm mt-8">
            <h3 className="text-[#0f172a] text-xl font-bold mb-4">The Problem We Solve:</h3>
            <div className="flex flex-col gap-3">
              {problemList.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="text-[#ef4444] text-base leading-none mt-0.5">✕</span>
                  <span className="text-[#475569] text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-4 mt-8">
            <div className="w-12 h-12 rounded-xl bg-[rgba(0,150,136,0.1)] flex items-center justify-center shrink-0">
              <Target size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[#0f172a] text-2xl font-bold mb-2">Our Mission</h3>
              <p className="text-[#475569] text-base">
                Empower micro-entrepreneurs with enterprise-grade Decision Support Systems. Make
                financial clarity accessible to everyone, not just big corporations.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-[#f1f5f9] rounded-3xl p-[33px] shadow-sm">
            <AnimatedGrid className="grid grid-cols-2 gap-4">
              {statsCards.map((card) => (
                <AnimatedGridItem
                  key={card.label}
                  className="rounded-2xl p-6 flex flex-col items-center text-center"
                  style={{ backgroundColor: card.bg }}
                >
                  <div className="text-3xl font-extrabold" style={{ color: card.color }}>
                    {card.value}
                  </div>
                  <div className="text-[#64748b] text-[11px] font-bold uppercase tracking-wider mt-2">
                    {card.label}
                  </div>
                </AnimatedGridItem>
              ))}
            </AnimatedGrid>

            <div className="relative overflow-hidden bg-[rgba(0,150,136,0.92)] rounded-2xl p-8 mt-6">
              <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-white" />
                  <span className="text-white text-xs font-bold uppercase tracking-wider opacity-90">
                    Our Impact Goal
                  </span>
                </div>
                <h4 className="text-white text-xl font-bold mt-3">
                  Help 10,000 Businesses Survive & Thrive
                </h4>
                <p className="text-white text-base opacity-80 mt-2">
                  By 2027, we aim to reduce F-commerce failure rate from 60% to 30%
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-center pt-4">
              {microStats.map((stat) => {
                const Icon = microStatIconMap[stat.icon]
                return (
                  <div
                    key={stat.label}
                    className="bg-[#f8fafc] border border-[#f1f5f9] rounded-xl p-3 flex flex-col items-center flex-1"
                  >
                    <Icon size={18} className="text-[#1e293b]" />
                    <span className="text-[#1e293b] text-base font-bold mt-1">{stat.value}</span>
                    <span className="text-[#64748b] text-[10px] font-semibold">{stat.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-[#fff1f2] flex items-center justify-center mb-4">
            <Heart size={24} className="text-[#f43f5e]" />
          </div>
          <h3 className="text-[#0f172a] text-2xl font-bold mb-3">Why We Built This</h3>
          <p className="text-[#475569] text-lg">
            We saw brilliant entrepreneurs working 14-hour days, only to discover at month-end
            they'd been losing money. Every seller deserves real-time profit visibility BEFORE
            it's too late.
          </p>
        </div>

        <div>
          <div className="w-14 h-14 rounded-2xl bg-[rgba(0,150,136,0.1)] flex items-center justify-center mb-4">
            <Compass size={24} className="text-primary" />
          </div>
          <h3 className="text-[#0f172a] text-2xl font-bold mb-3">Our Vision 2027</h3>
          <p className="text-[#475569] text-lg">
            Become the default Operating System for Bangladesh's ৳13B F-commerce market. Help
            10,000+ businesses survive Year 1 with intelligent automation and transparent
            analytics.
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}

export default About
