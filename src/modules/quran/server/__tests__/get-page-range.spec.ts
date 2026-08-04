import { describe, expect, it, vi } from 'vitest'
import { QuranPage } from '../../types'
import {
  QuranMalformedResponseError,
  QuranPageRangeLoadError,
  QuranProviderError,
} from '../errors'
import {
  createQuranCorrelationId,
  getInclusiveQuranPageNumbers,
  loadQuranPageRange,
  QuranLoadFailureLog,
} from '../get-page-range'

function page(pageNumber: number): QuranPage {
  return {
    schemaVersion: 1,
    mushafId: 1,
    pageNumber,
    v2Page: pageNumber,
    lines: [
      {
        lineNumber: 1,
        words: [
          {
            wordId: pageNumber * 100,
            position: 1,
            pageNumber,
            v2Page: pageNumber,
            lineNumber: 1,
            charTypeName: 'word',
            codeV2: 'ﱁ',
            accessibleText: `نص الصفحة ${pageNumber}`,
            verseKey: `2:${pageNumber}`,
            verseNumber: pageNumber,
            chapterId: 2,
          },
        ],
      },
    ],
    verses: [
      {
        chapterId: 2,
        chapterNameArabic: 'البقرة',
        verseKey: `2:${pageNumber}`,
        verseNumber: pageNumber,
        accessibleText: `نص الصفحة ${pageNumber}`,
      },
    ],
    headings: [],
  }
}

const correlationId = '11111111-2222-4333-8444-555555555555'

describe('Quran page range loader', () => {
  it('loads a one-page session through the inclusive range path', async () => {
    const loadPage = vi.fn(async (pageNumber: number) => page(pageNumber))

    await expect(
      loadQuranPageRange(17, 17, { correlationId, loadPage }),
    ).resolves.toEqual([page(17)])
    expect(loadPage).toHaveBeenCalledTimes(1)
    expect(loadPage).toHaveBeenCalledWith(17)
  })

  it('loads both pages of a two-page session', async () => {
    const loadPage = vi.fn(async (pageNumber: number) => page(pageNumber))

    const pages = await loadQuranPageRange(17, 18, {
      correlationId,
      loadPage,
    })

    expect(pages.map((item) => item.pageNumber)).toEqual([17, 18])
    expect(loadPage.mock.calls.map(([pageNumber]) => pageNumber)).toEqual([
      17,
      18,
    ])
  })

  it('loads pages 80–82 inclusively and preserves ascending order', async () => {
    const loadPage = vi.fn(async (pageNumber: number) => page(pageNumber))

    const pages = await loadQuranPageRange(80, 82, {
      correlationId,
      loadPage,
    })

    expect(getInclusiveQuranPageNumbers(80, 82)).toEqual([80, 81, 82])
    expect(pages.map((item) => item.pageNumber)).toEqual([80, 81, 82])
  })

  it.each([
    [0, 1],
    [1, 605],
    [82, 80],
    [80.5, 82],
  ])('rejects the invalid range %s–%s safely', async (startPage, endPage) => {
    const logFailure = vi.fn()

    await expect(
      loadQuranPageRange(startPage, endPage, {
        correlationId,
        logFailure,
      }),
    ).rejects.toMatchObject({ code: 'QURAN_INVALID_PAGE_RANGE' })
    expect(logFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedPage: startPage,
        returnedPage: null,
        lineCount: 0,
        errorCode: 'QURAN_INVALID_PAGE_RANGE',
      }),
    )
  })

  it('reports one failed page and never returns an incomplete range', async () => {
    const logFailure = vi.fn()
    const loadPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 81) {
        throw new QuranProviderError('QURAN_UPSTREAM_SERVER_ERROR', 500)
      }
      return page(pageNumber)
    })

    let caught: unknown
    try {
      await loadQuranPageRange(80, 82, {
        correlationId,
        loadPage,
        logFailure,
        now: () => 100,
      })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(QuranPageRangeLoadError)
    expect(caught).toMatchObject({
      pageNumber: 81,
      code: 'QURAN_UPSTREAM_SERVER_ERROR',
      upstreamStatusCode: 500,
    })
    expect(logFailure).toHaveBeenCalledWith({
      operation: 'load_qcf_v2_page',
      correlationId,
      requestedPage: 81,
      returnedPage: null,
      lineCount: 0,
      errorCode: 'QURAN_UPSTREAM_SERVER_ERROR',
      durationMs: 0,
    } satisfies QuranLoadFailureLog)
  })

  it('logs a synchronous provider configuration failure safely', async () => {
    const logFailure = vi.fn()
    const loadPage = vi.fn(() => {
      throw new Error('QF_CLIENT_SECRET missing')
    })

    await expect(
      loadQuranPageRange(80, 80, {
        correlationId,
        loadPage,
        logFailure,
      }),
    ).rejects.toMatchObject({
      pageNumber: 80,
      code: 'QURAN_UPSTREAM_REQUEST_FAILED',
    })
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(
      'QF_CLIENT_SECRET',
    )
  })

  it('retries the complete required range after a failed attempt', async () => {
    let shouldFail = true
    const loadPage = vi.fn(async (pageNumber: number) => {
      if (pageNumber === 81 && shouldFail) {
        throw new QuranProviderError()
      }
      return page(pageNumber)
    })

    await expect(
      loadQuranPageRange(80, 82, {
        correlationId,
        loadPage,
        logFailure: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(QuranPageRangeLoadError)

    shouldFail = false
    await expect(
      loadQuranPageRange(80, 82, {
        correlationId,
        loadPage,
        logFailure: vi.fn(),
      }),
    ).resolves.toEqual([page(80), page(81), page(82)])

    expect(loadPage.mock.calls.map(([pageNumber]) => pageNumber)).toEqual([
      80,
      81,
      82,
      80,
      81,
      82,
    ])
  })

  it('rejects a provider response assigned to the wrong page', async () => {
    const loadPage = vi.fn(async (pageNumber: number) =>
      page(pageNumber === 81 ? 80 : pageNumber),
    )

    await expect(
      loadQuranPageRange(80, 82, {
        correlationId,
        loadPage,
        logFailure: vi.fn(),
      }),
    ).rejects.toMatchObject({
      pageNumber: 81,
      code: new QuranMalformedResponseError().code,
    })
  })

  it('rejects a QCF page whose v2 font page does not match the request', async () => {
    const loadPage = vi.fn(async (pageNumber: number) => ({
      ...page(pageNumber),
      v2Page: pageNumber === 81 ? 80 : pageNumber,
    }))

    await expect(
      loadQuranPageRange(80, 82, {
        correlationId,
        loadPage,
        logFailure: vi.fn(),
      }),
    ).rejects.toMatchObject({
      pageNumber: 81,
      code: 'QURAN_MALFORMED_RESPONSE',
    })
  })

  it('generates opaque correlation IDs without request or credential data', () => {
    const generated = createQuranCorrelationId()

    expect(generated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(generated).not.toMatch(/token|secret|cookie|supabase|@/i)
  })
})
