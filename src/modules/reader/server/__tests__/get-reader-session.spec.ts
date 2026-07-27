import { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { getReaderSession } from '../get-reader-session'

type TableResult = {
  data: unknown
  error: { message: string } | null
}

type QueryMock = {
  select: (columns: string) => QueryMock
  eq: (column: string, value: unknown) => QueryMock
  maybeSingle: () => Promise<TableResult>
}

function client({
  userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  tables = {},
}: {
  userId?: string | null
  tables?: Record<string, TableResult>
}) {
  const from = vi.fn((table: string) => {
    const query = {} as QueryMock
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.maybeSingle = vi
      .fn()
      .mockResolvedValue(tables[table] ?? { data: null, error: null })
    return query
  })
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from,
  } as unknown as SupabaseClient
}

const sessionId = '11111111-1111-1111-1111-111111111111'

describe('getReaderSession', () => {
  it('returns unauthenticated without querying session data', async () => {
    const supabase = client({ userId: null })

    await expect(getReaderSession(supabase, sessionId)).resolves.toEqual({
      status: 'unauthenticated',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rejects a malformed UUID before querying tables', async () => {
    const supabase = client({})

    await expect(getReaderSession(supabase, 'not-a-uuid')).resolves.toEqual({
      status: 'not_found',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns not found when RLS hides another user session', async () => {
    const supabase = client({
      tables: { reading_sessions: { data: null, error: null } },
    })

    await expect(getReaderSession(supabase, sessionId)).resolves.toEqual({
      status: 'not_found',
    })
  })

  it('loads the owned session, assignment, and active plan', async () => {
    const supabase = client({
      tables: {
        reading_sessions: {
          data: {
            id: sessionId,
            daily_assignment_id:
              '22222222-2222-2222-2222-222222222222',
            session_order: 2,
            start_page: 17,
            end_page: 18,
            status: 'in_progress',
            last_opened_page: 18,
            first_opened_at: '2026-07-26T08:00:00Z',
            last_opened_at: '2026-07-26T08:05:00Z',
          },
          error: null,
        },
        daily_assignments: {
          data: {
            id: '22222222-2222-2222-2222-222222222222',
            reading_plan_id:
              '33333333-3333-3333-3333-333333333333',
            local_date: '2026-07-26',
            status: 'pending',
          },
          error: null,
        },
        reading_plans: {
          data: {
            id: '33333333-3333-3333-3333-333333333333',
            current_unread_page: 17,
          },
          error: null,
        },
      },
    })

    const result = await getReaderSession(supabase, sessionId)

    expect(result).toMatchObject({
      status: 'success',
      session: {
        id: sessionId,
        startPage: 17,
        endPage: 18,
        lastOpenedPage: 18,
        currentUnreadPage: 17,
      },
    })
    expect(supabase.from).toHaveBeenCalledWith('reading_sessions')
    expect(supabase.from).toHaveBeenCalledWith('daily_assignments')
    expect(supabase.from).toHaveBeenCalledWith('reading_plans')
  })

  it('never exposes a raw database error', async () => {
    const supabase = client({
      tables: {
        reading_sessions: {
          data: null,
          error: { message: 'SQLSTATE 42702 secret table details' },
        },
      },
    })

    const result = await getReaderSession(supabase, sessionId)

    expect(result.status).toBe('error')
    expect(JSON.stringify(result)).not.toMatch(/SQLSTATE|42702|secret table/)
  })
})
