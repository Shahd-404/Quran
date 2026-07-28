import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@/lib/supabase/server'
import { POST } from './route'

const mockedCreateServerClient = vi.mocked(createServerClient)

function request(body: unknown, origin = 'http://localhost') {
  return new Request('http://localhost/api/account/delete-reading-data', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

describe('POST /api/account/delete-reading-data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects cross-origin requests before authentication', async () => {
    const response = await POST(request({ confirmation: 'حذف بياناتي' }, 'https://attacker.example'))

    expect(response.status).toBe(403)
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
      rpc: vi.fn(),
    } as never)
    const response = await POST(request({ confirmation: 'حذف بياناتي' }))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects a wrong confirmation without calling the RPC', async () => {
    const rpc = vi.fn()
    mockedCreateServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } } })) },
      rpc,
    } as never)
    const response = await POST(request({ confirmation: 'حذف بيانات' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'INVALID_CONFIRMATION' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns typed aggregate counts after trusted RPC success', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } } })) },
      rpc: vi.fn(async () => ({
        data: {
          success: true,
          deleted: {
            plans_deleted: 1,
            khatmas_deleted: 1,
            schedules_deleted: 1,
            assignments_deleted: 1,
            sessions_deleted: 1,
            progress_events_deleted: 1,
            subscriptions_deleted: 1,
            deliveries_deleted: 1,
          },
        },
        error: null,
      })),
    } as never)

    const response = await POST(request({ confirmation: 'حذف بياناتي' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      code: 'READING_DATA_DELETED',
      deleted: {
        plansDeleted: 1,
        khatmasDeleted: 1,
        schedulesDeleted: 1,
        assignmentsDeleted: 1,
        sessionsDeleted: 1,
        progressEventsDeleted: 1,
        subscriptionsDeleted: 1,
        deliveriesDeleted: 1,
      },
    })
  })
})
