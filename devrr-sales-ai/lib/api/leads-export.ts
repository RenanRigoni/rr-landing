// Montagem da exportação de leads (7.9). Sem `import 'server-only'`, sem
// `next`, sem Supabase — recebe os dados já carregados e devolve o corpo do
// arquivo. Isso mantém tudo testável direto sob vitest e deixa a rota
// (`app/api/leads/export/route.ts`) fina: sessão → carrega → chama isto →
// `Response`.
//
// A exportação em massa é a mesma representação da 7.8 aplicada a N leads:
// JSON aninhado por lead, ou uma linha de CSV por lead. Nada é recalculado —
// `buildDossierJson`/`buildDossierCsvRow` só leem o que veio do banco.

import type { LeadWithDisplay } from '@/lib/queries/leads'
import {
  buildDossierJson,
  buildDossierCsv,
  buildDossierCsvRow,
  type DigitalAudit,
  type DossierJson,
  type DossierLeadInput,
} from '@/lib/domain/dossier-export'

export type ExportFormat = 'csv' | 'json'

/** `format` da query string → união fechada, ou `null` (→ 400 na rota). */
export function parseExportFormat(raw: string | null): ExportFormat | null {
  return raw === 'csv' || raw === 'json' ? raw : null
}

/**
 * `LeadWithDisplay` (lead + contato + fonte já resolvidos) → a entrada de
 * identificação que a 7.8 espera. `companyName` vem de `contact.company_name`
 * (a empresa real), NUNCA de `lead.title`.
 */
export function leadToDossierInput(lead: LeadWithDisplay): DossierLeadInput {
  return {
    title: lead.title,
    companyName: lead.contact.company_name,
    contactName: lead.contact.full_name,
    phone: lead.contact.phone,
    email: lead.contact.email,
    interest: lead.interest,
    source: lead.source?.name ?? null,
    valueCents: lead.value_cents,
  }
}

/**
 * Slug para o nome do arquivo do "Exportar JSON" individual
 * (`dossie-<slug>-<data>.json`, DOSSIE §13). Sem acento, minúsculas, só
 * `a-z0-9-`; vazio → `lead`.
 */
export function dossierFilenameSlug(companyName: string | null): string {
  const slug = (companyName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug === '' ? 'lead' : slug
}

export interface LeadsExportPayload {
  body: string
  contentType: string
  filename: string
}

/**
 * Corpo do arquivo de exportação em massa. `today` (yyyy-mm-dd) vem da rota —
 * a função fica determinística e testável. Lead sem auditoria entra assim
 * mesmo (dossiê só com a identificação; as seções ficam nulas / vazias).
 */
export function buildLeadsExport(
  leads: readonly LeadWithDisplay[],
  auditsByLead: ReadonlyMap<string, DigitalAudit>,
  format: ExportFormat,
  today: string,
): LeadsExportPayload {
  if (format === 'json') {
    const dossiers: DossierJson[] = leads.map((lead) =>
      buildDossierJson(leadToDossierInput(lead), auditsByLead.get(lead.id) ?? null),
    )
    return {
      body: JSON.stringify(dossiers, null, 2),
      contentType: 'application/json; charset=utf-8',
      filename: `leads-${today}.json`,
    }
  }

  const rows = leads.map((lead) =>
    buildDossierCsvRow(leadToDossierInput(lead), auditsByLead.get(lead.id) ?? null),
  )
  return {
    body: buildDossierCsv(rows),
    contentType: 'text/csv; charset=utf-8',
    filename: `leads-${today}.csv`,
  }
}
