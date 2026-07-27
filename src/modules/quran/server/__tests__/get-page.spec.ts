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

function sdkClient(byPage: ReturnType<typeof vi.fn>): ServerClient {
  return {
    content: {
      v4: {
        verses: { byPage },
      },
    },
  } as unknown as ServerClient
}

const chapters = Promise.resolve(
  new Map<number, QuranChapter>([
    [1, { id: 1, nameArabic: 'الفاتحة' }],
    [2, { id: 2, nameArabic: 'البقرة' }],
  ]),
)

describe('Quran page provider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('fetches only the requested Madani Mushaf page with Uthmani text', async () => {
    const byPage = vi.fn().mockResolvedValue([
      {
        id: 1,
        chapterId: 2,
        verseKey: '2:1',
        verseNumber: 1,
        pageNumber: 2,
        textUthmani: 'الم',
      },
    ])

    const page = await loadQuranPage(2, sdkClient(byPage), chapters)

    expect(byPage).toHaveBeenCalledTimes(1)
    expect(byPage).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({
        mushaf: 4,
        words: false,
        fields: { chapterId: true, textUthmani: true },
      }),
    )
    expect(page).toEqual({
      pageNumber: 2,
      verses: [
        {
          chapterId: 2,
          chapterNameArabic: 'البقرة',
          verseKey: '2:1',
          verseNumber: 1,
          uthmaniText: 'الم',
        },
      ],
    })
  })

  it('rejects an empty or malformed page response safely', async () => {
    const empty = sdkClient(vi.fn().mockResolvedValue([]))
    const wrongPage = sdkClient(
      vi.fn().mockResolvedValue([
        {
          chapterId: 1,
          verseKey: '1:1',
          verseNumber: 1,
          pageNumber: 2,
          textUthmani: 'بسم الله',
        },
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
