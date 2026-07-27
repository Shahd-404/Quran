import { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureCurrentAssignment } from '@/modules/daily-assignment/server/ensure-current-assignment'
import { getDashboardData } from '../get-dashboard-data'

vi.mock('@/modules/daily-assignment/server/ensure-current-assignment', () => ({
  ensureCurrentAssignment: vi.fn(),
}))

type TableResponse = { data: unknown; error: { message: string } | null }
type MockOptions = {
  tables?: Partial<Record<string, TableResponse>>
  authenticated?: boolean
}

function createClient({ tables = {}, authenticated = true }: MockOptions = {}): SupabaseClient {
  const defaults: Record<string, TableResponse> = {
    profiles: { data: { display_name: 'مريم' }, error: null },
    reading_plans: {
      data: {
        id: 'plan-1',
        status: 'active',
        start_page: 17,
        current_unread_page: 20,
        daily_pages: 5,
        sessions_per_day: 3,
        timezone: 'Africa/Cairo',
        effective_from: '2026-07-26',
        completed_at: null,
      },
      error: null,
    },
    daily_assignments: {
      data: { id: 'assignment-1', local_date: '2026-07-26', target_pages: 5, status: 'pending' },
      error: null,
    },
    reading_sessions: {
      data: [
        {
          id: 'session-1',
          session_order: 1,
          start_page: 20,
          end_page: 21,
          scheduled_for: '2026-07-26T05:00:00Z',
          status: 'pending',
        },
        {
          id: 'session-2',
          session_order: 2,
          start_page: 22,
          end_page: 23,
          scheduled_for: '2026-07-26T11:00:00Z',
          status: 'pending',
        },
        {
          id: 'session-3',
          session_order: 3,
          start_page: 24,
          end_page: 24,
          scheduled_for: '2026-07-26T18:00:00Z',
          status: 'pending',
        },
      ],
      error: null,
    },
    khatmas: {
      data: {
        id: 'khatma-1',
        status: 'active',
        start_page: 17,
        cycle_number: 1,
        completed_at: null,
      },
      error: null,
    },
  }

  const responses = { ...defaults, ...tables }
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: 'user-1' } : null },
        error: authenticated ? null : { message: 'not authenticated' },
      }),
    },
    from: vi.fn((table: string) => {
      const response = responses[table]
      const builder: {
        select: ReturnType<typeof vi.fn>
        eq: ReturnType<typeof vi.fn>
        in: ReturnType<typeof vi.fn>
        maybeSingle: ReturnType<typeof vi.fn>
        order: ReturnType<typeof vi.fn>
        limit: ReturnType<typeof vi.fn>
      } = {
        select: vi.fn(),
        eq: vi.fn(),
        in: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(response),
        order: vi.fn(),
        limit: vi.fn(),
      }
      builder.select.mockReturnValue(builder)
      builder.eq.mockReturnValue(builder)
      builder.in.mockReturnValue(builder)
      builder.limit.mockReturnValue(builder)
      builder.order.mockImplementation(() =>
        table === 'reading_sessions' ? Promise.resolve(response) : builder,
      )
      return builder
    }),
  }
  return client as unknown as SupabaseClient
}

describe('getDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ensureCurrentAssignment).mockResolvedValue({
      success: true,
      assignmentId: 'assignment-1',
      localDate: '2026-07-26',
      createdNow: true,
      carriedOver: false,
      targetPages: 5,
      sessionCount: 3,
    })
  })

  it('returns no-plan state without calling the assignment RPC', async () => {
    const client = createClient({ tables: { reading_plans: { data: null, error: null } } })
    const result = await getDashboardData(client)

    expect(result).toEqual({ status: 'no_active_plan', displayName: 'مريم' })
    expect(ensureCurrentAssignment).not.toHaveBeenCalled()
  })

  it('calls the assignment RPC exactly once and returns the typed dashboard', async () => {
    const client = createClient()
    const result = await getDashboardData(client, new Date('2026-07-26T10:00:00Z'))

    expect(ensureCurrentAssignment).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.sessions.map((item) => item.pageCount)).toEqual([2, 2, 1])
      expect(result.data.highlightedSession?.id).toBe('session-1')
    }
  })

  it('loads a completed plan without generating another assignment', async () => {
    const client = createClient({
      tables: {
        reading_plans: {
          data: {
            id: 'plan-1',
            status: 'completed',
            start_page: 604,
            current_unread_page: 604,
            daily_pages: 1,
            sessions_per_day: 1,
            timezone: 'Africa/Cairo',
            effective_from: '2026-07-26',
            completed_at: '2026-07-26T10:00:00Z',
          },
          error: null,
        },
        daily_assignments: {
          data: {
            id: 'assignment-1',
            local_date: '2026-07-26',
            target_pages: 1,
            status: 'completed',
          },
          error: null,
        },
        reading_sessions: {
          data: [
            {
              id: 'session-604',
              session_order: 1,
              start_page: 604,
              end_page: 604,
              scheduled_for: '2026-07-26T05:00:00Z',
              status: 'completed',
            },
          ],
          error: null,
        },
        khatmas: {
          data: {
            id: 'khatma-1',
            status: 'completed',
            start_page: 604,
            cycle_number: 4,
            completed_at: '2026-07-26T10:00:00Z',
          },
          error: null,
        },
      },
    })

    const result = await getDashboardData(
      client,
      new Date('2026-07-26T10:00:00Z'),
    )

    expect(ensureCurrentAssignment).not.toHaveBeenCalled()
    expect(result.status).toBe('completed_khatma')
    if (result.status === 'completed_khatma') {
      expect(result.data.khatma.cycleNumber).toBe(4)
      expect(result.data.khatma.completedPages).toBe(1)
    }
  })

  it('shows a future plan without generating an assignment', async () => {
    const result = await getDashboardData(
      createClient({
        tables: {
          reading_plans: {
            data: {
              id: 'plan-future',
              status: 'active',
              start_page: 1,
              current_unread_page: 1,
              daily_pages: 6,
              sessions_per_day: 2,
              timezone: 'Africa/Cairo',
              effective_from: '2026-07-28',
              completed_at: null,
            },
            error: null,
          },
        },
      }),
      new Date('2026-07-26T10:00:00Z'),
    )

    expect(result.status).toBe('future_plan')
    expect(ensureCurrentAssignment).not.toHaveBeenCalled()
  })

  it('returns a safe assignment error without leaking a database message', async () => {
    vi.mocked(ensureCurrentAssignment).mockResolvedValue({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'تعذّر تجهيز ورد اليوم. حاولي مرة أخرى.',
    })
    const result = await getDashboardData(createClient())

    expect(result.status).toBe('error')
    expect(JSON.stringify(result)).not.toContain('SQLSTATE')
    expect(JSON.stringify(result)).not.toContain('Supabase')
  })

  it('returns a configuration error when the assignment has no sessions', async () => {
    const result = await getDashboardData(
      createClient({ tables: { reading_sessions: { data: [], error: null } } }),
    )

    expect(result).toMatchObject({ status: 'error', code: 'MISSING_SESSIONS' })
  })

  it('does not expose raw query errors', async () => {
    const result = await getDashboardData(
      createClient({
        tables: {
          daily_assignments: {
            data: null,
            error: { message: 'SQLSTATE 42702 secret database details' },
          },
        },
      }),
    )

    expect(JSON.stringify(result)).not.toContain('42702')
    expect(JSON.stringify(result)).not.toContain('secret database details')
  })
})
