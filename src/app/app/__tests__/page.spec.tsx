import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboardData } from '@/modules/dashboard/server/get-dashboard-data'
import AppPage from '../page'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn().mockResolvedValue({}) }))
vi.mock('@/modules/dashboard/server/get-dashboard-data', () => ({ getDashboardData: vi.fn() }))
vi.mock('next/headers', () => ({ headers: () => new Headers() }))
vi.mock('next/server', () => ({ NextResponse: class NextResponse extends Response {} }))
vi.mock('@/components/logout-button', () => ({ default: () => 'تسجيل الخروج' }))

describe('AppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the create-plan state when no active plan exists', async () => {
    vi.mocked(getDashboardData).mockResolvedValue({
      status: 'no_active_plan',
      displayName: 'مريم',
    })

    const html = renderToStaticMarkup(await AppPage({}))

    expect(html).toContain('أنشئ خطة وردك')
    expect(html).toContain('مريم')
  })

  it('renders the safe assignment error state', async () => {
    vi.mocked(getDashboardData).mockResolvedValue({
      status: 'error',
      displayName: 'مريم',
      code: 'ASSIGNMENT_GENERATION_FAILED',
      message: 'تعذّر تجهيز ورد اليوم. حاولي مرة أخرى.',
    })

    const html = renderToStaticMarkup(await AppPage({}))

    expect(html).toContain('تعذّر عرض لوحة الورد')
    expect(html).not.toContain('SQLSTATE')
  })

  it('renders the dedicated completion state', async () => {
    vi.mocked(getDashboardData).mockResolvedValue({
      status: 'completed_khatma',
      data: {
        profile: { displayName: 'مريم' },
        plan: {
          id: 'plan-1',
          dailyPageTarget: 5,
          sessionsPerDay: 2,
          timezone: 'Africa/Cairo',
        },
        khatma: {
          id: 'khatma-1',
          cycleNumber: 3,
          startPage: 1,
          completedPages: 604,
          completedAt: '2026-07-26T10:00:00Z',
          formattedCompletionDate: '٢٦ يوليو ٢٠٢٦',
        },
      },
    })

    const html = renderToStaticMarkup(await AppPage({}))

    expect(html).toContain('تمت الختمة بحمد الله')
    expect(html).toContain('/app/khatma/new')
    expect(html).not.toContain('جلسات الورد')
  })

  it('renders the future-plan state', async () => {
    vi.mocked(getDashboardData).mockResolvedValue({
      status: 'future_plan',
      data: {
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
      },
    })

    const html = renderToStaticMarkup(await AppPage({}))

    expect(html).toContain('الخطة ستبدأ في')
    expect(html).not.toContain('ابدأ القراءة')
  })
})
