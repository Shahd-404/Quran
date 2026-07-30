import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@/lib/supabase/server'
import { POST } from './route'

const mockedCreateServerClient = vi.mocked(createServerClient)

function recoveryRequest(email: string) {
  return new Request(
    'https://quran-seven-lyart.vercel.app/api/auth/forgot-password',
    {
      method: 'POST',
      headers: {
        origin: 'https://quran-seven-lyart.vercel.app',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email }),
    },
  )
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv(
      'NEXT_PUBLIC_SITE_URL',
      'https://quran-seven-lyart.vercel.app',
    )
  })

  it('uses the exact trusted production reset destination', async () => {
    const resetPasswordForEmail = vi.fn(async () => ({
      data: {},
      error: null,
    }))
    mockedCreateServerClient.mockResolvedValue({
      auth: { resetPasswordForEmail },
    })

    const response = await POST(recoveryRequest('reader@example.com'))

    expect(response.status).toBe(200)
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'reader@example.com',
      {
        redirectTo:
          'https://quran-seven-lyart.vercel.app/auth/reset-password',
      },
    )
  })

  it('returns the same generic response for known and unknown emails', async () => {
    const resetPasswordForEmail = vi
      .fn()
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({
        data: {},
        error: {
          code: 'user_not_found',
          message: 'This email has no account',
        },
      })
    mockedCreateServerClient.mockResolvedValue({
      auth: { resetPasswordForEmail },
    })

    const known = await POST(recoveryRequest('known@example.com'))
    const unknown = await POST(recoveryRequest('unknown@example.com'))
    const knownBody = await known.json()
    const unknownBody = await unknown.json()

    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(knownBody).toEqual(unknownBody)
    expect(knownBody).toEqual({
      ok: true,
      message:
        'إذا كان هناك حساب مرتبط بهذا البريد، فستصلك رسالة لتغيير كلمة المرور.',
    })
    expect(JSON.stringify(unknownBody)).not.toContain('no account')
  })

  it('maps rate limits to a stable safe response', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: {
        resetPasswordForEmail: vi.fn(async () => ({
          data: {},
          error: {
            code: 'over_email_send_rate_limit',
            message: 'raw provider diagnostics',
          },
        })),
      },
    })

    const response = await POST(recoveryRequest('reader@example.com'))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body).toEqual({
      ok: false,
      code: 'rate_limited',
      message:
        'تم طلب رسائل كثيرة مؤخرًا.\nانتظري قليلًا ثم حاولي مرة أخرى.',
    })
    expect(JSON.stringify(body)).not.toContain('raw provider')
  })

  it('hides unexpected provider failures behind a stable response', async () => {
    mockedCreateServerClient.mockResolvedValue({
      auth: {
        resetPasswordForEmail: vi.fn(async () => ({
          data: {},
          error: {
            code: 'provider_failure',
            message: 'sensitive upstream diagnostics',
          },
        })),
      },
    })

    const response = await POST(recoveryRequest('reader@example.com'))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      ok: false,
      code: 'unexpected_failure',
    })
    expect(JSON.stringify(body)).not.toContain('sensitive upstream')
  })

  it('rejects invalid email syntax before calling Supabase', async () => {
    const response = await POST(recoveryRequest('invalid-email'))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      ok: false,
      code: 'invalid_email',
    })
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })

  it('does not derive redirects from the request host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'javascript:alert(1)')

    const response = await POST(recoveryRequest('reader@example.com'))

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      ok: false,
      code: 'invalid_redirect_url',
    })
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })
})
