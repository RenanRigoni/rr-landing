import { addDays, getDay, isBefore, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns'
import { TZDate } from '@date-fns/tz'

/**
 * O coração do produto (docs/IMPLEMENTATION_PLAN.md → 4.2): calcula quando o
 * próximo follow-up automático vence, respeitando fuso e horário comercial
 * da organização, e resolve quando um lead deixa de precisar de cobrança.
 * Puro — zero import de supabase/next. `lib/actions/` (4.3) é quem grava o
 * resultado; este arquivo só calcula.
 *
 * `date-fns` sozinho (v4, já pinada) não tem noção de fuso horário — os
 * testes de "org com fuso diferente" confirmariam isso rodando local ao
 * servidor, não ao fuso da org, que é exatamente o bug que `DATABASE.md`
 * descreve ("follow-up agendado pra sábado às 3h da manhã é bug de
 * produto"). `@date-fns/tz` é o companion oficial do mesmo projeto/major
 * (não third-party solto) — `TZDate` se comporta como `Date`, mas seus
 * getters/setters (`getDay`, `getHours`, `setHours`...) operam no horário
 * local do fuso informado, com DST tratado pela ICU do runtime, não por
 * aritmética de offset escrita à mão aqui.
 */

export interface FollowupRule {
  stepNumber: number
  delayDays: number
  isActive: boolean
  /** Já existe activity gerada para este passo — não gerar de novo (idempotência, ver D-020/4.3). */
  alreadyExecuted?: boolean
}

export interface BusinessHours {
  start: string // 'HH:mm', horário local da organização
  end: string // 'HH:mm', horário local da organização
  /** Dias com expediente — convenção de `Date.getDay()` (0 = domingo ... 6 = sábado). */
  days: number[]
}

export interface ComputeFollowupScheduleInput {
  enteredStageAt: Date
  rules: FollowupRule[]
  timezone: string
  businessHours: BusinessHours
  /** Instante de referência para "nunca agendar no passado". Default: agora. Parâmetro só existe para determinismo em teste. */
  now?: Date
}

function parseHHmm(value: string): { hours: number; minutes: number } {
  const parts = value.split(':')
  return { hours: Number(parts[0]), minutes: Number(parts[1]) }
}

/** Reaplica um horário 'HH:mm' local sobre um TZDate, zerando segundos/ms. */
function atLocalTime(zoned: TZDate, hhmm: string): TZDate {
  const { hours, minutes } = parseHHmm(hhmm)
  return setMilliseconds(setSeconds(setMinutes(setHours(zoned, hours), minutes), 0), 0) as TZDate
}

/**
 * Empurra um instante pra dentro da próxima janela de horário comercial
 * válida, no fuso da organização. Fim de semana (ou qualquer dia fora de
 * `businessHours.days`) avança pro próximo dia às `start`; antes da abertura
 * do dia avança pra `start` do mesmo dia; depois do fechamento avança pro
 * dia seguinte às `start`. Dentro do horário, devolve o instante como está —
 * "empurrar" só se aplica a quem está fora da janela.
 */
function pushIntoBusinessWindow(instant: Date, timezone: string, businessHours: BusinessHours): TZDate {
  let zoned = new TZDate(instant, timezone)

  // 8 iterações cobre qualquer combinação real de dias de expediente —
  // mesmo no caso extremo de só 1 dia útil na semana, não há como precisar
  // andar mais que 7 dias pra encontrá-lo, +1 de folga.
  for (let guard = 0; guard < 8; guard += 1) {
    if (!businessHours.days.includes(getDay(zoned))) {
      zoned = atLocalTime(addDays(zoned, 1), businessHours.start)
      continue
    }

    const dayStart = atLocalTime(zoned, businessHours.start)
    if (isBefore(zoned, dayStart)) {
      return dayStart
    }

    const dayEnd = atLocalTime(zoned, businessHours.end)
    if (!isBefore(zoned, dayEnd)) {
      zoned = atLocalTime(addDays(zoned, 1), businessHours.start)
      continue
    }

    return zoned
  }

  return zoned
}

/**
 * Data de vencimento de cada passo ativo e ainda não executado da sequência
 * de follow-up, a partir do momento em que o lead entrou no estágio.
 * `delayDays` é dias corridos (não úteis) somados a `enteredStageAt`; o
 * resultado é então empurrado pra dentro do horário comercial. Se a data
 * calculada já passou (`now`), agenda pra próxima janela útil a partir de
 * agora — nunca no passado.
 */
export function computeFollowupSchedule(input: ComputeFollowupScheduleInput): Array<{ stepNumber: number; dueAt: Date }> {
  const now = input.now ?? new Date()

  return input.rules
    .filter((rule) => rule.isActive && !rule.alreadyExecuted)
    .map((rule) => {
      const candidate = addDays(input.enteredStageAt, rule.delayDays)
      const reference = isBefore(candidate, now) ? now : candidate
      const dueAt = pushIntoBusinessWindow(reference, input.timezone, input.businessHours)
      return { stepNumber: rule.stepNumber, dueAt: new Date(dueAt.getTime()) }
    })
}

export interface ShouldCancelFollowupsInput {
  leadStatus: 'open' | 'won' | 'lost'
  respondedAt: Date | string | null
  stageIsWon: boolean
  stageIsLost: boolean
}

/**
 * docs/DATABASE.md → followup_rules, "Semântica de cancelamento": cliente
 * respondeu, ou o lead fechou (por estágio `is_won`/`is_lost` ou por status
 * já não estar `open`) — qualquer um desses cancela os follow-ups
 * automáticos pendentes. Regra 3 de `PRODUCT_SPEC.md`: nada é mais
 * destruidor de confiança que cobrar quem já respondeu.
 */
export function shouldCancelFollowups(input: ShouldCancelFollowupsInput): boolean {
  return input.respondedAt !== null || input.stageIsWon || input.stageIsLost || input.leadStatus !== 'open'
}

/** Mesmo shape de `sales.activities` (D-020/ARCHITECTURE.md: mesmo estilo do CRM-RR `next-action.ts`) — o chamador passa a linha do banco direto, sem mapear campo a campo. */
export interface ActivityLike {
  status: 'pending' | 'done' | 'cancelled'
  due_at: string | Date | null
}

/** Menor `due_at` entre as activities pendentes — o que `leads.next_action_at` deveria valer (D-006: cache mantido pela aplicação, não trigger). `null` sem nenhuma pendente com data. */
export function resolveNextAction(activities: ActivityLike[]): Date | null {
  const pendingDueDates = activities
    .filter((activity): activity is ActivityLike & { due_at: string | Date } => activity.status === 'pending' && activity.due_at !== null)
    .map((activity) => (activity.due_at instanceof Date ? activity.due_at : new Date(activity.due_at)))

  if (pendingDueDates.length === 0) {
    return null
  }

  return pendingDueDates.reduce((earliest, current) => (current.getTime() < earliest.getTime() ? current : earliest))
}
