import { describe, expect, it } from 'vitest'
import {
  getDefaultReaderPage,
  selectReaderPage,
} from '../page-selection'
import { ReaderSession } from '../types'

function session(overrides: Partial<ReaderSession> = {}): ReaderSession {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    assignmentId: '22222222-2222-2222-2222-222222222222',
    planId: '33333333-3333-3333-3333-333333333333',
    sessionOrder: 1,
    startPage: 17,
    endPage: 19,
    status: 'pending',
    lastOpenedPage: null,
    firstOpenedAt: null,
    lastOpenedAt: null,
    assignmentDate: '2026-07-26',
    assignmentStatus: 'pending',
    currentUnreadPage: 17,
    ...overrides,
  }
}

describe('reader page selection', () => {
  it('uses start_page when no saved page exists', () => {
    expect(getDefaultReaderPage(session())).toBe(17)
    expect(selectReaderPage(session(), undefined)).toEqual({
      pageNumber: 17,
      shouldRedirect: false,
    })
  })

  it('resumes from a valid last_opened_page', () => {
    expect(
      selectReaderPage(session({ lastOpenedPage: 18 }), undefined),
    ).toEqual({ pageNumber: 18, shouldRedirect: false })
  })

  it('ignores an invalid saved page and falls back to start_page', () => {
    expect(getDefaultReaderPage(session({ lastOpenedPage: 605 }))).toBe(17)
  })

  it('redirects pages below and above the assigned range to its boundaries', () => {
    expect(selectReaderPage(session(), '0')).toEqual({
      pageNumber: 17,
      shouldRedirect: true,
    })
    expect(selectReaderPage(session(), '605')).toEqual({
      pageNumber: 19,
      shouldRedirect: true,
    })
  })

  it('redirects malformed page input to the safe default', () => {
    expect(selectReaderPage(session({ lastOpenedPage: 18 }), '17.5')).toEqual({
      pageNumber: 18,
      shouldRedirect: true,
    })
  })
})
