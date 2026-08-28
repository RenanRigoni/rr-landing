'use client'

import { useId, type ChangeEvent, type ReactNode } from 'react'
import { ENUM_LABELS, NOT_ANALYZED_LABEL, DIGITAL_OPPORTUNITY_OPTIONS } from '@/lib/domain/digital-labels'
import type { DossierEnumGroup } from '@/lib/domain/digital-labels'

// Primitivos de campo do dossiê (7.6). Mesmo padrão visual de
// `components/leads/NewLeadForm.tsx` — `inputClass`/`labelClass` reproduzidos
// aqui (não extraídos de lá para não refatorar um componente fora do escopo
// desta tarefa). `font-mono` em TODO campo numérico e de data — regra visual
// mais importante do DESIGN_SYSTEM.md. Sem animação de entrada, sem glow, sem
// glass (DESIGN_SYSTEM.md → o que NÃO herdar).

export const inputClass =
  'rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50'
export const labelClass = 'text-xs font-medium text-content-secondary'

interface BaseFieldProps {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  /** Texto de ajuda opcional, associado por `aria-describedby`. */
  help?: string
  disabled?: boolean
}

function FieldShell({
  fieldId,
  helpId,
  label,
  help,
  children,
}: {
  fieldId: string
  helpId?: string
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className={labelClass}>
        {label}
      </label>
      {children}
      {help ? (
        <p id={helpId} className="text-[11px] text-content-muted">
          {help}
        </p>
      ) : null}
    </div>
  )
}

function useFieldIds(name: string, help?: string) {
  const base = useId()
  const fieldId = `${base}-${name}`
  const helpId = help ? `${fieldId}-help` : undefined
  return { fieldId, helpId }
}

export function TextField({ name, label, value, onChange, help, disabled, type = 'text' }: BaseFieldProps & { type?: 'text' | 'url' }) {
  const { fieldId, helpId } = useFieldIds(name, help)
  return (
    <FieldShell fieldId={fieldId} helpId={helpId} label={label} help={help}>
      <input
        id={fieldId}
        name={name}
        type={type}
        inputMode={type === 'url' ? 'url' : undefined}
        value={value}
        disabled={disabled}
        aria-describedby={helpId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  )
}

export function NumberField({
  name,
  label,
  value,
  onChange,
  help,
  disabled,
  min,
  max,
  step,
}: BaseFieldProps & { min?: number; max?: number; step?: number }) {
  const { fieldId, helpId } = useFieldIds(name, help)
  return (
    <FieldShell fieldId={fieldId} helpId={helpId} label={label} help={help}>
      <input
        id={fieldId}
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={helpId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={`${inputClass} font-mono`}
      />
    </FieldShell>
  )
}

export function DateField({
  name,
  label,
  value,
  onChange,
  help,
  disabled,
  withTime = false,
}: BaseFieldProps & { withTime?: boolean }) {
  const { fieldId, helpId } = useFieldIds(name, help)
  return (
    <FieldShell fieldId={fieldId} helpId={helpId} label={label} help={help}>
      <input
        id={fieldId}
        name={name}
        type={withTime ? 'datetime-local' : 'date'}
        value={value}
        disabled={disabled}
        aria-describedby={helpId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={`${inputClass} font-mono`}
      />
    </FieldShell>
  )
}

export function TextareaField({ name, label, value, onChange, help, disabled }: BaseFieldProps) {
  const { fieldId, helpId } = useFieldIds(name, help)
  return (
    <FieldShell fieldId={fieldId} helpId={helpId} label={label} help={help}>
      <textarea
        id={fieldId}
        name={name}
        rows={3}
        value={value}
        disabled={disabled}
        aria-describedby={helpId}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        className={inputClass}
      />
    </FieldShell>
  )
}

export function SelectField({
  name,
  label,
  value,
  onChange,
  help,
  disabled,
  options,
  enumGroup,
}: BaseFieldProps & { options: readonly string[]; enumGroup: DossierEnumGroup }) {
  const { fieldId, helpId } = useFieldIds(name, help)
  const labels = ENUM_LABELS[enumGroup] as Record<string, string>
  return (
    <FieldShell fieldId={fieldId} helpId={helpId} label={label} help={help}>
      <select
        id={fieldId}
        name={name}
        value={value}
        disabled={disabled}
        aria-describedby={helpId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        className={inputClass}
      >
        {/* Opção vazia = "não analisado" (D-037): grava `null`, nunca `nao`. */}
        <option value="">{NOT_ANALYZED_LABEL}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

/**
 * Grupo de checkboxes de `digital_opportunities` (DOSSIE §9). Todos os inputs
 * usam `name="digital_opportunities"` com o `value` canônico do vocabulário
 * fechado; o `label` é só visual. O sentinel `digital_opportunities_present`
 * NÃO fica aqui — é responsabilidade do formulário renderizá-lo sempre que
 * esta seção aparecer (contrato da 7.4).
 */
export function MultiCheckField({
  legend,
  selected,
  onToggle,
  disabled,
}: {
  legend: string
  selected: readonly string[]
  onToggle: (value: string, checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className={labelClass}>{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {DIGITAL_OPPORTUNITY_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-content-primary">
            <input
              type="checkbox"
              name="digital_opportunities"
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onToggle(option.value, e.target.checked)}
              className="h-4 w-4 rounded border-white/[0.15] bg-surface text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
