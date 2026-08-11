import { describe, it, expect } from 'vitest'
import { aggregateAiRuns, type AiRunSummary } from '@/lib/domain/ai-feedback-aggregation'

describe('aggregateAiRuns', () => {
  it('returns nulls for an empty list', () => {
    expect(aggregateAiRuns([])).toEqual({
      total: 0,
      acceptanceRate: null,
      errorRate: null,
      avgRating: null,
    })
  })

  it('handles a list where everything was rejected', () => {
    const runs: AiRunSummary[] = [
      { status: 'reviewed', applied: false, rating: 2 },
      { status: 'reviewed', applied: false, rating: 1 },
    ]
    const result = aggregateAiRuns(runs)
    expect(result.total).toBe(2)
    expect(result.acceptanceRate).toBe(0)
    expect(result.errorRate).toBe(0)
    expect(result.avgRating).toBe(1.5)
  })

  it('computes acceptance and error rate on a mixed batch', () => {
    const runs: AiRunSummary[] = [
      { status: 'reviewed', applied: true, rating: 5 },
      { status: 'reviewed', applied: true, rating: 4 },
      { status: 'reviewed', applied: false, rating: 2 },
      { status: 'error', applied: false, rating: null },
    ]
    const result = aggregateAiRuns(runs)
    expect(result.total).toBe(4)
    expect(result.acceptanceRate).toBe(50)
    expect(result.errorRate).toBe(25)
    expect(result.avgRating).toBe(3.7) // (5+4+2)/3 = 3.666... arredondado p/ 1 casa
  })

  it('ignores null ratings when averaging', () => {
    const runs: AiRunSummary[] = [
      { status: 'reviewed', applied: true, rating: null },
      { status: 'reviewed', applied: true, rating: 3 },
    ]
    const result = aggregateAiRuns(runs)
    expect(result.avgRating).toBe(3)
  })

  it('returns null avgRating when no run has a rating', () => {
    const runs: AiRunSummary[] = [{ status: 'pending_review', applied: false, rating: null }]
    expect(aggregateAiRuns(runs).avgRating).toBeNull()
  })
})
