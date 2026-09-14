import { describe, it, expect } from 'vitest'
import {
  computeFunnel,
  computeKpis,
  formatCompactBRL,
  formatPercent,
  groupPerformance,
  leadsCreatedInPeriod,
  lostReasonRanking,
  monthlySeries,
  NOT_INFORMED,
  reachedPosition,
  resolvePeriod,
  scoreVsProgress,
  stalledOpportunities,
  type AnalyticsLead,
  type AnalyticsStage,
} from '@/lib/domain/analytics'

const NOW = new Date('2026-09-14T15:00:00.000Z')
const TZ = 'America/Sao_Paulo'

const STAGES: AnalyticsStage[] = [
  { key: 'novo', label: 'Novo', position: 0, isWon: false, isLost: false },
  { key: 'contatado', label: 'Contatado', position: 1, isWon: false, isLost: false },
  { key: 'qualificado', label: 'Qualificado', position: 2, isWon: false, isLost: false },
  { key: 'proposta_enviada', label: 'Proposta enviada', position: 3, isWon: false, isLost: false },
  { key: 'negociacao', label: 'Negociação', position: 4, isWon: false, isLost: false },
  { key: 'ganho', label: 'Ganho', position: 5, isWon: true, isLost: false },
  { key: 'perdido', label: 'Perdido', position: 6, isWon: false, isLost: true },
]

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function lead(overrides: Partial<AnalyticsLead> = {}): AnalyticsLead {
  return {
    stageKey: 'novo',
    status: 'open',
    valueCents: 100000,
    source: 'Instagram',
    interest: 'Landing page',
    city: 'Patrocínio',
    createdAt: daysAgo(10),
    closedAt: null,
    respondedAt: null,
    lostReason: null,
    doneActivityTypes: [],
    digitalScore: null,
    ...overrides,
  }
}

describe('resolvePeriod', () => {
  it('aceita valor válido, inclusive vindo em array', () => {
    expect(resolvePeriod('30').days).toBe(30)
    expect(resolvePeriod(['tudo']).days).toBeNull()
  })

  it('cai no padrão (6 meses) com valor ausente ou inválido', () => {
    expect(resolvePeriod(undefined).value).toBe('180')
    expect(resolvePeriod('999').value).toBe('180')
  })
})

describe('leadsCreatedInPeriod', () => {
  it('filtra pela janela, ignora datas futuras e aceita período aberto', () => {
    const leads = [lead({ createdAt: daysAgo(5) }), lead({ createdAt: daysAgo(40) }), lead({ createdAt: daysAgo(-2) })]
    expect(leadsCreatedInPeriod(leads, NOW, 30)).toHaveLength(1)
    expect(leadsCreatedInPeriod(leads, NOW, null)).toHaveLength(2)
  })
})

describe('computeKpis', () => {
  it('sem fechamentos: taxa e ciclo nulos; negociação só de abertos em proposta/negociação', () => {
    const kpis = computeKpis(
      [
        lead({ stageKey: 'proposta_enviada', valueCents: 300000 }),
        lead({ stageKey: 'negociacao', valueCents: 200000 }),
        lead({ stageKey: 'qualificado', valueCents: 999900 }),
      ],
      NOW,
      30,
    )
    expect(kpis).toMatchObject({ leadsInPeriod: 3, negotiationCents: 500000, negotiationCount: 2, wonCount: 0, winRate: null, avgCycleDays: null })
  })

  it('ganhos e perdidos fechados no período dão taxa, receita e ciclo médio', () => {
    const kpis = computeKpis(
      [
        lead({ status: 'won', stageKey: 'ganho', valueCents: 150000, createdAt: daysAgo(40), closedAt: daysAgo(20) }),
        lead({ status: 'won', stageKey: 'ganho', valueCents: 250000, createdAt: daysAgo(30), closedAt: daysAgo(20) }),
        lead({ status: 'lost', stageKey: 'perdido', closedAt: daysAgo(5) }),
        lead({ status: 'lost', stageKey: 'perdido', closedAt: daysAgo(200) }),
        lead({ status: 'won', stageKey: 'ganho', closedAt: null }),
      ],
      NOW,
      90,
    )
    expect(kpis.wonCents).toBe(400000)
    expect(kpis.wonCount).toBe(2)
    expect(kpis.winRate).toBeCloseTo(2 / 3)
    expect(kpis.avgCycleDays).toBe(15)
  })
})

describe('reachedPosition', () => {
  it('aberto e ganho usam o estágio atual', () => {
    expect(reachedPosition(lead({ stageKey: 'qualificado' }), STAGES)).toBe(2)
    expect(reachedPosition(lead({ status: 'won', stageKey: 'ganho' }), STAGES)).toBe(5)
  })

  it('perdido é inferido pelas atividades concluídas', () => {
    const lost = (types: string[]) => lead({ status: 'lost', stageKey: 'perdido', doneActivityTypes: types })
    expect(reachedPosition(lost(['whatsapp', 'meeting', 'proposal_sent']), STAGES)).toBe(3)
    expect(reachedPosition(lost(['call', 'meeting']), STAGES)).toBe(2)
    expect(reachedPosition(lost(['email']), STAGES)).toBe(1)
    expect(reachedPosition(lost(['note']), STAGES)).toBe(0)
  })

  it('estágio desconhecido vale a primeira posição', () => {
    expect(reachedPosition(lead({ stageKey: 'inexistente' }), STAGES)).toBe(0)
  })
})

describe('computeFunnel', () => {
  it('conta quem alcançou cada estágio e a conversão sobre o anterior, sem o estágio de perda', () => {
    const funnel = computeFunnel(
      [
        lead({ stageKey: 'novo' }),
        lead({ stageKey: 'contatado' }),
        lead({ stageKey: 'proposta_enviada' }),
        lead({ status: 'won', stageKey: 'ganho' }),
      ],
      STAGES,
    )
    expect(funnel.map((s) => s.key)).not.toContain('perdido')
    expect(funnel[0]).toMatchObject({ key: 'novo', count: 4, rateFromPrevious: null })
    expect(funnel[1]).toMatchObject({ key: 'contatado', count: 3, rateFromPrevious: 0.75 })
    expect(funnel[5]).toMatchObject({ key: 'ganho', count: 1 })
  })

  it('sem leads a conversão fica nula', () => {
    expect(computeFunnel([], STAGES)[1]!.rateFromPrevious).toBeNull()
  })
})

describe('groupPerformance', () => {
  it('agrupa, soma valores, calcula taxa e ordena por volume e depois nome', () => {
    const groups = groupPerformance(
      [
        lead({ source: 'Indicação', status: 'won', stageKey: 'ganho', valueCents: 200000 }),
        lead({ source: 'Indicação', status: 'lost', stageKey: 'perdido' }),
        lead({ source: 'Google', valueCents: 50000 }),
        lead({ source: null }),
      ],
      (l) => l.source,
    )
    expect(groups.map((g) => g.label)).toEqual(['Indicação', 'Google', NOT_INFORMED])
    expect(groups[0]).toMatchObject({ leads: 2, won: 1, winRate: 0.5, wonCents: 200000, openCents: 0 })
    expect(groups[1]).toMatchObject({ winRate: null, openCents: 50000 })
  })
})

describe('lostReasonRanking', () => {
  it('só perdidos, motivo ausente vira "Não informado", ordena por contagem e nome', () => {
    const ranking = lostReasonRanking([
      lead({ status: 'lost', lostReason: 'Sem retorno' }),
      lead({ status: 'lost', lostReason: 'Sem retorno' }),
      lead({ status: 'lost', lostReason: 'Adiado' }),
      lead({ status: 'lost', lostReason: null }),
      lead({ status: 'open', lostReason: 'ignorado' }),
    ])
    expect(ranking).toEqual([
      { label: 'Sem retorno', count: 2 },
      { label: 'Adiado', count: 1 },
      { label: NOT_INFORMED, count: 1 },
    ])
  })
})

describe('stalledOpportunities', () => {
  it('qualificados sem proposta e propostas sem resposta, só abertos', () => {
    const stalled = stalledOpportunities([
      lead({ stageKey: 'qualificado', valueCents: 300000 }),
      lead({ stageKey: 'proposta_enviada', valueCents: 200000 }),
      lead({ stageKey: 'proposta_enviada', respondedAt: daysAgo(1) }),
      lead({ stageKey: 'qualificado', status: 'lost' }),
    ])
    expect(stalled.awaitingProposal).toEqual({ count: 1, cents: 300000 })
    expect(stalled.awaitingReply).toEqual({ count: 1, cents: 200000 })
  })
})

describe('scoreVsProgress', () => {
  it('distribui por faixa de score e mede quem chegou à proposta', () => {
    const buckets = scoreVsProgress(
      [
        lead({ digitalScore: 20, stageKey: 'proposta_enviada' }),
        lead({ digitalScore: 30, stageKey: 'contatado' }),
        lead({ digitalScore: 85, stageKey: 'novo' }),
        lead({ digitalScore: null, stageKey: 'negociacao' }),
      ],
      STAGES,
    )
    expect(buckets[0]).toMatchObject({ leads: 2, reachedProposalRate: 0.5 })
    expect(buckets[1]).toMatchObject({ leads: 0, reachedProposalRate: null })
    expect(buckets[2]).toMatchObject({ leads: 1, reachedProposalRate: 0 })
  })

  it('sem estágio de proposta ninguém conta como alcançado', () => {
    const stages = STAGES.filter((s) => s.key !== 'proposta_enviada')
    expect(scoreVsProgress([lead({ digitalScore: 10, stageKey: 'negociacao' })], stages)[0]!.reachedProposalRate).toBe(0)
  })
})

describe('monthlySeries', () => {
  it('monta os últimos meses no fuso da org e conta criados e ganhos', () => {
    const series = monthlySeries(
      [
        lead({ createdAt: '2026-09-02T12:00:00.000Z' }),
        lead({ createdAt: '2026-07-15T12:00:00.000Z', status: 'won', closedAt: '2026-09-01T02:00:00.000Z', valueCents: 480000 }),
        lead({ createdAt: '2025-01-10T12:00:00.000Z', status: 'won', closedAt: '2025-02-01T12:00:00.000Z' }),
        lead({ createdAt: '2026-08-10T12:00:00.000Z', status: 'won', closedAt: null }),
      ],
      NOW,
      3,
      TZ,
    )
    expect(series.map((p) => p.key)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(series.map((p) => p.label)).toEqual(['jul', 'ago', 'set'])
    expect(series.map((p) => p.created)).toEqual([1, 1, 1])
    // 2026-09-01T02:00Z ainda é 31/08 em Brasília.
    expect(series[1]).toMatchObject({ won: 1, wonCents: 480000 })
    expect(series[2]!.won).toBe(0)
  })

  it('atravessa a virada do ano', () => {
    const series = monthlySeries([], new Date('2026-01-20T12:00:00.000Z'), 2, TZ)
    expect(series.map((p) => p.key)).toEqual(['2025-12', '2026-01'])
  })
})

describe('formatação', () => {
  it('formatCompactBRL escolhe mi / mil / inteiro', () => {
    expect(formatCompactBRL(125_000_000)).toBe('R$ 1,3 mi')
    expect(formatCompactBRL(1_410_000)).toBe('R$ 14,1 mil')
    expect(formatCompactBRL(95_040)).toBe('R$ 950')
  })

  it('formatPercent arredonda e usa travessão sem base', () => {
    expect(formatPercent(0.426)).toBe('43%')
    expect(formatPercent(null)).toBe('—')
  })
})
