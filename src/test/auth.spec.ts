import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase/proxy', () => ({
  refreshSession: vi.fn(() => ({ user: null, profile: null })),
}))
vi.mock('../lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import * as registerRoute from '../app/api/auth/register/route'
import * as loginRoute from '../app/api/auth/login/route'
import { createServerClient } from '../lib/supabase/server'
import { middleware } from '../middleware'

const mockedCreateServerClient = vi.mocked(createServerClient)

function jsonRequest(url: string, body: unknown, origin = 'http://localhost') {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

describe('Auth routes and middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns validation error when registering without email/password', async () => {
    const req = jsonRequest('http://localhost/api/auth/register', {})
    const res = await registerRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.message).toMatch(/يرجى تقديم/)
  })

  it('returns validation error when password too short', async () => {
    const body = { email: 'a@b.com', password: 'short' }
    const req = jsonRequest('http://localhost/api/auth/register', body)
    const res = await registerRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.message).toMatch(/8 أحرف/)
  })

  it('returns validation error when logging in without credentials', async () => {
    const req = jsonRequest('http://localhost/api/auth/login', {})
    const res = await loginRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.message).toMatch(/يرجى تقديم/)
  })

  it('returns ok JSON on successful login', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn(async () => ({ data: { user: { id: '123' } }, error: null }))
      }
    } as any)

    const req = jsonRequest('http://localhost/api/auth/login', {
      email: 'user@example.com',
      password: 'password123',
    })
    const res = await loginRoute.POST(req as any)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })

  it('rejects a cross-origin login before accessing authentication', async () => {
    const req = jsonRequest(
      'http://localhost/api/auth/login',
      { email: 'user@example.com', password: 'password123' },
      'https://attacker.example',
    )
    const res = await loginRoute.POST(req as any)

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'CROSS_ORIGIN_REQUEST' })
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
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
