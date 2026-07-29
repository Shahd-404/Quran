import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HistoryPage } from '../history-page'
import { ReadingHistoryModel } from '../../types'

function model(): ReadingHistoryModel {
  const event = {
    id: 'event-1',
    readingSessionId: 'session-1',
    readingPlanId: 'plan-1',
    khatmaId: 'khatma-active',
    assignmentId: 'assignment-1',
    sessionOrder: 1,
    startPage: 17,
    endPage: 18,
    pageCount: 2,
    completedAt: '2026-07-26T05:24:00Z',
    localDate: '2026-07-26',
    timezone: 'Africa/Cairo',
    formattedCompletionTime: '٨:٢٤ ص',
  }
  return {
    totalCompletedPages: 590,
    totalCompletedSessions: 201,
    totalCompletedKhatmas: 1,
    currentKhatma: {
      id: 'khatma-active',
      readingPlanId: 'plan-active',
      cycleNumber: 2,
      status: 'active',
      startPage: 1,
      startedAt: '2026-07-27T00:00:00Z',
      completedAt: null,
      timezone: 'Africa/Cairo',
      currentUnreadPage: 19,
      completedPages: 18,
      completedSessions: 7,
      totalPages: 604,
      percentage: 3,
      formattedStartDate: '٢٧ يوليو ٢٠٢٦',
      formattedCompletionDate: null,
    },
    completedKhatmas: [
      {
        id: 'khatma-completed',
        readingPlanId: 'plan-completed',
        cycleNumber: 1,
        status: 'completed',
        startPage: 17,
        startedAt: '2026-01-01T00:00:00Z',
        completedAt: '2026-07-26T10:00:00Z',
        timezone: 'Africa/Cairo',
        currentUnreadPage: 604,
        completedPages: 588,
        completedSessions: 194,
        totalPages: 588,
        percentage: 100,
        formattedStartDate: '١ يناير ٢٠٢٦',
        formattedCompletionDate: '٢٦ يوليو ٢٠٢٦',
      },
    ],
    recentCompletedSessions: [event],
    dayGroups: [
      {
        localDate: '2026-07-26',
        formattedDate: 'الأحد، ٢٦ يوليو ٢٠٢٦',
        totalPages: 2,
        sessionCount: 1,
        events: [event],
      },
    ],
    pagination: {
      page: 1,
      pageSize: 20,
      totalEvents: 21,
      totalPages: 2,
      hasPrevious: false,
      hasNext: true,
    },
  }
}

describe('HistoryPage', () => {
  it('renders totals, current khatma, archive, ranges, and pagination', () => {
    render(<HistoryPage data={model()} />)

    expect(
      screen.getByRole('heading', { name: 'سجل القراءة' }),
    ).toBeInTheDocument()
    const summary = screen.getByLabelText('ملخص سجل القراءة')
    expect(summary).toHaveTextContent('٥٩٠')
    expect(summary).toHaveTextContent('٢٠١')
    expect(summary).toHaveTextContent('١')
    expect(screen.getByText('الختمة الحالية')).toBeInTheDocument()
    expect(screen.getByText('الختمات السابقة')).toBeInTheDocument()
    expect(screen.getByText('الصفحات ١٧–١٨')).toBeInTheDocument()
    expect(screen.getByText(/اكتملت الساعة ٨:٢٤ ص/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'التالي' }),
    ).toHaveAttribute('href', '/app/history?page=2')
    expect(
      screen.getByText('السابق').closest('[aria-disabled="true"]'),
    ).not.toBeNull()
    expect(
      screen.getAllByRole('link', { name: 'عرض تفاصيل الختمة' }),
    ).toHaveLength(2)
  })

  it('renders calm empty states without edit or delete actions', () => {
    const data = model()
    data.totalCompletedPages = 0
    data.totalCompletedSessions = 0
    data.totalCompletedKhatmas = 0
    data.currentKhatma = null
    data.completedKhatmas = []
    data.recentCompletedSessions = []
    data.dayGroups = []
    data.pagination = {
      page: 1,
      pageSize: 20,
      totalEvents: 0,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    }

    render(<HistoryPage data={data} />)

    expect(
      screen.getByText(
        'سيظهر هنا سجل جلساتك بعد إكمال أول جلسة قراءة.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('لا توجد ختمات مكتملة بعد')).toBeInTheDocument()
    expect(
      screen.getByText('ستظهر هنا عند إكمال أول ختمة بإذن الله.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /حذف|تعديل/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the current khatma with a compact horizontal progress bar', () => {
    render(<HistoryPage data={model()} />)

    const progress = screen.getByRole('progressbar', {
      name: 'نسبة تقدم الختمة الحالية',
    })
    expect(progress).toHaveClass('h-2.5', 'w-full')
    expect(progress).toHaveAttribute('aria-valuenow', '3')
    const currentCard = screen.getByText('الختمة الحالية').closest('section')
    expect(currentCard).not.toBeNull()
    expect(within(currentCard as HTMLElement).getByText('١٩')).toBeInTheDocument()
  })

  it('links back to the previous event page', () => {
    const data = model()
    data.pagination = {
      page: 2,
      pageSize: 20,
      totalEvents: 21,
      totalPages: 2,
      hasPrevious: true,
      hasNext: false,
    }

    render(<HistoryPage data={data} />)

    expect(
      screen.getByRole('link', { name: 'السابق' }),
    ).toHaveAttribute('href', '/app/history')
    expect(
      screen.getByText('التالي').closest('[aria-disabled="true"]'),
    ).not.toBeNull()
  })
})
