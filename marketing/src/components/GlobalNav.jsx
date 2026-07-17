import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import MunafaLogo from './MunafaLogo'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
]

function GlobalNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const sectionIds = navLinks.map((link) => link.href.slice(1))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    )

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleNavClick = (href) => {
    setIsMobileMenuOpen(false)
    document.querySelector(href).scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className={`sticky top-0 relative z-[100] isolate backdrop-blur-md bg-[rgba(242,255,252,0.8)] border-b border-[rgba(0,150,136,0.1)] ${
        isScrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="max-w-[1280px] mx-auto flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <MunafaLogo size={40} showWordmark />
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = link.href === `#${activeSection}`
            return (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`relative text-base pb-1 ${
                  isActive ? 'text-primary font-semibold' : 'text-[#475569] font-medium'
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute left-0 right-0 -bottom-1 h-0.5 bg-primary"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          <motion.a
            href="https://app.munafaos.com"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="hidden md:inline-flex bg-primaryAlt text-white rounded-full px-6 py-2.5 font-semibold text-base"
          >
            Start Free Trial
          </motion.a>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="md:hidden text-[#0f172a]"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg px-6 py-4 flex flex-col gap-4 overflow-hidden z-50"
          >
            {navLinks.map((link) => {
              const isActive = link.href === `#${activeSection}`
              return (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={`text-base text-left pb-1 w-fit ${
                    isActive
                      ? 'text-primary font-semibold border-b-2 border-primary'
                      : 'text-[#475569] font-medium'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
            <motion.a
              href="https://app.munafaos.com"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-primaryAlt text-white rounded-full px-6 py-2.5 font-semibold text-base"
            >
              Start Free Trial
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default GlobalNav
