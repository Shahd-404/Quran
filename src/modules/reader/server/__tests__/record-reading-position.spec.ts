import { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { ReaderSession } from '../../types'
import { recordReadingPosition } from '../record-reading-position'

function session(overrides: Partial<ReaderSession> = {}): ReaderSession {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    assignmentId: '22222222-2222-2222-2222-222222222222',
    planId: '33333333-3333-3333-3333-333333333333',
    sessionOrder: 1,
    startPage: 17,
    endPage: 18,
    status: 'pending',
    lastOpenedPage: null,
    firstOpenedAt: null,
    lastOpenedAt: null,
    assignmentDate: '2026-07-26',
    assignmentStatus: 'pending',
    currentUnreadPage: 17,
    ...overrides,
  }
}

function client(error: { message: string } | null = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error }),
  } as unknown as SupabaseClient
}

describe('recordReadingPosition', () => {
  it('calls the trusted RPC when a pending session first opens', async () => {
    const supabase = client()

    await expect(
      recordReadingPosition(supabase, session(), 17),
    ).resolves.toEqual({ success: true, changed: true })
    expect(supabase.rpc).toHaveBeenCalledWith('record_reading_position', {
      p_session_id: '11111111-1111-1111-1111-111111111111',
      p_page: 17,
    })
  })

  it('avoids duplicate calls for the same in-progress page', async () => {
    const supabase = client()

    await expect(
      recordReadingPosition(
        supabase,
        session({ status: 'in_progress', lastOpenedPage: 17 }),
        17,
      ),
    ).resolves.toEqual({ success: true, changed: false })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('keeps completed sessions read-only', async () => {
    const supabase = client()

    await expect(
      recordReadingPosition(
        supabase,
        session({ status: 'completed', lastOpenedPage: 18 }),
        17,
      ),
    ).resolves.toEqual({ success: true, changed: false })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('returns a non-destructive warning without raw SQL details', async () => {
    const supabase = client({ message: 'SQLSTATE 42501 hidden details' })

    const result = await recordReadingPosition(supabase, session(), 18)

    expect(result.success).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/SQLSTATE|42501|hidden/)
  })
})
