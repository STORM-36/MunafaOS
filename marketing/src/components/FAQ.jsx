import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'

const faqItems = [
  {
    tag: 'Technical',
    question: 'How does the "Magic Parser" work with Banglish messages?',
    answer: 'Paste raw Messenger text like \'Bhai 017... Banani pathan\' and our NLP-powered parser instantly extracts structured Name, Phone (11-digit validated), and Address. It handles mixed Bangla-English text, typos, emoji, and auto-converts Bangla numerals (০-৯) to English — all with 90%+ accuracy, no manual typing required.'
  },
  {
    tag: 'Getting Started',
    question: 'Do I need technical knowledge to use MunafaOS?',
    answer: 'No. MunafaOS is built mobile-first for busy F-commerce sellers — no complex setup, no learning curve. Just paste your order text, and the system calculates everything automatically. If you can use Facebook Messenger, you can use MunafaOS.'
  },
  {
    tag: 'Features',
    question: 'How exactly is Net Profit calculated?',
    answer: 'Net Profit = Selling Price − (Product Cost + Delivery + Ad Spend (CPR) + Packaging + Returns). This is real Unit Economics, calculated per order in real-time — not just revenue, so you see your TRUE profit before it\'s too late to adjust pricing or ad spend.'
  },
  {
    tag: 'Security',
    question: 'Is my business data secure and private? (GDPR compliance)',
    answer: 'Yes. MunafaOS uses Google Authentication combined with Row-Level Security (RLS), meaning your data is isolated and encrypted — no other workspace can ever access it. We\'re GDPR-compliant, and you can permanently delete your account and all associated data at any time for complete data sovereignty.'
  },
  {
    tag: 'Market',
    question: 'How big is Bangladesh\'s F-commerce market, really?',
    answer: 'Over 300,000 Bangladeshi businesses now operate through Facebook pages as their primary storefront — one of the largest F-commerce ecosystems in the world. Bangladesh\'s overall ecommerce market crossed $3 billion in 2025 and is projected to reach $6-8 billion by 2027-2028, driven by rising mobile internet use and financial inclusion. MunafaOS is built specifically for this fast-growing but still underserved market.'
  },
  {
    tag: 'Payments',
    question: 'Does MunafaOS support bKash and Nagad payments?',
    answer: 'Yes — bKash and Nagad together handle the large majority of Bangladesh\'s mobile financial service transactions, and we\'ve built MunafaOS\'s payment flow around them from day one since that\'s how Bangladeshi F-commerce sellers actually get paid. No international card gateway required.'
  }
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggleAccordion = (index) => {
    setOpenIndex((current) => (current === index ? null : index))
  }

  const handleContactClick = () => {
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <AnimatedSection id="faq" className="bg-[#f4fcfa] py-16 px-6 lg:px-64">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="bg-[#ccfbf1] rounded-full px-3 py-1 text-[#115e59] text-xs font-semibold">
          FAQ
        </span>

        <h2
          className="font-extrabold text-5xl text-center"
          style={{ letterSpacing: '-1.2px' }}
        >
          <span className="text-[#111827]">Frequently Asked </span>
          <span className="text-primary">Questions</span>
        </h2>

        <p className="text-[#4b5563] text-lg text-center">
          Everything you need to know about MunafaOS. Still have questions? Contact our team.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-3xl mx-auto mt-12">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index
          return (
            <div
              key={item.question}
              className="bg-white border border-[#f3f4f6] rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full flex justify-between items-start px-6 py-5"
              >
                <div className="flex flex-col items-start gap-2 text-left">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={20} className="text-primary shrink-0" />
                    <span className="text-[#111827] text-lg font-bold">{item.question}</span>
                  </div>
                  <span className="bg-[#f0fdfa] rounded-full px-2.5 py-0.5 text-primary text-xs font-medium">
                    {item.tag}
                  </span>
                </div>

                {isOpen ? (
                  <ChevronUp size={20} className="shrink-0" />
                ) : (
                  <ChevronDown size={20} className="shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 pt-4 border-t border-[#f3f4f6]">
                      <p className="text-[#4b5563] text-[15px] leading-relaxed">{item.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <div className="bg-white border border-[#f3f4f6] rounded-2xl shadow-sm p-10 flex flex-col items-center text-center mt-12 max-w-3xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#f0fdfa] border-2 border-primary flex items-center justify-center">
          <HelpCircle size={32} className="text-primary" />
        </div>

        <h3 className="text-[#111827] text-2xl font-bold mt-4">Still have questions?</h3>
        <p className="text-[#4b5563] text-base mt-2">
          Our support team is here to help. Get in touch and we'll respond within 24 hours.
        </p>

        <div className="flex gap-4 justify-center pt-5">
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault()
              handleContactClick()
            }}
            className="bg-primary text-white rounded-lg px-6 py-3 font-semibold"
          >
            Contact Support Team
          </a>
          <button
            onClick={() => console.log('Watch tutorial videos clicked')}
            className="border border-primary text-primary rounded-lg px-6 py-3 font-semibold"
          >
            Watch Tutorial Videos
          </button>
        </div>
      </div>
    </AnimatedSection>
  )
}

export default FAQ
