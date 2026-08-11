import { CompanyForm } from '@/components/companies/CompanyForm'
import { createCompany } from '@/lib/actions/companies'
import { listLeadSources } from '@/lib/queries/lead-sources'

export default async function NewCompanyPage() {
  const leadSources = await listLeadSources()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-sans text-2xl font-semibold text-content-primary">Nova empresa</h1>
      <CompanyForm
        action={createCompany}
        leadSources={leadSources}
        submitLabel="Criar empresa"
        submitPendingLabel="Criando…"
      />
    </div>
  )
}
