'use client'

import { useActionState } from 'react'
import { ScoreBar } from '@/components/deals/ScoreBar'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { saveQualification, type QualificationFormState } from '@/lib/actions/qualification'
import { classifyQualificationFactors } from '@/lib/domain/qualification-score'

interface Criterion {
  id: string
  label: string
  description: string | null
  max_score: number
}

interface ExistingScore {
  criterion_id: string
  score: number
  rationale: string
}

interface DealQualificationPanelProps {
  dealId: string
  criteria: Criterion[]
  overallScore: number | null
  existingScores: ExistingScore[]
}

const SCORE_LABELS = ['0 — Nulo', '1 — Muito fraco', '2 — Fraco', '3 — Neutro', '4 — Bom', '5 — Excelente']

const initialState: QualificationFormState = { error: null }

export function DealQualificationPanel({
  dealId,
  criteria,
  overallScore,
  existingScores,
}: DealQualificationPanelProps) {
  const boundAction = saveQualification.bind(null, dealId)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  const scoreByCriterion = new Map(existingScores.map((s) => [s.criterion_id, s]))

  const breakdown = classifyQualificationFactors(
    existingScores.map((s) => {
      const criterion = criteria.find((c) => c.id === s.criterion_id)
      return {
        criterionId: s.criterion_id,
        label: criterion?.label ?? s.criterion_id,
        score: s.score,
        maxScore: criterion?.max_score ?? 5,
        rationale: s.rationale,
      }
    }),
  )

  return (
    <div className="flex flex-col gap-6">
      {overallScore !== null ? (
        <div className="flex flex-col gap-3 rounded-inner border border-white/[0.08] bg-surface-elevated p-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl text-content-primary">{overallScore}</span>
            <span className="text-sm text-content-secondary">/100</span>
          </div>

          <div className="flex flex-col gap-2">
            {existingScores.map((s) => {
              const criterion = criteria.find((c) => c.id === s.criterion_id)
              if (!criterion) return null
              return <ScoreBar key={s.criterion_id} label={criterion.label} score={s.score} maxScore={criterion.max_score} />
            })}
          </div>

          {breakdown.strong.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-success">Fatores fortes</span>
              {breakdown.strong.map((f) => (
                <p key={f.criterionId} className="text-xs text-content-secondary">
                  + {f.label}: {f.rationale}
                </p>
              ))}
            </div>
          ) : null}

          {breakdown.risks.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-danger">Riscos</span>
              {breakdown.risks.map((f) => (
                <p key={f.criterionId} className="text-xs text-content-secondary">
                  − {f.label}: {f.rationale}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-content-secondary">Ainda não qualificado. Preencha abaixo.</p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        {criteria.map((criterion) => {
          const existing = scoreByCriterion.get(criterion.id)
          return (
            <div key={criterion.id} className="flex flex-col gap-1.5 border-t border-white/[0.08] pt-3 first:border-0 first:pt-0">
              <label className="text-xs font-medium text-content-primary">{criterion.label}</label>
              {criterion.description ? <p className="text-[11px] text-content-muted">{criterion.description}</p> : null}
              <select
                name={`score_${criterion.id}`}
                defaultValue={existing ? String(existing.score) : ''}
                className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
              >
                <option value="">— Não avaliado —</option>
                {SCORE_LABELS.slice(0, criterion.max_score + 1).map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                name={`rationale_${criterion.id}`}
                placeholder="Justificativa (obrigatória se pontuado)"
                defaultValue={existing?.rationale ?? ''}
                rows={2}
                className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
              />
            </div>
          )
        })}

        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <div>
          <SubmitButton pending={pending} label="Salvar qualificação" pendingLabel="Salvando…" />
        </div>
      </form>
    </div>
  )
}
