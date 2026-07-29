import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlanSettingsForm } from '../plan-settings-form'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

const current = {
  planId: 'plan-1',
  currentUnreadPage: 42,
  dailyPages: 4,
  sessionsPerDay: 2,
  timezone: 'Africa/Cairo',
  effectiveFrom: '2026-07-26',
  schedules: [
    { sessionOrder: 1, scheduledTime: '08:00' },
    { sessionOrder: 2, scheduledTime: '18:00' },
  ],
}

function openReview() {
  fireEvent.change(screen.getByLabelText('عدد صفحات الورد اليومية'), {
    target: { value: '6' },
  })
  fireEvent.change(screen.getByLabelText('عدد الجلسات اليومية'), {
    target: { value: '3' },
  })
  fireEvent.change(screen.getByLabelText('وقت الجلسة ١'), {
    target: { value: '06:00' },
  })
  fireEvent.change(screen.getByLabelText('وقت الجلسة ٢'), {
    target: { value: '12:00' },
  })
  fireEvent.change(screen.getByLabelText('وقت الجلسة ٣'), {
    target: { value: '20:00' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'مراجعة التعديلات' }))
}

describe('PlanSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows current values, a distribution preview, and the cancel action', () => {
    render(<PlanSettingsForm current={current} />)

    expect(screen.getByLabelText('عدد صفحات الورد اليومية')).toHaveValue(4)
    expect(screen.getByLabelText('عدد الجلسات اليومية')).toHaveValue(2)
    expect(screen.getByLabelText('وقت الجلسة ١')).toHaveValue('08:00')
    expect(screen.getByText('توزيع صفحات أول ورد جديد')).toBeInTheDocument()
    expect(screen.getByText(/الصفحات ٤٢–٤٣/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'إلغاء والعودة' })).toHaveAttribute(
      'href',
      '/app',
    )
  })

  it('rejects invalid daily pages before review', () => {
    render(<PlanSettingsForm current={current} />)

    fireEvent.change(screen.getByLabelText('عدد صفحات الورد اليومية'), {
      target: { value: '605' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة التعديلات' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'عدد الصفحات اليومية يجب أن يكون بين 1 و 604.',
    )
    expect(
      screen.queryByRole('heading', { name: 'الإعدادات القديمة والجديدة' }),
    ).not.toBeInTheDocument()
  })

  it('renders exactly one time input per session and rejects sessions above pages', () => {
    render(<PlanSettingsForm current={current} />)

    fireEvent.change(screen.getByLabelText('عدد الجلسات اليومية'), {
      target: { value: '3' },
    })
    expect(screen.getAllByLabelText(/وقت الجلسة/)).toHaveLength(3)

    fireEvent.change(screen.getByLabelText('عدد صفحات الورد اليومية'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة التعديلات' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'عدد الجلسات لا يجب أن يتجاوز الصفحات اليومية.',
    )
  })

  it('shows a duplicate-time error without silently sorting values', () => {
    render(<PlanSettingsForm current={current} />)

    fireEvent.change(screen.getByLabelText('وقت الجلسة ٢'), {
      target: { value: '08:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة التعديلات' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'يجب ألا تتكرر أوقات الجلسات.',
    )
    expect(screen.getByLabelText('وقت الجلسة ١')).toHaveValue('08:00')
    expect(screen.getByLabelText('وقت الجلسة ٢')).toHaveValue('08:00')
  })

  it('shows a chronological-time error without silently sorting values', () => {
    render(<PlanSettingsForm current={current} />)

    fireEvent.change(screen.getByLabelText('وقت الجلسة ١'), {
      target: { value: '20:00' },
    })
    fireEvent.change(screen.getByLabelText('وقت الجلسة ٢'), {
      target: { value: '06:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة التعديلات' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'يجب أن تكون أوقات الجلسات متزايدة زمنياً.',
    )
    expect(screen.getByLabelText('وقت الجلسة ١')).toHaveValue('20:00')
    expect(screen.getByLabelText('وقت الجلسة ٢')).toHaveValue('06:00')
  })

  it('previews the new distribution and reviews old and new settings', () => {
    render(<PlanSettingsForm current={current} />)

    openReview()

    expect(screen.getByRole('heading', { name: 'الإعدادات القديمة والجديدة' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'الإعدادات الحالية' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'الإعدادات الجديدة' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'التوزيع المتوقع للورد القادم' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/الصفحات ٤٢–٤٣/)).toBeInTheDocument()
    expect(
      screen.getByText(
        'سيتم تطبيق التعديلات على الورد القادم، ولن يتغير الورد الحالي.',
      ),
    ).toBeInTheDocument()
  })

  it('requires the explicit confirmation action before sending an update', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<PlanSettingsForm current={current} />)

    openReview()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'حفظ تعديلات الخطة' }),
    ).toBeInTheDocument()
  })

  it('updates the completion estimate before saving without a mutation', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<PlanSettingsForm current={current} />)

    expect(screen.getByText(/خلال ١٤١ يومًا/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('عدد صفحات الورد اليومية'), {
      target: { value: '6' },
    })

    expect(screen.getByText(/خلال ٩٤ يومًا/)).toBeInTheDocument()
    expect(
      screen.getByText(
        'تغيير عدد الصفحات سيغيّر موعد الختم المتوقع للأيام القادمة فقط.',
      ),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('saves only editable configuration and redirects with success feedback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          planId: 'plan-1',
          dailyPages: 6,
          sessionsPerDay: 3,
          updatedAt: '2026-07-27T10:00:00Z',
        }),
      }),
    )
    render(<PlanSettingsForm current={current} />)
    openReview()

    fireEvent.click(screen.getByRole('button', { name: 'حفظ تعديلات الخطة' }))

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/app?planUpdated=1'),
    )
    expect(fetch).toHaveBeenCalledWith('/api/reading-plan/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyPages: 6,
        sessions: [
          { sessionOrder: 1, scheduledTime: '06:00' },
          { sessionOrder: 2, scheduledTime: '12:00' },
          { sessionOrder: 3, scheduledTime: '20:00' },
        ],
      }),
    })
    expect(refresh).toHaveBeenCalled()
  })

  it('keeps the review usable after a safe recoverable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          success: false,
          code: 'INVALID_SCHEDULE',
          message: 'يجب أن تكون مواعيد الجلسات صحيحة، مختلفة، ومتزايدة زمنيًا.',
        }),
      }),
    )
    render(<PlanSettingsForm current={current} />)
    openReview()

    fireEvent.click(screen.getByRole('button', { name: 'حفظ تعديلات الخطة' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'يجب أن تكون مواعيد الجلسات صحيحة',
    )
    expect(
      screen.getByRole('button', { name: 'حفظ تعديلات الخطة' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'الإعدادات الجديدة' }).parentElement)
      .toHaveTextContent('٦ صفحات')
    expect(screen.getByRole('heading', { name: 'الإعدادات الجديدة' }).parentElement)
      .toHaveTextContent('20:00')
    expect(push).not.toHaveBeenCalled()
  })

  it('disables saving while pending and prevents duplicate submission', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
      ),
    )
    render(<PlanSettingsForm current={current} />)
    openReview()
    const save = screen.getByRole('button', { name: 'حفظ تعديلات الخطة' })

    fireEvent.click(save)
    fireEvent.click(save)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', { name: 'جارٍ حفظ التعديلات…' }),
    ).toBeDisabled()

    resolveRequest?.({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        planId: 'plan-1',
        dailyPages: 6,
        sessionsPerDay: 3,
        updatedAt: '2026-07-27T10:00:00Z',
      }),
    })
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/app?planUpdated=1'),
    )
  })
})
