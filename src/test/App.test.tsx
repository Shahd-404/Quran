import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import Home from '../components/Home'

describe('Home', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    vi.restoreAllMocks()
  })

  it('renders the Arabic product value and primary actions', () => {
    render(<Home />)
    expect(
      screen.getByRole('heading', { name: /وردك اليومي للقرآن/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ابدأ خطة وردك' })).toHaveAttribute(
      'href',
      '/register',
    )
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('renders the daily progress preview without an oversized decoration or overflow', () => {
    const { container } = render(<Home />)
    const card = screen.getByRole('region', { name: 'خمس صفحات بهدوء' })
    const percentage = within(card).getByText('٤٠٪')

    expect(card).toHaveClass('p-4')
    expect(card).not.toHaveClass('relative', 'overflow-hidden')
    expect(card.querySelector('.absolute')).toBeNull()
    expect(container.querySelector('.-left-12.-top-12')).toBeNull()
    expect(container.querySelector('.-bottom-5.-right-5')).toBeNull()
    expect(percentage).toHaveClass(
      'h-8',
      'w-fit',
      'rounded-full',
      'bg-primary-soft',
      'text-xs',
      'font-semibold',
    )
    expect(percentage).not.toHaveClass('absolute')
  })

  it('keeps the visible percentage and accessible progress value at forty percent', () => {
    render(<Home />)

    expect(screen.getByText('٤٠٪')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'نسبة إنجاز ورد اليوم' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
  })

  it('uses semantic theme tokens in both light and dark modes', () => {
    const { unmount } = render(<Home />)
    const lightCard = screen.getByRole('region', { name: 'خمس صفحات بهدوء' })
    expect(lightCard).toHaveClass('surface-card')
    expect(screen.getByText('٤٠٪')).toHaveClass('bg-primary-soft', 'text-primary-muted')
    unmount()

    document.documentElement.classList.add('dark')
    render(<Home />)
    const darkCard = screen.getByRole('region', { name: 'خمس صفحات بهدوء' })
    expect(darkCard).toHaveClass('surface-card')
    expect(screen.getByText('٤٠٪')).toHaveClass('bg-primary-soft', 'text-primary-muted')
  })

  it('does not perform reading or plan mutations while rendering the preview', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    render(<Home />)

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
