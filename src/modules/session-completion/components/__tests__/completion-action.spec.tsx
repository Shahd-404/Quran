import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompletionAction } from '../completion-action'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

describe('CompletionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a separate explicit confirmation before calling the server', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<CompletionAction sessionId="session-1" />)

    fireEvent.click(
      screen.getByRole('button', { name: 'أتممت قراءة الجلسة' }),
    )

    expect(
      screen.getByText('هل أتممت قراءة جميع صفحات هذه الجلسة؟'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('disables both actions while pending and prevents duplicate submission', async () => {
    const fetchMock = vi.fn(
      () => new Promise<Response>(() => undefined),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<CompletionAction sessionId="session-1" />)

    fireEvent.click(
      screen.getByRole('button', { name: 'أتممت قراءة الجلسة' }),
    )
    const confirm = screen.getByRole('button', {
      name: 'نعم، أتممت القراءة',
    })
    fireEvent.click(confirm)

    expect(
      await screen.findByRole('button', { name: 'جارٍ تسجيل الإكمال…' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'العودة للقراءة' }),
    ).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: 'جارٍ تسجيل الإكمال…' }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshes trusted dashboard data after success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }),
    )
    render(<CompletionAction sessionId="session-1" />)

    fireEvent.click(
      screen.getByRole('button', { name: 'أتممت قراءة الجلسة' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'نعم، أتممت القراءة' }),
    )

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/app?sessionCompleted=1'),
    )
    expect(refresh).toHaveBeenCalled()
  })

  it('shows a focusable safe error and never exposes the server payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: 'SQLSTATE 23505 secret database row',
        }),
      }),
    )
    render(<CompletionAction sessionId="session-1" />)

    fireEvent.click(
      screen.getByRole('button', { name: 'أتممت قراءة الجلسة' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'نعم، أتممت القراءة' }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'تعذّر تسجيل إكمال الجلسة الآن. بقيت الجلسة دون تغيير',
    )
    await waitFor(() => expect(alert).toHaveFocus())
    expect(document.body).not.toHaveTextContent(/SQLSTATE|23505|secret/)
  })
})
