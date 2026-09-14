/**
 * Funil simulado das empresas prospectadas (`PROSPECT_COMPANIES`): cada uma
 * vira um lead num estágio sorteado pela cota de `PROSPECT_STAGE_QUOTA`, com
 * a linha do tempo coerente com o quanto avançou. Nenhuma vira `ganho` — só
 * clientes reais fecham (`demo-clients.ts`). Motivos de perda são neutros.
 */

import { NICHE_SERVICES, PROSPECT_COMPANIES, type DemoCompany, type NicheService } from './demo-companies'
import type { Rng } from './demo-random'
import {
  diagnosisMeeting,
  done,
  FOLLOWUP_DELAY_DAYS,
  firstContact,
  followup,
  leadRegistered,
  NO_REPLY,
  pendingTask,
  portfolioSent,
  proposalSent,
  PROSPECTING_SOURCE,
  type ActDraft,
  type Clock,
  type DemoPerson,
  type DemoSourceName,
  type DemoStageKey,
  type FollowupStep,
  type LeadDraft,
} from './demo-timeline'

export const PROSPECT_STAGE_QUOTA: Record<Exclude<DemoStageKey, 'ganho'>, number> = {
  novo: 16,
  contatado: 22,
  qualificado: 12,
  proposta_enviada: 10,
  negociacao: 5,
  perdido: 35,
}

const SOURCE_WEIGHTS: ReadonlyArray<readonly [DemoSourceName, number]> = [
  [PROSPECTING_SOURCE, 0.55],
  ['Instagram', 0.12],
  ['Google', 0.1],
  ['Indicação', 0.1],
  ['WhatsApp', 0.08],
  ['Site', 0.05],
]

const FRANCHISE_PATTERN = /OdontoCompany|Todeschini|Vamos Sorrir/
const FRANCHISE_REASON = 'Site e sistemas padronizados pela franqueadora'

type LostLevel = 'contatado' | 'qualificado' | 'proposta'

const LOST_REASONS: Record<LostLevel, readonly string[]> = {
  contatado: [
    'Sem retorno após três tentativas de contato',
    'Decisor não disponível para reunião',
    'Já trabalha com agência de marketing',
    'Decidiu priorizar só o Instagram por enquanto',
  ],
  qualificado: [
    'Projeto adiado para 2027',
    'Já trabalha com agência de marketing',
    'Decidiu priorizar só o Instagram por enquanto',
    'Orçamento do semestre destinado a equipamentos',
  ],
  proposta: [
    'Sem retorno após os follow-ups da proposta',
    'Investimento acima do previsto para o momento',
    'Projeto adiado para 2027',
    'Optou por solução pronta de mercado',
  ],
}

const NEGOTIATION_REPLIES = [
  'Gostou da proposta; pediu para dividir em duas fases.',
  'Pediu ajuste de prazo para antes da alta temporada.',
  'Quer incluir integração com a agenda atual; revisando escopo.',
] as const

type ProspectNiche = keyof typeof NICHE_SERVICES

interface Ctx {
  clock: Clock
  rng: Rng
  company: DemoCompany
  person: DemoPerson
  service: NicheService
  source: DemoSourceName
  value: number
  /** 0 = pendência atrasada · 1 = hoje · 2 = futura. */
  bucket: number
}

type StageResult = Pick<LeadDraft, 'createdAt' | 'acts' | 'valueReais' | 'temperature' | 'closedAt' | 'respondedAt' | 'lostReason'>

export function buildProspectDrafts(clock: Clock, rng: Rng, personAt: (index: number) => DemoPerson): LeadDraft[] {
  const quota = Object.entries(PROSPECT_STAGE_QUOTA).flatMap(([key, n]) => Array<DemoStageKey>(n).fill(key as DemoStageKey))
  if (quota.length !== PROSPECT_COMPANIES.length) {
    throw new Error(`Cota de estágios (${quota.length}) difere do número de empresas (${PROSPECT_COMPANIES.length}).`)
  }
  const stages = rng.shuffle(quota)
  let openIndex = 0

  return PROSPECT_COMPANIES.map((company, index) => {
    const stageKey = stages[index]!
    const isFranchise = FRANCHISE_PATTERN.test(company.name)
    const service = rng.pick(NICHE_SERVICES[company.niche as ProspectNiche])
    const source = isFranchise ? PROSPECTING_SOURCE : rng.weighted(SOURCE_WEIGHTS)
    const ctx: Ctx = {
      clock,
      rng,
      company,
      person: personAt(index),
      service,
      source,
      value: Math.round(rng.int(service.min, service.max) / 100) * 100,
      bucket: stageKey === 'perdido' ? 0 : openIndex++ % 3,
    }
    const result = STAGE_BUILDERS[stageKey === 'ganho' ? 'novo' : stageKey](ctx, isFranchise)
    return {
      ...result,
      company,
      person: ctx.person,
      stageKey,
      title: service.title,
      interest: service.interest,
      source,
      notes: null,
      withAudit: source === PROSPECTING_SOURCE,
    }
  })
}

const STAGE_BUILDERS: Record<Exclude<DemoStageKey, 'ganho'>, (ctx: Ctx, isFranchise: boolean) => StageResult> = {
  novo: buildNovo,
  contatado: buildContatado,
  qualificado: buildQualificado,
  proposta_enviada: buildPropostaEnviada,
  negociacao: buildNegociacao,
  perdido: buildPerdido,
}

function openResult(createdAt: number, acts: ActDraft[], valueReais: number, temperature: LeadDraft['temperature']): StageResult {
  return { createdAt, acts, valueReais, temperature, closedAt: null, respondedAt: null, lostReason: null }
}

function dueFor(ctx: Ctx, notBefore: number): number {
  const { clock, rng } = ctx
  const due =
    ctx.bucket === 0
      ? clock.past(rng.int(1, 3), rng.int(9, 16))
      : ctx.bucket === 1
        ? clock.laterToday(rng.int(1, 4))
        : clock.future(rng.int(1, 6), rng.int(9, 16))
  return Math.max(due, notBefore + 60 * 60 * 1000)
}

function hour(ctx: Ctx): number {
  return ctx.rng.int(8, 17)
}

function registered(ctx: Ctx, daysAgo: number): ActDraft {
  return leadRegistered(ctx.company, ctx.source, ctx.service.interest, ctx.clock.past(daysAgo, hour(ctx), ctx.rng.int(0, 59)))
}

function contacted(ctx: Ctx, daysAgo: number): ActDraft {
  return firstContact(ctx.company, ctx.person, ctx.source, ctx.service.interest, ctx.clock.past(daysAgo, hour(ctx)))
}

function buildNovo(ctx: Ctx): StageResult {
  const reg = registered(ctx, ctx.rng.int(0, 9))
  const body = ctx.source === PROSPECTING_SOURCE ? 'Abordar com o diagnóstico digital pronto.' : 'Responder e entender a necessidade.'
  const task = pendingTask('Fazer primeiro contato', body, dueFor(ctx, reg.createdAt), reg.createdAt)
  return openResult(reg.createdAt, [reg, task], 0, ctx.rng.chance(0.6) ? 'cold' : 'warm')
}

function buildContatado(ctx: Ctx): StageResult {
  const { rng, clock } = ctx
  const d = rng.int(4, 30)
  const first = d - 1
  const acts = [registered(ctx, d), contacted(ctx, first)]
  if (first >= 3 && rng.chance(0.6)) acts.push(portfolioSent(clock.past(first - rng.int(1, 2), hour(ctx))))
  const last = acts[acts.length - 1]!
  acts.push(pendingTask('Retomar conversa', 'Confirmar interesse e agendar reunião de diagnóstico.', dueFor(ctx, last.createdAt), last.createdAt))
  return openResult(acts[0]!.createdAt, acts, rng.chance(0.4) ? ctx.value : 0, rng.chance(0.5) ? 'cold' : 'warm')
}

function buildQualificado(ctx: Ctx): StageResult {
  const { rng, clock } = ctx
  const d = rng.int(10, 45)
  const meetingDay = rng.int(2, Math.floor(d / 2))
  const acts = [registered(ctx, d), contacted(ctx, d - 1)]
  if (rng.chance(0.5)) acts.push(portfolioSent(clock.past(d - 2, hour(ctx))))
  const meeting = diagnosisMeeting(ctx.company, ctx.person, ctx.service, clock.past(meetingDay, rng.pick([10, 14, 16])))
  acts.push(meeting)
  acts.push(
    pendingTask('Montar e enviar proposta', `Escopo: ${ctx.service.title}.`, dueFor(ctx, meeting.createdAt), meeting.createdAt),
  )
  return openResult(acts[0]!.createdAt, acts, ctx.value, rng.chance(0.5) ? 'warm' : 'hot')
}

function buildPropostaEnviada(ctx: Ctx): StageResult {
  const { rng, clock } = ctx
  const p = rng.int(1, 9)
  const d = p + rng.int(6, 25)
  const proposalAt = clock.past(p, rng.int(9, 17))
  const acts = [
    registered(ctx, d),
    contacted(ctx, d - 1),
    diagnosisMeeting(ctx.company, ctx.person, ctx.service, clock.past(p + rng.int(1, 4), rng.pick([10, 14, 16]))),
    proposalSent(ctx.service.title, ctx.value, proposalAt),
  ]

  const steps: FollowupStep[] = [1, 2, 3]
  const pastSteps = steps.filter((s) => p - FOLLOWUP_DELAY_DAYS[s] > 0)
  const leaveOverdue = ctx.bucket === 0 ? pastSteps[pastSteps.length - 1] : undefined
  for (const step of steps) {
    const dueDaysAgo = p - FOLLOWUP_DELAY_DAYS[step]
    if (dueDaysAgo > 0) {
      const dueAt = clock.past(dueDaysAgo, 10)
      acts.push(step === leaveOverdue ? followup(step, 'pending', dueAt, proposalAt) : followup(step, 'done', dueAt, proposalAt, NO_REPLY))
    } else {
      const dueAt = dueDaysAgo === 0 ? clock.laterToday(rng.int(1, 3)) : clock.future(-dueDaysAgo, 10)
      acts.push(followup(step, 'pending', dueAt, proposalAt))
    }
  }
  if (!acts.some((a) => a.status === 'pending')) {
    const last = acts[acts.length - 1]!
    acts.push(pendingTask('Ligar para saber da decisão', 'Sequência automática terminou sem resposta.', dueFor(ctx, last.doneAt ?? last.createdAt), last.createdAt))
  }
  return openResult(acts[0]!.createdAt, acts, ctx.value, rng.chance(0.5) ? 'hot' : 'warm')
}

function buildNegociacao(ctx: Ctx): StageResult {
  const { rng, clock } = ctx
  const p = rng.int(10, 22)
  const d = p + rng.int(8, 30)
  const respondedDay = p - rng.int(2, 3)
  const proposalAt = clock.past(p, rng.int(9, 17))
  const respondedAt = clock.past(respondedDay, rng.int(9, 18))
  const acts = [
    registered(ctx, d),
    contacted(ctx, d - 1),
    diagnosisMeeting(ctx.company, ctx.person, ctx.service, clock.past(p + rng.int(2, 6), rng.pick([10, 14, 16]))),
    proposalSent(ctx.service.title, ctx.value, proposalAt),
    followup(1, 'done', clock.past(p - 1, 10), proposalAt, NO_REPLY),
    done('whatsapp', 'Cliente respondeu', rng.pick(NEGOTIATION_REPLIES), respondedAt),
    followup(2, 'cancelled', clock.past(p - 3, 10), proposalAt),
    followup(3, 'cancelled', clock.past(Math.max(p - 7, 1), 10), proposalAt),
  ]
  const meeting = done('meeting', 'Negociação de escopo e prazo', 'Alinhadas fases, prazo e forma de pagamento.', clock.past(rng.int(1, respondedDay - 1), 15))
  acts.push(meeting)
  const title = rng.pick(['Enviar proposta revisada', 'Confirmar forma de pagamento e data de início'] as const)
  acts.push(pendingTask(title, null, dueFor(ctx, meeting.createdAt), meeting.createdAt))
  return { ...openResult(acts[0]!.createdAt, acts, ctx.value, 'hot'), respondedAt }
}

function buildPerdido(ctx: Ctx, isFranchise: boolean): StageResult {
  const { rng, clock } = ctx
  const level: LostLevel = isFranchise
    ? 'contatado'
    : rng.weighted<LostLevel>([
        ['contatado', 0.4],
        ['qualificado', 0.25],
        ['proposta', 0.35],
      ])
  const reason = isFranchise ? FRANCHISE_REASON : rng.pick(LOST_REASONS[level])
  const d = rng.int(35, 178)
  const acts = [registered(ctx, d), contacted(ctx, d - 1)]
  let closeDay: number
  let respondedAt: number | null = null

  if (level === 'contatado') {
    acts.push(done('whatsapp', 'Segunda tentativa de contato', 'Reenviei a abordagem com um exemplo do nicho.', clock.past(d - rng.int(4, 7), hour(ctx))))
    closeDay = d - rng.int(10, 18)
  } else {
    const meetingDay = d - rng.int(4, 9)
    acts.push(diagnosisMeeting(ctx.company, ctx.person, ctx.service, clock.past(meetingDay, rng.pick([10, 14, 16]))))
    if (level === 'qualificado') {
      closeDay = meetingDay - rng.int(6, 14)
    } else {
      const p = meetingDay - rng.int(2, 5)
      const proposalAt = clock.past(p, rng.int(9, 17))
      acts.push(proposalSent(ctx.service.title, ctx.value, proposalAt))
      if (reason === LOST_REASONS.proposta[0]) {
        for (const step of [1, 2, 3] as const) {
          acts.push(followup(step, 'done', clock.past(p - FOLLOWUP_DELAY_DAYS[step], 10), proposalAt, NO_REPLY))
        }
      } else {
        respondedAt = clock.past(p - 2, rng.int(9, 18))
        acts.push(followup(1, 'done', clock.past(p - 1, 10), proposalAt, NO_REPLY))
        acts.push(done('whatsapp', 'Cliente respondeu', `${reason}.`, respondedAt))
        acts.push(followup(2, 'cancelled', clock.past(p - 3, 10), proposalAt))
        acts.push(followup(3, 'cancelled', clock.past(p - 7, 10), proposalAt))
      }
      closeDay = p - rng.int(9, 14)
    }
  }

  const closedAt = clock.past(Math.max(closeDay, 2), 17, 30)
  acts.push(done('note', 'Lead encerrado como perdido', `Motivo: ${reason}. Vale reabordar em 6 meses.`, closedAt))
  return {
    createdAt: acts[0]!.createdAt,
    acts,
    valueReais: level === 'contatado' ? 0 : ctx.value,
    temperature: null,
    closedAt,
    respondedAt,
    lostReason: reason,
  }
}
