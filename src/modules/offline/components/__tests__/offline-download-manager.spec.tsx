import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineDownloadManager } from '../offline-download-manager'
import { fetchOfflineBundle, fetchOfflineManifest } from '../../client/offline-api'
import {
  cleanupExpiredOfflineContent,
  ensureOfflineAccountScope,
  getOfflineStorageSummary,
  saveOfflineBundle,
} from '../../client/offline-db'

vi.mock('../../client/offline-api', () => ({
  fetchOfflineManifest: vi.fn(),
  fetchOfflineBundle: vi.fn(),
}))

vi.mock('../../client/offline-db', () => ({
  cleanupExpiredOfflineContent: vi.fn(),
  clearAllOfflineData: vi.fn(),
  ensureOfflineAccountScope: vi.fn(),
  getOfflineStorageSummary: vi.fn(),
  hasUnsyncedOfflineActions: vi.fn(),
  saveOfflineBundle: vi.fn(),
  syncOfflineOutbox: vi.fn(),
}))

const session = {
  id: '11111111-1111-4111-8111-111111111111',
  assignmentDate: '2026-08-04',
  sessionOrder: 1,
  startPage: 10,
  endPage: 10,
  scheduledFor: '2026-08-04T08:00:00.000Z',
  status: 'pending' as const,
}
const emptySummary = {
  sessions: [],
  pageCount: 0,
  estimatedBytes: 0,
  lastDownloadAt: null,
  pendingActions: 0,
  failedActions: 0,
}

describe('OfflineDownloadManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchOfflineManifest).mockResolvedValue({
      success: true,
      scopeKey: 'scope',
      localDate: '2026-08-04',
      includeNextDays: false,
      sessions: [session],
    })
    vi.mocked(ensureOfflineAccountScope).mockResolvedValue()
    vi.mocked(cleanupExpiredOfflineContent).mockResolvedValue(0)
    vi.mocked(getOfflineStorageSummary).mockResolvedValue(emptySummary)
    vi.stubGlobal('alert', vi.fn())
  })

  it('loads metadata but does not download or request persistence before explicit action', async () => {
    const persist = vi.fn(async () => true)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: vi.fn(async () => ({ quota: 1_000_000, usage: 0 })), persist },
    })
    render(<OfflineDownloadManager />)

    expect(await screen.findByRole('button', { name: 'تنزيل الورد' })).toBeEnabled()
    expect(fetchOfflineBundle).not.toHaveBeenCalled()
    expect(saveOfflineBundle).not.toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
  })

  it('commits a complete bundle and requests persistent storage after the click', async () => {
    const persist = vi.fn(async () => true)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: vi.fn(async () => ({ quota: 1_000_000, usage: 0 })), persist },
    })
    const bundle = {
      success: true as const,
      scopeKey: 'scope',
      generatedAt: '2026-08-04T10:00:00.000Z',
      expiresAt: '2026-08-11T10:00:00.000Z',
      sessions: [session],
      pages: [{
        pageNumber: 10,
        verses: [{
          chapterId: 2,
          chapterNameArabic: 'البقرة',
          verseKey: '2:1',
          verseNumber: 1,
          uthmaniText: 'نص قرآني',
        }],
      }],
    }
    vi.mocked(fetchOfflineBundle).mockResolvedValue(bundle)
    vi.mocked(saveOfflineBundle).mockResolvedValue({
      ...emptySummary,
      sessions: [{
        ...session,
        key: `scope:${session.id}`,
        scopeKey: 'scope',
        downloadedAt: bundle.generatedAt,
        expiresAt: bundle.expiresAt,
        estimatedBytes: 512,
      }],
      pageCount: 1,
      estimatedBytes: 512,
      lastDownloadAt: bundle.generatedAt,
    })
    render(<OfflineDownloadManager />)

    fireEvent.click(await screen.findByRole('button', { name: 'تنزيل الورد' }))

    await waitFor(() => expect(saveOfflineBundle).toHaveBeenCalledWith(bundle))
    expect(fetchOfflineBundle).toHaveBeenCalledWith([session.id])
    expect(persist).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/تم تنزيل الورد كاملًا/)).toBeInTheDocument()
  })
})
