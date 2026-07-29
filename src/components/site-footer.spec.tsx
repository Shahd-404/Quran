import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteFooter } from './site-footer'

describe('SiteFooter', () => {
  it('keeps the compact product line and dedication visible', () => {
    render(<SiteFooter />)

    expect(screen.getByText('ورد — صديقك اليومي للقرآن')).toBeVisible()
    expect(screen.getByText('إهداء لعبدالله')).toBeVisible()
  })
})
