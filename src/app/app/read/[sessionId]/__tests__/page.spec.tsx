import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadQuranPageRange } from '@/modules/quran/server/get-page-range'
import { getReaderSession } from '@/modules/reader/server/get-reader-session'
import { recordReadingPosition } from '@/modules/reader/server/record-reading-position'
import ReadingSessionPage from '../page'
import { notFound, redirect } from 'next/navigation'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/modules/reader/server/get-reader-session', () => ({
  getReaderSession: vi.fn(),
}))
vi.mock('@/modules/reader/server/record-reading-position', () => ({
  recordReadingPosition: vi.fn(),
}))
vi.mock('@/modules/quran/server/get-page-range', () => ({
  createQuranCorrelationId: vi.fn(
    () => '11111111-2222-4333-8444-555555555555',
  ),
  loadQuranPageRange: vi.fn(),
}))
vi.mock('next/headers', () => ({ headers: () => new Headers() }))
vi.mock('next/server', () => ({
  NextResponse: class NextResponse extends Response {},
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

const session = {
  id: '11111111-1111-1111-1111-111111111111',
  assignmentId: '22222222-2222-2222-2222-222222222222',
  planId: '33333333-3333-3333-3333-333333333333',
  sessionOrder: 1,
  startPage: 17,
  endPage: 18,
  status: 'pending' as const,
  lastOpenedPage: null,
  firstOpenedAt: null,
  lastOpenedAt: null,
  assignmentDate: '2026-07-26',
  assignmentStatus: 'pending' as const,
  currentUnreadPage: 17,
}

const pages = [17, 18].map((pageNumber) => ({
  pageNumber,
  verses: [
    {
      chapterId: 2,
      chapterNameArabic: 'البقرة',
      verseKey: `2:${pageNumber}`,
      verseNumber: pageNumber,
      uthmaniText: `نص الصفحة ${pageNumber}`,
    },
  ],
}))

describe('ReadingSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects an unauthenticated request to login', async () => {
    vi.mocked(getReaderSession).mockResolvedValue({
      status: 'unauthenticated',
    })

    await expect(
      ReadingSessionPage({
        params: { sessionId: session.id },
        searchParams: {},
      }),
    ).rejects.toThrow('REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('returns not found without revealing an unavailable session', async () => {
    vi.mocked(getReaderSession).mockResolvedValue({ status: 'not_found' })

    await expect(
      ReadingSessionPage({
        params: { sessionId: session.id },
        searchParams: {},
      }),
    ).rejects.toThrow('NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('redirects an out-of-range page to the nearest session boundary', async () => {
    vi.mocked(getReaderSession).mockResolvedValue({
      status: 'success',
      session,
    })

    await expect(
      ReadingSessionPage({
        params: { sessionId: session.id },
        searchParams: { page: '605' },
      }),
    ).rejects.toThrow(`REDIRECT:/app/read/${session.id}?page=18`)
  })

  it('shows a safe provider message and never exposes raw API errors', async () => {
    vi.mocked(getReaderSession).mockResolvedValue({
      status: 'success',
      session,
    })
    vi.mocked(loadQuranPageRange).mockRejectedValue(
      new Error('401 invalid_client secret-token'),
    )

    const html = renderToStaticMarkup(
      await ReadingSessionPage({
        params: { sessionId: session.id },
        searchParams: {},
      }),
    )

    expect(html).toContain('تعذّر تحميل صفحات القرآن الآن')
    expect(html).not.toMatch(/401|invalid_client|secret-token/)
    expect(html).toContain('11111111-2222-4333-8444-555555555555')
    expect(recordReadingPosition).not.toHaveBeenCalled()
  })

  it('loads the complete range before recording the reading position', async () => {
    vi.mocked(getReaderSession).mockResolvedValue({
      status: 'success',
      session,
    })
    vi.mocked(loadQuranPageRange).mockResolvedValue(pages)
    vi.mocked(recordReadingPosition).mockResolvedValue({
      success: true,
      changed: true,
    })

    const html = renderToStaticMarkup(
      await ReadingSessionPage({
        params: { sessionId: session.id },
        searchParams: {},
      }),
    )

    expect(loadQuranPageRange).toHaveBeenCalledWith(17, 18, {
      correlationId: '11111111-2222-4333-8444-555555555555',
    })
    expect(recordReadingPosition).toHaveBeenCalledWith({}, session, 17)
    expect(
      vi.mocked(loadQuranPageRange).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(recordReadingPosition).mock.invocationCallOrder[0],
    )
    expect(html).toContain('data-quran-page="17"')
    expect(html).toContain('data-quran-page="18"')
  })
})
