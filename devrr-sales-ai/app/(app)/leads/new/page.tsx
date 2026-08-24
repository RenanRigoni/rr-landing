import Link from 'next/link'
import { listSources } from '@/lib/queries/catalogs'
import { NewLeadForm } from '@/components/leads/NewLeadForm'

export default async function NewLeadPage() {
  const sources = await listSources()

  return (
    <div className="max-w-2xl">
      <Link href="/leads" className="text-xs text-content-secondary hover:text-content-primary">
        ← Leads
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight text-content-primary">Novo lead</h1>
      <p className="mt-1 text-sm text-content-secondary">
        Cadastre o contato e o interesse juntos — sem etapa separada. Estágio inicial: Novo.
      </p>

      <div className="mt-6 rounded-lg border border-white/[0.08] bg-surface-elevated p-6">
        <NewLeadForm sources={sources} />
      </div>
    </div>
  )
}
