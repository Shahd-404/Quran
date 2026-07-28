import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import RegisterPage from './page'

const confirmationSuccess = {
  ok: true,
  json: async () => ({
    ok: true,
    requiresEmailConfirmation: true,
  }),
}

function fillRegistrationForm(
  email = 'user@example.com',
  password = 'password123',
) {
  fireEvent.change(screen.getByLabelText('display_name'), {
    target: { value: 'مريم' },
  })
  fireEvent.change(screen.getByLabelText('email'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('password'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText('confirm'), {
    target: { value: password },
  })
}

function submitRegistration() {
  fireEvent.click(screen.getByRole('button', { name: 'إنشاء حساب' }))
}

describe('RegisterPage email confirmation flow', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the dedicated confirmation screen for successful signup with a null session', async () => {
    fetchMock.mockResolvedValue(confirmationSuccess)
    render(<RegisterPage />)
    fillRegistrationForm('reader@example.com')

    submitRegistration()

    expect(
      await screen.findByRole('heading', {
        name: 'تم إنشاء حسابك بنجاح',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'تم إنشاء حسابك بنجاح',
      }).parentElement,
    ).toHaveTextContent('أرسلنا رسالة تأكيد إلى بريدك الإلكتروني.')
    expect(
      screen.getByRole('heading', {
        name: 'تم إنشاء حسابك بنجاح',
      }).parentElement,
    ).toHaveTextContent(
      'افتحي الرسالة واضغطي على رابط التأكيد لتفعيل حسابك',
    )
    expect(screen.getByText('reader@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', {
      name: 'فتح صفحة تسجيل الدخول',
    })).toHaveAttribute('href', '/login')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('clears the password instead of retaining it after confirmation success', async () => {
    fetchMock.mockResolvedValue(confirmationSuccess)
    render(<RegisterPage />)
    fillRegistrationForm()

    submitRegistration()
    await screen.findByRole('heading', {
      name: 'تم إنشاء حسابك بنجاح',
    })

    expect(screen.queryByLabelText('password')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'تغيير البريد الإلكتروني',
      }),
    )

    expect(screen.getByLabelText('password')).toHaveValue('')
    expect(screen.getByLabelText('confirm')).toHaveValue('')
  })

  it('resends only after an explicit click and starts a cooldown', async () => {
    fetchMock
      .mockResolvedValueOnce(confirmationSuccess)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
    render(<RegisterPage />)
    fillRegistrationForm('resend@example.com')

    submitRegistration()
    const resendButton = await screen.findByRole('button', {
      name: 'إعادة إرسال رسالة التأكيد',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.click(resendButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/resend-confirmation',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'resend@example.com' }),
      }),
    )
    expect(
      await screen.findByText(
        'إذا كان البريد بحاجة إلى تأكيد، فقد أرسلنا رسالة جديدة.',
      ),
    ).toBeInTheDocument()

    const cooldownButton = screen.getByRole('button', {
      name: /إعادة الإرسال بعد 60 ثانية/,
    })
    expect(cooldownButton).toBeDisabled()
    fireEvent.click(cooldownButton)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate registration submissions while the first request is pending', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined))
    render(<RegisterPage />)
    fillRegistrationForm()

    const form = screen.getByRole('button', {
      name: 'إنشاء حساب',
    }).closest('form')
    expect(form).not.toBeNull()

    fireEvent.submit(form!)
    fireEvent.submit(form!)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', {
        name: 'جارٍ إنشاء الحساب...',
      }),
    ).toBeDisabled()
  })

  it('redirects to /app only for immediate signup with a session', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        requiresEmailConfirmation: false,
      }),
    })
    render(<RegisterPage />)
    fillRegistrationForm()

    submitRegistration()

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/app'))
    expect(
      screen.queryByText('تم إنشاء حسابك بنجاح'),
    ).not.toBeInTheDocument()
  })

  it('maps a genuine HTTP 400 to a specific safe failure without exposing raw details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        code: 'email_address_invalid',
        message:
          'RAW Supabase error with token and confirmation link',
      }),
    })
    render(<RegisterPage />)
    fillRegistrationForm()

    submitRegistration()

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'تعذر استخدام عنوان البريد الإلكتروني هذا. راجعيه ثم حاولي مرة أخرى.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('RAW Supabase')
    expect(screen.getByRole('alert')).not.toHaveTextContent('فشل التسجيل')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows the email confirmation note before submission', () => {
    render(<RegisterPage />)

    expect(
      screen.getByText(
        'بعد إنشاء الحساب، سنرسل لك رسالة لتأكيد بريدك الإلكتروني.',
      ),
    ).toBeInTheDocument()
  })
})
