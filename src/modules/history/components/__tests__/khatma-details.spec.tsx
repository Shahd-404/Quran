import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KhatmaDetails } from '../khatma-details'
import { KhatmaHistoryModel } from '../../types'

function data(status: 'active' | 'completed'): KhatmaHistoryModel {
  return {
    khatma: {
      id: '11111111-1111-1111-1111-111111111111',
      readingPlanId: 'plan-1',
      cycleNumber: 2,
      status,
      startPage: 17,
      startedAt: '2026-07-01T00:00:00Z',
      completedAt:
        status === 'completed' ? '2026-07-26T10:00:00Z' : null,
      timezone: 'Africa/Cairo',
      currentUnreadPage: status === 'active' ? 22 : 604,
      completedPages: status === 'completed' ? 588 : 5,
      completedSessions: status === 'completed' ? 200 : 2,
      totalPages: 588,
      percentage: status === 'completed' ? 100 : 1,
      formattedStartDate: '١ يوليو ٢٠٢٦',
      formattedCompletionDate:
        status === 'completed' ? '٢٦ يوليو ٢٠٢٦' : null,
    },
    dayGroups: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalEvents: 0,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    },
  }
}

describe('KhatmaDetails', () => {
  it('shows active progress without pretending the khatma is complete', () => {
    render(<KhatmaDetails data={data('active')} />)

    expect(screen.getByText('ختمة نشطة')).toBeInTheDocument()
    expect(screen.getByText(/ما زالت جارية/)).toBeInTheDocument()
    expect(screen.getByText('لم تكتمل بعد')).toBeInTheDocument()
    expect(
      screen.queryByText('تمت الختمة بحمد الله'),
    ).not.toBeInTheDocument()
  })

  it('shows the completed khatma state and its authoritative totals', () => {
    render(<KhatmaDetails data={data('completed')} />)

    expect(screen.getByText('تمت الختمة بحمد الله')).toBeInTheDocument()
    expect(screen.getByText('ختمة مكتملة')).toBeInTheDocument()
    expect(screen.getByText('٥٨٨')).toBeInTheDocument()
    expect(screen.getByText('٢٠٠')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'نسبة تقدم الختمة' }),
    ).toHaveAttribute('aria-valuenow', '100')
  })
})
