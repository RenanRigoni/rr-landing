import { describe, it, expect } from 'vitest'
import { calcStageConversion } from '@/lib/domain/conversion'

describe('calcStageConversion', () => {
  it('returns null when there were zero deals in the current stage (avoids division by zero)', () => {
    expect(calcStageConversion(0, 0)).toBeNull()
    expect(calcStageConversion(0, 5)).toBeNull()
  })

  it('returns 100 when every deal advanced to the next stage', () => {
    expect(calcStageConversion(10, 10)).toBe(100)
  })

  it('computes a partial conversion rate', () => {
    expect(calcStageConversion(100, 40)).toBe(40)
  })

  it('rounds to one decimal place', () => {
    expect(calcStageConversion(3, 1)).toBe(33.3)
  })

  it('returns 0 when no deal advanced', () => {
    expect(calcStageConversion(10, 0)).toBe(0)
  })
})
