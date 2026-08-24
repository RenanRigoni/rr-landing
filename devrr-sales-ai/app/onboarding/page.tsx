import { OnboardingForm } from '@/components/ui/OnboardingForm'

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-8">
      <div className="w-full max-w-sm rounded-card border border-white/[0.08] bg-surface-elevated p-8">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, largura/altura fixas conforme DESIGN_SYSTEM.md */}
          <img src="/logos/logo-primary-color.svg" alt="DevRR" width={180} height={39} />
        </div>
        <h1 className="mb-1 font-display text-xl font-extrabold tracking-tight text-content-primary">
          Vamos criar sua empresa
        </h1>
        <p className="mb-6 text-sm text-content-secondary">
          O nome que você usa com seus clientes. Dá pra ajustar depois.
        </p>
        <OnboardingForm />
      </div>
    </div>
  )
}
