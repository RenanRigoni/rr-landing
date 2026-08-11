export interface CriterionScoreInput {
  criterionId: string
  score: number
  weight: number
  maxScore: number
  isActive: boolean
}

/**
 * Score geral 0-100, ponderado pelo peso de cada critério ativo.
 * Retorna null (não 0) quando não há nenhum critério ativo pontuado —
 * "não qualificado ainda" é um estado diferente de "qualificado com nota zero".
 */
export function computeOverallScore(scores: CriterionScoreInput[]): number | null {
  const active = scores.filter((s) => s.isActive)
  if (active.length === 0) return null

  const weightTotal = active.reduce((sum, s) => sum + s.weight, 0)
  if (weightTotal === 0) return null

  const weightedSum = active.reduce((sum, s) => sum + (s.score / s.maxScore) * s.weight, 0)
  return Math.round((weightedSum / weightTotal) * 1000) / 10
}

export interface QualificationFactor {
  criterionId: string
  label: string
  rationale: string
}

export interface QualificationBreakdown {
  strong: QualificationFactor[]
  risks: QualificationFactor[]
}

export interface ScoredCriterion {
  criterionId: string
  label: string
  score: number
  maxScore: number
  rationale: string
}

const STRONG_RATIO = 0.8
const RISK_RATIO = 0.4

/**
 * Classifica cada dimensão pontuada em "fator forte" ou "risco" com base na
 * proporção da nota em relação ao máximo — usado para explicar o score
 * (Regra 7: qualificação nunca é só um número).
 */
export function classifyQualificationFactors(criteria: ScoredCriterion[]): QualificationBreakdown {
  const strong: QualificationFactor[] = []
  const risks: QualificationFactor[] = []

  for (const criterion of criteria) {
    const ratio = criterion.maxScore > 0 ? criterion.score / criterion.maxScore : 0
    const factor: QualificationFactor = {
      criterionId: criterion.criterionId,
      label: criterion.label,
      rationale: criterion.rationale,
    }
    if (ratio >= STRONG_RATIO) strong.push(factor)
    else if (ratio <= RISK_RATIO) risks.push(factor)
  }

  return { strong, risks }
}
