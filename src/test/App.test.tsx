import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from '../components/Home'

describe('Home', () => {
  it('renders the Arabic application title and development notice', () => {
    render(<Home />)
    expect(screen.getByText('ورد')).toBeInTheDocument()
    expect(screen.getByText(/التطبيق قيد التطوير/)).toBeInTheDocument()
  })
})
