import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteReadingDataCard } from '../delete-reading-data-card'

const push = vi.fn()
const refresh = vi.fn()
const unsubscribe = vi.fn(async () => true)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

describe('DeleteReadingDataCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(async () => ({ unsubscribe })),
          },
        }),
      },
    })
    vi.stubGlobal('PushManager', function PushManager() {})
  })

  it('does not mutate on the first click or cancel', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<DeleteReadingDataCard />)

    fireEvent.click(screen.getByRole('button', { name: 'مسح جميع بيانات القراءة' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تأكيد المسح النهائي' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء والعودة' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('enables deletion only for the exact phrase', () => {
    render(<DeleteReadingDataCard />)
    fireEvent.click(screen.getByRole('button', { name: 'مسح جميع بيانات القراءة' }))
    const input = screen.getByLabelText(/حذف بياناتي/)
    const submit = screen.getByRole('button', { name: 'تأكيد المسح النهائي' })

    fireEvent.change(input, { target: { value: 'حذف بياناتى' } })
    expect(submit).toBeDisabled()
    fireEvent.change(input, { target: { value: 'حذف بياناتي' } })
    expect(submit).toBeEnabled()
  })

  it('prevents duplicate submission, unsubscribes this browser, and redirects', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined
    const pending = new Promise((resolve) => {
      resolveRequest = resolve
    })
    const fetchMock = vi.fn(() => pending)
    vi.stubGlobal('fetch', fetchMock)
    render(<DeleteReadingDataCard />)

    fireEvent.click(screen.getByRole('button', { name: 'مسح جميع بيانات القراءة' }))
    fireEvent.change(screen.getByLabelText(/حذف بياناتي/), {
      target: { value: 'حذف بياناتي' },
    })
    const submit = screen.getByRole('button', { name: 'تأكيد المسح النهائي' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'جارٍ المسح النهائي…' })).toBeDisabled()

    resolveRequest?.({
      ok: true,
      json: vi.fn(async () => ({ success: true })),
    })
    await waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1))
    expect(push).toHaveBeenCalledWith('/app/plan/new?readingDataDeleted=1')
    expect(refresh).toHaveBeenCalled()
  })

  it('keeps the deletion successful when local browser cleanup fails', async () => {
    unsubscribe.mockResolvedValueOnce(false)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: vi.fn(async () => ({ success: true })),
      })),
    )
    render(<DeleteReadingDataCard />)

    fireEvent.click(screen.getByRole('button', { name: 'مسح جميع بيانات القراءة' }))
    fireEvent.change(screen.getByLabelText(/حذف بياناتي/), {
      target: { value: 'حذف بياناتي' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد المسح النهائي' }))

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/app/plan/new?readingDataDeleted=1&browserCleanup=failed',
      ),
    )
  })
})
