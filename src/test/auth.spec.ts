import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as registerRoute from '../app/api/auth/register/route'
import * as loginRoute from '../app/api/auth/login/route'
import { middleware } from '../middleware'

vi.mock('@/lib/supabase/proxy', () => ({
  refreshSession: vi.fn(() => ({ user: null, profile: null })),
}))

describe('Auth routes and middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns validation error when registering without email/password', async () => {
    const req = new Request('http://localhost/api/auth/register', { method: 'POST', body: JSON.stringify({}) })
    const res = await registerRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.message).toMatch(/يرجى تقديم/)
  })

  it('returns validation error when password too short', async () => {
    const body = { email: 'a@b.com', password: 'short' }
    const req = new Request('http://localhost/api/auth/register', { method: 'POST', body: JSON.stringify(body) })
    const res = await registerRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.message).toMatch(/8 أحرف/)
  })

  it('returns validation error when logging in without credentials', async () => {
    const req = new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({}) })
    const res = await loginRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.message).toMatch(/يرجى تقديم/)
  })

  it('middleware redirects unauthenticated to /login', async () => {
    const mockReq: any = {
      nextUrl: new URL('http://localhost/app'),
      url: 'http://localhost/app',
      cookies: { get: () => null },
      headers: { get: () => null }
    }
    // ensure the mocked createMiddleware returns null to force cookie fallback
    const res = await middleware(mockReq as any)
    expect(res.status).toBe(307)
    const loc = res.headers.get('location') || ''
    expect(loc).toMatch(/\/login$/)
  })
})
