import { describe, it, expect } from 'vitest'
import { isLostReasonRequired } from '@/lib/domain/lost-reason-rules'

describe('isLostReasonRequired', () => {
  it('requires a reason when moving to a lost stage without one', () => {
    expect(isLostReasonRequired(true, null)).toBe(true)
    expect(isLostReasonRequired(true, undefined)).toBe(true)
    expect(isLostReasonRequired(true, '')).toBe(true)
  })

  it('does not require a reason when a lost reason id is present', () => {
    expect(isLostReasonRequired(true, 'reason-123')).toBe(false)
  })

  it('never requires a reason for a non-lost stage, regardless of the id', () => {
    expect(isLostReasonRequired(false, null)).toBe(false)
    expect(isLostReasonRequired(false, 'reason-123')).toBe(false)
  })
})
