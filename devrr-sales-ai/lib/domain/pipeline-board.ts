// Kanban do pipeline (/pipeline, Fase 8). Lógica pura: recebe leads e
// estágios já resolvidos e devolve as colunas do quadro prontas para
// renderizar — nenhuma consulta, nenhuma mutação de banco. `moveLeadOnBoard`
// é a atualização otimista que a UI aplica antes da Server Action confirmar.

export interface BoardStage {
  id: string
  key: string
  label: string
  position: number
  probability: number // 0–100
  isWon: boolean
  isLost: boolean
}

export interface BoardLead {
  id: string
  stageId: string
  status: 'open' | 'won' | 'lost'
  title: string
  companyName: string // contacts.company_name ?? contacts.full_name
  contactFirstName: string // primeiro token de contacts.full_name
  contactPhone: string | null
  valueCents: number
  temperature: 'cold' | 'warm' | 'hot' | null
  nextActionAt: string | null
  lastContactAt: string | null
  closedAt: string | null
  sourceName: string | null
  digitalScore: number | null
}

export interface BoardColumn {
  stage: BoardStage
  leads: BoardLead[]
  totalCents: number
  weightedCents: number
  /** Só Ganho/Perdido: total de leads fechados fora da janela (não exibidos). */
  hiddenCount: number
}

export const CLOSED_WINDOW_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function weightedCents(valueCents: number, probability: number): number {
  return Math.round((valueCents * clamp(probability, 0, 100)) / 100)
}

function sumCents(leads: readonly BoardLead[]): number {
  return leads.reduce((sum, lead) => sum + lead.valueCents, 0)
}

function sumWeightedCents(leads: readonly BoardLead[], probability: number): number {
  return leads.reduce((sum, lead) => sum + weightedCents(lead.valueCents, probability), 0)
}

/** `Infinity` para `nextActionAt` nulo — ordena naturalmente por último, sem ramo extra. */
function nextActionRank(lead: BoardLead): number {
  return lead.nextActionAt === null ? Number.POSITIVE_INFINITY : new Date(lead.nextActionAt).getTime()
}

function sortOpenLeads(leads: readonly BoardLead[]): BoardLead[] {
  return [...leads].sort((a, b) => nextActionRank(a) - nextActionRank(b) || b.valueCents - a.valueCents)
}

// Só chamada com leads que já passaram pelo filtro de janela (closedAt
// garantidamente não nulo) — ver `buildBoardColumns`.
function sortClosedLeads(leads: readonly BoardLead[]): BoardLead[] {
  return [...leads].sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime())
}

function isClosedStage(stage: BoardStage): boolean {
  return stage.isWon || stage.isLost
}

function buildColumn(stage: BoardStage, leads: readonly BoardLead[]): BoardColumn {
  const sorted = isClosedStage(stage) ? sortClosedLeads(leads) : sortOpenLeads(leads)
  return {
    stage,
    leads: sorted,
    totalCents: sumCents(sorted),
    weightedCents: sumWeightedCents(sorted, stage.probability),
    hiddenCount: 0,
  }
}

export interface BuildBoardColumnsOptions {
  closedWindowDays?: number
  hiddenCountByStageId?: Readonly<Record<string, number>>
}

export function buildBoardColumns(
  leads: readonly BoardLead[],
  stages: readonly BoardStage[],
  now: Date,
  options: BuildBoardColumnsOptions = {},
): BoardColumn[] {
  const windowDays = options.closedWindowDays ?? CLOSED_WINDOW_DAYS
  const windowStart = now.getTime() - windowDays * DAY_MS
  const hiddenCountByStageId = options.hiddenCountByStageId ?? {}

  const stageById = new Map(stages.map((stage) => [stage.id, stage]))
  const leadsByStage = new Map<string, BoardLead[]>()
  for (const lead of leads) {
    if (!stageById.has(lead.stageId)) continue // estágio desconhecido é ignorado
    leadsByStage.set(lead.stageId, [...(leadsByStage.get(lead.stageId) ?? []), lead])
  }

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  return sortedStages.map((stage) => {
    const stageLeads = leadsByStage.get(stage.id) ?? []

    if (!isClosedStage(stage)) {
      return buildColumn(stage, stageLeads)
    }

    let hiddenCount = hiddenCountByStageId[stage.id] ?? 0
    const withinWindow: BoardLead[] = []
    for (const lead of stageLeads) {
      const closedTime = lead.closedAt === null ? null : new Date(lead.closedAt).getTime()
      if (closedTime !== null && closedTime >= windowStart) {
        withinWindow.push(lead)
      } else {
        hiddenCount += 1
      }
    }

    return { ...buildColumn(stage, withinWindow), hiddenCount }
  })
}

/**
 * Atualização otimista e imutável: tira o lead da coluna de origem e o
 * coloca na de destino já com `stageId`/`status`/`closedAt` recalculados.
 * `hiddenCount` de cada coluna não é recalculado aqui — só a Server Action
 * (que roda a query de novo) conhece os leads fechados fora da janela.
 */
export function moveLeadOnBoard(columns: readonly BoardColumn[], leadId: string, toStageId: string, now: Date): BoardColumn[] {
  const fromIndex = columns.findIndex((column) => column.leads.some((lead) => lead.id === leadId))
  if (fromIndex === -1) return columns as BoardColumn[]

  const fromColumn = columns[fromIndex]!
  if (fromColumn.stage.id === toStageId) return columns as BoardColumn[]

  const toIndex = columns.findIndex((column) => column.stage.id === toStageId)
  if (toIndex === -1) return columns as BoardColumn[]

  const toStage = columns[toIndex]!.stage
  const lead = fromColumn.leads.find((item) => item.id === leadId)!
  const nextStatus: BoardLead['status'] = toStage.isWon ? 'won' : toStage.isLost ? 'lost' : 'open'
  const movedLead: BoardLead = {
    ...lead,
    stageId: toStageId,
    status: nextStatus,
    closedAt: nextStatus === 'open' ? null : now.toISOString(),
  }

  return columns.map((column, index) => {
    if (index === fromIndex) {
      return { ...column, ...buildColumn(column.stage, column.leads.filter((item) => item.id !== leadId)), hiddenCount: column.hiddenCount }
    }
    if (index === toIndex) {
      return { ...column, ...buildColumn(column.stage, [...column.leads, movedLead]), hiddenCount: column.hiddenCount }
    }
    return column
  })
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Busca sem acento e sem caixa em empresa, título e primeiro nome do contato. Query vazia (após trim) sempre casa. */
export function matchesBoardSearch(lead: BoardLead, query: string): boolean {
  const trimmed = query.trim()
  if (trimmed === '') return true

  const needle = normalizeSearch(trimmed)
  return [lead.companyName, lead.title, lead.contactFirstName].some((field) => normalizeSearch(field).includes(needle))
}
