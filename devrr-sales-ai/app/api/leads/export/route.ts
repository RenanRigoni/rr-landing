import { NextResponse } from 'next/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { listLeadsForDisplay } from '@/lib/queries/leads'
import { listLatestAuditsByLead } from '@/lib/queries/digital-audits'
import { listStages, listSources } from '@/lib/queries/catalogs'
import { parseExportFormat, buildLeadsExport } from '@/lib/api/leads-export'
import type { Database } from '@/lib/types/database.types'

/**
 * Exportação em massa de leads — CSV ou JSON (7.9 / `DOSSIE.md` §15).
 *
 * Autenticada **pela sessão do usuário** (D-041): `requireOrgId()` + as
 * queries de sessão (`listLeadsForDisplay`/`listLatestAuditsByLead`/
 * `listStages`/`listSources`), todas filtrando `org_id` + RLS. Zero
 * `service_role` — o critério de D-034 ("a identidade do chamador decide o
 * que a query alcança?") aqui responde SIM, então `service_role` está
 * proibido.
 *
 * Esta rota **precisa** da sessão que o `proxy.ts` renova, então NÃO entra no
 * negative lookahead do matcher (ao contrário de `api/cron`, D-012): sem
 * sessão, o proxy responde `307 /login` antes de chegar aqui.
 *
 * Respeita os mesmos filtros da lista `/leads` (`stage` por `key`, `source`
 * por id, `status` enum, `search` por título). `format` ausente/inválido →
 * `400`. Nada é recalculado: a exportação é a representação da 7.8 aplicada a
 * N leads.
 */

export const dynamic = 'force-dynamic'

type LeadStatus = Database['sales']['Enums']['lead_status']

function isLeadStatus(value: string): value is LeadStatus {
  return value === 'open' || value === 'won' || value === 'lost'
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const format = parseExportFormat(url.searchParams.get('format'))
  if (!format) {
    return NextResponse.json(
      { error: "Parâmetro 'format' inválido. Use 'csv' ou 'json'." },
      { status: 400 },
    )
  }

  // Falha cedo para usuário autenticado sem organização (não deve acontecer
  // fora do onboarding). O recorte por tenant em si é da RLS + `org_id` das
  // queries abaixo.
  await requireOrgId()

  const stageKey = url.searchParams.get('stage') ?? undefined
  const sourceId = url.searchParams.get('source') ?? undefined
  const statusRaw = url.searchParams.get('status') ?? undefined
  const search = url.searchParams.get('search') ?? undefined

  const [stages, sources] = await Promise.all([listStages(), listSources()])
  const activeStage = stageKey ? stages.find((stage) => stage.key === stageKey) : undefined
  const activeSource = sourceId ? sources.find((source) => source.id === sourceId) : undefined
  const status = statusRaw && isLeadStatus(statusRaw) ? statusRaw : undefined

  const leads = await listLeadsForDisplay({
    stageId: activeStage?.id,
    sourceId: activeSource?.id,
    status,
    search,
  })
  const auditsByLead = await listLatestAuditsByLead(leads.map((lead) => lead.id))

  // Data do NOME do arquivo (`leads-YYYY-MM-DD.csv`), em UTC — decisão
  // deliberada: não há fuso do usuário confiável no servidor (a org tem
  // `timezone`, mas é da organização, não de quem baixa) e o texto da 7.9
  // proíbe fixar `America/Sao_Paulo` para todo mundo. Perto da meia-noite o
  // nome pode cair no dia UTC, não no dia local — é só rótulo de arquivo, não
  // afeta o conteúdo. Se um fuso confiável entrar no modelo, trocar aqui.
  const today = new Date().toISOString().slice(0, 10)
  const { body, contentType, filename } = buildLeadsExport(leads, auditsByLead, format, today)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
