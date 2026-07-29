import { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { getPlanSettings } from '../get-plan-settings'

type TableResponse = {
  data: unknown
  error: { message: string } | null
}

function createClient({
  authenticated = true,
  plan = {
    data: {
      id: 'plan-1',
      current_unread_page: 42,
      daily_pages: 5,
      sessions_per_day: 2,
      timezone: 'Africa/Cairo',
      effective_from: '2026-07-26',
    },
    error: null,
  },
  schedules = {
    data: [
      { session_order: 1, scheduled_time: '06:00:00' },
      { session_order: 2, scheduled_time: '18:30:00' },
    ],
    error: null,
  },
}: {
  authenticated?: boolean
  plan?: TableResponse
  schedules?: TableResponse
} = {}): SupabaseClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: 'user-1' } : null },
        error: authenticated ? null : { message: 'unauthenticated' },
      }),
    },
    from: vi.fn((table: string) => {
      const response = table === 'reading_plans' ? plan : schedules
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(response),
        order: vi.fn(),
      }
      builder.select.mockReturnValue(builder)
      builder.eq.mockReturnValue(builder)
      builder.limit.mockReturnValue(builder)
      builder.order.mockResolvedValue(response)
      return builder
    }),
  } as unknown as SupabaseClient
}

describe('getPlanSettings', () => {
  it('loads the current active plan and ordered schedule', async () => {
    const result = await getPlanSettings(createClient())

    expect(result).toEqual({
      status: 'success',
      data: {
        planId: 'plan-1',
        currentUnreadPage: 42,
        dailyPages: 5,
        sessionsPerDay: 2,
        timezone: 'Africa/Cairo',
        effectiveFrom: '2026-07-26',
        schedules: [
          { sessionOrder: 1, scheduledTime: '06:00' },
          { sessionOrder: 2, scheduledTime: '18:30' },
        ],
      },
    })
  })

  it('returns unauthenticated without querying plan data', async () => {
    const client = createClient({ authenticated: false })
    const result = await getPlanSettings(client)

    expect(result).toEqual({ status: 'unauthenticated' })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns no-active-plan for a user without one', async () => {
    const result = await getPlanSettings(
      createClient({ plan: { data: null, error: null } }),
    )

    expect(result).toEqual({ status: 'no_active_plan' })
  })

  it('rejects an incomplete schedule as malformed data', async () => {
    const result = await getPlanSettings(
      createClient({
        schedules: {
          data: [{ session_order: 1, scheduled_time: '06:00:00' }],
          error: null,
        },
      }),
    )

    expect(result).toEqual({ status: 'error' })
  })
})
