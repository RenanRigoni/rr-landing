import { LoginForm } from '@/components/ui/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-8">
      <div className="w-full max-w-sm rounded-card border border-white/[0.08] bg-surface-elevated p-8">
        <div className="mb-6">
          <span className="font-display text-lg font-extrabold tracking-tight text-content-primary">
            CRM<span className="text-brand-400">·RR</span>
          </span>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
