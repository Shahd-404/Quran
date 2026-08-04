import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  createOfflineDownloadBundle,
  getOfflineDownloadManifest,
} from '../offline-download'

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const sessionId = '11111111-1111-4111-8111-111111111111'
const assignmentId = '22222222-2222-4222-8222-222222222222'

type DatabaseResult = { data: unknown; error: unknown }

function createClient({
  sessions,
  rateAllowed = true,
}: {
  sessions: unknown[]
  rateAllowed?: boolean
}) {
  const results: Record<string, DatabaseResult> = {
    reading_plans: { data: { id: 'plan-1', timezone: 'Africa/Cairo' }, error: null },
    daily_assignments: {
      data: [{ id: assignmentId, local_date: '2026-08-04' }],
      error: null,
    },
    reading_sessions: { data: sessions, error: null },
  }

  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'gte', 'lte', 'neq', 'order', 'in', 'limit']) {
      builder[method] = vi.fn(() => builder)
    }
    builder.maybeSingle = vi.fn(async () => results[table])
    builder.then = (
      resolve: (value: DatabaseResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(results[table]).then(resolve, reject)
    return builder
  })
  const rpc = vi.fn(async () => ({ data: rateAllowed, error: null }))
  return {
    client: {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } }, error: null })) },
      from,
      rpc,
    } as unknown as SupabaseClient,
    from,
    rpc,
  }
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: sessionId,
    daily_assignment_id: assignmentId,
    session_order: 1,
    start_page: 10,
    end_page: 11,
    scheduled_for: '2026-08-04T08:00:00.000Z',
    status: 'pending',
    ...overrides,
  }
}

function quranPage(pageNumber: number) {
  return {
    pageNumber,
    verses: [{
      chapterId: 2,
      chapterNameArabic: 'البقرة',
      verseKey: `2:${pageNumber}`,
      verseNumber: pageNumber,
      uthmaniText: 'نص قرآني',
    }],
  }
}

describe('offline download server boundary', () => {
  it('returns only incomplete owned sessions and a pseudonymous account scope', async () => {
    const { client } = createClient({ sessions: [session()] })
    const result = await getOfflineDownloadManifest(
      client,
      false,
      new Date('2026-08-04T10:00:00.000Z'),
    )

    expect(result).toMatchObject({
      success: true,
      localDate: '2026-08-04',
      includeNextDays: false,
      sessions: [{ id: sessionId, startPage: 10, endPage: 11 }],
    })
    expect(result.success && result.scopeKey).not.toContain(userId)
  })

  it('loads every unique page through the injected server loader after rate approval', async () => {
    const { client, rpc } = createClient({ sessions: [session()] })
    const loadPage = vi.fn(async (pageNumber: number) => quranPage(pageNumber))
    const result = await createOfflineDownloadBundle(
      client,
      [sessionId],
      new Date('2026-08-04T10:00:00.000Z'),
      loadPage,
    )

    expect(result).toMatchObject({
      success: true,
      expiresAt: '2026-08-11T10:00:00.000Z',
      sessions: [{ id: sessionId }],
      pages: [{ pageNumber: 10 }, { pageNumber: 11 }],
    })
    expect(loadPage.mock.calls.map(([page]) => page)).toEqual([10, 11])
    expect(rpc).toHaveBeenCalledWith('reserve_offline_quran_download')
  })

  it('rejects a requested session that is not in the current owned eligibility window', async () => {
    const { client, rpc } = createClient({ sessions: [] })
    const loadPage = vi.fn()
    const result = await createOfflineDownloadBundle(
      client,
      [sessionId],
      new Date('2026-08-04T10:00:00.000Z'),
      loadPage,
    )

    expect(result).toMatchObject({ success: false, code: 'SESSION_NOT_ELIGIBLE' })
    expect(rpc).not.toHaveBeenCalled()
    expect(loadPage).not.toHaveBeenCalled()
  })

  it('fails the whole bundle when one Quran page cannot be loaded', async () => {
    const { client } = createClient({ sessions: [session()] })
    const result = await createOfflineDownloadBundle(
      client,
      [sessionId],
      new Date('2026-08-04T10:00:00.000Z'),
      async (pageNumber) => {
        if (pageNumber === 11) throw new Error('provider diagnostic')
        return quranPage(pageNumber)
      },
    )

    expect(result).toMatchObject({ success: false, code: 'CONTENT_UNAVAILABLE' })
    expect(JSON.stringify(result)).not.toContain('provider diagnostic')
  })

  it('rejects a range above the bounded unique-page limit before provider access', async () => {
    const { client, rpc } = createClient({
      sessions: [session({ start_page: 1, end_page: 121 })],
    })
    const loadPage = vi.fn()
    const result = await createOfflineDownloadBundle(
      client,
      [sessionId],
      new Date('2026-08-04T10:00:00.000Z'),
      loadPage,
    )

    expect(result).toMatchObject({ success: false, code: 'DOWNLOAD_TOO_LARGE' })
    expect(rpc).not.toHaveBeenCalled()
    expect(loadPage).not.toHaveBeenCalled()
  })
})
