import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OfflineAwareReaderMessage } from '../offline-aware-reader-message'

describe('OfflineAwareReaderMessage', () => {
  it('shows the safe Quran offline error without progress actions', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    render(<OfflineAwareReaderMessage fallback="provider failed" />)
    expect(screen.getByText('تعذر تحميل صفحة القرآن لعدم وجود اتصال بالإنترنت.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /إكمال|تمت قراءة/ })).not.toBeInTheDocument()
  })
})
