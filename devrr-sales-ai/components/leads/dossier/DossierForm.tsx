'use client'

import { useActionState } from 'react'
import { saveDigitalAudit } from '@/lib/actions/digital-audit'
import type { DigitalAuditResult } from '@/lib/actions/digital-audit-core'
import type { DigitalAudit } from '@/lib/queries/digital-audits-core'
import { DossierSections } from './DossierSections'
import { DossierSummary } from './DossierSummary'
import { useDossierState } from './useDossierState'

// Formulário do Dossiê Digital (7.6). Serve criação E edição: a decisão
// insert × update é 100% da action da 7.4 (`saveDigitalAudit`) a partir de
// `audit_id`; não há segunda action.
//
// Os 101 campos e o estado deles moram em `DossierSections`/`useDossierState`
// desde a 7.7, porque `/leads/new` renderiza as mesmas 7 seções. Aqui ficou o
// que é próprio da tela do dossiê: identidade da linha, lock otimista, faixa de
// resumo e submit.
//
// Três invariantes que a revisão corretiva da 7.6 travou:
//
// 1. **Lock otimista contra tela desatualizada.** `expected_updated_at` (a
//    versão que ESTE formulário viu) vai como campo oculto no submit de
//    edição. A action rejeita se o banco já avançou — não basta o
//    `.eq('updated_at')` interno, que só cobre corrida entre SELECT e UPDATE.
//    Depois de um save, `state.updatedAt` renova essa versão para o próximo.
// 2. **`pagespeed_analyzed_at` sem ambiguidade de fuso.** O `datetime-local`
//    não carrega offset; o valor submetido é convertido para instante ISO com
//    `Z` no cliente (`resolvePagespeedAnalyzedAt`), nunca deixado para o
//    `new Date()` do runtime interpretar.
// 3. **Nenhum valor de enum some no round-trip.** `buildInitialValues`
//    preserva o valor persistido verbatim; `SelectField` injeta uma opção
//    para valores fora do vocabulário curado (`nao_analisado`,
//    `nao_identificado`, `nao_se_aplica`, `parcialmente`, `raramente`,
//    `dados_insuficientes`…). Abrir + salvar sem tocar = identidade.
//
// Semântica preservada: "não analisado" (opção vazia → `null`), "não" (`nao`)
// e "valor preenchido" são três estados distintos; `nao` nunca é default.

interface DossierFormProps {
  leadId: string
  companyName?: string | null
  /** Auditoria existente (edição). Ausente = criação. */
  audit?: DigitalAudit | null
}

const initialState: DigitalAuditResult = { error: null }

export function DossierForm({ leadId, companyName, audit }: DossierFormProps) {
  const [state, formAction, pending] = useActionState(saveDigitalAudit, initialState)
  const dossier = useDossierState(audit)
  const { values } = dossier

  const effectiveAuditId = audit?.id ?? state.auditId ?? null
  // Versão do lock otimista: depois de um save é a que a action acabou de
  // persistir (`state.updatedAt`); antes, a que veio na prop. Um erro que não
  // escreveu nada preserva `state.updatedAt` (`carryFormContinuity` no
  // wrapper), então o retry nunca cai de volta para uma versão velha.
  const expectedUpdatedAt = state.updatedAt ?? audit?.updated_at ?? null

  const didSave = Boolean(state.auditId)
  const shownScore = didSave ? state.digitalScore ?? null : audit?.digital_score ?? null
  const shownCompleteness = didSave ? state.completeness ?? 0 : audit?.digital_score_completeness ?? 0

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lead_id" value={leadId} />
      {effectiveAuditId ? <input type="hidden" name="audit_id" value={effectiveAuditId} /> : null}
      {expectedUpdatedAt ? (
        // Contrato do lock: a versão que este formulário está editando. Não é
        // coluna de `digitalAuditSchema` — a action lê fora do schema.
        <input type="hidden" name="expected_updated_at" value={expectedUpdatedAt} />
      ) : null}

      <DossierSummary
        companyName={companyName}
        score={shownScore}
        completeness={shownCompleteness}
        googleAdsActive={values.google_ads_active}
        websiteExists={values.website_exists}
        googleRating={values.google_rating ? Number(values.google_rating) : null}
        googleReviewsCount={values.google_reviews_count ? Number(values.google_reviews_count) : null}
        pagespeedMobilePerformance={values.pagespeed_mobile_performance ? Number(values.pagespeed_mobile_performance) : null}
        pagespeedDesktopPerformance={values.pagespeed_desktop_performance ? Number(values.pagespeed_desktop_performance) : null}
        opportunityScore={values.digital_opportunity_score ? Number(values.digital_opportunity_score) : null}
      />

      <DossierSections state={dossier} defaultOpenIndex={0} />

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : state.auditId ? (
        <p role="status" className="text-sm text-success">
          Dossiê salvo{shownScore === null ? '' : ` · score ${shownScore}/100`} · {shownCompleteness}% analisado.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Salvando…' : 'Salvar dossiê'}
      </button>
    </form>
  )
}
