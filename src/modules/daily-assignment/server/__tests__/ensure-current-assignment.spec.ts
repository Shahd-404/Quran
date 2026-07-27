import { describe, it, expect, vi } from 'vitest'
import { ensureCurrentAssignment } from '../ensure-current-assignment'
import { codeToArabic } from '../error-mapping'

const mockClient = () => ({ rpc: vi.fn() });

describe('ensureCurrentAssignment', () => {
  it('returns success when RPC returns a row', async () => {
    const client = mockClient();
    const fake = [{ assignment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', local_date: '2026-07-26', created_now: true, carried_over: false, target_pages: 3, session_count: 3 }];
    (client.rpc as any).mockResolvedValue({ data: fake, error: null })

    const res = await ensureCurrentAssignment(client as any)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.assignmentId).toBe(fake[0].assignment_id)
      expect(res.localDate).toBe(fake[0].local_date)
      expect(res.createdNow).toBe(true)
      expect(res.carriedOver).toBe(false)
    }
  })

  it('maps RPC errors to machine codes and Arabic messages', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'ACTIVE_PLAN_NOT_FOUND' } })
    const res = await ensureCurrentAssignment(client as any)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('ACTIVE_PLAN_NOT_FOUND')
      expect(res.message).toBe(codeToArabic('ACTIVE_PLAN_NOT_FOUND') || 'لا توجد خطة ورد نشطة.')
    }
  })
})
