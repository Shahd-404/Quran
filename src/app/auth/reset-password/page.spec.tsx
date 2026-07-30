import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

import { createBrowserClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'
import ResetPasswordPage from './page'

const mockedCreateBrowserClient = vi.mocked(createBrowserClient)
const mockedUseRouter = vi.mocked(useRouter)

type AuthCallback = (
  event: string,
  session: Record<string, unknown> | null,
) => void

describe('ResetPasswordPage', () => {
  let authCallback: AuthCallback | null
  let updateUser: ReturnType<typeof vi.fn>
  let signOut: ReturnType<typeof vi.fn>
  let unsubscribe: ReturnType<typeof vi.fn>
  let routerPush: ReturnType<typeof vi.fn>
  let routerRefresh: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetAllMocks()
    window.history.replaceState({}, '', '/auth/reset-password')
    authCallback = null
    updateUser = vi.fn(async () => ({ data: {}, error: null }))
    signOut = vi.fn(async () => ({ error: null }))
    unsubscribe = vi.fn()
    routerPush = vi.fn()
    routerRefresh = vi.fn()
    mockedUseRouter.mockReturnValue({
      push: routerPush,
      refresh: routerRefresh,
    } as never)
    mockedCreateBrowserClient.mockReturnValue({
      auth: {
        updateUser,
        signOut,
        onAuthStateChange: vi.fn((callback: AuthCallback) => {
          authCallback = callback
          return { data: { subscription: { unsubscribe } } }
        }),
      },
    } as unknown as ReturnType<typeof createBrowserClient>)
  })

  function emitAuth(
    event: string,
    session: Record<string, unknown> | null,
  ) {
    expect(authCallback).not.toBeNull()
    act(() => {
      authCallback?.(event, session)
    })
  }

  function enterRecoverySession() {
    emitAuth('PASSWORD_RECOVERY', { user: { id: 'controlled-user' } })
  }

  function fillPasswords(
    password = 'new-password-123',
    confirmation = password,
  ) {
    fireEvent.change(
      screen.getByLabelText('كلمة المرور الجديدة'),
      { target: { value: password } },
    )
    fireEvent.change(
      screen.getByLabelText('تأكيد كلمة المرور الجديدة'),
      { target: { value: confirmation } },
    )
  }

  it('rejects direct access even when an ordinary session exists', () => {
    render(<ResetPasswordPage />)

    emitAuth('INITIAL_SESSION', { user: { id: 'signed-in-user' } })

    expect(
      screen.getByText('تعذّر استخدام رابط الاستعادة'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      }),
    ).not.toBeInTheDocument()
  })

  it.each([
    ['expired link', 'INITIAL_SESSION'],
    ['already-used link', 'SIGNED_OUT'],
  ])('shows the same safe state for an %s', (_label, event) => {
    render(<ResetPasswordPage />)

    emitAuth(event, null)

    expect(
      screen.getByText(/انتهت صلاحية رابط تغيير كلمة المرور/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'طلب رابط استعادة جديد' }),
    ).toHaveAttribute('href', '/forgot-password')
  })

  it('shows the form only for a valid recovery session', () => {
    render(<ResetPasswordPage />)

    enterRecoverySession()

    expect(
      screen.getByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      }),
    ).toBeInTheDocument()
  })

  it('enforces password policy and matching confirmation', () => {
    render(<ResetPasswordPage />)
    enterRecoverySession()

    fillPasswords('short', 'short')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      }),
    )
    expect(
      screen.getByText(/8 أحرف على الأقل/),
    ).toBeInTheDocument()

    fillPasswords('new-password-123', 'different-password')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      }),
    )
    expect(
      screen.getByText('تأكيد كلمة المرور غير مطابق.'),
    ).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('updates the password once and clears both fields after success', async () => {
    render(<ResetPasswordPage />)
    enterRecoverySession()
    fillPasswords()

    const form = screen
      .getByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      })
      .closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledTimes(1)
    })
    expect(updateUser).toHaveBeenCalledWith({
      password: 'new-password-123',
    })
    expect(
      await screen.findByText('تم تغيير كلمة المرور بنجاح.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByDisplayValue('new-password-123'),
    ).not.toBeInTheDocument()
  })

  it('does not log or persist passwords and tokens', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    render(<ResetPasswordPage />)
    enterRecoverySession()
    fillPasswords('private-password-123')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      }),
    )
    await screen.findByText('تم تغيير كلمة المرور بنجاح.')

    expect(consoleLog).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(storageWrite).not.toHaveBeenCalled()

    consoleLog.mockRestore()
    consoleError.mockRestore()
    storageWrite.mockRestore()
  })

  it('signs out only the local recovery session before returning to login', async () => {
    render(<ResetPasswordPage />)
    enterRecoverySession()
    fillPasswords()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      }),
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'الانتقال إلى تسجيل الدخول',
      }),
    )

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
      expect(routerPush).toHaveBeenCalledWith('/login')
      expect(routerRefresh).toHaveBeenCalled()
    })
  })

  it('invalidates the form when the recovery session expires during update', async () => {
    updateUser.mockResolvedValue({
      data: {},
      error: { code: 'session_not_found', message: 'raw auth detail' },
    })
    render(<ResetPasswordPage />)
    enterRecoverySession()
    fillPasswords()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'حفظ كلمة المرور الجديدة',
      }),
    )

    expect(
      await screen.findByText('تعذّر استخدام رابط الاستعادة'),
    ).toBeInTheDocument()
    expect(screen.queryByText('raw auth detail')).not.toBeInTheDocument()
  })
})
