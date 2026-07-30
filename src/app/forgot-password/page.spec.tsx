import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './page'

describe('ForgotPasswordPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits a valid normalized email and shows the generic response', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          message: 'provider response is deliberately ignored',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    render(<ForgotPasswordPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'البريد الإلكتروني' }),
      { target: { value: '  reader@example.com  ' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'إرسال رابط الاستعادة' }),
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/forgot-password',
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
          body: JSON.stringify({ email: 'reader@example.com' }),
        }),
      )
    })
    expect(
      await screen.findByText(
        'إذا كان هناك حساب مرتبط بهذا البريد، فستصلك رسالة لتغيير كلمة المرور.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/provider response/)).not.toBeInTheDocument()
  })

  it('maps rate limits without exposing raw account information', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          code: 'rate_limited',
          message: 'هذا البريد غير مسجل',
        }),
        {
          status: 429,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    render(<ForgotPasswordPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'البريد الإلكتروني' }),
      { target: { value: 'reader@example.com' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'إرسال رابط الاستعادة' }),
    )

    expect(
      await screen.findByText(/تم طلب رسائل كثيرة مؤخرًا/),
    ).toBeInTheDocument()
    expect(screen.queryByText('هذا البريد غير مسجل')).not.toBeInTheDocument()
  })

  it('shows a safe unexpected-error state without provider copy', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          code: 'unexpected_failure',
          message: 'raw provider diagnostics',
        }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    render(<ForgotPasswordPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'البريد الإلكتروني' }),
      { target: { value: 'reader@example.com' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'إرسال رابط الاستعادة' }),
    )

    expect(
      await screen.findByText(/تعذّر إرسال رابط الاستعادة الآن/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('raw provider diagnostics'),
    ).not.toBeInTheDocument()
  })

  it('prevents duplicate submissions and starts a cooldown', async () => {
    let resolveRequest!: (response: Response) => void
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve
      }),
    )
    render(<ForgotPasswordPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'البريد الإلكتروني' }),
      { target: { value: 'reader@example.com' } },
    )
    const form = screen
      .getByRole('button', { name: 'إرسال رابط الاستعادة' })
      .closest('form')
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)
    fireEvent.submit(form as HTMLFormElement)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveRequest(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /إعادة المحاولة بعد/ }),
      ).toBeDisabled()
    })
  })

  it('validates email syntax before making a request', () => {
    render(<ForgotPasswordPage />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'البريد الإلكتروني' }),
      { target: { value: 'invalid-email' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'إرسال رابط الاستعادة' }),
    )

    expect(
      screen.getByText('أدخلي عنوان بريد إلكتروني صالحًا.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
