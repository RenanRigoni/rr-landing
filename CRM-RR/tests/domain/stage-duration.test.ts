import { describe, it, expect } from 'vitest'
import { daysSince, isOlderThanDays } from '@/lib/domain/stage-duration'

const DAY_MS = 1000 * 60 * 60 * 24

describe('daysSince', () => {
  it('returns 0 for a timestamp from a few hours ago', () => {
    const now = Date.now()
    const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000).toISOString()
    expect(daysSince(threeHoursAgo, now)).toBe(0)
  })

  it('returns exact whole days for a round elapsed period', () => {
    const now = Date.now()
    const fiveDaysAgo = new Date(now - 5 * DAY_MS).toISOString()
    expect(daysSince(fiveDaysAgo, now)).toBe(5)
  })

  it('floors partial days instead of rounding', () => {
    const now = Date.now()
    const almostTwoDaysAgo = new Date(now - (2 * DAY_MS - 1000)).toISOString()
    expect(daysSince(almostTwoDaysAgo, now)).toBe(1)
  })

  it('returns a negative count for a timestamp in the future (no clamping)', () => {
    const now = Date.now()
    const future = new Date(now + DAY_MS).toISOString()
    expect(daysSince(future, now)).toBe(-1)
  })
})

describe('isOlderThanDays', () => {
  it('is false exactly at the threshold', () => {
    const now = Date.now()
    const exactlyFourteenDaysAgo = new Date(now - 14 * DAY_MS).toISOString()
    expect(isOlderThanDays(exactlyFourteenDaysAgo, 14, now)).toBe(false)
  })

  it('is true just past the threshold', () => {
    const now = Date.now()
    const fifteenDaysAgo = new Date(now - 15 * DAY_MS).toISOString()
    expect(isOlderThanDays(fifteenDaysAgo, 14, now)).toBe(true)
  })

  it('is false for a recent date', () => {
    const now = Date.now()
    const oneDayAgo = new Date(now - DAY_MS).toISOString()
    expect(isOlderThanDays(oneDayAgo, 14, now)).toBe(false)
  })
})
