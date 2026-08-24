import Link from 'next/link'
import { formatBRL } from '@/lib/domain/money'
import { formatRelativeDateBR } from '@/lib/domain/date'
import { StageBadge } from '@/components/ui/StageBadge'
import type { LeadWithDisplay } from '@/lib/queries/leads'

interface LeadsTableProps {
  leads: LeadWithDisplay[]
}

// docs/DESIGN_SYSTEM.md: contato, título, estágio (badge), fonte, valor
// (mono), último contato (mono, relativo), próxima ação. Dado tabular de
// verdade → <table>, não div-grid (web/coding-style: semântico primeiro).
export function LeadsTable({ leads }: LeadsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] bg-surface-muted text-[10px] uppercase tracking-[0.12em] text-content-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              Contato
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Título
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Estágio
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Fonte
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Valor
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Último contato
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Próxima ação
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-white/[0.06] transition-colors ease-spring last:border-0 hover:bg-white/[0.03]">
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="font-medium text-content-primary hover:text-brand-400">
                  {lead.contact.full_name}
                </Link>
                {lead.contact.phone ? <p className="font-mono text-xs text-content-muted">{lead.contact.phone}</p> : null}
              </td>
              <td className="px-4 py-3 text-content-secondary">
                <Link href={`/leads/${lead.id}`} className="hover:text-content-primary">
                  {lead.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StageBadge label={lead.stage.label} color={lead.stage.color} />
              </td>
              <td className="px-4 py-3 text-content-secondary">{lead.source?.name ?? '—'}</td>
              <td className="px-4 py-3 text-right font-mono text-content-primary">{formatBRL(lead.value_cents)}</td>
              <td className="px-4 py-3 font-mono text-xs text-content-muted">
                {lead.last_contact_at ? formatRelativeDateBR(lead.last_contact_at) : '—'}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-content-muted">
                {lead.next_action_at ? formatRelativeDateBR(lead.next_action_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
