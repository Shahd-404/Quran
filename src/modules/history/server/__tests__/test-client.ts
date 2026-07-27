import { SupabaseClient } from '@supabase/supabase-js'
import { vi } from 'vitest'

export type QueryResponse = {
  data: unknown
  error: { message: string } | null
  count?: number | null
}

export function createHistoryClient({
  authenticated = true,
  summary = {
    data: [
      {
        total_completed_pages: 5,
        total_completed_sessions: 2,
        total_completed_khatmas: 1,
      },
    ],
    error: null,
  },
  archive = { data: [], error: null },
  details = { data: [], error: null },
  events = { data: [], error: null, count: 0 },
}: {
  authenticated?: boolean
  summary?: QueryResponse
  archive?: QueryResponse
  details?: QueryResponse
  events?: QueryResponse
} = {}) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue(events),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: authenticated ? { id: 'user-1' } : null,
        },
        error: authenticated ? null : { message: 'not authenticated' },
      }),
    },
    rpc: vi.fn((name: string) => {
      if (name === 'get_reading_history_summary') {
        return Promise.resolve(summary)
      }
      if (name === 'get_khatma_history_archive') {
        return Promise.resolve(archive)
      }
      if (name === 'get_khatma_history_details') {
        return Promise.resolve(details)
      }
      return Promise.resolve({
        data: null,
        error: { message: 'unexpected RPC' },
      })
    }),
    from: vi.fn().mockReturnValue(builder),
  }

  return {
    client: client as unknown as SupabaseClient,
    rpc: client.rpc,
    from: client.from,
    builder,
  }
}

export const KHATMA_ID = '11111111-1111-1111-1111-111111111111'
export const OTHER_KHATMA_ID =
  '22222222-2222-2222-2222-222222222222'

export function historyEvent({
  id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  sessionId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  khatmaId = KHATMA_ID,
  sessionOrder = 1,
  startPage = 17,
  endPage = 18,
  completedAt = '2026-07-26T05:24:00Z',
  localDate = '2026-07-26',
}: {
  id?: string
  sessionId?: string
  khatmaId?: string
  sessionOrder?: number
  startPage?: number
  endPage?: number
  completedAt?: string
  localDate?: string | null
} = {}) {
  return {
    id,
    reading_session_id: sessionId,
    reading_plan_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    khatma_id: khatmaId,
    daily_assignment_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    start_page: startPage,
    end_page: endPage,
    completed_at: completedAt,
    daily_assignments: {
      local_date: localDate,
      timezone: 'Africa/Cairo',
    },
    reading_sessions: { session_order: sessionOrder },
    reading_plans: { timezone: 'Africa/Cairo' },
  }
}

export function khatmaRow({
  id = KHATMA_ID,
  status = 'active',
}: {
  id?: string
  status?: 'active' | 'completed'
} = {}) {
  return {
    khatma_id: id,
    reading_plan_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    cycle_number: status === 'active' ? 2 : 1,
    khatma_status: status,
    start_page: 17,
    started_at: '2026-07-01T00:00:00Z',
    completed_at:
      status === 'completed' ? '2026-07-26T10:00:00Z' : null,
    timezone: 'Africa/Cairo',
    current_unread_page: status === 'active' ? 22 : 604,
    completed_pages: status === 'active' ? 5 : 588,
    completed_sessions: status === 'active' ? 2 : 200,
  }
}
