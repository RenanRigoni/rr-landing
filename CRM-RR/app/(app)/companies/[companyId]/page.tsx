import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CompanyForm } from '@/components/companies/CompanyForm'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { deleteCompany, updateCompany } from '@/lib/actions/companies'
import { getCompany, listCompanyContacts } from '@/lib/queries/companies'
import { listLeadSources } from '@/lib/queries/lead-sources'

interface CompanyDetailPageProps {
  params: Promise<{ companyId: string }>
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { companyId } = await params
  const [company, contacts, leadSources] = await Promise.all([
    getCompany(companyId),
    listCompanyContacts(companyId),
    listLeadSources(),
  ])

  if (!company) notFound()

  const boundUpdate = updateCompany.bind(null, company.id)
  const boundDelete = deleteCompany.bind(null, company.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-semibold text-content-primary">{company.company_name}</h1>
        <DeleteButton
          action={boundDelete}
          confirmMessage={`Excluir "${company.company_name}"? Isso também desvincula os contatos associados.`}
        />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-8">
        <CompanyForm
          action={boundUpdate}
          leadSources={leadSources}
          defaultValues={company}
          submitLabel="Salvar alterações"
          submitPendingLabel="Salvando…"
        />

        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Contatos</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-content-secondary">Nenhum contato vinculado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="block rounded-inner border border-white/[0.08] bg-surface-elevated px-3 py-2 text-sm text-content-primary transition-colors ease-spring hover:border-brand-500"
                  >
                    <span className="block">{contact.full_name}</span>
                    {contact.role_title ? (
                      <span className="text-xs text-content-secondary">{contact.role_title}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
