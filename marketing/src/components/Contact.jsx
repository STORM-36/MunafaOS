import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Clock, Globe, Send, ChevronDown } from 'lucide-react'
import AnimatedSection from './animations/AnimatedSection'
import { AnimatedGrid, AnimatedGridItem } from './animations/AnimatedGrid'

const businessTypes = ['Select your business type', 'F-Commerce Seller', 'E-Commerce Store', 'Wholesale/B2B', 'Other'];

function Contact() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessType: '',
    message: ''
  })
  const [submitStatus, setSubmitStatus] = useState('idle') // 'idle' | 'sending' | 'success' | 'error'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitStatus('sending')
    try {
      const response = await fetch('https://formspree.io/f/mqereybg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ fullName: '', email: '', phone: '', businessType: '', message: '' })
      } else {
        setSubmitStatus('error')
      }
    } catch (err) {
      setSubmitStatus('error')
    }
  }

  const inputClasses = 'bg-[#f8fafc] border border-[#cbd5e1] rounded-md px-4 py-3 w-full'

  return (
    <AnimatedSection id="contact" className="bg-[#fcfdfd] py-16 px-6 lg:px-16">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
        <span className="bg-[#d1fae5] rounded-full px-4 py-1 text-[#047857] text-sm font-medium">
          Contact Us
        </span>

        <h2
          className="font-extrabold text-5xl text-center"
          style={{ letterSpacing: '-1.2px' }}
        >
          <span className="text-[#0a121e]">Get in </span>
          <span className="text-primary">Touch</span>
        </h2>

        <p className="text-[#6b7280] text-lg text-center">
          Have questions about MunafaOS? Our team is here to help. Get a response within 24
          hours.
        </p>
      </div>

      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
        <AnimatedGrid className="lg:col-span-5 flex flex-col gap-6">
          <AnimatedGridItem className="bg-[#e6f7f5] border border-[#a7f3d0] rounded-xl p-6 shadow-sm flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Mail size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[#0a121e] text-base font-bold">Email Support</h3>
              <p className="text-[#6b7280] text-sm mt-1">support@munafaos.com</p>
              <p className="text-[#6b7280] text-sm">sales@munafaos.com</p>
              <p className="text-primary text-sm font-medium mt-2">Response time: 24 hours</p>
            </div>
          </AnimatedGridItem>

          <AnimatedGridItem className="bg-[#e6f7f5] border border-[#a7f3d0] rounded-xl p-6 shadow-sm flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Phone size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[#0a121e] text-base font-bold">Phone / WhatsApp</h3>
              <p className="text-[#6b7280] text-sm mt-1">+880 1700-000000</p>
              <p className="text-[#6b7280] text-sm">Available: 9 AM - 6 PM (Sat-Thu)</p>
              <p className="text-primary text-sm font-medium mt-2">
                Call or message on WhatsApp
              </p>
            </div>
          </AnimatedGridItem>

          <AnimatedGridItem className="bg-[#e6f7f5] border border-[#a7f3d0] rounded-xl p-6 shadow-sm flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[#0a121e] text-base font-bold">Office Address</h3>
              <p className="text-[#6b7280] text-sm mt-1">Road 12, Block E, Banani</p>
              <p className="text-[#6b7280] text-sm">Dhaka 1213, Bangladesh</p>
              <p className="text-primary text-sm font-medium mt-2">
                Visit by appointment only
              </p>
            </div>
          </AnimatedGridItem>

          <AnimatedGridItem className="bg-[#e6f7f5] border border-[#a7f3d0] rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              <h3 className="text-[#0a121e] text-base font-bold">Business Hours</h3>
            </div>

            <div className="flex justify-between mt-4 text-sm">
              <span className="text-[#0a121e]">Saturday - Thursday</span>
              <span className="text-[#6b7280]">9:00 AM - 6:00 PM</span>
            </div>
            <div className="border-t border-[#a7f3d0] my-3" />
            <div className="flex justify-between text-sm">
              <span className="text-[#0a121e]">Friday</span>
              <span className="text-[#6b7280]">Closed</span>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Globe size={14} className="text-[#6b7280]" />
              <span className="text-[#6b7280] text-xs">
                Bangladesh Standard Time (BST) - UTC+6
              </span>
            </div>
          </AnimatedGridItem>
        </AnimatedGrid>

        <div className="lg:col-span-7">
          <div className="bg-[#e6f7f5] border border-[#a7f3d0] rounded-xl p-[33px] shadow-sm">
            <h3 className="text-[#0a121e] text-2xl font-bold">Send us a message</h3>
            <p className="text-[#6b7280] text-sm mt-1">
              Fill out the form and we'll get back to you within 24 hours.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-6">
              <div>
                <label className="block text-[#0a121e] text-sm font-medium mb-2">
                  Full Name *
                </label>
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-[#0a121e] text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01 }}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    className={inputClasses}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[#0a121e] text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01 }}
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="01700000000"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0a121e] text-sm font-medium mb-2">
                  Business Type
                </label>
                <div className="relative">
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className={`${inputClasses} appearance-none pr-10`}
                  >
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0a121e] text-sm font-medium mb-2">
                  Message *
                </label>
                <motion.textarea
                  whileFocus={{ scale: 1.01 }}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className={inputClasses}
                />
              </div>

              <button
                type="submit"
                disabled={submitStatus === 'sending'}
                className={`bg-primary text-white rounded-lg w-full py-3 flex items-center justify-center gap-2 font-medium ${
                  submitStatus === 'sending' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <Send size={16} />
                {submitStatus === 'sending' ? 'Sending...' : 'Send Message'}
              </button>

              {submitStatus === 'success' && (
                <div className="bg-[#d1fae5] border border-[#6ee7b7] rounded-lg p-4 text-[#065f46] text-sm">
                  Message sent! We'll get back to you within 24 hours.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-lg p-4 text-[#991b1b] text-sm">
                  Something went wrong. Please try again or email us directly at
                  support@munafaos.com.
                </div>
              )}

              <p className="text-[#6b7280] text-xs text-center">
                By submitting this form, you agree to our privacy policy.
              </p>
            </form>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}

export default Contact
