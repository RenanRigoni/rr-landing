import { describe, it, expect } from 'vitest'
import { computeFollowupSchedule, shouldCancelFollowups, resolveNextAction, type BusinessHours } from '@/lib/domain/followup'

// Toda data esperada abaixo foi conferida rodando a função de verdade antes
// de virar expect(...).toBe(...) — mesma disciplina do achado do NBSP
// (formatBRL) e do "cerca de" (formatRelativeDateBR): timezone/DST é
// exatamente a classe de bug que não dá pra adivinhar de cabeça.
const DEFAULT_HOURS: BusinessHours = { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] }

describe('computeFollowupSchedule', () => {
  it('entrada numa sexta 17h + delay 1 dia (cai sábado) empurra pra segunda 09h', () => {
    const fridayAt17 = new Date('2026-06-12T20:00:00.000Z') // sexta 17h em America/Sao_Paulo (UTC-3)
    const now = new Date('2026-06-01T12:00:00.000Z') // bem antes, não interfere

    const result = computeFollowupSchedule({
      enteredStageAt: fridayAt17,
      rules: [{ stepNumber: 1, delayDays: 1, isActive: true }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now,
    })

    expect(result).toEqual([{ stepNumber: 1, dueAt: new Date('2026-06-15T12:00:00.000Z') }]) // segunda 09h BRT
  })

  it('entrada num sábado, delay 0 — o próprio dia de entrada já é fora do expediente, empurra pra segunda 09h', () => {
    const saturday = new Date('2026-06-13T14:00:00.000Z') // sábado 11h em America/Sao_Paulo
    const now = new Date('2026-06-01T12:00:00.000Z')

    const result = computeFollowupSchedule({
      enteredStageAt: saturday,
      rules: [{ stepNumber: 1, delayDays: 0, isActive: true }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now,
    })

    expect(result).toEqual([{ stepNumber: 1, dueAt: new Date('2026-06-15T12:00:00.000Z') }]) // segunda 09h BRT
  })

  it('org com fuso diferente (America/Manaus, UTC-4) — mesmo instante de entrada gera dueAt diferente de São Paulo', () => {
    const fridayAt17SaoPaulo = new Date('2026-06-12T20:00:00.000Z')
    const now = new Date('2026-06-01T12:00:00.000Z')

    const result = computeFollowupSchedule({
      enteredStageAt: fridayAt17SaoPaulo,
      rules: [{ stepNumber: 1, delayDays: 1, isActive: true }],
      timezone: 'America/Manaus',
      businessHours: DEFAULT_HOURS,
      now,
    })

    // segunda 09h em Manaus (UTC-4) = 13h UTC — 1h depois do equivalente em São Paulo (12h UTC)
    expect(result).toEqual([{ stepNumber: 1, dueAt: new Date('2026-06-15T13:00:00.000Z') }])
  })

  it('regra desativada não aparece no cronograma', () => {
    const fridayAt17 = new Date('2026-06-12T20:00:00.000Z')
    const now = new Date('2026-06-01T12:00:00.000Z')

    const result = computeFollowupSchedule({
      enteredStageAt: fridayAt17,
      rules: [{ stepNumber: 1, delayDays: 1, isActive: false }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now,
    })

    expect(result).toEqual([])
  })

  it('passo já executado (alreadyExecuted) não é reagendado', () => {
    const fridayAt17 = new Date('2026-06-12T20:00:00.000Z')
    const now = new Date('2026-06-01T12:00:00.000Z')

    const result = computeFollowupSchedule({
      enteredStageAt: fridayAt17,
      rules: [{ stepNumber: 1, delayDays: 1, isActive: true, alreadyExecuted: true }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now,
    })

    expect(result).toEqual([])
  })

  it('regra ativa e não executada continua no cronograma junto de outra desativada', () => {
    const fridayAt17 = new Date('2026-06-12T20:00:00.000Z')
    const now = new Date('2026-06-01T12:00:00.000Z')

    const result = computeFollowupSchedule({
      enteredStageAt: fridayAt17,
      rules: [
        { stepNumber: 1, delayDays: 1, isActive: false },
        { stepNumber: 2, delayDays: 1, isActive: true, alreadyExecuted: true },
        { stepNumber: 3, delayDays: 1, isActive: true },
      ],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now,
    })

    expect(result).toEqual([{ stepNumber: 3, dueAt: new Date('2026-06-15T12:00:00.000Z') }])
  })

  it('nunca agenda no passado: enteredStageAt + delay já passou e "agora" está dentro do expediente — vence agora mesmo', () => {
    const enteredLongAgo = new Date('2020-01-01T12:00:00.000Z')
    const nowInsideBusinessHours = new Date('2026-06-15T13:00:00.000Z') // segunda 10h BRT

    const result = computeFollowupSchedule({
      enteredStageAt: enteredLongAgo,
      rules: [{ stepNumber: 1, delayDays: 1, isActive: true }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now: nowInsideBusinessHours,
    })

    expect(result).toEqual([{ stepNumber: 1, dueAt: nowInsideBusinessHours }])
  })

  it('nunca agenda no passado: enteredStageAt + delay já passou e "agora" está fora do expediente — empurra pra próxima janela', () => {
    const enteredLongAgo = new Date('2020-01-01T12:00:00.000Z')
    const nowOutsideBusinessHours = new Date('2026-06-15T02:00:00.000Z') // domingo 23h BRT

    const result = computeFollowupSchedule({
      enteredStageAt: enteredLongAgo,
      rules: [{ stepNumber: 1, delayDays: 1, isActive: true }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now: nowOutsideBusinessHours,
    })

    expect(result).toEqual([{ stepNumber: 1, dueAt: new Date('2026-06-15T12:00:00.000Z') }]) // segunda 09h BRT
  })

  it('premissa de horário de verão: Brasil não observa DST desde 2019 — offset -03:00 de São Paulo é constante o ano todo (não testamos transição de DST porque não existe uma para testar hoje)', () => {
    const january = computeFollowupSchedule({
      enteredStageAt: new Date('2026-01-05T12:00:00.000Z'),
      rules: [{ stepNumber: 1, delayDays: 0, isActive: true }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now: new Date('2026-01-01T00:00:00.000Z'),
    })
    const july = computeFollowupSchedule({
      enteredStageAt: new Date('2026-07-06T12:00:00.000Z'),
      rules: [{ stepNumber: 1, delayDays: 0, isActive: true }],
      timezone: 'America/Sao_Paulo',
      businessHours: DEFAULT_HOURS,
      now: new Date('2026-07-01T00:00:00.000Z'),
    })

    // 12:00 UTC vira 09:00 local (abertura) nos dois meses — mesmo offset -03:00
    expect(january[0]?.dueAt.getUTCHours()).toBe(12)
    expect(july[0]?.dueAt.getUTCHours()).toBe(12)
  })
})

describe('shouldCancelFollowups', () => {
  it('cancela quando o cliente respondeu', () => {
    expect(shouldCancelFollowups({ leadStatus: 'open', respondedAt: new Date(), stageIsWon: false, stageIsLost: false })).toBe(true)
  })

  it('cancela quando o estágio é de ganho', () => {
    expect(shouldCancelFollowups({ leadStatus: 'won', respondedAt: null, stageIsWon: true, stageIsLost: false })).toBe(true)
  })

  it('cancela quando o estágio é de perda', () => {
    expect(shouldCancelFollowups({ leadStatus: 'lost', respondedAt: null, stageIsWon: false, stageIsLost: true })).toBe(true)
  })

  it('cancela quando o status do lead não é mais aberto, mesmo sem sinal de estágio', () => {
    expect(shouldCancelFollowups({ leadStatus: 'won', respondedAt: null, stageIsWon: false, stageIsLost: false })).toBe(true)
  })

  it('não cancela quando nada disso se aplica (lead aberto, sem resposta, estágio neutro)', () => {
    expect(shouldCancelFollowups({ leadStatus: 'open', respondedAt: null, stageIsWon: false, stageIsLost: false })).toBe(false)
  })
})

describe('resolveNextAction', () => {
  it('sem activities, devolve null', () => {
    expect(resolveNextAction([])).toBeNull()
  })

  it('só activities done/cancelled, devolve null', () => {
    expect(
      resolveNextAction([
        { status: 'done', due_at: '2026-01-01T00:00:00.000Z' },
        { status: 'cancelled', due_at: '2026-02-01T00:00:00.000Z' },
      ]),
    ).toBeNull()
  })

  it('pendente sem due_at (tarefa manual sem data) não conta, devolve null', () => {
    expect(resolveNextAction([{ status: 'pending', due_at: null }])).toBeNull()
  })

  it('devolve o menor due_at entre as pendentes, ignorando done/cancelled mesmo que tenham data anterior', () => {
    const result = resolveNextAction([
      { status: 'pending', due_at: '2026-03-03T00:00:00.000Z' },
      { status: 'pending', due_at: '2026-01-01T00:00:00.000Z' },
      { status: 'cancelled', due_at: '2025-01-01T00:00:00.000Z' },
      { status: 'done', due_at: '2024-01-01T00:00:00.000Z' },
    ])

    expect(result?.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('aceita due_at já como Date, não só string', () => {
    const result = resolveNextAction([{ status: 'pending', due_at: new Date('2026-05-05T00:00:00.000Z') }])
    expect(result?.toISOString()).toBe('2026-05-05T00:00:00.000Z')
  })
})
