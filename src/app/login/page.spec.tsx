import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('LoginPage password recovery entry point', () => {
  it('shows an accessible forgot-password link', () => {
    render(<LoginPage />)

    const link = screen.getByRole('link', {
      name: 'نسيتِ كلمة المرور؟',
    })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })
})
