import { describe, expect, it } from 'vitest'
import {
  calculateExpectedCompletionDate,
  calculateExpectedReadingDays,
  calculateExpectedReadingSessions,
  formatCompletionEstimateArabic,
  getCompletionEstimate,
  getRemainingQuranPages,
} from '../completion-estimate'

describe('Quran completion estimate', () => {
  it.each([
    { pagesPerDay: 1, expectedDays: 604 },
    { pagesPerDay: 2, expectedDays: 302 },
    { pagesPerDay: 3, expectedDays: 202 },
    { pagesPerDay: 5, expectedDays: 121 },
    { pagesPerDay: 10, expectedDays: 61 },
  ])(
    'estimates page 1 at $pagesPerDay pages per day as $expectedDays reading days',
    ({ pagesPerDay, expectedDays }) => {
      const remainingPages = getRemainingQuranPages(1)

      expect(remainingPages).toBe(604)
      expect(
        calculateExpectedReadingDays(remainingPages as number, pagesPerDay),
      ).toBe(expectedDays)
    },
  )

  it('counts the next unread page inclusively for partial progress', () => {
    expect(getRemainingQuranPages(425)).toBe(180)
    expect(calculateExpectedReadingDays(180, 3)).toBe(60)
  })

  it('treats page 604 as one remaining page until the khatma is completed', () => {
    expect(getRemainingQuranPages(604)).toBe(1)
    expect(calculateExpectedReadingDays(1, 10)).toBe(1)
  })

  it('returns zero remaining days for the explicit completed state', () => {
    const estimate = getCompletionEstimate({
      currentUnreadPage: 604,
      pagesPerDay: 3,
      sessionsPerDay: 3,
      timezone: 'Africa/Cairo',
      completed: true,
      now: new Date('2026-07-29T10:00:00Z'),
    })

    expect(estimate).toEqual({
      remainingPages: 0,
      expectedReadingDays: 0,
      estimatedRemainingSessions: 0,
      readingStartDate: null,
      expectedCompletionDate: null,
    })
    expect(
      formatCompletionEstimateArabic(
        estimate as NonNullable<typeof estimate>,
        3,
        'active-plan',
      )?.primaryText,
    ).toBe('أتممتِ الختمة، تقبّل الله منكِ 🌿')
  })

  it('rounds partial final days upward', () => {
    expect(calculateExpectedReadingDays(5, 2)).toBe(3)
  })

  it('derives remaining sessions using the deterministic final-day distribution', () => {
    expect(calculateExpectedReadingSessions(588, 5, 3)).toBe(354)
    expect(calculateExpectedReadingSessions(5, 5, 3)).toBe(3)
    expect(calculateExpectedReadingSessions(2, 5, 3)).toBe(2)
    expect(calculateExpectedReadingSessions(0, 5, 3)).toBe(0)
  })

  it('rejects invalid session estimates without invalidating the day estimate', () => {
    expect(calculateExpectedReadingSessions(10, 2, 3)).toBeNull()
    expect(calculateExpectedReadingSessions(10, 2, 0)).toBeNull()
  })

  it('includes the first reading date as day one', () => {
    expect(
      calculateExpectedCompletionDate({
        expectedReadingDays: 202,
        timezone: 'Africa/Cairo',
        effectiveFrom: '2026-07-29',
        now: new Date('2026-07-29T10:00:00Z'),
      }),
    ).toEqual({
      readingStartDate: '2026-07-29',
      expectedCompletionDate: '2027-02-15',
    })
  })

  it('uses a future effective date as the first reading day', () => {
    expect(
      calculateExpectedCompletionDate({
        expectedReadingDays: 3,
        timezone: 'Africa/Cairo',
        effectiveFrom: '2026-08-05',
        now: new Date('2026-07-29T10:00:00Z'),
      }),
    ).toEqual({
      readingStartDate: '2026-08-05',
      expectedCompletionDate: '2026-08-07',
    })
  })

  it('derives today from the plan timezone instead of the machine timezone', () => {
    const now = new Date('2026-07-27T01:30:00Z')

    expect(
      calculateExpectedCompletionDate({
        expectedReadingDays: 1,
        timezone: 'Asia/Tokyo',
        now,
      })?.expectedCompletionDate,
    ).toBe('2026-07-27')
    expect(
      calculateExpectedCompletionDate({
        expectedReadingDays: 1,
        timezone: 'America/Los_Angeles',
        now,
      })?.expectedCompletionDate,
    ).toBe('2026-07-26')
  })

  it.each([0, -1, Number.NaN, 1.5])(
    'rejects invalid daily page target %s',
    (pagesPerDay) => {
      expect(calculateExpectedReadingDays(604, pagesPerDay)).toBeNull()
    },
  )

  it('rejects missing daily targets, invalid page bounds, and invalid timezones', () => {
    expect(calculateExpectedReadingDays(604, undefined)).toBeNull()
    expect(getRemainingQuranPages(null)).toBeNull()
    expect(getRemainingQuranPages(0)).toBeNull()
    expect(getRemainingQuranPages(605)).toBeNull()
    expect(getRemainingQuranPages(1.5)).toBeNull()
    expect(
      getCompletionEstimate({
        currentUnreadPage: 1,
        pagesPerDay: 3,
        timezone: 'Invalid/Timezone',
        now: new Date('2026-07-29T10:00:00Z'),
      }),
    ).toBeNull()
  })
})
