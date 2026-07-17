import { Sparkles, Check, Flame } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'
import { AnimatedGrid, AnimatedGridItem, gridItemVariants } from './animations/AnimatedGrid'

const featuredItemVariants = {
  hidden: gridItemVariants.hidden,
  visible: { ...gridItemVariants.visible, scale: 1.02 }
}

const pricingPlans = [
  {
    name: 'Free',
    tagline: 'Perfect for testing the waters',
    originalPrice: null,
    price: '0',
    saveLabel: null,
    features: [
      '250 free tokens on signup',
      'Banglish text parser (2 tokens/parse)',
      'Basic profit calculator',
      'Up to 25 orders/month',
      'Mobile responsive dashboard',
      'Google Authentication',
      'Community support'
    ],
    buttonText: 'Get Started Free',
    featured: false
  },
  {
    name: 'Starter',
    tagline: 'Perfect for new entrepreneurs',
    originalPrice: '999',
    price: '499',
    saveLabel: 'Save 50% - Launch Offer',
    features: [
      'Up to 100 orders/month',
      'Smart text parser (Banglish support)',
      'Basic profit calculator',
      'Excel export (.xlsx)',
      'Email support (48hr response)',
      'Mobile responsive dashboard',
      'Google Authentication'
    ],
    buttonText: 'Try This Plan',
    featured: false
  },
  {
    name: 'Professional',
    tagline: 'For growing F-commerce stores',
    originalPrice: '1,999',
    price: '999',
    saveLabel: 'Save 50% - Best Value',
    features: [
      'UNLIMITED orders',
      'Advanced NLP Parser (Regex + AI)',
      'Real-time profit engine (Unit Economics)',
      'Ad spend integration (Facebook CPR)',
      'Monthly/yearly analytics & reports',
      'Courier agnostic database',
      'Auto location detection (Inside/Outside Dhaka)',
      'Profit breakdown modal',
      'Priority support (24hr response)'
    ],
    buttonText: 'Start Free Trial Now',
    featured: true
  },
  {
    name: 'Enterprise',
    tagline: 'For established businesses (20+ orders/day)',
    originalPrice: '3,999',
    price: '1,999',
    saveLabel: 'Save 50% - Full Power',
    features: [
      'Everything in Professional',
      'Multiple user accounts (team access)',
      'Courier API integration (Pathao/Steadfast)',
      'Custom report builder',
      'WhatsApp/SMS notifications',
      'Dedicated account manager',
      'GDPR compliance tools (data sovereignty)',
      'Soft delete + hard delete options',
      'API access for custom integrations'
    ],
    buttonText: 'Try This Plan',
    featured: false
  }
];

function Pricing() {
  return (
    <AnimatedSection id="pricing" className="bg-white pt-14 pb-24">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 text-center px-6">
        <span className="bg-[#e6f4f3] rounded-full px-4 py-1 text-primary text-sm font-semibold">
          Pricing Plans
        </span>

        <h2 className="font-extrabold text-5xl text-center">
          <span className="text-[#0f172a]">Affordable Plans for </span>
          <span className="text-primary">Every Business Size</span>
        </h2>

        <p className="text-[#6b7280] text-lg text-center">
          Start free. Scale as you grow. All prices in BDT (৳). Cancel anytime. No hidden fees or
          credit card required for trial.
        </p>

        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-full px-6 py-3 flex items-center gap-2 mt-2">
          <Sparkles size={20} className="text-[#b45309]" />
          <span className="text-[#b45309] text-base font-bold">
            Launch Offer: 50% OFF for First 1000 Users!
          </span>
        </div>
      </div>

      <AnimatedGrid className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch mt-16 px-6">
        {pricingPlans.map((plan) => (
          <AnimatedGridItem
            key={plan.name}
            variants={plan.featured ? featuredItemVariants : gridItemVariants}
            className={`relative flex-1 bg-white rounded-3xl p-[33px] flex flex-col ${
              plan.featured
                ? 'border-2 border-[#00d094] shadow-xl'
                : 'border border-[#f3f4f6] shadow-md'
            }`}
          >
            {plan.featured && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full px-4 py-1 text-white text-xs font-bold flex items-center gap-1">
                <Flame size={14} className="text-white" />
                Most Popular
              </span>
            )}

            <h3 className="text-[#0f172a] text-2xl font-bold text-center">{plan.name}</h3>
            <p className="text-[#6b7280] text-sm text-center mt-1">{plan.tagline}</p>

            <div className="flex flex-col items-center mt-6">
              {plan.originalPrice && (
                <span className="text-[#9ca3af] text-lg line-through">৳{plan.originalPrice}</span>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-[#0f172a] text-5xl font-extrabold">৳{plan.price}</span>
                <span className="text-[#6b7280] text-base">
                  {plan.originalPrice ? '/month' : 'forever'}
                </span>
              </div>
            </div>

            {plan.saveLabel && (
              <div className="flex justify-center mt-4">
                <span className="bg-[#f0fdf4] border border-[#dcfce7] rounded-lg px-3 py-1 text-primary text-xs font-bold">
                  {plan.saveLabel}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-8 flex-1">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <Check size={20} className="text-primary shrink-0" />
                  <span className="text-[#1f2937] text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <a
              href="https://app.munafaos.com"
              className={`w-full rounded-full py-4 font-bold mt-8 flex items-center justify-center ${
                plan.featured
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-[#f9fafb] border border-[#e5e7eb] text-[#0f172a]'
              }`}
            >
              {plan.buttonText}
            </a>
          </AnimatedGridItem>
        ))}
      </AnimatedGrid>

      <div className="flex flex-wrap justify-center gap-6 mt-16 text-[#6b7280] text-sm font-medium text-center">
        <span>✓ All prices in Bangladeshi Taka (BDT)</span>
        <span>✓ Cancel anytime, no questions asked</span>
        <span>✓ No hidden fees or contracts</span>
      </div>

      <div className="max-w-[1280px] mx-auto mt-16 px-6">
        <div className="bg-[rgba(230,244,243,0.4)] border border-[#e6f4f3] rounded-[40px] p-[49px] flex flex-col items-center text-center">
          <h3 className="text-[#0f172a] text-2xl font-bold">Need a custom plan?</h3>
          <p className="text-[#4b5563] text-base max-w-xl mt-3">
            If you process 500+ orders/day or need custom integrations, white-label solutions, or
            on-premise deployment, contact our enterprise team.
          </p>
          <button className="border-2 border-primary text-primary rounded-full px-10 py-3.5 font-bold mt-6">
            Talk to Sales Team
          </button>
        </div>
      </div>
    </AnimatedSection>
  )
}

export default Pricing
