import { Check, X } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'

const comparisonRows = [
  { feature: 'Orders per month', free: '25', starter: '100', professional: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Banglish Text Parser', free: 'Basic (2 tokens/parse)', starter: true, professional: 'Advanced NLP + AI', enterprise: 'Advanced NLP + AI' },
  { feature: 'Net Profit Calculator', free: 'Basic', starter: 'Basic', professional: 'Real-time Unit Economics', enterprise: 'Real-time Unit Economics' },
  { feature: 'Excel Export (.xlsx)', free: false, starter: true, professional: true, enterprise: true },
  { feature: 'Ad Spend Integration', free: false, starter: false, professional: true, enterprise: true },
  { feature: 'Courier Agnostic Database', free: false, starter: false, professional: true, enterprise: true },
  { feature: 'Profit Breakdown Modal', free: false, starter: false, professional: true, enterprise: true },
  { feature: 'Multiple User Accounts', free: false, starter: false, professional: false, enterprise: true },
  { feature: 'API Access', free: false, starter: false, professional: false, enterprise: true },
  { feature: 'GDPR Compliance Tools', free: false, starter: false, professional: false, enterprise: true },
  { feature: 'Support', free: 'Community', starter: 'Email (48hr)', professional: 'Priority (24hr)', enterprise: 'Dedicated Manager' }
];

const planColumns = ['Free', 'Starter', 'Professional', 'Enterprise'];

function renderCell(value) {
  if (value === true) {
    return <Check size={18} className="text-primary mx-auto" />
  }
  if (value === false) {
    return <X size={18} className="text-[#d1d5db] mx-auto" />
  }
  return <span className="text-[#4b5563] text-[13px]">{value}</span>
}

function PricingComparison() {
  return (
    <AnimatedSection className="bg-[#fafafa] py-16 px-6">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center pb-10">
          <h2 className="text-[#111827] text-4xl font-extrabold">Compare All Plans</h2>
          <p className="text-[#6b7280] text-base mt-3">
            See exactly what's included in each plan.
          </p>
        </div>

        <div className="rounded-2xl border border-[#f3f4f6] overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="py-4"></th>
                {planColumns.map((col) => (
                  <th
                    key={col}
                    className={`text-center text-base font-bold text-[#0f172a] py-4 ${
                      col === 'Professional'
                        ? 'bg-[rgba(0,150,136,0.08)] border-b-2 border-primary'
                        : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, index) => (
                <tr key={row.feature} className={index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                  <td className="text-left text-[#374151] text-sm font-medium py-4 border-b border-[#f3f4f6] px-4">
                    {row.feature}
                  </td>
                  <td className="text-center py-4 border-b border-[#f3f4f6]">
                    {renderCell(row.free)}
                  </td>
                  <td className="text-center py-4 border-b border-[#f3f4f6]">
                    {renderCell(row.starter)}
                  </td>
                  <td className="text-center py-4 border-b border-[#f3f4f6] bg-[rgba(0,150,136,0.03)]">
                    {renderCell(row.professional)}
                  </td>
                  <td className="text-center py-4 border-b border-[#f3f4f6]">
                    {renderCell(row.enterprise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AnimatedSection>
  )
}

export default PricingComparison
