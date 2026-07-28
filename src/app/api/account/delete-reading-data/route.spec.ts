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
})
