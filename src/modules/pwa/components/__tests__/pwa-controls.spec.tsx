import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaControls } from '../pwa-controls'

describe('PwaControls', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false })) })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: {},
        register: vi.fn(async () => ({ waiting: null, installing: null, addEventListener: vi.fn() })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
  })
  it('prompts only after the install button is clicked', async () => {
    const prompt = vi.fn(async () => undefined)
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: typeof prompt
      userChoice: Promise<{ outcome: 'dismissed'; platform: string }>
    }
    event.prompt = prompt
    event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'test' })
    render(<PwaControls />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    act(() => { window.dispatchEvent(event) })
    const button = await screen.findByRole('button', { name: 'تثبيت تطبيق ورد' })
    expect(prompt).not.toHaveBeenCalled()
    fireEvent.click(button)
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText('تثبيت تطبيق ورد')).not.toBeInTheDocument())
  })
  it('hides installation in standalone mode', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    render(<PwaControls />)
    act(() => { window.dispatchEvent(new Event('beforeinstallprompt')) })
    expect(screen.queryByText('تثبيت تطبيق ورد')).not.toBeInTheDocument()
  })
})
