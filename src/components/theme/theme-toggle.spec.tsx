import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeScript } from './theme-script'
import { ThemeToggle } from './theme-toggle'

afterEach(() => {
  document.documentElement.classList.remove('dark')
  delete document.documentElement.dataset.theme
  window.localStorage.clear()
})

describe('theme support', () => {
  it('ships a pre-hydration script that reads storage and system preference', () => {
    const { container } = render(<ThemeScript />)
    const source = container.querySelector('script')?.textContent

    expect(source).toContain("localStorage.getItem('wird-theme')")
    expect(source).toContain("prefers-color-scheme: dark")
    expect(source).toContain("classList.toggle('dark'")
  })

  it('toggles from light to dark and persists the preference', async () => {
    const { container } = render(<ThemeToggle />)
    const toggle = await screen.findByRole('button', {
      name: 'تفعيل الوضع الداكن',
    })
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(toggle)

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem('wird-theme')).toBe('dark')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'تفعيل الوضع الفاتح' }),
      ).toBeInTheDocument(),
    )
  })

  it('recognizes a dark class applied before hydration', async () => {
    document.documentElement.classList.add('dark')
    render(<ThemeToggle />)

    const toggle = await screen.findByRole('button', {
      name: 'تفعيل الوضع الفاتح',
    })
    fireEvent.click(toggle)

    expect(document.documentElement).not.toHaveClass('dark')
    expect(window.localStorage.getItem('wird-theme')).toBe('light')
  })
})
