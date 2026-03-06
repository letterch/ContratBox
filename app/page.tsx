import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { FAQ } from "@/components/landing/faq"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <Footer />
    </>
  )
}
