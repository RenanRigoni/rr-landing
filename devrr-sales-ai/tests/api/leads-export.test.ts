import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseExportFormat,
  leadToDossierInput,
  dossierFilenameSlug,
  buildLeadsExport,
} from '@/lib/api/leads-export'
import { DOSSIER_CSV_COLUMNS, type DigitalAudit } from '@/lib/domain/dossier-export'
import type { LeadWithDisplay } from '@/lib/queries/leads'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeLead(overrides: Partial<{
  id: string
  title: string
  interest: string | null
  valueCents: number
  companyName: string | null
  fullName: string
  phone: string | null
  email: string | null
  source: string | null
}> = {}): LeadWithDisplay {
  const o = {
    id: 'lead-1',
    title: 'Landing page para clínica',
    interest: 'Site novo',
    valueCents: 250000,
    companyName: 'Clínica Sorriso',
    fullName: 'Dra. Ana',
    phone: '+55 34 90000-0000',
    email: 'ana@sorriso.com',
    source: 'Instagram',
    ...overrides,
  }
  return {
    id: o.id,
    title: o.title,
    interest: o.interest,
    value_cents: o.valueCents,
    contact: {
      id: 'contact-1',
      full_name: o.fullName,
      phone: o.phone,
      email: o.email,
      company_name: o.companyName,
    },
    source: o.source === null ? null : { id: 'src-1', name: o.source },
  } as unknown as LeadWithDisplay
}

// ---------------------------------------------------------------------------
// parseExportFormat
// ---------------------------------------------------------------------------

describe('parseExportFormat', () => {
  it('aceita csv e json', () => {
    expect(parseExportFormat('csv')).toBe('csv')
    expect(parseExportFormat('json')).toBe('json')
  })

  it('rejeita ausente / vazio / qualquer outra coisa', () => {
    expect(parseExportFormat(null)).toBeNull()
    expect(parseExportFormat('')).toBeNull()
    expect(parseExportFormat('xml')).toBeNull()
    expect(parseExportFormat('CSV')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// leadToDossierInput
// ---------------------------------------------------------------------------

describe('leadToDossierInput', () => {
  it('empresa vem do contato, título à parte, fonte pelo nome', () => {
    const input = leadToDossierInput(makeLead())
    expect(input).toEqual({
      title: 'Landing page para clínica',
      companyName: 'Clínica Sorriso',
      contactName: 'Dra. Ana',
      phone: '+55 34 90000-0000',
      email: 'ana@sorriso.com',
      interest: 'Site novo',
      source: 'Instagram',
      valueCents: 250000,
    })
  })

  it('fonte nula quando o lead não tem fonte', () => {
    expect(leadToDossierInput(makeLead({ source: null })).source).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// dossierFilenameSlug
// ---------------------------------------------------------------------------

describe('dossierFilenameSlug', () => {
  it('normaliza acento, espaço e caixa', () => {
    expect(dossierFilenameSlug('Clínica Sorriso Uberlândia')).toBe('clinica-sorriso-uberlandia')
  })

  it('colapsa separadores e apara pontas', () => {
    expect(dossierFilenameSlug('  Loja & Cia — 2026!  ')).toBe('loja-cia-2026')
  })

  it('vazio / nulo → "lead"', () => {
    expect(dossierFilenameSlug(null)).toBe('lead')
    expect(dossierFilenameSlug('   ')).toBe('lead')
    expect(dossierFilenameSlug('!!!')).toBe('lead')
  })
})

// ---------------------------------------------------------------------------
// buildLeadsExport
// ---------------------------------------------------------------------------

describe('buildLeadsExport — CSV', () => {
  it('BOM + cabeçalho estável + uma linha por lead', () => {
    const leads = [makeLead({ id: 'a' }), makeLead({ id: 'b', companyName: 'Outra' })]
    const { body, contentType, filename } = buildLeadsExport(leads, new Map(), 'csv', '2026-08-28')

    expect(contentType).toBe('text/csv; charset=utf-8')
    expect(filename).toBe('leads-2026-08-28.csv')
    expect(body.charCodeAt(0)).toBe(0xfeff)

    const lines = body.slice(1).split('\r\n')
    expect(lines[0]).toBe(DOSSIER_CSV_COLUMNS.join(','))
    expect(lines).toHaveLength(4) // cabeçalho + 2 leads + '' final
  })

  it('sem leads → só cabeçalho', () => {
    const { body } = buildLeadsExport([], new Map(), 'csv', '2026-08-28')
    expect(body.slice(1)).toBe(`${DOSSIER_CSV_COLUMNS.join(',')}\r\n`)
  })

  it('usa a auditoria do lead quando existe no mapa', () => {
    const audit = { website_exists: 'sim', digital_score: 71 } as unknown as DigitalAudit
    const { body } = buildLeadsExport([makeLead({ id: 'a' })], new Map([['a', audit]]), 'csv', '2026-08-28')
    const row = body.slice(1).split('\r\n')[1] ?? ''
    const cells = row.split(',')
    expect(cells[DOSSIER_CSV_COLUMNS.indexOf('website_exists')]).toBe('sim')
    expect(cells[DOSSIER_CSV_COLUMNS.indexOf('digital_score')]).toBe('71')
  })
})

describe('buildLeadsExport — JSON', () => {
  it('array de dossiês aninhados, um por lead, sem recalcular score', () => {
    const audit = { digital_score: 55, digital_score_completeness: 40 } as unknown as DigitalAudit
    const leads = [makeLead({ id: 'a' }), makeLead({ id: 'b' })]
    const { body, contentType, filename } = buildLeadsExport(
      leads,
      new Map([['a', audit]]),
      'json',
      '2026-08-28',
    )

    expect(contentType).toBe('application/json; charset=utf-8')
    expect(filename).toBe('leads-2026-08-28.json')

    const parsed = JSON.parse(body) as unknown[]
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(2)
    expect(Object.keys(parsed[0] as object)).toEqual([
      'lead',
      'audit_exists',
      'prospecting',
      'google',
      'website',
      'conversion',
      'instagram',
      'pagespeed',
      'diagnostic',
    ])
    expect((parsed[0] as { diagnostic: { digital_score: number } }).diagnostic.digital_score).toBe(55)
    expect((parsed[1] as { diagnostic: { digital_score: number | null } }).diagnostic.digital_score).toBeNull()
  })

  it('export em massa carrega a mesma semântica de existência da auditoria', () => {
    // lead "a" tem linha de auditoria (mesmo sem score); lead "b" não tem.
    const auditVazia = {
      digital_score: null,
      digital_score_completeness: null,
      digital_opportunities: [],
    } as unknown as DigitalAudit
    const leads = [makeLead({ id: 'a' }), makeLead({ id: 'b' })]

    const json = JSON.parse(
      buildLeadsExport(leads, new Map([['a', auditVazia]]), 'json', '2026-08-28').body,
    ) as { audit_exists: boolean }[]
    expect(json[0]?.audit_exists).toBe(true)
    expect(json[1]?.audit_exists).toBe(false)

    const csv = buildLeadsExport(leads, new Map([['a', auditVazia]]), 'csv', '2026-08-28').body
    const [, rowA, rowB] = csv.slice(1).split('\r\n')
    const col = DOSSIER_CSV_COLUMNS.indexOf('audit_exists')
    expect((rowA ?? '').split(',')[col]).toBe('true')
    expect((rowB ?? '').split(',')[col]).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// Rota GET /api/leads/export (deps de sessão mockadas — sem rede)
// ---------------------------------------------------------------------------

const { requireOrgIdMock, listLeadsForDisplayMock, listLatestAuditsByLeadMock, listStagesMock, listSourcesMock } =
  vi.hoisted(() => ({
    requireOrgIdMock: vi.fn(),
    listLeadsForDisplayMock: vi.fn(),
    listLatestAuditsByLeadMock: vi.fn(),
    listStagesMock: vi.fn(),
    listSourcesMock: vi.fn(),
  }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/queries/require-org', () => ({ requireOrgId: requireOrgIdMock }))
vi.mock('@/lib/queries/leads', () => ({ listLeadsForDisplay: listLeadsForDisplayMock }))
vi.mock('@/lib/queries/digital-audits', () => ({ listLatestAuditsByLead: listLatestAuditsByLeadMock }))
vi.mock('@/lib/queries/catalogs', () => ({ listStages: listStagesMock, listSources: listSourcesMock }))

async function getRoute() {
  return import('@/app/api/leads/export/route')
}

function request(query = ''): Request {
  return new Request(`http://localhost/api/leads/export${query}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  requireOrgIdMock.mockResolvedValue('org-1')
  listStagesMock.mockResolvedValue([{ id: 'stage-1', key: 'quente' }])
  listSourcesMock.mockResolvedValue([{ id: 'src-1', name: 'Instagram' }])
  listLeadsForDisplayMock.mockResolvedValue([makeLead({ id: 'a' })])
  listLatestAuditsByLeadMock.mockResolvedValue(new Map())
})

describe('GET /api/leads/export', () => {
  it('sem format → 400, sem tocar sessão nem carregar leads', async () => {
    const { GET } = await getRoute()
    const res = await GET(request())

    expect(res.status).toBe(400)
    expect(requireOrgIdMock).not.toHaveBeenCalled()
    expect(listLeadsForDisplayMock).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({
      error: "Parâmetro 'format' inválido. Use 'csv' ou 'json'.",
    })
  })

  it('format inválido → 400', async () => {
    const { GET } = await getRoute()
    expect((await GET(request('?format=xml'))).status).toBe(400)
  })

  it('?format=csv → 200 text/csv com BOM, cabeçalho e Content-Disposition attachment', async () => {
    const { GET } = await getRoute()
    const res = await GET(request('?format=csv'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/)

    // O BOM tem que estar nos BYTES da resposta (o Excel pt-BR precisa). Não
    // dá para checar por `res.text()`: o decoder UTF-8 do Fetch remove o BOM
    // inicial ao decodificar.
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
    // TextDecoder('utf-8') com ignoreBOM padrão (false) já remove o BOM inicial.
    const decoded = new TextDecoder('utf-8').decode(bytes)
    expect(decoded.split('\r\n')[0]).toBe(DOSSIER_CSV_COLUMNS.join(','))
    expect(requireOrgIdMock).toHaveBeenCalledTimes(1)
  })

  it('?format=json → 200 application/json, array de dossiês aninhados', async () => {
    const { GET } = await getRoute()
    const res = await GET(request('?format=json'))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')

    const parsed = JSON.parse(await res.text()) as unknown[]
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
    expect(Object.keys(parsed[0] as object)).toContain('pagespeed')
  })

  it('resolve o filtro de estágio por key antes de consultar os leads', async () => {
    const { GET } = await getRoute()
    await GET(request('?format=json&stage=quente&status=won'))

    expect(listLeadsForDisplayMock).toHaveBeenCalledWith({
      stageId: 'stage-1',
      sourceId: undefined,
      status: 'won',
      search: undefined,
    })
  })

  it('estágio inexistente e status inválido são ignorados (sem filtro)', async () => {
    const { GET } = await getRoute()
    await GET(request('?format=json&stage=nao-existe&status=zzz'))

    expect(listLeadsForDisplayMock).toHaveBeenCalledWith({
      stageId: undefined,
      sourceId: undefined,
      status: undefined,
      search: undefined,
    })
  })
})
