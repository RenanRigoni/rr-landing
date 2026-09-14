// Métricas comerciais da tela /analytics. Lógica pura: recebe leads já
// resolvidos (estágio por chave, fonte/serviço/cidade por nome) e devolve os
// números prontos para exibir. Responde as perguntas da Definição de pronto
// (PRODUCT_SPEC.md): leads no período, quem pediu orçamento e não recebeu
// proposta, quem recebeu proposta e não respondeu, quanto há em negociação e
// qual serviço puxa mais interesse.

import { weightedCents } from './pipeline-board'

export interface AnalyticsStage {
  key: string
  label: string
  position: number
  probability: number
  isWon: boolean
  isLost: boolean
}

export interface AnalyticsLead {
  stageKey: string
  status: 'open' | 'won' | 'lost'
  valueCents: number
  source: string | null
  interest: string | null
  city: string | null
  createdAt: string
  closedAt: string | null
  respondedAt: string | null
  lostReason: string | null
  /** Tipos das atividades concluídas — dizem até onde um lead perdido chegou. */
  doneActivityTypes: readonly string[]
  /** Score digital do dossiê mais recente; `null` sem dossiê. */
  digitalScore: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000
export const NOT_INFORMED = 'Não informado'
const NEGOTIATION_KEYS = new Set(['proposta_enviada', 'negociacao'])

// --- Período -------------------------------------------------------------------

export const PERIOD_OPTIONS = [
  { value: '30', label: '30 dias', days: 30 },
  { value: '90', label: '90 dias', days: 90 },
  { value: '180', label: '6 meses', days: 180 },
  { value: 'tudo', label: 'Tudo', days: null },
] as const

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]['value']
export const DEFAULT_PERIOD: PeriodValue = '180'

export function resolvePeriod(raw: string | string[] | undefined): (typeof PERIOD_OPTIONS)[number] {
  const value = Array.isArray(raw) ? raw[0] : raw
  return PERIOD_OPTIONS.find((option) => option.value === value) ?? PERIOD_OPTIONS.find((o) => o.value === DEFAULT_PERIOD)!
}

function isInPeriod(iso: string | null, now: Date, days: number | null): boolean {
  if (iso === null) return false
  const time = new Date(iso).getTime()
  if (time > now.getTime()) return false
  return days === null || time >= now.getTime() - days * DAY_MS
}

export function leadsCreatedInPeriod(leads: readonly AnalyticsLead[], now: Date, days: number | null): AnalyticsLead[] {
  return leads.filter((lead) => isInPeriod(lead.createdAt, now, days))
}

// --- KPIs ----------------------------------------------------------------------

export interface AnalyticsKpis {
  leadsInPeriod: number
  negotiationCents: number
  negotiationCount: number
  wonCents: number
  wonCount: number
  /** won / (won + lost) entre os fechados no período; `null` sem fechamento. */
  winRate: number | null
  /** Média de dias entre criação e ganho; `null` sem ganho no período. */
  avgCycleDays: number | null
}

export function computeKpis(leads: readonly AnalyticsLead[], now: Date, days: number | null): AnalyticsKpis {
  const negotiation = leads.filter((l) => l.status === 'open' && NEGOTIATION_KEYS.has(l.stageKey))
  const closed = leads.filter((l) => l.status !== 'open' && isInPeriod(l.closedAt, now, days))
  const won = closed.filter((l) => l.status === 'won')
  const cycles = won.map((l) => (new Date(l.closedAt!).getTime() - new Date(l.createdAt).getTime()) / DAY_MS)

  return {
    leadsInPeriod: leadsCreatedInPeriod(leads, now, days).length,
    negotiationCents: sumCents(negotiation),
    negotiationCount: negotiation.length,
    wonCents: sumCents(won),
    wonCount: won.length,
    winRate: closed.length === 0 ? null : won.length / closed.length,
    avgCycleDays: cycles.length === 0 ? null : Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length),
  }
}

// --- Funil ---------------------------------------------------------------------

export interface FunnelStep {
  key: string
  label: string
  count: number
  /** Fração que chegou aqui vinda do passo anterior; `null` no primeiro passo ou sem base. */
  rateFromPrevious: number | null
}

/**
 * Posição mais avançada que o lead alcançou. Não há histórico de estágio no
 * schema: aberto → estágio atual; ganho → estágio de ganho; perdido → inferido
 * pelas atividades concluídas (proposta enviada → proposta; reunião →
 * qualificado; contato → contatado; nada → primeiro estágio).
 */
export function reachedPosition(lead: AnalyticsLead, stages: readonly AnalyticsStage[]): number {
  const positionOf = (key: string) => stages.find((s) => s.key === key)?.position ?? 0
  if (lead.status !== 'lost') return positionOf(lead.stageKey)

  const types = new Set(lead.doneActivityTypes)
  if (types.has('proposal_sent')) return positionOf('proposta_enviada')
  if (types.has('meeting')) return positionOf('qualificado')
  if (['call', 'whatsapp', 'email'].some((t) => types.has(t))) return positionOf('contatado')
  return 0
}

export function computeFunnel(leads: readonly AnalyticsLead[], stages: readonly AnalyticsStage[]): FunnelStep[] {
  const steps = stages.filter((s) => !s.isLost).sort((a, b) => a.position - b.position)
  const reached = leads.map((lead) => reachedPosition(lead, stages))

  return steps.map((stage, index) => {
    const count = reached.filter((position) => position >= stage.position).length
    const previous = index === 0 ? null : reached.filter((position) => position >= steps[index - 1]!.position).length
    return {
      key: stage.key,
      label: stage.label,
      count,
      rateFromPrevious: previous === null || previous === 0 ? null : count / previous,
    }
  })
}

// --- Previsão ponderada ----------------------------------------------------------

export interface ForecastStage {
  key: string
  label: string
  probability: number
  openCents: number
  weightedCents: number
  count: number
}

export interface Forecast {
  openCents: number
  weightedCents: number
  byStage: ForecastStage[]
}

/**
 * Valor em aberto × probabilidade de cada etapa (D-046). Pondera lead a lead
 * com `weightedCents()` de `pipeline-board.ts` — a mesma função usada nas
 * colunas do Kanban (8.3) — em vez de ponderar a soma da etapa de uma vez,
 * para o total bater exatamente com o cabeçalho do Pipeline mesmo com
 * arredondamento por lead.
 */
export function computeForecast(leads: readonly AnalyticsLead[], stages: readonly AnalyticsStage[]): Forecast {
  const open = leads.filter((lead) => lead.status === 'open')
  const openStages = stages.filter((stage) => !stage.isWon && !stage.isLost).sort((a, b) => a.position - b.position)

  const byStage = openStages.map((stage) => {
    const stageLeads = open.filter((lead) => lead.stageKey === stage.key)
    return {
      key: stage.key,
      label: stage.label,
      probability: stage.probability,
      openCents: sumCents(stageLeads),
      weightedCents: stageLeads.reduce((sum, lead) => sum + weightedCents(lead.valueCents, stage.probability), 0),
      count: stageLeads.length,
    }
  })

  return {
    openCents: sumCents(open),
    weightedCents: byStage.reduce((sum, stage) => sum + stage.weightedCents, 0),
    byStage,
  }
}

// --- Agrupamentos ----------------------------------------------------------------

export interface GroupPerformance {
  label: string
  leads: number
  won: number
  winRate: number | null
  wonCents: number
  openCents: number
}

export function groupPerformance(
  leads: readonly AnalyticsLead[],
  keyOf: (lead: AnalyticsLead) => string | null,
): GroupPerformance[] {
  const groups = new Map<string, AnalyticsLead[]>()
  for (const lead of leads) {
    const key = keyOf(lead) ?? NOT_INFORMED
    groups.set(key, [...(groups.get(key) ?? []), lead])
  }

  return [...groups.entries()]
    .map(([label, items]) => {
      const won = items.filter((l) => l.status === 'won')
      const closed = items.filter((l) => l.status !== 'open').length
      return {
        label,
        leads: items.length,
        won: won.length,
        winRate: closed === 0 ? null : won.length / closed,
        wonCents: sumCents(won),
        openCents: sumCents(items.filter((l) => l.status === 'open')),
      }
    })
    .sort((a, b) => b.leads - a.leads || a.label.localeCompare(b.label, 'pt-BR'))
}

export interface ReasonCount {
  label: string
  count: number
}

export function lostReasonRanking(leads: readonly AnalyticsLead[]): ReasonCount[] {
  const counts = new Map<string, number>()
  for (const lead of leads) {
    if (lead.status !== 'lost') continue
    const label = lead.lostReason ?? NOT_INFORMED
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
}

// --- Oportunidades paradas ------------------------------------------------------------

export interface StalledBucket {
  count: number
  cents: number
}

export interface StalledOpportunities {
  /** Qualificado, ainda sem proposta. */
  awaitingProposal: StalledBucket
  /** Proposta enviada e o cliente não respondeu. */
  awaitingReply: StalledBucket
}

export function stalledOpportunities(leads: readonly AnalyticsLead[]): StalledOpportunities {
  const open = leads.filter((l) => l.status === 'open')
  const bucket = (items: AnalyticsLead[]): StalledBucket => ({ count: items.length, cents: sumCents(items) })
  return {
    awaitingProposal: bucket(open.filter((l) => l.stageKey === 'qualificado')),
    awaitingReply: bucket(open.filter((l) => l.stageKey === 'proposta_enviada' && l.respondedAt === null)),
  }
}

// --- Score digital × avanço ---------------------------------------------------------

export interface ScoreBucket {
  label: string
  range: string
  leads: number
  /** Fração que chegou pelo menos à proposta; `null` sem leads na faixa. */
  reachedProposalRate: number | null
}

const SCORE_BUCKETS = [
  { label: 'Presença fraca', range: '0–39', min: 0, max: 39 },
  { label: 'Presença média', range: '40–69', min: 40, max: 69 },
  { label: 'Presença forte', range: '70–100', min: 70, max: 100 },
] as const

export function scoreVsProgress(leads: readonly AnalyticsLead[], stages: readonly AnalyticsStage[]): ScoreBucket[] {
  const proposalPosition = stages.find((s) => s.key === 'proposta_enviada')?.position ?? Number.POSITIVE_INFINITY
  return SCORE_BUCKETS.map((bucket) => {
    const inBucket = leads.filter((l) => l.digitalScore !== null && l.digitalScore >= bucket.min && l.digitalScore <= bucket.max)
    const reached = inBucket.filter((l) => reachedPosition(l, stages) >= proposalPosition).length
    return {
      label: bucket.label,
      range: bucket.range,
      leads: inBucket.length,
      reachedProposalRate: inBucket.length === 0 ? null : reached / inBucket.length,
    }
  })
}

// --- Série mensal ----------------------------------------------------------------

export interface MonthPoint {
  key: string
  label: string
  created: number
  won: number
  wonCents: number
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function monthKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).formatToParts(date)
  const year = parts.find((p) => p.type === 'year')!.value
  const month = parts.find((p) => p.type === 'month')!.value
  return `${year}-${month}`
}

/** Últimos `months` meses (inclui o atual), no fuso da organização. */
export function monthlySeries(leads: readonly AnalyticsLead[], now: Date, months: number, timezone: string): MonthPoint[] {
  const [year, month] = monthKey(now, timezone).split('-').map(Number) as [number, number]
  const points: MonthPoint[] = Array.from({ length: months }, (_, i) => {
    const offset = months - 1 - i
    const d = new Date(Date.UTC(year, month - 1 - offset, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    return { key, label: MONTH_LABELS[d.getUTCMonth()]!, created: 0, won: 0, wonCents: 0 }
  })
  const byKey = new Map(points.map((p) => [p.key, p]))

  for (const lead of leads) {
    const created = byKey.get(monthKey(new Date(lead.createdAt), timezone))
    if (created) created.created += 1
    if (lead.status === 'won' && lead.closedAt) {
      const won = byKey.get(monthKey(new Date(lead.closedAt), timezone))
      if (won) {
        won.won += 1
        won.wonCents += lead.valueCents
      }
    }
  }
  return points
}

// --- Formatação ------------------------------------------------------------------

const compactFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** `1410000` → `"R$ 14,1 mil"`; abaixo de mil reais, valor inteiro. */
export function formatCompactBRL(cents: number): string {
  const reais = cents / 100
  if (Math.abs(reais) >= 1_000_000) return `R$ ${compactFormatter.format(reais / 1_000_000)} mi`
  if (Math.abs(reais) >= 1_000) return `R$ ${compactFormatter.format(reais / 1_000)} mil`
  return `R$ ${compactFormatter.format(Math.round(reais))}`
}

export function formatPercent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`
}

function sumCents(leads: readonly AnalyticsLead[]): number {
  return leads.reduce((sum, lead) => sum + lead.valueCents, 0)
}
