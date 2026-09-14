import { describe, it, expect } from 'vitest'
import {
  buildBoardColumns,
  matchesBoardSearch,
  moveLeadOnBoard,
  weightedCents,
  type BoardLead,
  type BoardStage,
} from '@/lib/domain/pipeline-board'

const NOW = new Date('2026-09-14T15:00:00.000Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

const STAGE_NOVO: BoardStage = { id: 's-novo', key: 'novo', label: 'Novo', position: 0, probability: 5, isWon: false, isLost: false }
const STAGE_CONTATADO: BoardStage = {
  id: 's-contatado',
  key: 'contatado',
  label: 'Contatado',
  position: 1,
  probability: 15,
  isWon: false,
  isLost: false,
}
const STAGE_GANHO: BoardStage = { id: 's-ganho', key: 'ganho', label: 'Ganho', position: 2, probability: 100, isWon: true, isLost: false }
const STAGE_PERDIDO: BoardStage = {
  id: 's-perdido',
  key: 'perdido',
  label: 'Perdido',
  position: 3,
  probability: 0,
  isWon: false,
  isLost: true,
}
const STAGES = [STAGE_NOVO, STAGE_CONTATADO, STAGE_GANHO, STAGE_PERDIDO]

function boardLead(overrides: Partial<BoardLead> = {}): BoardLead {
  return {
    id: 'lead-1',
    stageId: STAGE_NOVO.id,
    status: 'open',
    title: 'Landing page',
    companyName: 'Padaria São João',
    contactFirstName: 'Carlos',
    contactPhone: '+5511988887777',
    valueCents: 100000,
    temperature: 'warm',
    nextActionAt: null,
    lastContactAt: null,
    closedAt: null,
    sourceName: 'Instagram',
    digitalScore: null,
    ...overrides,
  }
}

describe('weightedCents', () => {
  it('arredonda valor × probabilidade / 100', () => {
    expect(weightedCents(100000, 50)).toBe(50000)
    expect(weightedCents(1, 50)).toBe(1) // round(0.5) = 1
  })

  it('protege contra probabilidade fora de 0–100', () => {
    expect(weightedCents(100000, -10)).toBe(0)
    expect(weightedCents(100000, 150)).toBe(100000)
  })
})

describe('buildBoardColumns', () => {
  it('uma coluna por estágio, na ordem de position, mesmo sem leads', () => {
    const columns = buildBoardColumns([], STAGES, NOW)
    expect(columns.map((c) => c.stage.key)).toEqual(['novo', 'contatado', 'ganho', 'perdido'])
    expect(columns.every((c) => c.leads.length === 0 && c.totalCents === 0 && c.hiddenCount === 0)).toBe(true)
  })

  it('lead em estágio desconhecido é ignorado, não lança', () => {
    const columns = buildBoardColumns([boardLead({ stageId: 'estagio-removido' })], STAGES, NOW)
    expect(columns.flatMap((c) => c.leads)).toHaveLength(0)
  })

  it('soma totalCents e weightedCents dos leads da coluna', () => {
    const columns = buildBoardColumns(
      [boardLead({ id: 'a', valueCents: 100000 }), boardLead({ id: 'b', valueCents: 200000 })],
      STAGES,
      NOW,
    )
    const novo = columns.find((c) => c.stage.key === 'novo')!
    expect(novo.totalCents).toBe(300000)
    expect(novo.weightedCents).toBe(weightedCents(100000, 5) + weightedCents(200000, 5))
  })

  describe('ordenação em colunas abertas', () => {
    it('nextActionAt asc, nulos por último, depois valueCents desc', () => {
      const columns = buildBoardColumns(
        [
          boardLead({ id: 'sem-acao-barato', nextActionAt: null, valueCents: 100000 }),
          boardLead({ id: 'sem-acao-caro', nextActionAt: null, valueCents: 200000 }),
          boardLead({ id: 'daqui-2-dias', nextActionAt: daysAgo(-2) }),
          boardLead({ id: 'hoje', nextActionAt: daysAgo(0) }),
        ],
        STAGES,
        NOW,
      )
      const novo = columns.find((c) => c.stage.key === 'novo')!
      expect(novo.leads.map((l) => l.id)).toEqual(['hoje', 'daqui-2-dias', 'sem-acao-caro', 'sem-acao-barato'])
    })

    it('empate em nextActionAt desempata por valueCents desc', () => {
      const mesmoHorario = daysAgo(0)
      const columns = buildBoardColumns(
        [
          boardLead({ id: 'barato', nextActionAt: mesmoHorario, valueCents: 100000 }),
          boardLead({ id: 'caro', nextActionAt: mesmoHorario, valueCents: 200000 }),
        ],
        STAGES,
        NOW,
      )
      const novo = columns.find((c) => c.stage.key === 'novo')!
      expect(novo.leads.map((l) => l.id)).toEqual(['caro', 'barato'])
    })
  })

  describe('janela de fechados (Ganho/Perdido)', () => {
    it('só mostra closedAt dentro da janela; fora da janela conta em hiddenCount', () => {
      const columns = buildBoardColumns(
        [
          boardLead({ id: 'dentro', stageId: STAGE_GANHO.id, status: 'won', closedAt: daysAgo(10) }),
          boardLead({ id: 'fora', stageId: STAGE_GANHO.id, status: 'won', closedAt: daysAgo(45) }),
          boardLead({ id: 'sem-data', stageId: STAGE_GANHO.id, status: 'won', closedAt: null }),
        ],
        STAGES,
        NOW,
      )
      const ganho = columns.find((c) => c.stage.key === 'ganho')!
      expect(ganho.leads.map((l) => l.id)).toEqual(['dentro'])
      expect(ganho.hiddenCount).toBe(2)
    })

    it('soma hiddenCountByStageId (leads antigos que a query nem trouxe)', () => {
      const columns = buildBoardColumns([boardLead({ id: 'dentro', stageId: STAGE_PERDIDO.id, status: 'lost', closedAt: daysAgo(1) })], STAGES, NOW, {
        hiddenCountByStageId: { [STAGE_PERDIDO.id]: 40 },
      })
      const perdido = columns.find((c) => c.stage.key === 'perdido')!
      expect(perdido.hiddenCount).toBe(40)
      expect(perdido.leads).toHaveLength(1)
    })

    it('ordena fechados por closedAt desc', () => {
      const columns = buildBoardColumns(
        [
          boardLead({ id: 'mais-antigo', stageId: STAGE_GANHO.id, status: 'won', closedAt: daysAgo(5) }),
          boardLead({ id: 'mais-recente', stageId: STAGE_GANHO.id, status: 'won', closedAt: daysAgo(1) }),
        ],
        STAGES,
        NOW,
      )
      const ganho = columns.find((c) => c.stage.key === 'ganho')!
      expect(ganho.leads.map((l) => l.id)).toEqual(['mais-recente', 'mais-antigo'])
    })

    it('respeita closedWindowDays customizado', () => {
      const columns = buildBoardColumns(
        [boardLead({ id: 'dentro-7', stageId: STAGE_GANHO.id, status: 'won', closedAt: daysAgo(5) })],
        STAGES,
        NOW,
        { closedWindowDays: 3 },
      )
      const ganho = columns.find((c) => c.stage.key === 'ganho')!
      expect(ganho.leads).toHaveLength(0)
      expect(ganho.hiddenCount).toBe(1)
    })
  })
})

describe('moveLeadOnBoard', () => {
  function baseColumns() {
    return buildBoardColumns(
      [
        boardLead({ id: 'lead-a', stageId: STAGE_NOVO.id, valueCents: 100000 }),
        boardLead({ id: 'lead-b', stageId: STAGE_CONTATADO.id, valueCents: 200000, closedAt: null }),
      ],
      STAGES,
      NOW,
    )
  }

  it('move aberto → aberto, recalcula totais e reordena', () => {
    const moved = moveLeadOnBoard(baseColumns(), 'lead-a', STAGE_CONTATADO.id, NOW)
    const novo = moved.find((c) => c.stage.key === 'novo')!
    const contatado = moved.find((c) => c.stage.key === 'contatado')!
    expect(novo.leads).toHaveLength(0)
    expect(novo.totalCents).toBe(0)
    expect(contatado.leads.map((l) => l.id)).toContain('lead-a')
    expect(contatado.totalCents).toBe(300000)
  })

  it('move aberto → ganho: status vira won e closedAt é preenchido com now', () => {
    const moved = moveLeadOnBoard(baseColumns(), 'lead-a', STAGE_GANHO.id, NOW)
    const ganho = moved.find((c) => c.stage.key === 'ganho')!
    expect(ganho.leads[0]).toMatchObject({ id: 'lead-a', status: 'won', closedAt: NOW.toISOString() })
  })

  it('move aberto → perdido: status vira lost e closedAt é preenchido com now', () => {
    const moved = moveLeadOnBoard(baseColumns(), 'lead-a', STAGE_PERDIDO.id, NOW)
    const perdido = moved.find((c) => c.stage.key === 'perdido')!
    expect(perdido.leads[0]).toMatchObject({ id: 'lead-a', status: 'lost', closedAt: NOW.toISOString() })
  })

  it('move perdido → aberto: closedAt volta a null e status vira open', () => {
    const columns = buildBoardColumns(
      [boardLead({ id: 'lead-c', stageId: STAGE_PERDIDO.id, status: 'lost', closedAt: daysAgo(1) })],
      STAGES,
      NOW,
    )
    const moved = moveLeadOnBoard(columns, 'lead-c', STAGE_NOVO.id, NOW)
    const novo = moved.find((c) => c.stage.key === 'novo')!
    expect(novo.leads[0]).toMatchObject({ id: 'lead-c', status: 'open', closedAt: null })
  })

  it('lead inexistente devolve columns inalterado', () => {
    const columns = baseColumns()
    expect(moveLeadOnBoard(columns, 'nao-existe', STAGE_CONTATADO.id, NOW)).toBe(columns)
  })

  it('mesmo estágio devolve columns inalterado', () => {
    const columns = baseColumns()
    expect(moveLeadOnBoard(columns, 'lead-a', STAGE_NOVO.id, NOW)).toBe(columns)
  })

  it('estágio de destino inexistente devolve columns inalterado', () => {
    const columns = baseColumns()
    expect(moveLeadOnBoard(columns, 'lead-a', 'estagio-removido', NOW)).toBe(columns)
  })
})

describe('matchesBoardSearch', () => {
  it('query vazia (mesmo só com espaços) sempre casa', () => {
    expect(matchesBoardSearch(boardLead(), '')).toBe(true)
    expect(matchesBoardSearch(boardLead(), '   ')).toBe(true)
  })

  it('casa em companyName, title e contactFirstName, sem acento e sem caixa', () => {
    const lead = boardLead({ companyName: 'Padaria São João', title: 'Landing page', contactFirstName: 'Carlos' })
    expect(matchesBoardSearch(lead, 'sao joao')).toBe(true)
    expect(matchesBoardSearch(lead, 'LANDING')).toBe(true)
    expect(matchesBoardSearch(lead, 'carlos')).toBe(true)
  })

  it('sem correspondência devolve false', () => {
    expect(matchesBoardSearch(boardLead(), 'inexistente')).toBe(false)
  })
})
