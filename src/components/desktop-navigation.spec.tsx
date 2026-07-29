import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DesktopNavigation } from './desktop-navigation'

let pathname = '/app'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

describe('DesktopNavigation', () => {
  beforeEach(() => {
    pathname = '/app'
  })

  it('exposes all authenticated destinations at the desktop breakpoint', () => {
    const { container } = render(<DesktopNavigation />)
    const navigation = screen.getByRole('navigation', {
      name: 'التنقل الرئيسي',
    })
    const expectedRoutes = [
      ['لوحة الورد', '/app'],
      ['السجل', '/app/history'],
      ['الخطة', '/app/plan/settings'],
      ['الإعدادات', '/app/settings/privacy'],
    ] as const

    expectedRoutes.forEach(([label, href]) => {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        href,
      )
    })
    expect(navigation).toHaveClass('hidden', 'md:flex')
    expect(container.querySelectorAll('svg')).toHaveLength(4)
    container
      .querySelectorAll('svg')
      .forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
  })

  it('marks Settings as the active keyboard-reachable route', () => {
    pathname = '/app/settings/privacy'

    render(<DesktopNavigation />)

    const settings = screen.getByRole('link', { name: 'الإعدادات' })
    expect(settings).toHaveAttribute('aria-current', 'page')
    expect(settings).toHaveClass('bg-primary-soft', 'text-primary-muted')
    expect(settings).toHaveClass('focus-visible:outline-offset-2')
    expect(
      screen.getByRole('link', { name: 'لوحة الورد' }),
    ).not.toHaveAttribute('aria-current')
  })
})
