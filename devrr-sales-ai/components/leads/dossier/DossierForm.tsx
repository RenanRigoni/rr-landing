'use client'

import { useActionState, useState } from 'react'
import { saveDigitalAudit } from '@/lib/actions/digital-audit'
import type { DigitalAuditResult } from '@/lib/actions/digital-audit-core'
import type { DigitalAudit } from '@/lib/queries/digital-audits-core'
import { FIELD_LABELS } from '@/lib/domain/digital-labels'
import {
  DOSSIER_SECTIONS,
  ALL_DOSSIER_FIELDS,
  countSectionFilled,
  isFieldVisible,
  type DossierFieldName,
  type DossierFieldSpec,
  type DossierSectionSpec,
} from './sections'
import { DossierSection } from './DossierSection'
import { DossierSummary } from './DossierSummary'
import {
  TextField,
  NumberField,
  DateField,
  TextareaField,
  SelectField,
  MultiCheckField,
} from './DossierFields'

// Formulário do Dossiê Digital (7.6). Serve criação E edição: a única
// diferença é o campo oculto `audit_id`, presente só quando já existe
// auditoria — a decisão insert × update é 100% da action da 7.4
// (`saveDigitalAudit`), nunca do cliente. Não há segunda action.
//
// Semântica preservada (regra central da tarefa): "não analisado" (campo em
// branco → `null`), "não" (`nao`) e "valor preenchido" são três estados
// distintos. Selects têm sempre a opção vazia "Não analisado" (= `null`);
// nunca `nao` como default.
//
// Cascata: a UI só ESCONDE campos dependentes quando a base muda; quem limpa
// o dado contraditório já gravado é o servidor (7.4, `resolveClearedFields`).
// Campo escondido não é renderizado → não entra no FormData → o submit manda
// a mudança da base sem os dependentes obsoletos.

interface DossierFormProps {
  leadId: string
  companyName?: string | null
  /** Auditoria existente (edição). Ausente = criação. */
  audit?: DigitalAudit | null
}

const initialState: DigitalAuditResult = { error: null }

const pad = (n: number): string => String(n).padStart(2, '0')

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ISO de `timestamptz` → valor local `AAAA-MM-DDTHH:mm` para `datetime-local`. */
function toDatetimeLocalValue(raw: string | null): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Estado inicial dos campos escalares a partir da auditoria (ou vazio).
 *
 * Selects: qualquer valor persistido que não esteja no vocabulário oferecido
 * pelo campo — incluindo `nao_analisado` — colapsa para a opção vazia "Não
 * analisado". `null` também. Assim a UI nunca mostra um select "em branco por
 * acidente": vazio SEMPRE quer dizer "não analisado" (D-037), e nunca é `nao`.
 */
function buildInitialValues(audit: DigitalAudit | null | undefined): Record<string, string> {
  const row: Partial<Record<DossierFieldName, unknown>> = audit ?? {}
  const values: Record<string, string> = {}

  for (const field of ALL_DOSSIER_FIELDS) {
    if (field.type === 'multicheck') continue
    const raw = row[field.name]

    if (field.type === 'date') {
      values[field.name] = typeof raw === 'string' ? raw.slice(0, 10) : ''
    } else if (field.type === 'datetime') {
      values[field.name] = toDatetimeLocalValue(typeof raw === 'string' ? raw : null)
    } else if (field.type === 'select') {
      const stored = typeof raw === 'string' ? raw : ''
      values[field.name] = field.options?.includes(stored) ? stored : ''
    } else if (field.type === 'number') {
      values[field.name] = raw === null || raw === undefined ? '' : String(raw)
    } else {
      values[field.name] = typeof raw === 'string' ? raw : ''
    }
  }

  if (!audit && values.researched_at === '') {
    values.researched_at = todayLocal()
  }

  return values
}

function initialOpportunities(audit: DigitalAudit | null | undefined): string[] {
  return audit?.digital_opportunities ? [...audit.digital_opportunities] : []
}

function helpFor(spec: DossierFieldSpec): string | undefined {
  if (spec.type === 'number' && /_(lcp|inp|fcp|tbt|speed_index)$/.test(spec.name)) return 'Em milissegundos'
  if (spec.name.endsWith('_cls')) return 'Valor decimal (ex.: 0,08)'
  if (spec.type === 'datetime') return 'Instante da consulta'
  return undefined
}

export function DossierForm({ leadId, companyName, audit }: DossierFormProps) {
  const [state, formAction, pending] = useActionState(saveDigitalAudit, initialState)
  const [values, setValues] = useState<Record<string, string>>(() => buildInitialValues(audit))
  const [opportunities, setOpportunities] = useState<string[]>(() => initialOpportunities(audit))

  const effectiveAuditId = audit?.id ?? state.auditId ?? null
  const didSave = Boolean(state.auditId)
  const shownScore = didSave ? state.digitalScore ?? null : audit?.digital_score ?? null
  const shownCompleteness = didSave ? state.completeness ?? 0 : audit?.digital_score_completeness ?? 0

  const setField = (name: string) => (value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  function toggleOpportunity(value: string, checked: boolean) {
    setOpportunities((previous) =>
      checked ? [...new Set([...previous, value])] : previous.filter((entry) => entry !== value),
    )
  }

  function clearSection(section: DossierSectionSpec) {
    setValues((previous) => {
      const next = { ...previous }
      for (const field of section.fields) {
        if (field.type !== 'multicheck') next[field.name] = ''
      }
      return next
    })
    if (section.hasOpportunities) setOpportunities([])
  }

  function markSectionNotAnalyzed(section: DossierSectionSpec) {
    setValues((previous) => {
      const next = { ...previous }
      for (const field of section.fields) {
        if (field.type === 'select') next[field.name] = ''
      }
      return next
    })
  }

  function renderField(spec: DossierFieldSpec) {
    const label = FIELD_LABELS[spec.name] ?? spec.name
    const help = helpFor(spec)
    const value = values[spec.name] ?? ''

    switch (spec.type) {
      case 'text':
        return (
          <TextField key={spec.name} name={spec.name} label={label} value={value} onChange={setField(spec.name)} help={help} />
        )
      case 'url':
        return (
          <TextField key={spec.name} type="url" name={spec.name} label={label} value={value} onChange={setField(spec.name)} help={help} />
        )
      case 'number':
        return (
          <NumberField
            key={spec.name}
            name={spec.name}
            label={label}
            value={value}
            onChange={setField(spec.name)}
            help={help}
            min={spec.min}
            max={spec.max}
            step={spec.step}
          />
        )
      case 'date':
        return (
          <DateField key={spec.name} name={spec.name} label={label} value={value} onChange={setField(spec.name)} help={help} />
        )
      case 'datetime':
        return (
          <DateField key={spec.name} withTime name={spec.name} label={label} value={value} onChange={setField(spec.name)} help={help} />
        )
      case 'textarea':
        return (
          <div key={spec.name} className="sm:col-span-2">
            <TextareaField name={spec.name} label={label} value={value} onChange={setField(spec.name)} help={help} />
          </div>
        )
      case 'select':
        return (
          <SelectField
            key={spec.name}
            name={spec.name}
            label={label}
            value={value}
            onChange={setField(spec.name)}
            help={help}
            options={spec.options ?? []}
            enumGroup={spec.enumGroup ?? 'tri_state'}
          />
        )
      case 'multicheck':
        return (
          <div key={spec.name} className="sm:col-span-2">
            <MultiCheckField legend={label} selected={opportunities} onToggle={toggleOpportunity} />
          </div>
        )
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lead_id" value={leadId} />
      {effectiveAuditId ? <input type="hidden" name="audit_id" value={effectiveAuditId} /> : null}

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

      <div className="flex flex-col gap-3">
        {DOSSIER_SECTIONS.map((section, index) => {
          const { filled, total } = countSectionFilled(section, values, opportunities)
          const hasSelect = section.fields.some((field) => field.type === 'select')
          return (
            <DossierSection
              key={section.key}
              title={section.title}
              filled={filled}
              total={total}
              onClear={() => clearSection(section)}
              onMarkNotAnalyzed={hasSelect ? () => markSectionNotAnalyzed(section) : undefined}
              defaultOpen={index === 0}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.filter((field) => isFieldVisible(field, values)).map(renderField)}
              </div>
              {section.hasOpportunities ? (
                // Sentinel do contrato da 7.4: presente sempre que a seção de
                // oportunidades está no formulário, marcada ou não. Sem ele o
                // wrapper não consegue distinguir "grupo fora do submit" de
                // "nenhuma oportunidade marcada".
                <input type="hidden" name="digital_opportunities_present" value="1" />
              ) : null}
            </DossierSection>
          )
        })}
      </div>

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
