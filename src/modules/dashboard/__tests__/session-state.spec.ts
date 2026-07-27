import { describe, expect, it } from 'vitest'
import { deriveSessionState, selectHighlightedSession } from '../session-state'
import { DashboardSession } from '../types'

const now = new Date('2026-07-26T12:00:00.000Z')

function session(
  sessionOrder: number,
  presentationState: DashboardSession['presentationState'],
): DashboardSession {
  return {
    id: `session-${sessionOrder}`,
    sessionOrder,
    startPage: sessionOrder,
    endPage: sessionOrder,
    pageCount: 1,
    scheduledFor: now.toISOString(),
    formattedTime: '٣:٠٠ م',
    persistedStatus: presentationState === 'completed' ? 'completed' : 'pending',
    presentationState,
  }
}

describe('deriveSessionState', () => {
  it('keeps completed and in-progress persisted states', () => {
    expect(
      deriveSessionState({
        persistedStatus: 'completed',
        assignmentLocalDate: '2026-07-26',
        scheduledFor: '2026-07-26T13:00:00Z',
        timezone: 'Africa/Cairo',
        now,
      }),
    ).toBe('completed')
    expect(
      deriveSessionState({
        persistedStatus: 'in_progress',
        assignmentLocalDate: '2026-07-26',
        scheduledFor: '2026-07-26T13:00:00Z',
        timezone: 'Africa/Cairo',
        now,
      }),
    ).toBe('in_progress')
  })

  it('derives upcoming and available for today', () => {
    expect(
      deriveSessionState({
        persistedStatus: 'pending',
        assignmentLocalDate: '2026-07-26',
        scheduledFor: '2026-07-26T13:00:00Z',
        timezone: 'Africa/Cairo',
        now,
      }),
    ).toBe('upcoming')
    expect(
      deriveSessionState({
        persistedStatus: 'pending',
        assignmentLocalDate: '2026-07-26',
        scheduledFor: '2026-07-26T11:00:00Z',
        timezone: 'Africa/Cairo',
        now,
      }),
    ).toBe('available')
  })

  it('derives missed using the plan timezone rather than the runtime timezone', () => {
    expect(
      deriveSessionState({
        persistedStatus: 'pending',
        assignmentLocalDate: '2026-07-26',
        scheduledFor: '2026-07-26T20:00:00Z',
        timezone: 'Pacific/Kiritimati',
        now,
      }),
    ).toBe('missed')
  })
})

describe('selectHighlightedSession', () => {
  it('prefers an in-progress session over an earlier pending session', () => {
    expect(selectHighlightedSession([session(1, 'available'), session(2, 'in_progress')])?.sessionOrder).toBe(2)
  })

  it('selects the first pending session when none is in progress', () => {
    expect(selectHighlightedSession([session(2, 'upcoming'), session(1, 'available')])?.sessionOrder).toBe(1)
  })

  it('returns null when all sessions are completed', () => {
    expect(selectHighlightedSession([session(1, 'completed'), session(2, 'completed')])).toBeNull()
  })
})
