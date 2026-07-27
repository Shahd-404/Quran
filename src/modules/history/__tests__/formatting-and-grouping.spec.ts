import { describe, expect, it } from 'vitest'
import {
  formatHistoryLocalDate,
  formatHistoryTime,
  localDateFromTimestamp,
} from '../formatting'
import { groupHistoryEvents } from '../group-history-events'
import { HistoryEvent } from '../types'

function event(overrides: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    id: 'event-1',
    readingSessionId: 'session-1',
    readingPlanId: 'plan-1',
    khatmaId: 'khatma-1',
    assignmentId: 'assignment-1',
    sessionOrder: 1,
    startPage: 17,
    endPage: 18,
    pageCount: 2,
    completedAt: '2026-07-26T05:24:00Z',
    localDate: '2026-07-26',
    timezone: 'Africa/Cairo',
    formattedCompletionTime: '٨:٢٤ ص',
    ...overrides,
  }
}

describe('history formatting and grouping', () => {
  it('formats Arabic dates and times in the saved timezone', () => {
    expect(formatHistoryLocalDate('2026-07-26')).toMatch(
      /الأحد.*٢٦.*يوليو.*٢٠٢٦/,
    )
    expect(
      formatHistoryTime('2026-07-26T05:24:00Z', 'Africa/Cairo'),
    ).toMatch(/٨:٢٤/)
    expect(
      localDateFromTimestamp(
        '2026-07-25T22:30:00Z',
        'Africa/Cairo',
      ),
    ).toBe('2026-07-26')
  })

  it('groups multiple sessions by authoritative assignment local date', () => {
    const groups = groupHistoryEvents([
      event(),
      event({
        id: 'event-2',
        readingSessionId: 'session-2',
        sessionOrder: 2,
        startPage: 19,
        endPage: 21,
        pageCount: 3,
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      totalPages: 5,
      sessionCount: 2,
    })
  })
})
