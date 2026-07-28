import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase/proxy', () => ({
  refreshSession: vi.fn(() => ({ user: null, profile: null })),
}))
vi.mock('../lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import * as registerRoute from '../app/api/auth/register/route'
import * as resendConfirmationRoute from '../app/api/auth/resend-confirmation/route'
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
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://wird.example')
  })

  it('returns validation error when registering without email/password', async () => {
    const req = jsonRequest('http://localhost/api/auth/register', {})
    const res = await registerRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json).toMatchObject({
      ok: false,
      code: 'validation_failed',
    })
  })

  it('returns validation error when password too short', async () => {
    const body = { email: 'a@b.com', password: 'short' }
    const req = jsonRequest('http://localhost/api/auth/register', body)
    const res = await registerRoute.POST(req as any)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json).toMatchObject({
      ok: false,
      code: 'weak_password',
    })
  })

  it('treats a user with a null session as successful registration without duplicating the profile trigger', async () => {
    const signUp = vi.fn(async () => ({
      data: {
        user: { id: 'new-user' },
        session: null,
      },
      error: null,
    }))
    mockedCreateServerClient.mockResolvedValue({
      auth: { signUp },
    })

    const req = jsonRequest('http://localhost/api/auth/register', {
      display_name: 'مريم',
      email: 'new@example.com',
      password: 'password123',
    })
    const res = await registerRoute.POST(req)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({
      ok: true,
      requiresEmailConfirmation: true,
    })
    expect(signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: {
        data: { display_name: 'مريم' },
        emailRedirectTo:
          'https://wird.example/login?emailConfirmed=1',
      },
    })
    expect(mockedCreateServerClient).toHaveBeenCalledTimes(1)
  })

  it('returns immediate signup success when Supabase creates a session', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: {
            user: { id: 'new-user' },
            session: { access_token: 'not-returned-to-client' },
          },
          error: null,
        })),
      },
    })

    const req = jsonRequest('http://localhost/api/auth/register', {
      email: 'new@example.com',
      password: 'password123',
    })
    const res = await registerRoute.POST(req)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({
      ok: true,
      requiresEmailConfirmation: false,
    })
  })

  it('gives an existing unconfirmed user the same private confirmation behavior', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: null, session: null },
          error: {
            code: 'user_already_exists',
            message: 'User already registered',
          },
        })),
      },
    })

    const req = jsonRequest('http://localhost/api/auth/register', {
      email: 'existing@example.com',
      password: 'password123',
    })
    const res = await registerRoute.POST(req)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      requiresEmailConfirmation: true,
    })
  })

  it('maps an email rate limit by stable code without exposing the raw Auth message', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: null, session: null },
          error: {
            code: 'over_email_send_rate_limit',
            message: 'RAW SMTP provider details must stay private',
          },
        })),
      },
    })

    const req = jsonRequest('http://localhost/api/auth/register', {
      email: 'new@example.com',
      password: 'password123',
    })
    const res = await registerRoute.POST(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json).toEqual({
      ok: false,
      code: 'over_email_send_rate_limit',
      message:
        'تم إرسال رسائل كثيرة مؤخرًا. انتظري قليلًا ثم حاولي مرة أخرى.',
    })
    expect(JSON.stringify(json)).not.toContain('RAW SMTP')
  })

  it('fails safely before signup when NEXT_PUBLIC_SITE_URL is malformed', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'javascript:alert(1)')

    const req = jsonRequest('http://localhost/api/auth/register', {
      email: 'new@example.com',
      password: 'password123',
    })
    const res = await registerRoute.POST(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toMatchObject({
      ok: false,
      code: 'invalid_redirect_url',
    })
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })

  it('does not expose unknown raw Supabase errors', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: null, session: null },
          error: {
            code: 'internal_provider_secret',
            message: 'secret provider response and confirmation URL',
          },
        })),
      },
    })

    const req = jsonRequest('http://localhost/api/auth/register', {
      email: 'new@example.com',
      password: 'password123',
    })
    const res = await registerRoute.POST(req)
    const serialized = JSON.stringify(await res.json())

    expect(res.status).toBe(502)
    expect(serialized).toContain('unexpected_failure')
    expect(serialized).not.toContain('internal_provider_secret')
    expect(serialized).not.toContain('secret provider')
    expect(serialized).not.toContain('confirmation URL')
  })

  it('resends signup confirmation only through the resend endpoint', async () => {
    const resend = vi.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    }))
    mockedCreateServerClient.mockResolvedValue({
      auth: { resend },
    })

    const req = jsonRequest(
      'http://localhost/api/auth/resend-confirmation',
      { email: 'new@example.com' },
    )
    const res = await resendConfirmationRoute.POST(req)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'new@example.com',
      options: {
        emailRedirectTo:
          'https://wird.example/login?emailConfirmed=1',
      },
    })
  })

  it('keeps resend account lookup private and maps resend rate limits safely', async () => {
    const resend = vi
      .fn()
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { code: 'user_not_found', message: 'No user' },
      })
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          code: 'over_email_send_rate_limit',
          message: 'raw rate limit diagnostics',
        },
      })
    mockedCreateServerClient.mockResolvedValue({
      auth: { resend },
    })

    const first = await resendConfirmationRoute.POST(
      jsonRequest(
        'http://localhost/api/auth/resend-confirmation',
        { email: 'unknown@example.com' },
      ),
    )
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ ok: true })

    const second = await resendConfirmationRoute.POST(
      jsonRequest(
        'http://localhost/api/auth/resend-confirmation',
        { email: 'known@example.com' },
      ),
    )
    const secondJson = await second.json()
    expect(second.status).toBe(429)
    expect(secondJson).toEqual({
      ok: false,
      code: 'over_email_send_rate_limit',
      message:
        'تم إرسال رسائل كثيرة مؤخرًا. انتظري قليلًا ثم حاولي مرة أخرى.',
    })
    expect(JSON.stringify(secondJson)).not.toContain('raw rate limit')
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
