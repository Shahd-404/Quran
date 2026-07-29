import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlanSettings } from '@/modules/reading-plan/settings/server/get-plan-settings'
import PlanSettingsPage from '../page'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/modules/reading-plan/settings/server/get-plan-settings', () => ({
  getPlanSettings: vi.fn(),
}))
vi.mock('next/headers', () => ({ headers: () => new Headers() }))
vi.mock('next/server', () => ({
  NextResponse: class NextResponse extends Response {},
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('PlanSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the settings experience with the current plan values', async () => {
    vi.mocked(getPlanSettings).mockResolvedValue({
      status: 'success',
      data: {
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
      },
    })

    const html = renderToStaticMarkup(await PlanSettingsPage())

    expect(html).toContain('تعديل الخطة')
    expect(html).toContain('عدد صفحات الورد اليومية')
    expect(html).toContain('عدد الجلسات اليومية')
    expect(html).toContain('إلغاء والعودة')
  })
})
