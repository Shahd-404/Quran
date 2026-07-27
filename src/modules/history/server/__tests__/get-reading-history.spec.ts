import { describe, expect, it } from 'vitest'
import { getReadingHistory } from '../get-reading-history'
import {
  createHistoryClient,
  historyEvent,
  khatmaRow,
} from './test-client'

describe('getReadingHistory', () => {
  it('rejects unauthenticated requests before reading history', async () => {
    const { client, rpc, from } = createHistoryClient({
      authenticated: false,
    })

    await expect(getReadingHistory(client, '1')).resolves.toEqual({
      status: 'unauthenticated',
    })
    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('returns a calm empty model when no progress events exist', async () => {
    const { client } = createHistoryClient({
      summary: {
        data: [
          {
            total_completed_pages: 0,
            total_completed_sessions: 0,
            total_completed_khatmas: 0,
          },
        ],
        error: null,
      },
    })

    const result = await getReadingHistory(client, '1')

    expect(result).toMatchObject({
      status: 'success',
      data: {
        totalCompletedPages: 0,
        totalCompletedSessions: 0,
        totalCompletedKhatmas: 0,
        dayGroups: [],
      },
    })
  })

  it('uses authoritative totals and groups multiple sessions by assignment local date', async () => {
    const events = [
      historyEvent(),
      historyEvent({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        sessionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
        sessionOrder: 2,
        startPage: 19,
        endPage: 21,
        completedAt: '2026-07-26T10:30:00Z',
      }),
    ]
    const { client } = createHistoryClient({
      archive: {
        data: [
          khatmaRow(),
          khatmaRow({
            id: '33333333-3333-3333-3333-333333333333',
            status: 'completed',
          }),
        ],
        error: null,
      },
      events: { data: events, error: null, count: 2 },
    })

    const result = await getReadingHistory(client, '1')

    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.data.totalCompletedPages).toBe(5)
    expect(result.data.totalCompletedSessions).toBe(2)
    expect(result.data.totalCompletedKhatmas).toBe(1)
    expect(result.data.currentKhatma?.status).toBe('active')
    expect(result.data.completedKhatmas).toHaveLength(1)
    expect(result.data.dayGroups).toHaveLength(1)
    expect(result.data.dayGroups[0]).toMatchObject({
      localDate: '2026-07-26',
      totalPages: 5,
      sessionCount: 2,
    })
    expect(
      result.data.dayGroups[0].events.map((event) => event.pageCount),
    ).toEqual([2, 3])
  })

  it('falls back to the event date in the historical plan timezone', async () => {
    const { client } = createHistoryClient({
      events: {
        data: [
          historyEvent({
            completedAt: '2026-07-25T22:30:00Z',
            localDate: null,
          }),
        ],
        error: null,
        count: 1,
      },
    })

    const result = await getReadingHistory(client, '1')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.dayGroups[0].localDate).toBe('2026-07-26')
      expect(
        result.data.dayGroups[0].events[0].formattedCompletionTime,
      ).toMatch(/١:٣٠/)
    }
  })

  it('uses stable descending pagination and validates the page input', async () => {
    const { client, builder } = createHistoryClient({
      events: {
        data: [historyEvent()],
        error: null,
        count: 21,
      },
    })

    const result = await getReadingHistory(client, 'invalid')

    expect(result.status).toBe('success')
    expect(builder.order).toHaveBeenNthCalledWith(1, 'completed_at', {
      ascending: false,
    })
    expect(builder.order).toHaveBeenNthCalledWith(2, 'id', {
      ascending: false,
    })
    expect(builder.range).toHaveBeenCalledWith(0, 19)
    if (result.status === 'success') {
      expect(result.data.pagination).toMatchObject({
        page: 1,
        hasPrevious: false,
        hasNext: true,
        totalPages: 2,
      })
    }
  })

  it('returns a safe error without exposing raw database details', async () => {
    const { client } = createHistoryClient({
      events: {
        data: null,
        error: { message: 'SQLSTATE 42702 secret table detail' },
        count: null,
      },
    })

    const result = await getReadingHistory(client, '1')

    expect(result).toEqual({
      status: 'error',
      message: 'تعذّر تحميل سجل القراءة الآن. حاول مرة أخرى بعد قليل.',
    })
    expect(JSON.stringify(result)).not.toMatch(/42702|secret table/)
  })
})
