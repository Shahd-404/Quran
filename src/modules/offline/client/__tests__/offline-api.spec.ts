import { describe, expect, it } from 'vitest'
import { parseOfflineBundle, parseOfflineManifest } from '../offline-api'
import { validateOfflineBundle } from '../offline-db'
import type { OfflineDownloadBundle } from '../../types'

const session = {
  id: '11111111-1111-4111-8111-111111111111',
  assignmentDate: '2026-08-04',
  sessionOrder: 1,
  startPage: 10,
  endPage: 10,
  scheduledFor: '2026-08-04T08:00:00.000Z',
  status: 'pending' as const,
}
const page = {
  pageNumber: 10,
  verses: [{
    chapterId: 2,
    chapterNameArabic: 'البقرة',
    verseKey: '2:1',
    verseNumber: 1,
    uthmaniText: 'نص قرآني',
  }],
}

describe('offline API response validation', () => {
  it('accepts a minimal safe manifest and rejects malformed page ranges', () => {
    expect(parseOfflineManifest({
      success: true,
      scopeKey: 'scope',
      localDate: '2026-08-04',
      includeNextDays: false,
      sessions: [session],
    })).not.toBeNull()
    expect(parseOfflineManifest({
      success: true,
      scopeKey: 'scope',
      localDate: '2026-08-04',
      includeNextDays: false,
      sessions: [{ ...session, endPage: 605 }],
    })).toBeNull()
  })

  it('rejects malformed Quran payloads before IndexedDB writes', () => {
    expect(parseOfflineBundle({
      success: true,
      scopeKey: 'scope',
      generatedAt: '2026-08-04T10:00:00.000Z',
      expiresAt: '2026-08-11T10:00:00.000Z',
      sessions: [session],
      pages: [{ ...page, verses: [] }],
    })).toBeNull()
  })

  it('fails closed for an incomplete or expired bundle', () => {
    const complete: OfflineDownloadBundle = {
      success: true,
      scopeKey: 'scope',
      generatedAt: new Date(Date.now() - 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sessions: [session],
      pages: [page],
    }
    expect(() => validateOfflineBundle(complete)).not.toThrow()
    expect(() => validateOfflineBundle({ ...complete, pages: [] })).toThrow(
      'INCOMPLETE_OFFLINE_SESSION',
    )
    expect(() => validateOfflineBundle({
      ...complete,
      expiresAt: new Date(Date.now() - 1).toISOString(),
    })).toThrow('INVALID_OFFLINE_EXPIRY')
  })
})
