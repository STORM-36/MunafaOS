import GlobalNav from './components/GlobalNav'
import Hero from './components/Hero'
import ProblemSolution from './components/ProblemSolution'
import Features from './components/Features'
import About from './components/About'
import Pricing from './components/Pricing'
import PricingComparison from './components/PricingComparison'
import FAQ from './components/FAQ'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <GlobalNav />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <About />
        <Pricing />
        <PricingComparison />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

export default App
