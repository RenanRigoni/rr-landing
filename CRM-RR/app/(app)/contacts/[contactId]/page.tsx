import { notFound } from 'next/navigation'
import { ContactForm } from '@/components/contacts/ContactForm'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { deleteContact, updateContact } from '@/lib/actions/contacts'
import { getContact } from '@/lib/queries/contacts'
import { listCompanies } from '@/lib/queries/companies'

interface ContactDetailPageProps {
  params: Promise<{ contactId: string }>
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { contactId } = await params
  const [contact, companies] = await Promise.all([getContact(contactId), listCompanies()])

  if (!contact) notFound()

  const boundUpdate = updateContact.bind(null, contact.id)
  const boundDelete = deleteContact.bind(null, contact.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-semibold text-content-primary">{contact.full_name}</h1>
        <DeleteButton action={boundDelete} confirmMessage={`Excluir "${contact.full_name}"?`} />
      </div>

      <ContactForm
        action={boundUpdate}
        companies={companies}
        defaultValues={contact}
        submitLabel="Salvar alterações"
        submitPendingLabel="Salvando…"
      />
    </div>
  )
}
