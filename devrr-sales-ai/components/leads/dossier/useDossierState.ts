'use client'

import { useState } from 'react'
import type { DigitalAudit } from '@/lib/queries/digital-audits-core'
import type { DossierSectionSpec } from './sections'
import {
  buildInitialValues,
  initialOpportunities,
  clearSectionValues,
  markSectionNotAnalyzedValues,
} from './form-state'

// Estado do dossiê extraído do `DossierForm` (7.7) para ser compartilhado com o
// cadastro em um passo (`/leads/new`), que renderiza as MESMAS 7 seções dentro
// do formulário de lead. Extração, não reimplementação: os 101 campos continuam
// existindo em um lugar só (`sections.ts` + `DossierSections.tsx`), e as regras
// puras continuam em `form-state.ts`.
//
// Todo campo é controlado por decisão testada (mesma nota de `NewLeadForm`):
// com `<form action={formAction}>`, o React reseta inputs não controlados
// depois de qualquer chamada da action que não lança — inclusive o
// `status: 'duplicate'` do cadastro, que é justamente quando o operador
// precisa que nada do que digitou desapareça.

const pad = (n: number): string => String(n).padStart(2, '0')

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export interface DossierState {
  values: Record<string, string>
  opportunities: string[]
  setField: (name: string) => (value: string) => void
  toggleOpportunity: (value: string, checked: boolean) => void
  clearSection: (section: DossierSectionSpec) => void
  markSectionNotAnalyzed: (section: DossierSectionSpec) => void
  /** `pagespeed_analyzed_at` como veio do banco (instante ISO), ou `null`. */
  originalAnalyzedAt: string | null
  /** Offset (min) da PRÓPRIA data desse instante — não o de "agora", para o
   * relógio local não deslocar por DST. */
  offsetForOriginalAnalyzed: number
}

export function useDossierState(audit?: DigitalAudit | null): DossierState {
  const originalAnalyzedAt = audit?.pagespeed_analyzed_at ?? null
  const offsetForOriginalAnalyzed = originalAnalyzedAt
    ? new Date(originalAnalyzedAt).getTimezoneOffset()
    : new Date().getTimezoneOffset()

  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialValues(audit, offsetForOriginalAnalyzed, todayLocal()),
  )
  const [opportunities, setOpportunities] = useState<string[]>(() => initialOpportunities(audit))

  const setField = (name: string) => (value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  function toggleOpportunity(value: string, checked: boolean) {
    setOpportunities((previous) =>
      checked ? [...new Set([...previous, value])] : previous.filter((entry) => entry !== value),
    )
  }

  function clearSection(section: DossierSectionSpec) {
    setValues((previous) => clearSectionValues(section, previous))
    if (section.hasOpportunities) setOpportunities([])
  }

  function markSectionNotAnalyzed(section: DossierSectionSpec) {
    setValues((previous) => markSectionNotAnalyzedValues(section, previous))
    // "Não analisado" na seção Diagnóstico inclui zerar as oportunidades
    // (nenhuma identificada). O sentinel continua no JSX → submit envia `[]`.
    if (section.hasOpportunities) setOpportunities([])
  }

  return {
    values,
    opportunities,
    setField,
    toggleOpportunity,
    clearSection,
    markSectionNotAnalyzed,
    originalAnalyzedAt,
    offsetForOriginalAnalyzed,
  }
}
