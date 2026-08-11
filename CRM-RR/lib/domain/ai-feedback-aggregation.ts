export interface AiRunSummary {
  status: 'pending_review' | 'reviewed' | 'error'
  applied: boolean
  rating: number | null
}

export interface AiQualitySummary {
  total: number
  acceptanceRate: number | null
  errorRate: number | null
  avgRating: number | null
}

/**
 * Agrega execuções de IA em métricas de qualidade (Fase 7 / /ai-quality).
 * Retorna null (não 0) para taxas/médias quando não há dados suficientes —
 * "sem execuções" é diferente de "0% de aceitação".
 */
export function aggregateAiRuns(runs: AiRunSummary[]): AiQualitySummary {
  const total = runs.length
  if (total === 0) {
    return { total: 0, acceptanceRate: null, errorRate: null, avgRating: null }
  }

  const appliedCount = runs.filter((r) => r.applied).length
  const errorCount = runs.filter((r) => r.status === 'error').length
  const ratings = runs.map((r) => r.rating).filter((r): r is number => r !== null)

  return {
    total,
    acceptanceRate: Math.round((appliedCount / total) * 1000) / 10,
    errorRate: Math.round((errorCount / total) * 1000) / 10,
    avgRating: ratings.length > 0 ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10 : null,
  }
}
