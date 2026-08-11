import { ContactForm } from '@/components/contacts/ContactForm'
import { createContact } from '@/lib/actions/contacts'
import { listCompanies } from '@/lib/queries/companies'

export default async function NewContactPage() {
  const companies = await listCompanies()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-sans text-2xl font-semibold text-content-primary">Novo contato</h1>
      <ContactForm
        action={createContact}
        companies={companies}
        submitLabel="Criar contato"
        submitPendingLabel="Criando…"
      />
    </div>
  )
}
