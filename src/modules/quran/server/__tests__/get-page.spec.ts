import { ServerClient } from '@quranjs/api/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuranChapter } from '../../types'
import { getQuranFoundationClient } from '../client'
import {
  getSafeQuranErrorMessage,
  QuranMalformedResponseError,
  QuranProviderError,
} from '../errors'
import { loadQuranPage } from '../get-page'

function sdkClient(
  byPage: ReturnType<typeof vi.fn>,
  byKey: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({
    textUthmani: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  }),
): ServerClient {
  return {
    content: {
      v4: {
        verses: { byPage, byKey },
      },
    },
  } as unknown as ServerClient
}

function providerWord({
  id,
  position,
  pageNumber,
  lineNumber,
  verseKey,
  codeV2,
  text,
}: {
  id: number
  position: number
  pageNumber: number
  lineNumber: number
  verseKey: string
  codeV2: string
  text: string
}) {
  return {
    id,
    position,
    pageNumber,
    v2Page: pageNumber,
    lineNumber,
    verseKey,
    charTypeName: 'word',
    codeV2,
    textQpcHafs: text,
    textUthmani: text,
  }
}

function providerVerse({
  chapterId,
  verseNumber,
  pageNumber,
  words,
}: {
  chapterId: number
  verseNumber: number
  pageNumber: number
  words: ReturnType<typeof providerWord>[]
}) {
  return {
    id: chapterId * 1000 + verseNumber,
    chapterId,
    verseKey: `${chapterId}:${verseNumber}`,
    verseNumber,
    pageNumber,
    v2Page: pageNumber,
    textUthmani: words.map((word) => word.textUthmani).join(' '),
    words,
  }
}

const chapters = Promise.resolve(
  new Map<number, QuranChapter>([
    [1, { id: 1, nameArabic: 'الفاتحة', bismillahPre: false }],
    [2, { id: 2, nameArabic: 'البقرة', bismillahPre: true }],
    [3, { id: 3, nameArabic: 'آل عمران', bismillahPre: true }],
  ]),
)

describe('Quran QCF V2 page provider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requests the official QCF V2 word fields and groups canonical words by line', async () => {
    const byPage = vi.fn().mockResolvedValue([
      providerVerse({
        chapterId: 2,
        verseNumber: 2,
        pageNumber: 2,
        words: [
          providerWord({
            id: 21,
            position: 1,
            pageNumber: 2,
            lineNumber: 3,
            verseKey: '2:2',
            codeV2: 'ﱁ',
            text: 'ذَٰلِكَ',
          }),
          providerWord({
            id: 22,
            position: 2,
            pageNumber: 2,
            lineNumber: 3,
            verseKey: '2:2',
            codeV2: 'ﱂ',
            text: 'ٱلْكِتَـٰبُ',
          }),
        ],
      }),
    ])

    const page = await loadQuranPage(2, sdkClient(byPage), chapters)

    expect(byPage).toHaveBeenCalledTimes(1)
    expect(byPage).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({
        mushaf: 1,
        words: true,
        fields: expect.objectContaining({
          chapterId: true,
          textUthmani: true,
          v2Page: true,
        }),
        wordFields: expect.objectContaining({
          charTypeName: true,
          codeV2: true,
          lineNumber: true,
          pageNumber: true,
          position: true,
          textQpcHafs: true,
          v2Page: true,
          verseKey: true,
        }),
      }),
    )
    expect(page).toMatchObject({
      schemaVersion: 1,
      mushafId: 1,
      pageNumber: 2,
      v2Page: 2,
      headings: [],
    })
    expect(page.lines).toHaveLength(1)
    expect(page.lines[0].lineNumber).toBe(3)
    expect(page.lines[0].words.map((word) => word.wordId)).toEqual([21, 22])
    expect(page.verses[0].accessibleText).toBe('ذَٰلِكَ ٱلْكِتَـٰبُ')
  })

  it('builds the first page heading from official chapter metadata', async () => {
    const byPage = vi.fn().mockResolvedValue([
      providerVerse({
        chapterId: 1,
        verseNumber: 1,
        pageNumber: 1,
        words: [
          providerWord({
            id: 1,
            position: 1,
            pageNumber: 1,
            lineNumber: 2,
            verseKey: '1:1',
            codeV2: 'ﱁ',
            text: 'بِسْمِ',
          }),
        ],
      }),
    ])
    const byKey = vi.fn()

    const page = await loadQuranPage(1, sdkClient(byPage, byKey), chapters)

    expect(page.headings).toEqual([
      {
        chapterId: 1,
        chapterNameArabic: 'الفاتحة',
        titleLineNumber: 1,
        bismillahLineNumber: null,
        beforeLineNumber: 2,
        bismillahText: null,
      },
    ])
    expect(byKey).not.toHaveBeenCalled()
  })

  it('uses the official Basmala text on a page containing a Surah boundary', async () => {
    const byPage = vi.fn().mockResolvedValue([
      providerVerse({
        chapterId: 2,
        verseNumber: 286,
        pageNumber: 50,
        words: [
          providerWord({
            id: 5001,
            position: 1,
            pageNumber: 50,
            lineNumber: 10,
            verseKey: '2:286',
            codeV2: 'ﱁ',
            text: 'لَا',
          }),
        ],
      }),
      providerVerse({
        chapterId: 3,
        verseNumber: 1,
        pageNumber: 50,
        words: [
          providerWord({
            id: 5002,
            position: 1,
            pageNumber: 50,
            lineNumber: 13,
            verseKey: '3:1',
            codeV2: 'ﱂ',
            text: 'الٓمٓ',
          }),
        ],
      }),
    ])
    const byKey = vi.fn().mockResolvedValue({
      textUthmani: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    })

    const page = await loadQuranPage(50, sdkClient(byPage, byKey), chapters)

    expect(byKey).toHaveBeenCalledWith(
      '1:1',
      expect.objectContaining({ mushaf: 1, words: false }),
    )
    expect(page.headings[0]).toMatchObject({
      chapterId: 3,
      titleLineNumber: 11,
      bismillahLineNumber: 12,
      beforeLineNumber: 13,
      bismillahText: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    })
  })

  it('rejects an empty response or a word assigned to another page', async () => {
    const empty = sdkClient(vi.fn().mockResolvedValue([]))
    const wrongPage = sdkClient(
      vi.fn().mockResolvedValue([
        providerVerse({
          chapterId: 1,
          verseNumber: 1,
          pageNumber: 1,
          words: [
            providerWord({
              id: 1,
              position: 1,
              pageNumber: 2,
              lineNumber: 2,
              verseKey: '1:1',
              codeV2: 'ﱁ',
              text: 'بِسْمِ',
            }),
          ],
        }),
      ]),
    )

    await expect(loadQuranPage(1, empty, chapters)).rejects.toBeInstanceOf(
      QuranMalformedResponseError,
    )
    await expect(
      loadQuranPage(1, wrongPage, chapters),
    ).rejects.toBeInstanceOf(QuranMalformedResponseError)
  })

  it('returns a retry-safe Arabic message without leaking provider errors', async () => {
    const provider = sdkClient(
      vi.fn().mockRejectedValue(
        new Error('401 invalid_client secret-token-value'),
      ),
    )

    let caught: unknown
    try {
      await loadQuranPage(17, provider, chapters)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(QuranProviderError)
    const safeMessage = getSafeQuranErrorMessage(caught)
    expect(safeMessage).toContain('إعادة المحاولة')
    expect(safeMessage).not.toMatch(/401|invalid_client|secret-token/)
  })

  it.each([
    [401, 'QURAN_UPSTREAM_UNAUTHORIZED'],
    [403, 'QURAN_UPSTREAM_FORBIDDEN'],
    [404, 'QURAN_UPSTREAM_NOT_FOUND'],
    [429, 'QURAN_UPSTREAM_RATE_LIMITED'],
    [500, 'QURAN_UPSTREAM_SERVER_ERROR'],
  ] as const)(
    'maps provider status %s to the stable code %s',
    async (statusCode, errorCode) => {
      const provider = sdkClient(
        vi
          .fn()
          .mockRejectedValue(
            new Error(`${statusCode} upstream-sensitive-details`),
          ),
      )

      await expect(
        loadQuranPage(17, provider, chapters),
      ).rejects.toMatchObject({
        code: errorCode,
        upstreamStatusCode: statusCode,
      })
    },
  )

  it('rejects missing server-only provider configuration', () => {
    vi.stubEnv('QF_CLIENT_ID', '')
    vi.stubEnv('QF_CLIENT_SECRET', '')
    vi.stubEnv('QF_ENV', '')

    let caught: unknown
    try {
      getQuranFoundationClient()
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(Error)
    const safeMessage = getSafeQuranErrorMessage(caught)
    expect(safeMessage).toContain('غير مُعدّ بعد')
    expect(safeMessage).not.toContain('QF_CLIENT_SECRET')
  })
})
