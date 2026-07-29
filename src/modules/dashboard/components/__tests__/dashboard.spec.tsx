import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from '../dashboard'
import {
  CompletedKhatmaState,
  DashboardError,
  FuturePlanState,
} from '../dashboard-states'
import { DashboardModel } from '../../types'

vi.mock('@/components/logout-button', () => ({ default: () => <button>تسجيل الخروج</button> }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-26T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

function model(overrides: Partial<DashboardModel['assignment']> = {}): DashboardModel {
  const firstSession: DashboardModel['sessions'][number] = {
    id: 'session-1',
    sessionOrder: 1,
    startPage: 17,
    endPage: 18,
    pageCount: 2,
    scheduledFor: '2026-07-26T05:00:00Z',
    formattedTime: '٨:٠٠ ص',
    persistedStatus: 'pending',
    presentationState: 'available',
  }
  return {
    profile: { displayName: 'مريم' },
    plan: {
      id: 'plan-1',
      status: 'active',
      startPage: 17,
      currentUnreadPage: 17,
      dailyPageTarget: 5,
      sessionsPerDay: 3,
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-26',
    },
    khatma: {
      id: 'khatma-1',
      status: 'active',
      startPage: 17,
      completedPages: 0,
      totalPages: 588,
      percentage: 0,
    },
    assignment: {
      id: 'assignment-1',
      localDate: '2026-07-26',
      formattedDate: 'الأحد، ٢٦ يوليو ٢٠٢٦',
      targetPages: 5,
      status: 'pending',
      createdNow: false,
      carriedOver: false,
      completedPages: 0,
      percentage: 0,
      ...overrides,
    },
    sessions: [firstSession],
    highlightedSession: firstSession,
  }
}

describe('Dashboard', () => {
  it('uses the centered dashboard container and horizontal progress bars', () => {
    const { container } = render(<Dashboard data={model()} />)

    expect(container.querySelector('.max-w-5xl')).toHaveClass(
      'mx-auto',
      'w-full',
      'px-4',
      'py-6',
      'sm:px-6',
      'lg:py-10',
    )

    const progressBars = screen.getAllByRole('progressbar')
    expect(progressBars).toHaveLength(2)
    progressBars.forEach((progressBar) => {
      expect(progressBar).toHaveClass('h-2.5', 'w-full')
      expect(progressBar.querySelector('svg')).not.toBeInTheDocument()
    })
    expect(container.querySelector('.aspect-square')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'إعدادات الخطة' })).toHaveAttribute(
      'href',
      '/app/plan/settings',
    )
    expect(screen.getByRole('link', { name: 'سجل القراءة' })).toHaveAttribute(
      'href',
      '/app/history',
    )
    expect(
      screen.getAllByRole('link', { name: 'الخصوصية والبيانات' }),
    ).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: 'عرض تفاصيل الختمة' }),
    ).toHaveAttribute('href', '/app/history/khatmas/khatma-1')
  })

  it('renders zero daily progress and the informational reader action', () => {
    render(<Dashboard data={model()} />)

    expect(screen.getByRole('progressbar', { name: 'نسبة إنجاز ورد اليوم' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
    expect(screen.getAllByRole('link', { name: 'ابدأ القراءة' })[0]).toHaveAttribute(
      'href',
      '/app/read/session-1',
    )
    expect(screen.queryByText(/إكمال الجلسة/)).not.toBeInTheDocument()
  })

  it('renders the active-plan completion estimate near khatma progress', () => {
    render(<Dashboard data={model()} />)

    expect(
      screen.getByRole('heading', { name: 'موعد الختم المتوقع' }),
    ).toBeInTheDocument()
    expect(screen.getByText('باقي لكِ ٥٨٨ صفحة.')).toBeInTheDocument()
    expect(screen.getByText(/خلال ١١٨ يومًا/)).toBeInTheDocument()
    expect(screen.getByText(/موعد الختم المتوقع:/).querySelector('time'))
      .toHaveAttribute('datetime', '2026-11-20')
  })

  it('renders partial progress and the calm carried-over notice', () => {
    render(<Dashboard data={model({ completedPages: 2, percentage: 40, carriedOver: true })} />)

    expect(screen.getByRole('progressbar', { name: 'نسبة إنجاز ورد اليوم' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
    expect(screen.getByText('هذا ورد غير مكتمل من يوم سابق')).toBeInTheDocument()
  })

  it('renders 100% progress and no highlighted action when all sessions completed', () => {
    const data = model({ completedPages: 5, percentage: 100 })
    data.sessions = data.sessions.map((item) => ({
      ...item,
      persistedStatus: 'completed',
      presentationState: 'completed',
    }))
    data.highlightedSession = null
    render(<Dashboard data={data} />)

    expect(screen.getByRole('progressbar', { name: 'نسبة إنجاز ورد اليوم' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
    expect(screen.getByText('اكتمل ورد هذا اليوم')).toBeInTheDocument()
  })

  it('renders the dedicated completed-khatma state and explicit action', () => {
    render(
      <CompletedKhatmaState
        data={{
          profile: { displayName: 'مريم' },
          plan: {
            id: 'plan-1',
            dailyPageTarget: 5,
            sessionsPerDay: 3,
            timezone: 'Africa/Cairo',
          },
          khatma: {
            id: 'khatma-1',
            cycleNumber: 2,
            startPage: 17,
            completedPages: 588,
            completedAt: '2026-07-26T10:00:00Z',
            formattedCompletionDate: '٢٦ يوليو ٢٠٢٦',
          },
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'تمت الختمة بحمد الله' }),
    ).toBeInTheDocument()
    expect(screen.getByText('٢٦ يوليو ٢٠٢٦')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ابدأ ختمة جديدة' })).toHaveAttribute(
      'href',
      '/app/khatma/new',
    )
    expect(screen.getByRole('link', { name: 'سجل القراءة' })).toHaveAttribute(
      'href',
      '/app/history',
    )
    expect(
      screen.getByRole('link', { name: 'عرض تفاصيل الختمة' }),
    ).toHaveAttribute('href', '/app/history/khatmas/khatma-1')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders the future-plan state without daily reading controls', () => {
    render(
      <FuturePlanState
        data={{
          profile: { displayName: 'مريم' },
          plan: {
            id: 'plan-2',
            effectiveFrom: '2026-07-28',
            formattedEffectiveDate: 'الثلاثاء، ٢٨ يوليو ٢٠٢٦',
            currentUnreadPage: 1,
            dailyPageTarget: 5,
            sessionsPerDay: 2,
            timezone: 'Africa/Cairo',
          },
        }}
      />,
    )

    expect(screen.getByText(/الخطة ستبدأ في/)).toBeInTheDocument()
    expect(screen.getByText(/لن يُنشأ أي تكليف يومي/)).toBeInTheDocument()
    expect(screen.queryByText('ابدأ القراءة')).not.toBeInTheDocument()
  })

  it('does not render raw database details in the safe error state', () => {
    render(<DashboardError displayName={null} message="تعذّر تجهيز لوحة الورد الآن." />)

    expect(screen.getByRole('alert')).toHaveTextContent('تعذّر تجهيز لوحة الورد الآن.')
    expect(screen.queryByText(/SQLSTATE|Supabase|42702/)).not.toBeInTheDocument()
  })

  it('shows the plan-update success feedback', () => {
    render(<Dashboard data={model()} planUpdated />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'تم حفظ تعديلات الخطة',
    )
  })

  it('refreshes the plan summary without changing the current assignment card', () => {
    const data = model()
    data.plan.dailyPageTarget = 6
    data.plan.sessionsPerDay = 2

    render(<Dashboard data={data} />)

    const planSummary = screen.getByText('ملخص الخطة').closest('section')
    const assignmentCard = screen.getByText('ورد اليوم').closest('section')

    expect(planSummary).not.toBeNull()
    expect(assignmentCard).not.toBeNull()
    expect(within(planSummary as HTMLElement).getByText('٦ صفحات')).toBeInTheDocument()
    expect(within(planSummary as HTMLElement).getByText('٢ جلسات')).toBeInTheDocument()
    expect(assignmentCard).toHaveTextContent('٠من٥صفحات مكتملة')
    expect(screen.getAllByText('الصفحات ١٧–١٨')).toHaveLength(2)
    expect(
      screen.getAllByText(/موعد الجلسة: ٨:٠٠ ص/),
    ).toHaveLength(2)
  })
})
