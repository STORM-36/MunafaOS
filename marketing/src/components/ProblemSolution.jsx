import { FileText, EyeOff, Network, Smartphone, BarChart3, MapPin } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'
import { AnimatedGrid, AnimatedGridItem } from './animations/AnimatedGrid'

const problemCards = [
  {
    icon: 'FileText',
    title: 'Problem: Manual Data Entry Hell',
    problemText: 'Processing 20 orders/day = 1.5 hours wasted on copy-paste. High error rate = wrong phone numbers = returns = 120৳ loss per order.',
    solutionText: 'Paste raw Messenger text → AI extracts Name, Phone (11-digit validated), Address instantly. Handles "Bhai 017... Banani pathan" perfectly. Removes noise (greetings, labels, brackets).',
    statLabel: 'TIME SAVED PER ORDER',
    statValue: '3-5 minutes',
    statSubtext: '= 1.5 hours daily for 20 orders'
  },
  {
    icon: 'EyeOff',
    title: 'Problem: "Profit Blindness"',
    problemText: 'Merchants focus on Revenue, not Net Profit. Facebook CPM spikes = "profitable" Monday product loses money by Friday. Realized too late.',
    solutionText: 'Real-time Unit Economics: Net Profit = Selling Price - (COGS + Delivery + Ad CPR + Packaging + Returns). See TRUE profit BEFORE it\'s too late to pivot.',
    statLabel: 'AVERAGE PROFIT INCREASE',
    statValue: '23-30%',
    statSubtext: 'by avoiding loss-making products'
  },
  {
    icon: 'Network',
    title: 'Problem: Data Scattered Chaos',
    problemText: 'Orders in Messenger. Ad costs in Facebook. Courier data in Pathao. Banking in Excel. No single source of truth = impossible to make smart decisions.',
    solutionText: 'ONE centralized dashboard. Orders, Products, Ads, Banking, Courier, Reports — all connected. Export to Excel anytime. You OWN your data. No lock-in.',
    statLabel: 'ERROR REDUCTION',
    statValue: '95%',
    statSubtext: 'vs spreadsheet chaos'
  }
];

const featureHighlights = [
  {
    icon: 'Smartphone',
    title: 'Mobile-First Design',
    text: '80% of F-commerce happens on mobile. Our UI is optimized for smartphones. Manage orders from anywhere.'
  },
  {
    icon: 'BarChart3',
    title: 'Actionable Analytics',
    text: 'Monthly/yearly profit trends. Product performance rankings. Ad ROI breakdown. Make decisions with confidence.'
  },
  {
    icon: 'MapPin',
    title: 'Built for Bangladesh',
    text: 'Understands Banglish. Supports BDT (৳). Integrates with local couriers. Designed for YOUR market.'
  }
];

const iconMap = { FileText, EyeOff, Network, Smartphone, BarChart3, MapPin }

function ProblemSolution() {
  return (
    <AnimatedSection id="benefits" className="bg-[#f0fdfa] py-24">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="bg-[rgba(224,242,241,0.3)] border border-[rgba(0,150,136,0.3)] rounded-full px-4 py-2 text-primary text-xs font-bold uppercase tracking-wider">
            WHY MUNAFAOS?
          </span>

          <h2
            className="font-extrabold text-6xl text-center"
            style={{ letterSpacing: '-1.5px' }}
          >
            <span className="text-[#1a2b3b]">The Problem We Solve for </span>
            <span className="text-primary">F-Commerce</span>
            <br />
            <span className="text-primary">Sellers</span>
          </h2>

          <p className="text-[#6b7280] text-xl font-medium max-w-2xl">
            60% of F-commerce businesses fail in Year 1. Here's why — and how we fix it.
          </p>
        </div>

        <AnimatedGrid className="flex flex-col lg:flex-row gap-8 mt-16">
          {problemCards.map((card) => {
            const Icon = iconMap[card.icon]
            return (
              <AnimatedGridItem
                key={card.title}
                className="flex-1 bg-white border border-[#f3f4f6] rounded-[32px] p-[41px] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-[#e0f2f1] flex items-center justify-center mb-6">
                    <Icon size={20} className="text-primary" />
                  </div>

                  <h3 className="text-[#1a2b3b] text-2xl font-extrabold mb-4">{card.title}</h3>

                  <div className="bg-[#fffafa] border border-[#ffe4e4] rounded-2xl p-[21px] mb-4">
                    <p className="text-[#c53030] text-[13px] font-medium">{card.problemText}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-primary text-sm font-extrabold">
                      MunafaOS Solution:{' '}
                    </span>
                    <span className="text-[#4b5563] text-sm">{card.solutionText}</span>
                  </div>
                </div>

                <div className="bg-[#f0fdfa] rounded-2xl p-4">
                  <div className="text-[#9ca3af] text-[11px] font-bold uppercase tracking-wider">
                    {card.statLabel}
                  </div>
                  <div className="text-primary text-3xl font-extrabold mt-1">{card.statValue}</div>
                  <div className="text-[#6b7280] text-[11px] font-semibold mt-1">
                    {card.statSubtext}
                  </div>
                </div>
              </AnimatedGridItem>
            )
          })}
        </AnimatedGrid>

        <AnimatedGrid className="flex flex-col lg:flex-row gap-8 pt-4 mt-8">
          {featureHighlights.map((feature) => {
            const Icon = iconMap[feature.icon]
            return (
              <AnimatedGridItem
                key={feature.title}
                className="flex-1 bg-white border border-[rgba(178,223,219,0.4)] rounded-2xl p-8 shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-[#f0fdfa] flex items-center justify-center mb-4">
                  <Icon size={18} className="text-primary" />
                </div>

                <h3 className="text-[#1a2b3b] text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-[#6b7280] text-sm font-medium">{feature.text}</p>
              </AnimatedGridItem>
            )
          })}
        </AnimatedGrid>
      </div>
    </AnimatedSection>
  )
}

export default ProblemSolution
