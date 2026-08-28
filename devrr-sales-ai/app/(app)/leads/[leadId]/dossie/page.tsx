import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeadForDisplay } from '@/lib/queries/leads'
import { getLatestAuditForLead } from '@/lib/queries/digital-audits'
import { DossierForm } from '@/components/leads/dossier/DossierForm'
import type { Database } from '@/lib/types/database.types'

// Rota do Dossiê Digital (7.7). Server Component: só resolve lead + auditoria
// atual e entrega às peças prontas da 7.5/7.6. Nenhuma lógica de dossiê aqui —
// `expected_updated_at`, `audit_id`, score, fuso, campos condicionais,
// oportunidades e cascatas são 100% do `DossierForm` (7.6) e da action (7.4).
//
// Isolamento de tenant: `getLeadForDisplay` já resolve `requireOrgId()` da
// sessão e filtra `.eq('org_id', ...)` — lead de outra organização volta
// `null`, indistinguível de inexistente (D-020). Nada de `service_role`.
//
// Ausência de auditoria (`getLatestAuditForLead` → `null`) é estado normal:
// vira modo criação. Erro real do Supabase é lançado pela query da 7.5 (nunca
// mascarado como "sem auditoria") e sobe para o `error.tsx` deste segmento.

const STATUS_LABEL: Record<Database['sales']['Enums']['lead_status'], string> = {
  open: 'Aberto',
  won: 'Ganho',
  lost: 'Perdido',
}

interface DossierPageProps {
  params: Promise<{ leadId: string }>
}

export default async function DossierPage({ params }: DossierPageProps) {
  const { leadId } = await params

  const lead = await getLeadForDisplay(leadId)
  if (!lead) {
    notFound()
  }

  // Abrir a página não cria nada: só leitura. A linha em `lead_digital_audits`
  // passa a existir apenas quando o usuário salva o formulário.
  const audit = await getLatestAuditForLead(lead.id)

  return (
    <div className="max-w-4xl">
      <nav aria-label="Trilha" className="text-xs text-content-muted">
        <Link href="/leads" className="hover:text-content-primary">
          Leads
        </Link>
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <Link href={`/leads/${lead.id}`} className="hover:text-content-primary">
          {lead.title}
        </Link>
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <span className="text-content-secondary">Dossiê digital</span>
      </nav>

      <h1 className="mt-3 text-xl font-semibold tracking-tight text-content-primary">Dossiê digital</h1>
      <p className="mt-1 text-sm text-content-secondary">
        {audit
          ? 'Continue o diagnóstico da presença digital pública deste lead. Nada precisa estar completo para salvar.'
          : 'Documente a presença digital pública deste lead. Salvar pela primeira vez cria o dossiê.'}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-white/[0.08] bg-surface-elevated p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Empresa</dt>
          <dd className="mt-1 text-content-primary">{lead.title}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Contato</dt>
          <dd className="mt-1 text-content-secondary">{lead.contact.full_name || '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Telefone</dt>
          <dd className="mt-1 font-mono text-content-secondary">{lead.contact.phone ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Fonte</dt>
          <dd className="mt-1 text-content-secondary">{lead.source?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Status</dt>
          <dd className="mt-1 text-content-secondary">{STATUS_LABEL[lead.status]}</dd>
        </div>
        {lead.interest ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-content-muted">Interesse</dt>
            <dd className="mt-1 text-content-secondary">{lead.interest}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6">
        <DossierForm leadId={lead.id} companyName={lead.title} audit={audit} />
      </div>
    </div>
  )
}
