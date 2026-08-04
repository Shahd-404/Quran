import {
  QCF_V2_MAX_LINE_NUMBER,
  QCF_V2_MUSHAF_ID,
  QCF_V2_SCHEMA_VERSION,
  isSafeQcfV2GlyphMarkup,
  isValidQuranPage,
} from '../qcf-v2'
import type {
  QuranChapter,
  QuranLine,
  QuranPage,
  QuranPageHeading,
  QuranVerse,
  QuranWord,
  QuranWordCharType,
} from '../types'
import { QuranMalformedResponseError } from './errors'

const WORD_CHAR_TYPES = new Set<QuranWordCharType>([
  'word',
  'end',
  'pause',
  'sajdah',
  'rub-el-hizb',
])

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new QuranMalformedResponseError()
  }
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new QuranMalformedResponseError()
  }
  return value
}

function positiveInteger(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new QuranMalformedResponseError()
  }
  return Number(value)
}

function wordCharType(value: unknown): QuranWordCharType {
  if (typeof value !== 'string' || !WORD_CHAR_TYPES.has(value as QuranWordCharType)) {
    throw new QuranMalformedResponseError()
  }
  return value as QuranWordCharType
}

function isVerseKeyFor(
  verseKey: string,
  chapterId: number,
  verseNumber: number,
): boolean {
  return verseKey === `${chapterId}:${verseNumber}`
}

function chapterFor(
  chapters: Map<number, QuranChapter>,
  chapterId: number,
): QuranChapter {
  const chapter = chapters.get(chapterId)
  if (!chapter) throw new QuranMalformedResponseError()
  return chapter
}

export function pageRequiresBismillah(
  requestedPage: number,
  providerVerses: unknown[],
  chapters: Map<number, QuranChapter>,
): boolean {
  if (!isValidQuranPage(requestedPage)) return false

  return providerVerses.some((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const verse = value as Record<string, unknown>
    const chapterId = Number(verse.chapterId)
    return (
      verse.verseNumber === 1 &&
      verse.pageNumber === requestedPage &&
      Number.isInteger(chapterId) &&
      chapters.get(chapterId)?.bismillahPre === true
    )
  })
}

export function normalizeQcfV2Page(
  requestedPage: number,
  providerVerses: unknown[],
  chapters: Map<number, QuranChapter>,
  bismillahText: string | null,
): QuranPage {
  if (!isValidQuranPage(requestedPage) || providerVerses.length === 0) {
    throw new QuranMalformedResponseError()
  }

  const lines = new Map<number, QuranWord[]>()
  const verses: QuranVerse[] = []
  const headings: QuranPageHeading[] = []
  const seenWordIds = new Set<number>()
  let previousLineNumber = 0

  for (const providerVerse of providerVerses) {
    const verse = asRecord(providerVerse)
    const chapterId = positiveInteger(verse.chapterId)
    const verseNumber = positiveInteger(verse.verseNumber)
    const verseKey = nonEmptyString(verse.verseKey)
    const versePageNumber = positiveInteger(verse.pageNumber)
    const verseV2Page = positiveInteger(verse.v2Page)
    const officialVerseText = nonEmptyString(verse.textUthmani)
    const providerWords = verse.words
    const chapter = chapterFor(chapters, chapterId)

    if (
      !isVerseKeyFor(verseKey, chapterId, verseNumber) ||
      !isValidQuranPage(versePageNumber) ||
      !isValidQuranPage(verseV2Page) ||
      !Array.isArray(providerWords) ||
      providerWords.length === 0 ||
      officialVerseText.trim() === ''
    ) {
      throw new QuranMalformedResponseError()
    }

    const normalizedVerseWords: QuranWord[] = []
    let previousPosition = 0

    for (const providerWord of providerWords) {
      const word = asRecord(providerWord)
      const wordId = positiveInteger(word.id)
      const position = positiveInteger(word.position)
      const pageNumber = positiveInteger(word.pageNumber)
      const v2Page = positiveInteger(word.v2Page)
      const lineNumber = positiveInteger(word.lineNumber)
      const charTypeName = wordCharType(word.charTypeName)
      const codeV2 = nonEmptyString(word.codeV2)
      const accessibleText = nonEmptyString(
        word.textQpcHafs ?? word.textUthmani,
      )
      const wordVerseKey = nonEmptyString(word.verseKey)

      if (
        seenWordIds.has(wordId) ||
        position <= previousPosition ||
        pageNumber !== requestedPage ||
        v2Page !== requestedPage ||
        lineNumber > QCF_V2_MAX_LINE_NUMBER ||
        lineNumber < previousLineNumber ||
        wordVerseKey !== verseKey ||
        !isSafeQcfV2GlyphMarkup(codeV2)
      ) {
        throw new QuranMalformedResponseError()
      }

      seenWordIds.add(wordId)
      previousPosition = position
      previousLineNumber = lineNumber

      const normalizedWord: QuranWord = {
        wordId,
        position,
        pageNumber,
        v2Page,
        lineNumber,
        charTypeName,
        codeV2,
        accessibleText,
        verseKey,
        verseNumber,
        chapterId,
      }
      normalizedVerseWords.push(normalizedWord)

      const lineWords = lines.get(lineNumber)
      if (lineWords) lineWords.push(normalizedWord)
      else lines.set(lineNumber, [normalizedWord])
    }

    const firstLineNumber = normalizedVerseWords[0]?.lineNumber
    if (!firstLineNumber) throw new QuranMalformedResponseError()

    if (verseNumber === 1 && versePageNumber === requestedPage) {
      if (chapter.bismillahPre && !bismillahText) {
        throw new QuranMalformedResponseError()
      }
      const titleLineNumber = firstLineNumber - (chapter.bismillahPre ? 2 : 1)
      const bismillahLineNumber = chapter.bismillahPre
        ? firstLineNumber - 1
        : null
      if (titleLineNumber < 1) throw new QuranMalformedResponseError()
      headings.push({
        chapterId,
        chapterNameArabic: chapter.nameArabic,
        titleLineNumber,
        bismillahLineNumber,
        beforeLineNumber: firstLineNumber,
        bismillahText: chapter.bismillahPre ? bismillahText : null,
      })
    }

    verses.push({
      chapterId,
      chapterNameArabic: chapter.nameArabic,
      verseKey,
      verseNumber,
      accessibleText: normalizedVerseWords
        .map((word) => word.accessibleText)
        .join(' '),
    })
  }

  const normalizedLines: QuranLine[] = [...lines.entries()]
    .sort(([left], [right]) => left - right)
    .map(([lineNumber, words]) => ({ lineNumber, words }))

  if (normalizedLines.length === 0 || seenWordIds.size === 0) {
    throw new QuranMalformedResponseError()
  }

  const contentLineNumbers = new Set(normalizedLines.map((line) => line.lineNumber))
  const decorativeLineNumbers = new Set<number>()
  for (const heading of headings) {
    const reservedLines = [
      heading.titleLineNumber,
      heading.bismillahLineNumber,
    ].filter((lineNumber): lineNumber is number => lineNumber !== null)
    if (
      reservedLines.some(
        (lineNumber) =>
          contentLineNumbers.has(lineNumber) ||
          decorativeLineNumbers.has(lineNumber),
      )
    ) {
      throw new QuranMalformedResponseError()
    }
    reservedLines.forEach((lineNumber) => decorativeLineNumbers.add(lineNumber))
  }

  return {
    schemaVersion: QCF_V2_SCHEMA_VERSION,
    mushafId: QCF_V2_MUSHAF_ID,
    pageNumber: requestedPage,
    v2Page: requestedPage,
    lines: normalizedLines,
    verses,
    headings,
  }
}
