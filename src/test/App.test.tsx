import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from '../components/Home'

describe('Home', () => {
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
})
