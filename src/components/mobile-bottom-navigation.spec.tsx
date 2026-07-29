import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MobileBottomNavigation } from './mobile-bottom-navigation'

describe('MobileBottomNavigation', () => {
  it('uses safe authenticated routes with visible Arabic labels', () => {
    const { container } = render(<MobileBottomNavigation />)

    const expectedRoutes = [
      ['اليوم', '/app'],
      ['السجل', '/app/history'],
      ['الخطة', '/app/plan/settings'],
      ['الإعدادات', '/app/settings/privacy'],
    ] as const

    expectedRoutes.forEach(([label, href]) => {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    })

    expect(
      screen.getByRole('navigation', { name: 'التنقل في التطبيق' }),
    ).toHaveClass('md:hidden')
    const icons = container.querySelectorAll('svg')
    expect(icons).toHaveLength(4)
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
  })
})
