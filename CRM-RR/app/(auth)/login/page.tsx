import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-8">
      <PhasePlaceholder
        title="Login"
        phase="Fase 2"
        description="Autenticação via Supabase Auth (usuário único, signup público desabilitado) — implementado na Fase 2 (DB + Auth + CRUD básico)."
      />
    </div>
  )
}
