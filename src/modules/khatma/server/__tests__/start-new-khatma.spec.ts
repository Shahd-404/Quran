import { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { startNewKhatma } from '../start-new-khatma'

function clientWithRpc(result: { data: unknown; error: unknown }): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient
}

describe('startNewKhatma', () => {
  it('calls the trusted RPC with only the effective date', async () => {
    const client = clientWithRpc({
      data: [
        {
          plan_id: 'plan-2',
          khatma_id: 'khatma-2',
          cycle_number: 3,
          effective_from: '2026-07-27',
        },
      ],
      error: null,
    })

    const result = await startNewKhatma(client, '2026-07-27')

    expect(client.rpc).toHaveBeenCalledWith(
      'start_new_khatma_from_previous_plan',
      { p_effective_from: '2026-07-27' },
    )
    expect(result).toEqual({
      success: true,
      planId: 'plan-2',
      khatmaId: 'khatma-2',
      cycleNumber: 3,
      effectiveFrom: '2026-07-27',
    })
  })

  it('rejects a malformed date before calling the database', async () => {
    const client = clientWithRpc({ data: null, error: null })

    const result = await startNewKhatma(client, '27-07-2026')

    expect(result).toMatchObject({
      success: false,
      code: 'INVALID_EFFECTIVE_DATE',
    })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('maps stable database codes to safe Arabic errors', async () => {
    const client = clientWithRpc({
      data: null,
      error: {
        code: 'P0001',
        message: 'ACTIVE_PLAN_EXISTS',
        details: null,
      },
    })

    const result = await startNewKhatma(client, '2026-07-27')

    expect(result).toMatchObject({
      success: false,
      code: 'ACTIVE_PLAN_EXISTS',
    })
    expect(JSON.stringify(result)).not.toContain('P0001')
  })

  it('rejects a malformed RPC response', async () => {
    const client = clientWithRpc({
      data: [{ plan_id: 'plan-2' }],
      error: null,
    })

    const result = await startNewKhatma(client, '2026-07-27')

    expect(result).toMatchObject({
      success: false,
      code: 'INTERNAL_ERROR',
    })
  })

  it('never exposes an unknown raw database error', async () => {
    const client = clientWithRpc({
      data: null,
      error: {
        code: '42702',
        message: 'SQLSTATE 42702 secret database details',
      },
    })

    const result = await startNewKhatma(client, '2026-07-27')

    expect(result).toMatchObject({
      success: false,
      code: 'INTERNAL_ERROR',
    })
    expect(JSON.stringify(result)).not.toContain('42702')
    expect(JSON.stringify(result)).not.toContain('secret database details')
  })
})
