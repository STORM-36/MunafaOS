import { motion } from 'framer-motion'
import { Check, ArrowRight, PlayCircle, TrendingUp, Wallet } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'

const checklistItems = [
  'Parse "Banglish" orders instantly with NLP-powered text extraction',
  'Calculate net profit in real-time (Product + Delivery + Ads + Packaging)',
  'Export reports to Excel. Own your data forever. No vendor lock-in'
];

const topStats = [
  { label: 'ORDERS', value: '847', color: '#3eb2a7', bg: 'rgba(187,255,208,0.5)' },
  { label: 'REVENUE', value: '৳2.4L', color: '#009688', bg: 'rgba(156,241,189,0.5)' },
  { label: 'MARGIN', value: '18.5%', color: '#009688', bg: 'rgba(194,255,246,0.5)' }
];

const bottomStats = [
  { label: 'AD SPEND', value: '৳ 18,450' },
  { label: 'RETURNS', value: '42 (4.9%)' }
];

const footerStats = [
  { value: '300K+', label: 'Active F-Commerce Pages' },
  { value: '1.5hrs', label: 'Saved Daily per User' },
  { value: '৳13B', label: 'Market by 2027' }
];

function Hero() {
  return (
    <AnimatedSection id="home" className="bg-[#f0fdfa] w-full py-20 px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row gap-12 items-center">
        <div className="flex-1">
          <h1
            className="font-heading font-extrabold text-5xl lg:text-7xl leading-[1.05]"
            style={{ letterSpacing: '-1.8px' }}
          >
            <span className="block text-[#0f172a]">Stop Losing</span>
            <span className="block text-[#0f172a]">
              {' '}
              Money on <span className="text-primaryAlt">"Profitable"</span>
            </span>
            <span className="block text-[#0c1427]"> Products</span>
          </h1>

          <p className="text-[#475569] text-xl leading-relaxed mt-6 max-w-xl">
            The first Decision Support System built for Bangladesh's F-Commerce. Convert messy
            Messenger orders into structured data in 1 click. Track REAL profit after ads,
            delivery & returns. Save 90% of manual work.
          </p>

          <div className="flex flex-col gap-4 mt-8">
            {checklistItems.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                  <Check size={12} className="text-primary" />
                </span>
                <span className="text-[#334155] text-base font-medium">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-row flex-wrap gap-4 mt-10">
            <a
              href="https://app.munafaos.com"
              className="bg-primary text-white rounded-full px-8 py-[18px] font-bold text-lg flex items-center gap-2"
            >
              Start 14-Day Free Trial
              <ArrowRight size={20} />
            </a>
            <button
              onClick={() => console.log('Watch demo clicked')}
              className="bg-white border-2 border-[#e2e8f0] rounded-full px-8 py-[18px] font-bold text-lg text-[#1e293b] flex items-center gap-2"
            >
              <PlayCircle size={24} className="text-[#1e293b]" />
              Watch Demo (2 min)
            </button>
          </div>
        </div>

        <div className="flex-1 w-full">
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ type: 'spring', stiffness: 90, damping: 14, delay: 0.2 }}
            className="rounded-[40px] p-6 md:p-10 shadow-[0_25px_50px_-12px_rgba(59,190,146,0.49)] w-full overflow-hidden"
            style={{
              background:
                'linear-gradient(175deg, rgba(170,244,217,0.11) 44%, rgba(170,244,217,0.11) 65%, rgba(161,232,220,0.2) 90%)',
            }}
          >
            <div className="bg-primary rounded-xl h-10 flex items-center gap-2 px-4">
              <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
            </div>

            <div className="flex gap-2 md:gap-4 mt-6">
              {topStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex-1 min-w-0 rounded-xl p-4 border border-[#dcfce7]"
                  style={{ backgroundColor: stat.bg }}
                >
                  <div
                    className="text-xs font-bold uppercase tracking-wider truncate"
                    style={{ color: stat.color }}
                  >
                    {stat.label}
                  </div>
                  <div className="text-3xl font-extrabold mt-1 truncate" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-2xl p-[26px] mt-4 border-2"
              style={{
                backgroundColor: 'rgba(215,255,227,0.7)',
                borderColor: 'rgba(0,150,136,0.2)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-primary text-sm font-bold">Net Profit (This Month)</div>
                  <div className="text-[#0f172a] text-3xl font-bold mt-1">৳ 45,230</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp size={12} className="text-primary" />
                    <span className="text-primary text-xs font-bold">23.4% vs last month</span>
                  </div>
                </div>
                <Wallet size={40} className="text-primary" />
              </div>

              <div className="border-t border-[#f1f5f9] my-4" />

              <p className="text-[#64748b] text-[10px]">
                After deducting: Product Cost, Delivery, Ad Spend, Packaging
              </p>
            </div>

            <div className="flex gap-4 mt-4">
              {bottomStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex-1 bg-[#f2f5f9] rounded-xl p-4 text-center"
                >
                  <div className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-wider">
                    {stat.label}
                  </div>
                  <div className="text-[#1e293b] text-lg font-bold mt-1">{stat.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto flex flex-row flex-wrap gap-12 mt-20">
        {footerStats.map((stat) => (
          <div key={stat.label}>
            <div className="text-primaryAlt text-4xl font-extrabold">{stat.value}</div>
            <div className="text-[#64748b] text-base font-medium mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </AnimatedSection>
  )
}

export default Hero
