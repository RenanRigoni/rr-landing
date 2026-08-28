import type { ReactNode } from 'react'
import { classifyLighthouseScore, type PagespeedRating } from '@/lib/domain/pagespeed'
import { ENUM_LABELS, PAGESPEED_RATING_LABELS } from '@/lib/domain/digital-labels'

// Faixa de resumo do dossiê (DOSSIE §11 / plano 7.6). Somente leitura —
// `digital_score` e `digital_score_completeness` NUNCA são inputs (D-038): o
// servidor recalcula a cada gravação. Quando o formulário passa uma prévia
// (`computeDigitalScore` sobre os valores atuais em edição), `isPreview` deixa
// isso explícito na tela. Números em DM Mono; a classificação de PageSpeed vem
// de `pagespeed.ts` — nenhum limiar repetido aqui. Cor nunca é sinal único:
// todo item colorido carrega também o texto da classificação.

interface DossierSummaryProps {
  companyName?: string | null
  score: number | null
  completeness: number
  /** `google_ads_active` como está no dossiê (enum `tri_state`). */
  googleAdsActive?: string | null
  /** `website_exists` como está no dossiê. */
  websiteExists?: string | null
  googleRating?: number | null
  googleReviewsCount?: number | null
  pagespeedMobilePerformance?: number | null
  pagespeedDesktopPerformance?: number | null
  opportunityScore?: number | null
  /** `true` quando o número exibido é uma prévia recalculada no cliente e o
   * servidor ainda vai recalcular ao salvar. */
  isPreview?: boolean
}

const RATING_COLOR: Record<PagespeedRating, string> = {
  bom: 'text-success',
  precisa_melhorar: 'text-warning',
  ruim: 'text-danger',
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-content-muted">{label}</span>
      <span className="font-mono text-sm text-content-primary">{children}</span>
    </div>
  )
}

function triLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return ENUM_LABELS.tri_state[value as keyof typeof ENUM_LABELS.tri_state] ?? value
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value)
}

function PerformanceMetric({ label, value }: { label: string; value: number | null | undefined }) {
  const rating = classifyLighthouseScore(value ?? null)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-content-muted">{label}</span>
      <span className={`font-mono text-sm ${rating ? RATING_COLOR[rating] : 'text-content-muted'}`}>
        {num(value)}
        {rating ? <span className="ml-1 text-[11px] text-content-secondary">· {PAGESPEED_RATING_LABELS[rating]}</span> : null}
      </span>
    </div>
  )
}

export function DossierSummary({
  companyName,
  score,
  completeness,
  googleAdsActive,
  websiteExists,
  googleRating,
  googleReviewsCount,
  pagespeedMobilePerformance,
  pagespeedDesktopPerformance,
  opportunityScore,
  isPreview = false,
}: DossierSummaryProps) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-surface-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-content-primary">{companyName?.trim() || 'Empresa sem nome'}</span>
        {isPreview ? (
          <span className="text-[10px] uppercase tracking-[0.12em] text-content-muted">
            prévia · recalculado ao salvar
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Score digital">{score === null ? '—' : `${score}/100`}</Metric>
        <Metric label="Completude">{`${completeness}%`}</Metric>
        <Metric label="Google Ads">{triLabel(googleAdsActive)}</Metric>
        <Metric label="Site">{triLabel(websiteExists)}</Metric>
        <Metric label="Nota Google">{num(googleRating)}</Metric>
        <Metric label="Nº avaliações">{num(googleReviewsCount)}</Metric>
        <PerformanceMetric label="Performance mobile" value={pagespeedMobilePerformance} />
        <PerformanceMetric label="Performance desktop" value={pagespeedDesktopPerformance} />
        <Metric label="Potencial 0–10">{num(opportunityScore)}</Metric>
      </div>
    </div>
  )
}
