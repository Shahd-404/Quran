import { describe, it, expect } from 'vitest'
import { distributePages } from '../distribute-pages'
import { InvalidInputError } from '../errors'

describe('Reading plan distribution engine', () => {
  it('3 pages across 3 sessions', () => {
    const res = distributePages({ currentPage: 1, dailyPages: 3, sessionsCount: 3 })
    expect(res.requestedPages).toBe(3)
    expect(res.assignedPages).toBe(3)
    expect(res.sessions.map(s => s.pageCount)).toEqual([1,1,1])
    expect(res.sessions.map(s => [s.startPage,s.endPage])).toEqual([[1,1],[2,2],[3,3]])
    expect(res.nextUnreadPage).toBe(4)
    expect(res.reachesEndOfKhatma).toBe(false)
  })

  it('5 pages across 3 sessions', () => {
    const res = distributePages({ currentPage: 1, dailyPages: 5, sessionsCount: 3 })
    expect(res.assignedPages).toBe(5)
    expect(res.sessions.map(s => s.pageCount)).toEqual([2,2,1])
    expect(res.sessions.map(s => [s.startPage,s.endPage])).toEqual([[1,2],[3,4],[5,5]])
    expect(res.nextUnreadPage).toBe(6)
  })

  it('6 pages across 2 sessions', () => {
    const res = distributePages({ currentPage: 10, dailyPages: 6, sessionsCount: 2 })
    expect(res.assignedPages).toBe(6)
    expect(res.sessions.map(s => s.pageCount)).toEqual([3,3])
    expect(res.sessions[0].startPage).toBe(10)
  })

  it('1 page across 1 session', () => {
    const res = distributePages({ currentPage: 100, dailyPages: 1, sessionsCount: 1 })
    expect(res.assignedPages).toBe(1)
    expect(res.sessions.length).toBe(1)
    expect(res.sessions[0].startPage).toBe(100)
    expect(res.sessions[0].endPage).toBe(100)
  })

  it('remainder assigned to earliest sessions', () => {
    const res = distributePages({ currentPage: 1, dailyPages: 5, sessionsCount: 4 })
    expect(res.sessions.map(s => s.pageCount)).toEqual([2,1,1,1])
  })

  it('consecutive non-overlapping ranges', () => {
    const res = distributePages({ currentPage: 50, dailyPages: 5, sessionsCount: 3 })
    const ranges = res.sessions.map(s => [s.startPage, s.endPage])
    // ensure consecutive
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i][0]).toBe(ranges[i-1][1] + 1)
    }
  })

  it('starting at page 1', () => {
    const res = distributePages({ currentPage: 1, dailyPages: 3, sessionsCount: 2 })
    expect(res.sessions[0].startPage).toBe(1)
  })

  it('ending exactly at page 604', () => {
    const res = distributePages({ currentPage: 602, dailyPages: 3, sessionsCount: 3, totalPages: 604 })
    expect(res.assignedPages).toBe(3)
    expect(res.sessions.map(s => [s.startPage,s.endPage])).toEqual([[602,602],[603,603],[604,604]])
    expect(res.reachesEndOfKhatma).toBe(true)
    expect(res.nextUnreadPage).toBeNull()
  })

  it('starting at page 603 with target greater than remaining pages', () => {
    const res = distributePages({ currentPage: 603, dailyPages: 5, sessionsCount: 3, totalPages: 604 })
    expect(res.assignedPages).toBe(2)
    expect(res.sessions.map(s => [s.startPage,s.endPage])).toEqual([[603,603],[604,604]])
    expect(res.reachesEndOfKhatma).toBe(true)
    expect(res.nextUnreadPage).toBeNull()
  })

  it('remaining pages fewer than configured sessions', () => {
    const res = distributePages({ currentPage: 604, dailyPages: 3, sessionsCount: 3, totalPages: 604 })
    expect(res.assignedPages).toBe(1)
    expect(res.sessions.length).toBe(1)
    expect(res.sessions[0].startPage).toBe(604)
  })

  it('invalid page 0', () => {
    expect(() => distributePages({ currentPage: 0, dailyPages: 2, sessionsCount: 2 })).toThrow(InvalidInputError)
  })

  it('invalid page beyond totalPages', () => {
    expect(() => distributePages({ currentPage: 605, dailyPages: 1, sessionsCount: 1 })).toThrow(InvalidInputError)
  })

  it('invalid zero daily pages', () => {
    expect(() => distributePages({ currentPage: 1, dailyPages: 0, sessionsCount: 1 })).toThrow(InvalidInputError)
  })

  it('invalid zero sessions', () => {
    expect(() => distributePages({ currentPage: 1, dailyPages: 1, sessionsCount: 0 })).toThrow(InvalidInputError)
  })

  it('more than 6 sessions', () => {
    expect(() => distributePages({ currentPage: 1, dailyPages: 10, sessionsCount: 7 })).toThrow(InvalidInputError)
  })

  it('sessions greater than daily pages', () => {
    expect(() => distributePages({ currentPage: 1, dailyPages: 2, sessionsCount: 3 })).toThrow(InvalidInputError)
  })

  it('invalid total page count', () => {
    expect(() => distributePages({ currentPage: 1, dailyPages: 1, sessionsCount: 1, totalPages: 0 })).toThrow(InvalidInputError)
  })

  it('input immutability and determinism', () => {
    const input = { currentPage: 10, dailyPages: 5, sessionsCount: 3 }
    const copy = { ...input }
    const a = distributePages(input)
    const b = distributePages(input)
    expect(a).toEqual(b)
    expect(input).toEqual(copy)
  })
})
