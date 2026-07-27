import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewKhatmaForm } from '../new-khatma-form'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

const configuration = {
  planId: 'plan-1',
  dailyPages: 6,
  sessionsPerDay: 2,
  timezone: 'Africa/Cairo',
  previousCycleNumber: 4,
  schedules: [
    { sessionOrder: 1, scheduledTime: '06:00' },
    { sessionOrder: 2, scheduledTime: '18:30' },
  ],
}

describe('NewKhatmaForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the copied configuration and both explicit choices', () => {
    render(
      <NewKhatmaForm
        configuration={configuration}
        initialEffectiveFrom="2026-07-26"
      />,
    )

    expect(screen.getByText('٦ صفحات')).toBeInTheDocument()
    expect(screen.getByText('٢ جلسات')).toBeInTheDocument()
    expect(screen.getByText('Africa/Cairo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ابدأ بنفس الخطة' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'إنشاء خطة مختلفة' })).toHaveAttribute(
      'href',
      '/app/plan/new',
    )
  })

  it('requires a second confirmation before creating the khatma', () => {
    render(
      <NewKhatmaForm
        configuration={configuration}
        initialEffectiveFrom="2026-07-26"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ بنفس الخطة' }))

    expect(
      screen.getByText(
        'هل تريد بدء ختمة جديدة من الصفحة الأولى بنفس إعدادات خطتك السابقة؟',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'نعم، ابدأ الختمة' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'العودة' })).toBeInTheDocument()
    expect(screen.getByLabelText('تاريخ بدء الخطة')).toHaveAttribute(
      'min',
      '2026-07-26',
    )
  })

  it('submits only the effective date and redirects to the dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          planId: 'plan-2',
          khatmaId: 'khatma-2',
          cycleNumber: 5,
          effectiveFrom: '2026-07-27',
        }),
      }),
    )
    render(
      <NewKhatmaForm
        configuration={configuration}
        initialEffectiveFrom="2026-07-26"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ بنفس الخطة' }))
    fireEvent.change(screen.getByLabelText('تاريخ بدء الخطة'), {
      target: { value: '2026-07-27' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'نعم، ابدأ الختمة' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'))
    expect(fetch).toHaveBeenCalledWith('/api/khatma/start-new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effectiveFrom: '2026-07-27' }),
    })
    expect(refresh).toHaveBeenCalled()
  })

  it('shows a safe API error and stays on the confirmation step', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          success: false,
          code: 'ACTIVE_PLAN_EXISTS',
          message: 'لديك ختمة نشطة بالفعل. انتقل إلى لوحة الورد لمتابعتها.',
        }),
      }),
    )
    render(
      <NewKhatmaForm
        configuration={configuration}
        initialEffectiveFrom="2026-07-26"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ بنفس الخطة' }))
    fireEvent.click(screen.getByRole('button', { name: 'نعم، ابدأ الختمة' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('لديك ختمة نشطة بالفعل')
    expect(push).not.toHaveBeenCalled()
  })

  it('disables the pending action and prevents duplicate submission', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined
    const pendingResponse = new Promise((resolve) => {
      resolveRequest = resolve
    })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingResponse))
    render(
      <NewKhatmaForm
        configuration={configuration}
        initialEffectiveFrom="2026-07-26"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ بنفس الخطة' }))
    const submit = screen.getByRole('button', { name: 'نعم، ابدأ الختمة' })

    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'جارٍ بدء الختمة…' })).toBeDisabled()

    resolveRequest?.({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        planId: 'plan-2',
        khatmaId: 'khatma-2',
        cycleNumber: 5,
        effectiveFrom: '2026-07-26',
      }),
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'))
  })
})
