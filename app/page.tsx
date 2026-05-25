import { Navbar } from '@/components/sections/navbar'
import { Hero } from '@/components/sections/hero'
import { Problem } from '@/components/sections/problem'
import { Features } from '@/components/sections/features'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Pricing } from '@/components/sections/pricing'
import { Testimonials } from '@/components/sections/testimonials'
import { Benchmark } from '@/components/sections/benchmark'
import { CaseStudy } from '@/components/sections/case-study'
import { Guarantee } from '@/components/sections/guarantee'
import { FAQ } from '@/components/sections/faq'
import { OutrosServicosteaser } from '@/components/sections/outros-servicos-teaser'
import { CtaFinal } from '@/components/sections/cta-final'
import { Footer } from '@/components/sections/footer'
import { WhatsappFloat } from '@/components/ui/whatsapp-float'
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll'

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <AnimateOnScroll>
          <Problem />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <Features />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <HowItWorks />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <Pricing />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <OutrosServicosteaser />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <Testimonials />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <Benchmark />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <CaseStudy />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <Guarantee />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <FAQ />
        </AnimateOnScroll>
        <AnimateOnScroll>
          <CtaFinal />
        </AnimateOnScroll>
      </main>
      <Footer />
      <WhatsappFloat />
    </>
  )
}
