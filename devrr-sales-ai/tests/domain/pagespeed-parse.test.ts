import { describe, it, expect } from 'vitest'
import {
  parsePagespeedResponse,
  buildPagespeedReportUrl,
  strategyFieldsToFormValues,
  assemblePagespeedPatch,
  type PagespeedStrategyFields,
  type ConsultPagespeedResult,
} from '@/lib/domain/pagespeed-parse'

// Normalização da resposta do PageSpeed Insights v5 (7.10). Fixture recortada
// de uma resposta real; toda asserção respeita o contrato do plano 7.10 /
// D-040 — scores 0–1 → 0–100, ms de laboratório, INP só de campo, CrUX
// diferenciado, `0` preservado.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface ResponseOverrides {
  categories?: Record<string, unknown>
  audits?: Record<string, unknown>
  loadingExperience?: unknown
}

function makeResponse(overrides: ResponseOverrides = {}): unknown {
  return {
    id: 'https://clinica.example/',
    lighthouseResult: {
      categories:
        'categories' in overrides
          ? overrides.categories
          : {
              performance: { score: 0.91 },
              accessibility: { score: 0.88 },
              'best-practices': { score: 1 },
              seo: { score: 0.92 },
            },
      audits:
        'audits' in overrides
          ? overrides.audits
          : {
              'largest-contentful-paint': { numericValue: 2480 },
              'first-contentful-paint': { numericValue: 1200 },
              'total-blocking-time': { numericValue: 150 },
              'speed-index': { numericValue: 3300 },
              'cumulative-layout-shift': { numericValue: 0.08 },
            },
    },
    ...('loadingExperience' in overrides
      ? { loadingExperience: overrides.loadingExperience }
      : {
          loadingExperience: {
            metrics: {
              LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100 },
              INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
              CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
            },
          },
        }),
  }
}

// ---------------------------------------------------------------------------
// parsePagespeedResponse — scores
// ---------------------------------------------------------------------------

describe('parsePagespeedResponse — categorias', () => {
  it('score Lighthouse 0–1 vira 0–100 arredondado', () => {
    const f = parsePagespeedResponse(makeResponse(), 'mobile')
    expect(f.performance).toBe(91)
    expect(f.accessibility).toBe(88)
    expect(f.best_practices).toBe(100)
    expect(f.seo).toBe(92)
  })

  it('score 0 permanece 0, nunca null', () => {
    const f = parsePagespeedResponse(
      makeResponse({ categories: { performance: { score: 0 }, seo: { score: 0.5 } } }),
      'mobile',
    )
    expect(f.performance).toBe(0)
    expect(f.seo).toBe(50)
  })

  it('categoria ausente ou score não numérico → null', () => {
    const f = parsePagespeedResponse(
      makeResponse({ categories: { performance: { score: 'x' }, accessibility: {} } }),
      'mobile',
    )
    expect(f.performance).toBeNull()
    expect(f.accessibility).toBeNull()
    expect(f.best_practices).toBeNull()
  })

  it('categories não é objeto → todos os scores null', () => {
    const f = parsePagespeedResponse(makeResponse({ categories: 42 as unknown as Record<string, unknown> }), 'mobile')
    expect(f.performance).toBeNull()
    expect(f.seo).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// parsePagespeedResponse — métricas de laboratório
// ---------------------------------------------------------------------------

describe('parsePagespeedResponse — laboratório', () => {
  it('LCP/FCP/TBT/Speed Index em ms inteiro (arredondado); CLS decimal sem arredondar', () => {
    const f = parsePagespeedResponse(
      makeResponse({
        audits: {
          'largest-contentful-paint': { numericValue: 2480.7 },
          'first-contentful-paint': { numericValue: 1199.4 },
          'total-blocking-time': { numericValue: 150 },
          'speed-index': { numericValue: 3300.9 },
          'cumulative-layout-shift': { numericValue: 0.083 },
        },
      }),
      'mobile',
    )
    expect(f.lcp).toBe(2481)
    expect(f.fcp).toBe(1199)
    expect(f.tbt).toBe(150)
    expect(f.speed_index).toBe(3301)
    expect(f.cls).toBe(0.083)
  })

  it('métrica ausente → null, nunca 0 inventado', () => {
    const f = parsePagespeedResponse(
      makeResponse({
        audits: {
          'largest-contentful-paint': { numericValue: 2000 },
          // sem speed-index, sem cls, sem fcp
          'total-blocking-time': { numericValue: 0 },
        },
      }),
      'mobile',
    )
    expect(f.lcp).toBe(2000)
    expect(f.tbt).toBe(0) // 0 real permanece
    expect(f.fcp).toBeNull()
    expect(f.speed_index).toBeNull()
    expect(f.cls).toBeNull()
  })

  it('audits não é objeto, ou audit sem numericValue → null', () => {
    const f = parsePagespeedResponse(
      makeResponse({ audits: { 'largest-contentful-paint': { numericValue: 'NaN-like' }, 'first-contentful-paint': 7 as unknown } }),
      'mobile',
    )
    expect(f.lcp).toBeNull()
    expect(f.fcp).toBeNull()

    const g = parsePagespeedResponse(makeResponse({ audits: null as unknown as Record<string, unknown> }), 'mobile')
    expect(g.tbt).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// parsePagespeedResponse — INP e Core Web Vitals (campo / CrUX)
// ---------------------------------------------------------------------------

describe('parsePagespeedResponse — campo (CrUX)', () => {
  it('com CrUX: field_data_available true, INP do percentil de campo, CWV pelos três percentis', () => {
    const f = parsePagespeedResponse(makeResponse(), 'mobile')
    expect(f.field_data_available).toBe(true)
    expect(f.inp).toBe(180) // percentil de campo, em ms
    expect(f.core_web_vitals).toBe('aprovado') // 2100<=2500, 180<=200, 5/100<=0.1
  })

  it('sem loadingExperience: field_data_available false, INP null, CWV dados_insuficientes (NÃO reprovado)', () => {
    const f = parsePagespeedResponse(makeResponse({ loadingExperience: undefined }), 'mobile')
    expect(f.field_data_available).toBe(false)
    expect(f.inp).toBeNull()
    expect(f.core_web_vitals).toBe('dados_insuficientes')
  })

  it('loadingExperience presente mas metrics vazio → sem dado de campo', () => {
    const f = parsePagespeedResponse(makeResponse({ loadingExperience: { metrics: {} } }), 'mobile')
    expect(f.field_data_available).toBe(false)
    expect(f.core_web_vitals).toBe('dados_insuficientes')
  })

  it('loadingExperience.metrics não é objeto → sem dado de campo', () => {
    const f = parsePagespeedResponse(makeResponse({ loadingExperience: { metrics: 'x' } }), 'mobile')
    expect(f.field_data_available).toBe(false)
    expect(f.inp).toBeNull()
  })

  it('CrUX presente mas faltando um dos três percentis → dados_insuficientes, não reprovado', () => {
    const f = parsePagespeedResponse(
      makeResponse({
        loadingExperience: {
          metrics: {
            LARGEST_CONTENTFUL_PAINT_MS: { percentile: 9000 },
            CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 30 },
            // sem INTERACTION_TO_NEXT_PAINT
          },
        },
      }),
      'mobile',
    )
    expect(f.field_data_available).toBe(true)
    expect(f.inp).toBeNull()
    expect(f.core_web_vitals).toBe('dados_insuficientes')
  })

  it('CrUX com os três percentis mas algum falha → reprovado', () => {
    const f = parsePagespeedResponse(
      makeResponse({
        loadingExperience: {
          metrics: {
            LARGEST_CONTENTFUL_PAINT_MS: { percentile: 4800 }, // > 2500
            INTERACTION_TO_NEXT_PAINT: { percentile: 120 },
            CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 4 },
          },
        },
      }),
      'mobile',
    )
    expect(f.core_web_vitals).toBe('reprovado')
  })

  it('percentil não numérico é ignorado (tratado como ausente)', () => {
    const f = parsePagespeedResponse(
      makeResponse({
        loadingExperience: {
          metrics: {
            LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2000 },
            INTERACTION_TO_NEXT_PAINT: { percentile: 'fast' },
            CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: Number.NaN },
          },
        },
      }),
      'mobile',
    )
    expect(f.field_data_available).toBe(true) // metrics tem chaves
    expect(f.inp).toBeNull()
    expect(f.core_web_vitals).toBe('dados_insuficientes')
  })
})

// ---------------------------------------------------------------------------
// parsePagespeedResponse — payload inesperado (fronteira não confiável)
// ---------------------------------------------------------------------------

describe('parsePagespeedResponse — payload inesperado', () => {
  it('não lança para null / vazio / lighthouseResult inválido', () => {
    for (const bad of [null, undefined, 42, 'texto', [], {}, { lighthouseResult: 'x' }, { lighthouseResult: { categories: 1, audits: 2 } }]) {
      const f = parsePagespeedResponse(bad, 'desktop')
      expect(f.performance).toBeNull()
      expect(f.lcp).toBeNull()
      expect(f.inp).toBeNull()
      expect(f.field_data_available).toBe(false)
      expect(f.core_web_vitals).toBe('dados_insuficientes')
    }
  })
})

// ---------------------------------------------------------------------------
// mobile ≠ desktop
// ---------------------------------------------------------------------------

describe('mobile e desktop não se cruzam', () => {
  it('cada chamada normaliza a sua própria resposta', () => {
    const mobile = parsePagespeedResponse(makeResponse({ categories: { performance: { score: 0.42 } } }), 'mobile')
    const desktop = parsePagespeedResponse(makeResponse({ categories: { performance: { score: 0.95 } } }), 'desktop')
    expect(mobile.performance).toBe(42)
    expect(desktop.performance).toBe(95)
  })
})

// ---------------------------------------------------------------------------
// buildPagespeedReportUrl
// ---------------------------------------------------------------------------

describe('buildPagespeedReportUrl', () => {
  it('encode da URL analisada e form_factor por estratégia', () => {
    expect(buildPagespeedReportUrl('https://a.example/x y?q=1&z=2', 'mobile')).toBe(
      'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fa.example%2Fx%20y%3Fq%3D1%26z%3D2&form_factor=mobile',
    )
    expect(buildPagespeedReportUrl('https://a.example/', 'desktop')).toBe(
      'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fa.example%2F&form_factor=desktop',
    )
  })
})

// ---------------------------------------------------------------------------
// strategyFieldsToFormValues — patch esparso
// ---------------------------------------------------------------------------

function fields(overrides: Partial<PagespeedStrategyFields> = {}): PagespeedStrategyFields {
  return {
    performance: 91,
    accessibility: 88,
    best_practices: 100,
    seo: 92,
    core_web_vitals: 'aprovado',
    lcp: 2480,
    inp: 180,
    cls: 0.08,
    fcp: 1200,
    tbt: 150,
    speed_index: 3300,
    field_data_available: true,
    ...overrides,
  }
}

describe('strategyFieldsToFormValues', () => {
  it('prefixa e serializa; core_web_vitals sempre entra', () => {
    const patch = strategyFieldsToFormValues(fields(), 'pagespeed_mobile_')
    expect(patch.pagespeed_mobile_performance).toBe('91')
    expect(patch.pagespeed_mobile_core_web_vitals).toBe('aprovado')
    expect(patch.pagespeed_mobile_lcp).toBe('2480')
    expect(patch.pagespeed_mobile_inp).toBe('180')
    expect(patch.pagespeed_mobile_cls).toBe('0.08')
  })

  it('valor null NÃO vira chave (preserva o que o operador digitou); 0 vira chave', () => {
    const patch = strategyFieldsToFormValues(
      fields({ inp: null, cls: null, performance: 0, speed_index: null }),
      'pagespeed_desktop_',
    )
    expect('pagespeed_desktop_inp' in patch).toBe(false)
    expect('pagespeed_desktop_cls' in patch).toBe(false)
    expect('pagespeed_desktop_speed_index' in patch).toBe(false)
    expect(patch.pagespeed_desktop_performance).toBe('0')
    expect(patch.pagespeed_desktop_core_web_vitals).toBe('aprovado')
  })
})

// ---------------------------------------------------------------------------
// assemblePagespeedPatch
// ---------------------------------------------------------------------------

function okResult(overrides: Partial<ConsultPagespeedResult> = {}): ConsultPagespeedResult {
  return {
    ok: true,
    error: null,
    analyzedUrl: 'https://clinica.example/',
    analyzedAtIso: '2026-08-28T12:00:00.000Z',
    mobile: { ok: true, fields: fields(), reportUrl: 'https://pagespeed.web.dev/analysis?url=x&form_factor=mobile', error: null },
    desktop: { ok: true, fields: fields({ performance: 70 }), reportUrl: 'https://pagespeed.web.dev/analysis?url=x&form_factor=desktop', error: null },
    ...overrides,
  }
}

describe('assemblePagespeedPatch', () => {
  it('!ok → patch e warnings vazios (o chamador mostra result.error)', () => {
    const { patch, warnings } = assemblePagespeedPatch(
      { ok: false, error: 'URL inválida', analyzedUrl: null, analyzedAtIso: null, mobile: { ok: false, fields: null, reportUrl: null, error: null }, desktop: { ok: false, fields: null, reportUrl: null, error: null } },
      180,
    )
    expect(patch).toEqual({})
    expect(warnings).toEqual([])
  })

  it('sucesso completo: mobile + desktop prefixados, metadados, field_data_available sim', () => {
    const { patch, warnings } = assemblePagespeedPatch(okResult(), 180)
    expect(warnings).toEqual([])
    expect(patch.pagespeed_mobile_performance).toBe('91')
    expect(patch.pagespeed_desktop_performance).toBe('70')
    expect(patch.pagespeed_analyzed_url).toBe('https://clinica.example/')
    // ISO → relógio local (offset 180 = UTC-3): 12:00Z → 09:00
    expect(patch.pagespeed_analyzed_at).toBe('2026-08-28T09:00')
    expect(patch.pagespeed_mobile_report_url).toContain('form_factor=mobile')
    expect(patch.pagespeed_desktop_report_url).toContain('form_factor=desktop')
    expect(patch.pagespeed_field_data_available).toBe('sim')
  })

  it('desktop falhou: só mobile preenche, desktop vira warning, nada de desktop no patch', () => {
    const { patch, warnings } = assemblePagespeedPatch(
      okResult({ desktop: { ok: false, fields: null, reportUrl: null, error: 'O PageSpeed respondeu com erro (HTTP 500).' } }),
      0,
    )
    expect(patch.pagespeed_mobile_performance).toBe('91')
    expect('pagespeed_desktop_performance' in patch).toBe(false)
    expect('pagespeed_desktop_report_url' in patch).toBe(false)
    expect(warnings).toEqual(['Desktop: O PageSpeed respondeu com erro (HTTP 500).'])
  })

  it('estratégia !ok sem error não gera warning nem campo', () => {
    const { patch, warnings } = assemblePagespeedPatch(
      okResult({ desktop: { ok: false, fields: null, reportUrl: null, error: null } }),
      0,
    )
    expect('pagespeed_desktop_performance' in patch).toBe(false)
    expect(warnings).toEqual([])
  })

  it('nenhum CrUX em nenhuma estratégia → field_data_available nao', () => {
    const { patch } = assemblePagespeedPatch(
      okResult({
        mobile: { ok: true, fields: fields({ field_data_available: false }), reportUrl: null, error: null },
        desktop: { ok: true, fields: fields({ field_data_available: false }), reportUrl: null, error: null },
      }),
      0,
    )
    expect(patch.pagespeed_field_data_available).toBe('nao')
  })

  it('analyzedUrl null e analyzedAtIso inválido → sem essas chaves', () => {
    const { patch } = assemblePagespeedPatch(
      okResult({ analyzedUrl: null, analyzedAtIso: 'não-é-iso' }),
      180,
    )
    expect('pagespeed_analyzed_url' in patch).toBe(false)
    expect('pagespeed_analyzed_at' in patch).toBe(false)
  })

  it('analyzedAtIso null → sem pagespeed_analyzed_at', () => {
    const { patch } = assemblePagespeedPatch(okResult({ analyzedAtIso: null }), 180)
    expect('pagespeed_analyzed_at' in patch).toBe(false)
  })
})
