import { describe, it, expect } from 'vitest'
import { detectNextAction } from '@/lib/domain/next-action'

describe('detectNextAction', () => {
  it('reports no next action when there are no activities at all', () => {
    expect(detectNextAction([])).toEqual({ hasNextAction: false, nextDueAt: null, isOverdue: false })
  })

  it('reports no next action when every activity is done or cancelled', () => {
    const result = detectNextAction([
      { status: 'done', due_at: '2026-01-01T00:00:00Z' },
      { status: 'cancelled', due_at: null },
    ])
    expect(result.hasNextAction).toBe(false)
  })

  it('reports a next action without overdue flag when the pending activity has no due date', () => {
    const result = detectNextAction([{ status: 'pending', due_at: null }])
    expect(result).toEqual({ hasNextAction: true, nextDueAt: null, isOverdue: false })
  })

  it('marks overdue when the due date is in the past', () => {
    const now = new Date('2026-06-15T12:00:00Z').getTime()
    const result = detectNextAction([{ status: 'pending', due_at: '2026-06-10T00:00:00Z' }], now)
    expect(result.hasNextAction).toBe(true)
    expect(result.isOverdue).toBe(true)
  })

  it('does not mark overdue when the due date is in the future', () => {
    const now = new Date('2026-06-15T12:00:00Z').getTime()
    const result = detectNextAction([{ status: 'pending', due_at: '2026-06-20T00:00:00Z' }], now)
    expect(result.isOverdue).toBe(false)
  })

  it('picks the earliest due date among multiple pending activities', () => {
    const result = detectNextAction([
      { status: 'pending', due_at: '2026-06-20T00:00:00Z' },
      { status: 'pending', due_at: '2026-06-12T00:00:00Z' },
      { status: 'done', due_at: '2026-06-01T00:00:00Z' },
    ])
    expect(result.nextDueAt).toBe('2026-06-12T00:00:00Z')
  })
})
