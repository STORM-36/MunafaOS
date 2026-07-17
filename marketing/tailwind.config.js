/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        primaryAlt: 'var(--color-primary-alt)',
        accentCyan: 'var(--color-accent-cyan)',
        accentRose: 'var(--color-accent-rose)',
        bgHero: 'var(--color-bg-hero)',
        bgFeatures: 'var(--color-bg-features)',
        bgPricing: 'var(--color-bg-pricing)',
        bgFaq: 'var(--color-bg-faq)',
        bgContact: 'var(--color-bg-contact)',
        textHeading: 'var(--color-text-heading)',
        textBody: 'var(--color-text-body)',
        textMuted: 'var(--color-text-muted)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
    },
  },
  plugins: [],
}
