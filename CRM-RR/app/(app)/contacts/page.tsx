import Link from 'next/link'
import { listContacts } from '@/lib/queries/contacts'

export default async function ContactsPage() {
  const contacts = await listContacts()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Contatos</h1>
        <Link
          href="/contacts/new"
          className="rounded-pill bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-all ease-spring hover:bg-brand-500 hover:scale-[1.02]"
        >
          Novo contato
        </Link>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-content-secondary">Nenhum contato cadastrado ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-white/[0.08]">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-t border-white/[0.08] hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}`} className="text-content-primary hover:text-brand-400">
                      {contact.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-content-secondary">{contact.companies?.company_name ?? '—'}</td>
                  <td className="px-4 py-3 text-content-secondary">{contact.role_title ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-content-secondary">{contact.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
