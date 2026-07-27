import { describe, expect, it } from 'vitest'
import { formatAssignmentDate, formatSessionTime } from '../formatting'
import { calculateDailyProgress, calculateKhatmaProgress } from '../progress'
import { DashboardSession } from '../types'

function session(id: string, pageCount: number, completed: boolean): DashboardSession {
  return {
    id,
    sessionOrder: Number(id),
    startPage: 1,
    endPage: pageCount,
    pageCount,
    scheduledFor: '2026-07-26T10:00:00Z',
    formattedTime: '',
    persistedStatus: completed ? 'completed' : 'pending',
    presentationState: completed ? 'completed' : 'available',
  }
}

describe('dashboard progress', () => {
  it.each([
    { completed: [false, false], expectedPages: 0, expectedPercentage: 0 },
    { completed: [true, false], expectedPages: 2, expectedPercentage: 40 },
    { completed: [true, true], expectedPages: 5, expectedPercentage: 100 },
  ])(
    'calculates $expectedPercentage% daily progress',
    ({ completed, expectedPages, expectedPercentage }) => {
      const result = calculateDailyProgress(
        [session('1', 2, completed[0]), session('2', 3, completed[1])],
        5,
      )
      expect(result).toEqual({ completedPages: expectedPages, percentage: expectedPercentage })
    },
  )

  it('calculates khatma progress from a non-page-1 starting point', () => {
    expect(calculateKhatmaProgress(200, 101)).toEqual({
      completedPages: 99,
      totalPages: 504,
      percentage: 20,
    })
  })
})

describe('Arabic server-side formatting', () => {
  it('formats the assignment date and session time in Arabic using the saved timezone', () => {
    const date = formatAssignmentDate('2026-07-26', 'Africa/Cairo')
    const time = formatSessionTime('2026-07-26T10:00:00Z', 'Africa/Cairo')

    expect(date).toMatch(/[٠-٩]/)
    expect(date).toContain('يوليو')
    expect(time).toMatch(/[٠-٩]/)
    expect(time).toContain('م')
  })
})
