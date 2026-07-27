import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConnectivityNotice } from '../connectivity-notice'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

describe('ConnectivityNotice', () => {
  it('appears offline and disappears online', () => {
    setOnline(false)
    render(<ConnectivityNotice />)
    expect(screen.getByRole('status')).toHaveTextContent('أنتِ الآن دون اتصال')
    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
