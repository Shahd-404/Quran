import { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeReadingSession } from '../complete-reading-session'

const sessionId = '11111111-1111-1111-1111-111111111111'

function createClient(data: unknown, error: unknown = null): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as unknown as SupabaseClient
}

function completionRow(overrides: Record<string, unknown> = {}) {
  return {
    session_id: sessionId,
    session_completed: true,
    assignment_completed: false,
    khatma_completed: false,
    plan_completed: false,
    current_unread_page: 19,
    already_completed: false,
    ...overrides,
  }
}

describe('completeReadingSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a validated typed success response', async () => {
    const client = createClient([completionRow()])

    await expect(
      completeReadingSession(client, sessionId),
    ).resolves.toEqual({
      success: true,
      sessionId,
      sessionCompleted: true,
      assignmentCompleted: false,
      khatmaCompleted: false,
      planCompleted: false,
      currentUnreadPage: 19,
      alreadyCompleted: false,
    })
    expect(client.rpc).toHaveBeenCalledWith('complete_reading_session', {
      p_session_id: sessionId,
    })
  })

  it('accepts the RPC idempotent-success response', async () => {
    const result = await completeReadingSession(
      createClient([
        completionRow({
          assignment_completed: true,
          already_completed: true,
        }),
      ]),
      sessionId,
    )

    expect(result).toMatchObject({
      success: true,
      alreadyCompleted: true,
      assignmentCompleted: true,
    })
  })

  it('uses the offline receipt RPC for a valid stable action key and timestamp', async () => {
    const client = createClient([completionRow()])
    const occurredAt = '2026-08-04T10:00:00.000Z'
    const idempotencyKey = '33333333-3333-4333-8333-333333333333'

    await expect(
      completeReadingSession(
        client,
        sessionId,
        { idempotencyKey, occurredAt },
        new Date('2026-08-04T11:00:00.000Z'),
      ),
    ).resolves.toMatchObject({ success: true })
    expect(client.rpc).toHaveBeenCalledWith('complete_offline_reading_session', {
      p_session_id: sessionId,
      p_idempotency_key: idempotencyKey,
      p_occurred_at: occurredAt,
    })
  })

  it('rejects a stale or malformed offline action before calling the RPC', async () => {
    const client = createClient([completionRow()])
    const result = await completeReadingSession(
      client,
      sessionId,
      { idempotencyKey: 'not-a-uuid', occurredAt: '2026-07-01T10:00:00.000Z' },
      new Date('2026-08-04T11:00:00.000Z'),
    )

    expect(result).toMatchObject({ success: false, code: 'OFFLINE_ACTION_INVALID' })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('maps known errors to safe Arabic without raw SQL leakage', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = await completeReadingSession(
      createClient(null, {
        code: 'P0001',
        message: 'SESSION_NOT_FOUND SQLSTATE secret-row',
      }),
      sessionId,
    )

    expect(result).toEqual({
      success: false,
      code: 'SESSION_NOT_FOUND',
      message: 'تعذّر العثور على جلسة الورد المطلوبة.',
    })
    expect(JSON.stringify(result)).not.toMatch(/SQLSTATE|secret-row/)
  })

  it('rejects malformed responses and out-of-range frontiers safely', async () => {
    const result = await completeReadingSession(
      createClient([completionRow({ current_unread_page: 605 })]),
      sessionId,
    )

    expect(result).toMatchObject({
      success: false,
      code: 'INTERNAL_ERROR',
    })
  })

  it('does not call the RPC for a malformed session id', async () => {
    const client = createClient([])
    const result = await completeReadingSession(client, 'not-a-uuid')

    expect(result).toMatchObject({
      success: false,
      code: 'SESSION_NOT_FOUND',
    })
    expect(client.rpc).not.toHaveBeenCalled()
  })
})
