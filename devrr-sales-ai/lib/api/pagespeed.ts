import 'server-only'
import { serverEnv } from '@/lib/env.server'
import {
  parsePagespeedResponse,
  buildPagespeedReportUrl,
  type PagespeedStrategy,
  type PagespeedStrategyOutcome,
  type ConsultPagespeedResult,
} from '@/lib/domain/pagespeed-parse'

// Camada de rede da integração PageSpeed (7.10 / D-040). Só o `fetch` à API
// OFICIAL v5 e a orquestração mobile+desktop — nenhuma regra de dossiê, que
// mora no domínio puro (`lib/domain/pagespeed-parse.ts`). Sem Supabase, sem
// `service_role`: a API do Google não precisa de banco. A action
// (`lib/actions/pagespeed.ts`) só resolve a sessão e chama `runPagespeedAnalysis`.
//
// Regras que este arquivo garante:
//   • URL validada ANTES de qualquer chamada — só `http:`/`https:`. Bloqueia
//     `javascript:`/`data:`/`file:`/etc. Nenhum `fetch` direto ao site do
//     lead, nenhuma resolução de DNS própria (a URL vai para o Google, não
//     para nós) — superfície de SSRF mínima;
//   • timeout duro por `AbortSignal.timeout` — a chamada externa nunca fica
//     pendurada. Sem retry (o plano não pede);
//   • `Promise.allSettled` nas duas estratégias: uma pode falhar e a outra ser
//     aproveitada;
//   • erro sempre volta como união discriminada tratável — nunca lança, nunca
//     vaza stack nem payload cru;
//   • a chave (`serverEnv.PAGESPEED_API_KEY`, opcional) entra só na query
//     string do servidor. Nunca é logada.

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

/** Valores de `category` no REQUEST (a resposta usa `best-practices` com hífen). */
const PSI_REQUEST_CATEGORIES = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO'] as const

/** 60 s por estratégia (D-040: "duas chamadas HTTP de até ~60 s"). */
const PSI_TIMEOUT_MS = 60_000

function failedOutcome(message: string): PagespeedStrategyOutcome {
  return { ok: false, fields: null, reportUrl: null, error: message }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * `website_url` cru → URL normalizada `http(s)` ou `null`. `null` também para
 * string vazia/ausente. Rejeita todo esquema que não seja `http`/`https` —
 * é a fronteira de esquema exigida pela revisão de SSRF.
 */
export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed === '') return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return parsed.toString()
}

/** Uma estratégia: monta a query, chama a API, classifica o resultado. */
async function fetchStrategy(
  analyzedUrl: string,
  strategy: PagespeedStrategy,
): Promise<PagespeedStrategyOutcome> {
  const query = new URLSearchParams({ url: analyzedUrl, strategy })
  for (const category of PSI_REQUEST_CATEGORIES) query.append('category', category)
  if (serverEnv.PAGESPEED_API_KEY) query.set('key', serverEnv.PAGESPEED_API_KEY)

  let response: Response
  try {
    response = await fetch(`${PSI_ENDPOINT}?${query.toString()}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(PSI_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return failedOutcome('A consulta ao PageSpeed excedeu o tempo limite. Tente novamente.')
    }
    return failedOutcome('Não foi possível falar com o serviço do PageSpeed.')
  }

  if (response.status === 429) {
    return failedOutcome(
      serverEnv.PAGESPEED_API_KEY
        ? 'Limite de consultas do PageSpeed atingido. Aguarde alguns minutos e tente de novo.'
        : 'Limite de consultas do PageSpeed atingido (sem chave, a cota por IP é baixa). Configure PAGESPEED_API_KEY ou tente mais tarde.',
    )
  }
  if (!response.ok) {
    return failedOutcome(`O PageSpeed respondeu com erro (HTTP ${response.status}).`)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return failedOutcome('Resposta do PageSpeed em formato inesperado.')
  }

  // Erro estruturado do Google mesmo com HTTP 2xx (raro, mas possível).
  if (isRecord(json) && isRecord(json.error)) {
    return failedOutcome('O PageSpeed não conseguiu analisar esta URL.')
  }
  // Sem `lighthouseResult` não há o que aproveitar — não deixa virar dado
  // parcial silencioso.
  if (!isRecord(json) || !isRecord(json.lighthouseResult)) {
    return failedOutcome('Resposta do PageSpeed sem dados de análise.')
  }

  return {
    ok: true,
    fields: parsePagespeedResponse(json, strategy),
    reportUrl: buildPagespeedReportUrl(analyzedUrl, strategy),
    error: null,
  }
}

function settledToOutcome(
  settled: PromiseSettledResult<PagespeedStrategyOutcome>,
): PagespeedStrategyOutcome {
  return settled.status === 'fulfilled'
    ? settled.value
    : failedOutcome('Falha inesperada na consulta ao PageSpeed.')
}

/**
 * Orquestra a consulta completa: valida a URL, dispara `mobile` e `desktop`
 * em paralelo, monta o `ConsultPagespeedResult`.
 *
 * - URL inválida → `ok: false`, `reason` implícito na mensagem, sem nenhuma
 *   chamada ao Google.
 * - As DUAS estratégias falharam → `ok: false` com a causa.
 * - Ao menos uma OK → `ok: true`; a que falhou fica `{ ok: false, error }` e
 *   o cliente transforma em aviso (não inventa dado da outra).
 */
export async function runPagespeedAnalysis(
  rawUrl: string | null | undefined,
): Promise<ConsultPagespeedResult> {
  const analyzedUrl = normalizeWebsiteUrl(rawUrl)
  if (analyzedUrl === null) {
    const invalid = failedOutcome('URL de site inválida.')
    return {
      ok: false,
      error: 'Informe uma URL de site válida (começando com http:// ou https://) antes de consultar o PageSpeed.',
      analyzedUrl: null,
      analyzedAtIso: null,
      mobile: invalid,
      desktop: invalid,
    }
  }

  // Instante real da consulta (D-040 / contrato de fuso da 7.6: `timestamptz`).
  const analyzedAtIso = new Date().toISOString()

  // Array literal (não `.map`) para o `Promise.allSettled` devolver uma TUPLA
  // de 2 — índice literal não fica `| undefined` sob `noUncheckedIndexedAccess`.
  const [mobileSettled, desktopSettled] = await Promise.allSettled([
    fetchStrategy(analyzedUrl, 'mobile'),
    fetchStrategy(analyzedUrl, 'desktop'),
  ])
  const mobile = settledToOutcome(mobileSettled)
  const desktop = settledToOutcome(desktopSettled)

  const ok = mobile.ok || desktop.ok
  return {
    ok,
    error: ok
      ? null
      : `Não foi possível consultar o PageSpeed. ${mobile.error ?? desktop.error ?? ''}`.trim(),
    analyzedUrl,
    analyzedAtIso: ok ? analyzedAtIso : null,
    mobile,
    desktop,
  }
}
