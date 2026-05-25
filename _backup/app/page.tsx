import { Navbar } from '@/components/sections/navbar'
import { Hero } from '@/components/sections/hero'
import { Problem } from '@/components/sections/problem'
import { Features } from '@/components/sections/features'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Pricing } from '@/components/sections/pricing'
import { Testimonials } from '@/components/sections/testimonials'
import { CaseStudy } from '@/components/sections/case-study'
import { Guarantee } from '@/components/sections/guarantee'
import { FAQ } from '@/components/sections/faq'
import { CtaFinal } from '@/components/sections/cta-final'
import { Footer } from '@/components/sections/footer'
import { WhatsappFloat } from '@/components/ui/whatsapp-float'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CaseStudy />
        <Guarantee />
        <FAQ />
        <CtaFinal />
      </main>
      <Footer />
      <WhatsappFloat />
    </>
  )
}
