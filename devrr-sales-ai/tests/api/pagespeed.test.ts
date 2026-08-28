import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Camada de rede da integração PageSpeed (7.10). Roda SEM internet: `fetch`
// global é stub, `server-only` é neutralizado e `lib/env.server` é mockado
// (a suíte `npm run test` não carrega env de servidor). Nenhuma chamada real
// à API do Google, nenhuma cota gasta.

const { envRef } = vi.hoisted(() => ({ envRef: { key: undefined as string | undefined } }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/env.server', () => ({
  serverEnv: {
    get PAGESPEED_API_KEY() {
      return envRef.key
    },
  },
}))

const { normalizeWebsiteUrl, runPagespeedAnalysis } = await import('@/lib/api/pagespeed')

// ---------------------------------------------------------------------------
// Fixture de resposta OK da API v5
// ---------------------------------------------------------------------------

function psiBody(performance: number, withField = true): unknown {
  return {
    id: 'https://clinica.example/',
    lighthouseResult: {
      categories: {
        performance: { score: performance },
        accessibility: { score: 0.9 },
        'best-practices': { score: 1 },
        seo: { score: 0.8 },
      },
      audits: {
        'largest-contentful-paint': { numericValue: 2400 },
        'first-contentful-paint': { numericValue: 1100 },
        'total-blocking-time': { numericValue: 90 },
        'speed-index': { numericValue: 3000 },
        'cumulative-layout-shift': { numericValue: 0.05 },
      },
    },
    ...(withField
      ? {
          loadingExperience: {
            metrics: {
              LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2000 },
              INTERACTION_TO_NEXT_PAINT: { percentile: 150 },
              CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 4 },
            },
          },
        }
      : {}),
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const fetchMock = vi.fn()

beforeEach(() => {
  envRef.key = undefined
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// normalizeWebsiteUrl — fronteira de esquema (SSRF)
// ---------------------------------------------------------------------------

describe('normalizeWebsiteUrl', () => {
  it('aceita http e https', () => {
    expect(normalizeWebsiteUrl('https://a.example')).toBe('https://a.example/')
    expect(normalizeWebsiteUrl('  http://a.example/x  ')).toBe('http://a.example/x')
  })

  it('rejeita vazio, não-string, e esquemas não HTTP', () => {
    expect(normalizeWebsiteUrl('')).toBeNull()
    expect(normalizeWebsiteUrl('   ')).toBeNull()
    expect(normalizeWebsiteUrl(null)).toBeNull()
    expect(normalizeWebsiteUrl(undefined)).toBeNull()
    expect(normalizeWebsiteUrl(42 as unknown as string)).toBeNull()
    expect(normalizeWebsiteUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeWebsiteUrl('data:text/html,<script>')).toBeNull()
    expect(normalizeWebsiteUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeWebsiteUrl('ftp://a.example')).toBeNull()
    expect(normalizeWebsiteUrl('não é url')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// runPagespeedAnalysis
// ---------------------------------------------------------------------------

describe('runPagespeedAnalysis', () => {
  it('URL inválida → ok:false e NENHUMA chamada ao Google', async () => {
    const result = await runPagespeedAnalysis('javascript:alert(1)')
    expect(result.ok).toBe(false)
    expect(result.analyzedUrl).toBeNull()
    expect(result.analyzedAtIso).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mobile + desktop 200 → ok:true, campos das duas estratégias, instante ISO', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(psiBody(0.44))) // mobile
    fetchMock.mockResolvedValueOnce(jsonResponse(psiBody(0.71))) // desktop

    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.ok).toBe(true)
    expect(result.analyzedUrl).toBe('https://clinica.example/')
    expect(result.analyzedAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.mobile.ok).toBe(true)
    expect(result.mobile.fields?.performance).toBe(44)
    expect(result.desktop.fields?.performance).toBe(71)
    // não cruzou dados
    expect(result.mobile.fields?.performance).not.toBe(result.desktop.fields?.performance)
    expect(result.mobile.reportUrl).toContain('form_factor=mobile')
  })

  it('manda strategy e as 4 categorias; sem chave não põe key=', async () => {
    fetchMock.mockResolvedValue(jsonResponse(psiBody(0.5)))
    await runPagespeedAnalysis('https://clinica.example')

    const urls = fetchMock.mock.calls.map(([u]) => String(u))
    expect(urls.some((u) => u.includes('strategy=mobile'))).toBe(true)
    expect(urls.some((u) => u.includes('strategy=desktop'))).toBe(true)
    expect(urls.every((u) => u.includes('category=PERFORMANCE') && u.includes('category=SEO'))).toBe(true)
    expect(urls.every((u) => !u.includes('key='))).toBe(true)
  })

  it('com PAGESPEED_API_KEY: a chave entra na query string', async () => {
    envRef.key = 'secret-key-123'
    fetchMock.mockResolvedValue(jsonResponse(psiBody(0.5)))
    await runPagespeedAnalysis('https://clinica.example')

    const urls = fetchMock.mock.calls.map(([u]) => String(u))
    expect(urls.every((u) => u.includes('key=secret-key-123'))).toBe(true)
  })

  it('uma estratégia falha (500), a outra é aproveitada → ok:true + erro só na que falhou', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(psiBody(0.6))) // mobile ok
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500)) // desktop 500

    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.ok).toBe(true)
    expect(result.mobile.ok).toBe(true)
    expect(result.desktop.ok).toBe(false)
    expect(result.desktop.error).toContain('HTTP 500')
    expect(result.desktop.fields).toBeNull()
  })

  it('as duas estratégias falham → ok:false', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.ok).toBe(false)
    expect(result.analyzedAtIso).toBeNull()
    expect(result.error).toContain('PageSpeed')
  })

  it('429 → mensagem clara; sem chave, sugere configurar PAGESPEED_API_KEY', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.ok).toBe(false)
    expect(result.mobile.error).toMatch(/Limite de consultas/)
    expect(result.mobile.error).toMatch(/PAGESPEED_API_KEY/)
  })

  it('429 com chave configurada → mensagem sem sugerir a env', async () => {
    envRef.key = 'k'
    fetchMock.mockResolvedValue(jsonResponse({}, 429))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.mobile.error).toMatch(/Limite de consultas/)
    expect(result.mobile.error).not.toMatch(/PAGESPEED_API_KEY/)
  })

  it('timeout (AbortSignal.timeout) → erro de tempo limite, sem lançar', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.ok).toBe(false)
    expect(result.mobile.error).toMatch(/tempo limite/)
  })

  it('falha de rede genérica → erro tratável', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.mobile.error).toMatch(/serviço do PageSpeed/)
  })

  it('payload não-JSON → erro de formato inesperado (sem TypeError)', async () => {
    fetchMock.mockResolvedValue(new Response('<<html não json>>', { status: 200 }))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.mobile.error).toMatch(/formato inesperado/)
  })

  it('resposta 200 sem lighthouseResult → não vira dado parcial silencioso', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'https://x' }, 200))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.ok).toBe(false)
    expect(result.mobile.error).toMatch(/sem dados de análise/)
  })

  it('erro estruturado do Google com HTTP 200 → tratado', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 400, message: 'Invalid URL' } }, 200))
    const result = await runPagespeedAnalysis('https://clinica.example')
    expect(result.ok).toBe(false)
    expect(result.mobile.error).toMatch(/não conseguiu analisar/)
  })
})
