/**
 * Blocos de linha do tempo do seed de demonstração: tipos do rascunho de
 * lead, relógio relativo a `now` (horário comercial de Brasília) e as
 * atividades recorrentes do funil. Tudo puro — `demo-data.ts` monta os
 * rascunhos e converte em linhas.
 */

import { formatBRL, reaisToCents } from '../../lib/domain/money'
import { NICHE_GAP, NICHE_SEARCH_QUERY, type DemoCompany } from './demo-companies'

export const DEMO_STAGE_KEYS = [
  'novo',
  'contatado',
  'qualificado',
  'proposta_enviada',
  'negociacao',
  'ganho',
  'perdido',
] as const
export type DemoStageKey = (typeof DEMO_STAGE_KEYS)[number]

export const PROSPECTING_SOURCE = 'Prospecção ativa'
export const DEMO_SOURCE_NAMES = [PROSPECTING_SOURCE, 'Instagram', 'Google', 'Indicação', 'WhatsApp', 'Site'] as const
export type DemoSourceName = (typeof DEMO_SOURCE_NAMES)[number]

export type ActivityType = 'note' | 'call' | 'whatsapp' | 'email' | 'meeting' | 'task' | 'followup' | 'proposal_sent'
export type FollowupStep = 1 | 2 | 3

/** Atraso de cada passo da sequência padrão de `proposta_enviada` (`seed_org_defaults`, 0007). */
export const FOLLOWUP_DELAY_DAYS: Record<FollowupStep, number> = { 1: 1, 2: 3, 3: 7 }

export interface DemoPerson {
  fullName: string
  firstName: string
  role: string
  phone: string
  email: string | null
  notes: string | null
}

/** Datas em epoch ms. */
export interface ActDraft {
  type: ActivityType
  title: string
  body: string | null
  status: 'pending' | 'done' | 'cancelled'
  dueAt: number | null
  doneAt: number | null
  createdAt: number
  isAuto: boolean
  step: FollowupStep | null
}

export interface LeadDraft {
  company: DemoCompany
  person: DemoPerson
  stageKey: DemoStageKey
  title: string
  interest: string
  valueReais: number
  source: DemoSourceName
  temperature: 'cold' | 'warm' | 'hot' | null
  createdAt: number
  closedAt: number | null
  respondedAt: number | null
  lostReason: string | null
  notes: string | null
  withAudit: boolean
  acts: ActDraft[]
}

// --- Relógio ------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const BRT_OFFSET_HOURS = 3

export interface Clock {
  /** `daysAgo` dias atrás, às `hour`:`minute` de Brasília; nunca depois de `now`. */
  past(daysAgo: number, hour: number, minute?: number): number
  /** `daysAhead` dias à frente, às `hour` de Brasília; sempre depois de `now`. */
  future(daysAhead: number, hour: number): number
  /** Ainda hoje, `hours` horas depois de `now`. */
  laterToday(hours: number): number
  now: number
}

export function createClock(now: Date): Clock {
  const nowMs = now.getTime()
  const atBrt = (base: number, hour: number, minute: number): number => {
    const d = new Date(base)
    d.setUTCHours(hour + BRT_OFFSET_HOURS, minute, 0, 0)
    return d.getTime()
  }
  return {
    now: nowMs,
    past: (daysAgo, hour, minute = 0) => Math.min(atBrt(nowMs - daysAgo * DAY_MS, hour, minute), nowMs - 15 * 60 * 1000),
    future: (daysAhead, hour) => Math.max(atBrt(nowMs + daysAhead * DAY_MS, hour, 0), nowMs + 2 * HOUR_MS),
    laterToday: (hours) => nowMs + hours * HOUR_MS,
  }
}

// --- Construtores de atividade -----------------------------------------------------

export function done(type: ActivityType, title: string, body: string | null, at: number): ActDraft {
  return { type, title, body, status: 'done', dueAt: null, doneAt: at, createdAt: at, isAuto: false, step: null }
}

export function pendingTask(title: string, body: string | null, dueAt: number, createdAt: number): ActDraft {
  return { type: 'task', title, body, status: 'pending', dueAt, doneAt: null, createdAt: Math.min(createdAt, dueAt), isAuto: false, step: null }
}

export function followup(
  step: FollowupStep,
  status: ActDraft['status'],
  dueAt: number,
  createdAt: number,
  body: string | null = null,
): ActDraft {
  return {
    type: 'followup',
    title: `Follow-up ${step} da proposta`,
    body,
    status,
    dueAt,
    doneAt: status === 'done' ? dueAt : null,
    createdAt,
    isAuto: true,
    step,
  }
}

export const NO_REPLY = 'Mensagem de acompanhamento enviada pelo WhatsApp. Sem resposta.'

export function money(reais: number): string {
  return formatBRL(reaisToCents(reais))
}

const SOURCE_ORIGIN: Record<DemoSourceName, (company: DemoCompany, interest: string) => string> = {
  [PROSPECTING_SOURCE]: (company) =>
    `Encontrado na busca "${NICHE_SEARCH_QUERY[company.niche]} ${company.city.toLowerCase()}". Dossiê digital preenchido.`,
  Instagram: (_, interest) => `Mandou direct no Instagram da DevRR perguntando sobre ${lowerFirst(interest)}.`,
  Google: (company, interest) => `Formulário do site da DevRR após busca no Google por "${lowerFirst(interest)} ${company.city.toLowerCase()}".`,
  Indicação: () => 'Indicação de cliente da carteira da DevRR.',
  WhatsApp: (_, interest) => `Chamou no WhatsApp comercial pedindo orçamento de ${lowerFirst(interest)}.`,
  Site: () => 'Preencheu o formulário de contato do site da DevRR.',
}

export function leadRegistered(company: DemoCompany, source: DemoSourceName, interest: string, at: number): ActDraft {
  return done('note', 'Lead cadastrado', SOURCE_ORIGIN[source](company, interest), at)
}

export function firstContact(company: DemoCompany, person: DemoPerson, source: DemoSourceName, interest: string, at: number): ActDraft {
  if (source === PROSPECTING_SOURCE) {
    return done(
      'whatsapp',
      'Primeiro contato (prospecção)',
      `Abordagem com o diagnóstico digital: ${NICHE_GAP[company.niche]}. ${person.firstName} pediu exemplos de projetos.`,
      at,
    )
  }
  return done(
    'whatsapp',
    'Primeiro retorno',
    `Respondi em menos de 1h. ${person.firstName} quer entender prazo e investimento de ${lowerFirst(interest)}.`,
    at,
  )
}

export function portfolioSent(at: number): ActDraft {
  return done('whatsapp', 'Enviei portfólio e cases do nicho', 'Mandei 3 projetos parecidos e o link do dossiê resumido.', at)
}

export function diagnosisMeeting(company: DemoCompany, person: DemoPerson, range: { min: number; max: number }, at: number): ActDraft {
  return done(
    'meeting',
    'Reunião de diagnóstico',
    `Dor principal: ${NICHE_GAP[company.niche]}. Decisor: ${person.firstName} (${person.role.toLowerCase()}). Faixa conversada: ${money(range.min)} a ${money(range.max)}.`,
    at,
  )
}

export function proposalSent(title: string, valueReais: number, at: number): ActDraft {
  return done('proposal_sent', 'Proposta enviada', `${title} — ${money(valueReais)}. Validade de 15 dias, 50% de entrada.`, at)
}

/** Minúscula só na primeira letra, preservando siglas ("Landing page" → "landing page", "CRM próprio" fica). */
function lowerFirst(text: string): string {
  return /^\p{Lu}\p{Ll}/u.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text
}
