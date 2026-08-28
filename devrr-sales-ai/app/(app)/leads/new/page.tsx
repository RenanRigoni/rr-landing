import Link from 'next/link'
import { listSources } from '@/lib/queries/catalogs'
import { NewLeadForm } from '@/components/leads/NewLeadForm'

export default async function NewLeadPage() {
  const sources = await listSources()

  return (
    // `max-w-4xl` e sem card externo desde a 7.7: o formulário passou a ser uma
    // pilha de seções (`<details>` com o mesmo `bg-surface-elevated`), e um card
    // por fora aninharia duas superfícies elevadas idênticas. Mesma largura da
    // página do dossiê, que renderiza as mesmas seções.
    <div className="max-w-4xl">
      <Link href="/leads" className="text-xs text-content-secondary hover:text-content-primary">
        ← Leads
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight text-content-primary">Novo lead</h1>
      <p className="mt-1 text-sm text-content-secondary">
        Cadastre o contato e o interesse juntos — sem etapa separada. Estágio inicial: Novo. O dossiê digital é
        opcional e pode ser preenchido agora ou depois.
      </p>

      <div className="mt-6">
        <NewLeadForm sources={sources} />
      </div>
    </div>
  )
}
