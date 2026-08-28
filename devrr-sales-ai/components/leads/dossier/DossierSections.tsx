'use client'

import type { ReactNode } from 'react'
import { FIELD_LABELS } from '@/lib/domain/digital-labels'
import { resolvePagespeedAnalyzedAt } from '@/lib/domain/dossier-datetime'
import { DOSSIER_SECTIONS, countSectionFilled, isFieldVisible, type DossierFieldSpec } from './sections'
import { DossierSection } from './DossierSection'
import type { DossierState } from './useDossierState'
import {
  TextField,
  NumberField,
  DateField,
  TextareaField,
  SelectField,
  MultiCheckField,
} from './DossierFields'

// As 7 seções do dossiê como bloco reusável (7.7). Nasceu de dentro do
// `DossierForm` (7.6) quando `/leads/new` passou a renderizar as mesmas seções:
// os 101 campos existem em UM lugar só — aqui e em `sections.ts` —, nunca numa
// segunda cópia por tela.
//
// Não tem `<form>` nem action próprios: é só o miolo. Quem monta o formulário
// decide o resto (`lead_id`/`audit_id`/`expected_updated_at` do dossiê, ou os
// campos comerciais do cadastro).
//
// Cascata: a UI só ESCONDE campos dependentes quando a base muda; quem limpa o
// dado contraditório já gravado é o servidor (7.4). Campo escondido não é
// renderizado → não entra no FormData.

interface DossierSectionsProps {
  state: DossierState
  /**
   * Índice da seção aberta por padrão. `null` = todas recolhidas — é o que
   * `/leads/new` pede (o dossiê é opcional lá, não pode competir com os campos
   * comerciais). A página do dossiê abre a primeira.
   */
  defaultOpenIndex?: number | null
  /**
   * Slot renderizado ao fim da seção PageSpeed (7.10 — o botão "Consultar
   * PageSpeed"). Só a página do dossiê passa; `/leads/new` não, então o botão
   * não aparece lá.
   */
  pagespeedTool?: ReactNode
}

function helpFor(spec: DossierFieldSpec): string | undefined {
  if (spec.type === 'number' && /_(lcp|inp|fcp|tbt|speed_index)$/.test(spec.name)) return 'Em milissegundos'
  if (spec.name.endsWith('_cls')) return 'Valor decimal (ex.: 0,08)'
  if (spec.type === 'datetime') return 'Instante da consulta'
  return undefined
}

/** Offset (min) do fuso do usuário PARA a data/hora que a string representa —
 * o browser resolve DST daquela data. Fallback: offset de agora. */
function offsetForLocalClock(local: string): number {
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? new Date().getTimezoneOffset() : d.getTimezoneOffset()
}

export function DossierSections({ state, defaultOpenIndex = 0, pagespeedTool }: DossierSectionsProps) {
  const { values, opportunities, setField, toggleOpportunity } = state

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
        // O input visível é só display (nome descartado pelo schema). O valor
        // real vai no oculto, já como instante ISO com `Z` — sem depender do
        // fuso do runtime.
        return (
          <div key={spec.name}>
            <DateField
              withTime
              name={`${spec.name}__local`}
              label={label}
              value={value}
              onChange={setField(spec.name)}
              help={help}
            />
            <input
              type="hidden"
              name={spec.name}
              value={resolvePagespeedAnalyzedAt({
                localValue: value,
                originalIso: state.originalAnalyzedAt,
                offsetForOriginal: state.offsetForOriginalAnalyzed,
                offsetForEdited: offsetForLocalClock(value),
              })}
            />
          </div>
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
            onClear={() => state.clearSection(section)}
            onMarkNotAnalyzed={hasSelect ? () => state.markSectionNotAnalyzed(section) : undefined}
            defaultOpen={defaultOpenIndex === index}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.filter((field) => isFieldVisible(field, values)).map(renderField)}
            </div>
            {section.key === 'pagespeed' && pagespeedTool ? pagespeedTool : null}
            {section.hasOpportunities ? (
              // Sentinel do contrato da 7.4: presente sempre que a seção de
              // oportunidades está no formulário, marcada ou não. Sem ele o
              // wrapper da action não consegue distinguir "grupo fora do
              // submit" de "nenhuma oportunidade marcada". Vale para os dois
              // formulários que renderizam este bloco.
              <input type="hidden" name="digital_opportunities_present" value="1" />
            ) : null}
          </DossierSection>
        )
      })}
    </div>
  )
}
