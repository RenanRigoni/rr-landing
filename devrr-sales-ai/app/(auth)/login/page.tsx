import { LoginForm } from '@/components/ui/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-8">
      <div className="w-full max-w-sm rounded-card border border-white/[0.08] bg-surface-elevated p-8">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, largura/altura fixas conforme DESIGN_SYSTEM.md */}
          <img src="/logos/logo-primary-color.svg" alt="DevRR" width={180} height={39} />
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
