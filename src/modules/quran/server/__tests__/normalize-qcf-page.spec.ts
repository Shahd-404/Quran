import { describe, expect, it } from 'vitest'
import type { QuranChapter } from '../../types'
import { QuranMalformedResponseError } from '../errors'
import { normalizeQcfV2Page } from '../normalize-qcf-page'

const chapters = new Map<number, QuranChapter>([
  [2, { id: 2, nameArabic: 'البقرة', bismillahPre: true }],
  [3, { id: 3, nameArabic: 'آل عمران', bismillahPre: true }],
])

function word({
  id,
  position,
  pageNumber = 22,
  v2Page = pageNumber,
  lineNumber,
  verseKey = '2:30',
  codeV2 = 'ﱁ',
  text = `كلمة ${id}`,
}: {
  id: number
  position: number
  pageNumber?: number
  v2Page?: number
  lineNumber: number
  verseKey?: string
  codeV2?: string
  text?: string
}) {
  return {
    id,
    position,
    pageNumber,
    v2Page,
    lineNumber,
    verseKey,
    charTypeName: 'word',
    codeV2,
    textQpcHafs: text,
    textUthmani: text,
  }
}

function verse({
  chapterId = 2,
  verseNumber = 30,
  pageNumber = 22,
  v2Page = pageNumber,
  words,
}: {
  chapterId?: number
  verseNumber?: number
  pageNumber?: number
  v2Page?: number
  words: ReturnType<typeof word>[]
}) {
  return {
    id: chapterId * 1000 + verseNumber,
    chapterId,
    verseNumber,
    verseKey: `${chapterId}:${verseNumber}`,
    pageNumber,
    v2Page,
    textUthmani: words.map((item) => item.textUthmani).join(' '),
    words,
  }
}

describe('QCF V2 page normalization', () => {
  it('groups a continuing verse by official line number without reordering words', () => {
    const providerWords = [
      word({ id: 1, position: 1, lineNumber: 5, text: 'إِنِّي' }),
      word({ id: 2, position: 2, lineNumber: 5, text: 'جَاعِلٌ' }),
      word({ id: 3, position: 3, lineNumber: 6, text: 'فِي' }),
      word({ id: 4, position: 4, lineNumber: 6, text: 'ٱلْأَرْضِ' }),
    ]

    const page = normalizeQcfV2Page(
      22,
      [
        verse({
          pageNumber: 21,
          v2Page: 21,
          words: providerWords,
        }),
      ],
      chapters,
      null,
    )

    expect(page.lines.map((line) => line.lineNumber)).toEqual([5, 6])
    expect(page.lines.flatMap((line) => line.words.map((item) => item.wordId)))
      .toEqual([1, 2, 3, 4])
    expect(page.verses[0].accessibleText).toBe(
      'إِنِّي جَاعِلٌ فِي ٱلْأَرْضِ',
    )
    expect(page.headings).toEqual([])
  })

  it('preserves API order when one line contains words from two verses', () => {
    const page = normalizeQcfV2Page(
      22,
      [
        verse({
          verseNumber: 30,
          words: [word({ id: 10, position: 1, lineNumber: 7 })],
        }),
        verse({
          verseNumber: 31,
          words: [
            word({
              id: 11,
              position: 1,
              lineNumber: 7,
              verseKey: '2:31',
            }),
          ],
        }),
      ],
      chapters,
      null,
    )

    expect(page.lines[0].words.map((item) => item.verseKey)).toEqual([
      '2:30',
      '2:31',
    ])
  })

  it.each([
    ['duplicate word IDs', [
      verse({
        words: [
          word({ id: 1, position: 1, lineNumber: 5 }),
          word({ id: 1, position: 2, lineNumber: 5 }),
        ],
      }),
    ]],
    ['out-of-order lines', [
      verse({
        words: [
          word({ id: 1, position: 1, lineNumber: 6 }),
          word({ id: 2, position: 2, lineNumber: 5 }),
        ],
      }),
    ]],
    ['a mismatched v2 font page', [
      verse({
        words: [
          word({ id: 1, position: 1, lineNumber: 5, v2Page: 21 }),
        ],
      }),
    ]],
    ['unsafe glyph markup', [
      verse({
        words: [
          word({
            id: 1,
            position: 1,
            lineNumber: 5,
            codeV2: '<img src=x>',
          }),
        ],
      }),
    ]],
    ['a non-QCF literal glyph', [
      verse({
        words: [
          word({
            id: 1,
            position: 1,
            lineNumber: 5,
            codeV2: 'plain Arabic text',
          }),
        ],
      }),
    ]],
    ['a numeric entity outside QCF ranges', [
      verse({
        words: [
          word({
            id: 1,
            position: 1,
            lineNumber: 5,
            codeV2: '&#60;',
          }),
        ],
      }),
    ]],
  ])('rejects %s as an incomplete or malformed page', (_label, verses) => {
    expect(() => normalizeQcfV2Page(22, verses, chapters, null)).toThrow(
      QuranMalformedResponseError,
    )
  })

  it('rejects a Surah start when its official heading rows collide with content', () => {
    expect(() =>
      normalizeQcfV2Page(
        22,
        [
          verse({
            words: [word({ id: 1, position: 1, lineNumber: 4 })],
          }),
          verse({
            chapterId: 3,
            verseNumber: 1,
            words: [
              word({
                id: 2,
                position: 1,
                lineNumber: 5,
                verseKey: '3:1',
              }),
            ],
          }),
        ],
        chapters,
        'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
      ),
    ).toThrow(QuranMalformedResponseError)
  })
})
