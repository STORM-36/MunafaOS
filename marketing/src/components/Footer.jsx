import { Facebook, Instagram, Twitter, Linkedin, Mail, MapPin, ShieldCheck } from 'lucide-react'
import MunafaLogo from './MunafaLogo'

const productLinks = ['Features', 'Benefits', 'Pricing', 'Demo Video', 'Integrations', 'Changelog']
const companyLinks = ['About MunafaOS', 'Our Story', 'Blog & Insights', 'Careers', 'Press Kit', 'Contact Us']
const resourceLinks = ['Help Center', 'Video Tutorials', 'API Documentation', 'Community Forum', 'Privacy Policy', 'Terms of Service']
const socialIcons = [
  { Icon: Facebook, label: 'Facebook' },
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Twitter, label: 'Twitter' },
  { Icon: Linkedin, label: 'LinkedIn' },
]
const trustBadges = ['GDPR COMPLIANT', 'SSL ENCRYPTED', '100% DATA PRIVACY', 'BANK-LEVEL SECURITY']
const bottomLinks = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Refund Policy']

function FooterColumn({ heading, links }) {
  return (
    <div>
      <h4 className="text-white font-bold text-lg mb-4">{heading}</h4>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="text-[#9ca3af] text-sm">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Footer() {
  return (
    <section className="bg-[#0a121e] w-full">
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <MunafaLogo size={40} showWordmark onDark />
            </div>
            <p className="text-[#9ca3af] text-sm mb-6">
              The first Decision Support System built for Bangladesh's F-commerce revolution.
              <br />
              Automate orders, track REAL profit, own your data.
            </p>
            <div className="flex gap-3">
              {socialIcons.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-10 h-10 rounded-lg border border-[#374151] flex items-center justify-center"
                >
                  <Icon size={18} className="text-[#9ca3af]" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn heading="Product" links={productLinks} />
          <FooterColumn heading="Company" links={companyLinks} />
          <FooterColumn heading="Resources" links={resourceLinks} />
        </div>

        <div className="bg-[#111b27] rounded-2xl p-10 mt-16 flex flex-col md:flex-row gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(0,150,136,0.15)] flex items-center justify-center">
              <Mail size={20} className="text-primary" />
            </div>
            <div>
              <div className="text-[#9ca3af] uppercase text-xs tracking-wider">Email</div>
              <div className="text-white font-bold text-lg">support@munafaos.com</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(0,150,136,0.15)] flex items-center justify-center">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <div className="text-[#9ca3af] uppercase text-xs tracking-wider">Location</div>
              <div className="text-white font-bold text-lg">Dhaka, Bangladesh</div>
            </div>
          </div>
        </div>

        <div className="border-t border-b border-[#1f2937] flex flex-wrap justify-center gap-12 py-8 mt-16">
          {trustBadges.map((badge) => (
            <div key={badge} className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#6b7280]" />
              <span className="uppercase tracking-wider text-xs text-[#6b7280]">{badge}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
          <p className="text-[#9ca3af] text-sm">
            © 2026 MunafaOS. All rights reserved. Made with{' '}
            <span className="text-primary">💚</span> for Bangladesh's F-commerce entrepreneurs.
          </p>
          <div className="flex gap-6">
            {bottomLinks.map((link) => (
              <a key={link} href="#" className="text-[#9ca3af] text-sm">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Footer
