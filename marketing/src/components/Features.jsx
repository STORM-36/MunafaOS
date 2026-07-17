import { Wand2, Calculator, Megaphone, ShieldCheck, FileSpreadsheet, Bell, Languages, Truck, PieChart, Check } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'
import { AnimatedGrid, AnimatedGridItem } from './animations/AnimatedGrid'

const featureCards = [
  { icon: 'Wand2', bgColor: '#f59e0b', title: 'Magic Parser (NLP-Powered)', description: 'Paste "Bhai 017... Banani pathan" → Get structured Name, Phone, Address instantly. Handles Banglish, typos, emoji. Uses Regex + String Manipulation for 90%+ accuracy.', stat: '3-5 min saved per order' },
  { icon: 'Calculator', bgColor: '#10b981', title: 'Unit Economics Engine', description: 'Net Profit = Selling Price - (Product Cost + Delivery + Ad CPR + Packaging). See REAL profit in real-time. Stop "profit blindness" that kills 60% of businesses.', stat: '23% avg profit increase' },
  { icon: 'Megaphone', bgColor: '#3b82f6', title: 'Ad Spend Integration', description: 'Track Facebook CPM volatility. A profitable product Monday can lose money Friday if ad costs spike. Link ad spend directly to each product for true ROI.', stat: 'Prevent hidden losses' },
  { icon: 'ShieldCheck', bgColor: '#d946ef', title: 'Bank-Level Security (RLS)', description: 'Google Authentication + Row-Level Security. Your data is isolated, encrypted, GDPR-compliant. "Delete Account" option for complete data sovereignty.', stat: '100% data privacy' },
  { icon: 'FileSpreadsheet', bgColor: '#3b82f6', title: 'Excel Export (SheetJS)', description: 'One-click export to .xlsx. Monthly/yearly profit reports. Own your customer data - no vendor lock-in. Works offline after download.', stat: 'Complete data ownership' },
  { icon: 'Bell', bgColor: '#f43f5e', title: 'Smart Profit Alerts', description: 'Get instant notifications about high-risk orders, negative margins, or products with high return rates (120 BDT loss per return).', stat: 'Real-time risk detection' },
  { icon: 'Languages', bgColor: '#10b981', title: 'Bilingual Bridge Engine', description: 'Processes mixed Bangla-English text. Auto-converts Bangla numerals (০-৯) to English (0-9). Word boundary protection prevents name corruption.', stat: 'Understands Banglish' },
  { icon: 'Truck', bgColor: '#14b8a6', title: 'Courier Agnostic Database', description: 'Works with Pathao, Steadfast, Redx, eCourier. Store delivery/return charges centrally. Auto-detects "Inside Dhaka" (60৳) vs "Outside" (120৳).', stat: 'All couriers supported' },
  { icon: 'PieChart', bgColor: '#8b5cf6', title: 'Profit Breakdown Modal', description: 'Visualize exactly where money goes: Product, Delivery, Ads, Packaging. See cost breakdown for every single order. Make data-driven decisions.', stat: 'Full transparency' }
];

const iconMap = { Wand2, Calculator, Megaphone, ShieldCheck, FileSpreadsheet, Bell, Languages, Truck, PieChart }

function Features() {
  return (
    <AnimatedSection id="features" className="bg-[#fafafa] py-16 px-8">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 text-center">
        <span className="bg-[#e0f2f1] rounded-full px-4 py-1.5 text-primary text-sm font-semibold">
          Powerful Features
        </span>

        <h2
          className="font-extrabold text-5xl text-center"
          style={{ letterSpacing: '-1.2px' }}
        >
          <span className="text-[#111827]">Everything You Need to </span>
          <span className="text-primary">Dominate</span>
          <br />
          <span className="text-primary">F-Commerce</span>
        </h2>

        <p className="text-[#4b5563] text-xl text-center">
          Built specifically for Bangladesh's 300,000+ F-commerce sellers. No complex setup, no
          learning curve. Just paste, calculate, profit.
        </p>
      </div>

      <AnimatedGrid className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
        {featureCards.map((card) => {
          const Icon = iconMap[card.icon]
          return (
            <AnimatedGridItem
              key={card.title}
              className="bg-white border border-[#f3f4f6] rounded-2xl p-[33px] shadow-sm flex flex-col justify-between h-full"
            >
              <div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <Icon size={24} className="text-white" />
                </div>

                <h3 className="text-[#111827] text-xl font-bold pt-6 pb-3">{card.title}</h3>
                <p className="text-[#4b5563] text-sm leading-relaxed">{card.description}</p>
              </div>

              <div className="border-t border-[#f3f4f6] pt-5 mt-5 flex items-center gap-2">
                <Check size={16} className="text-primary" />
                <span className="text-primary text-sm font-semibold">{card.stat}</span>
              </div>
            </AnimatedGridItem>
          )
        })}
      </AnimatedGrid>
    </AnimatedSection>
  )
}

export default Features
