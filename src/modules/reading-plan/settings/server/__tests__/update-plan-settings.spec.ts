import { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { updatePlanSettings } from '../update-plan-settings'

function clientWithRpc(result: { data: unknown; error: unknown }): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient
}

const validInput = {
  dailyPages: 6,
  sessions: [
    { sessionOrder: 1, scheduledTime: '06:00' },
    { sessionOrder: 2, scheduledTime: '12:00' },
    { sessionOrder: 3, scheduledTime: '20:00' },
  ],
}

describe('updatePlanSettings', () => {
  it('calls the trusted RPC without user, plan, progress, or timezone fields', async () => {
    const client = clientWithRpc({
      data: [
        {
          plan_id: 'plan-1',
          daily_pages: 6,
          sessions_per_day: 3,
          updated_at: '2026-07-27T10:00:00Z',
        },
      ],
      error: null,
    })

    const result = await updatePlanSettings(client, validInput)

    expect(client.rpc).toHaveBeenCalledWith(
      'update_active_reading_plan',
      {
        p_daily_pages: 6,
        p_sessions: validInput.sessions,
      },
    )
    expect(result).toEqual({
      success: true,
      planId: 'plan-1',
      dailyPages: 6,
      sessionsPerDay: 3,
      updatedAt: '2026-07-27T10:00:00Z',
    })
  })

  it('rejects sessions that exceed daily pages before calling the RPC', async () => {
    const client = clientWithRpc({ data: null, error: null })

    const result = await updatePlanSettings(client, {
      dailyPages: 1,
      sessions: validInput.sessions.slice(0, 2),
    })

    expect(result).toMatchObject({
      success: false,
      code: 'INVALID_SESSIONS',
    })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects unordered times before calling the RPC', async () => {
    const client = clientWithRpc({ data: null, error: null })

    const result = await updatePlanSettings(client, {
      dailyPages: 2,
      sessions: [
        { sessionOrder: 1, scheduledTime: '20:00' },
        { sessionOrder: 2, scheduledTime: '06:00' },
      ],
    })

    expect(result).toMatchObject({
      success: false,
      code: 'INVALID_SCHEDULE',
    })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('maps stable errors to safe Arabic messages', async () => {
    const client = clientWithRpc({
      data: null,
      error: { code: 'P0001', message: 'ACTIVE_PLAN_NOT_FOUND' },
    })

    const result = await updatePlanSettings(client, validInput)

    expect(result).toMatchObject({
      success: false,
      code: 'ACTIVE_PLAN_NOT_FOUND',
    })
    expect(JSON.stringify(result)).not.toContain('P0001')
  })

  it('maps update conflicts without exposing database details', async () => {
    const client = clientWithRpc({
      data: null,
      error: {
        code: 'P0001',
        message: 'PLAN_UPDATE_CONFLICT',
        details: 'private conflicting row details',
      },
    })

    const result = await updatePlanSettings(client, validInput)

    expect(result).toMatchObject({
      success: false,
      code: 'PLAN_UPDATE_CONFLICT',
      message: 'تغيّرت الخطة أثناء الحفظ. راجع الإعدادات الحالية وحاول مرة أخرى.',
    })
    expect(JSON.stringify(result)).not.toContain('private conflicting row details')
  })

  it('does not expose unknown SQL errors', async () => {
    const client = clientWithRpc({
      data: null,
      error: {
        code: '42702',
        message: 'SQLSTATE 42702 private database detail',
      },
    })

    const result = await updatePlanSettings(client, validInput)

    expect(result).toMatchObject({
      success: false,
      code: 'INTERNAL_ERROR',
    })
    expect(JSON.stringify(result)).not.toContain('42702')
    expect(JSON.stringify(result)).not.toContain('private database detail')
  })
})
