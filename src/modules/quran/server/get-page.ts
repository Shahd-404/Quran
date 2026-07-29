import { PageNumber } from '@quranjs/api'
import { ServerClient } from '@quranjs/api/server'
import { QuranChapter, QuranPage } from '../types'
import { getQuranFoundationClient } from './client'
import {
  normalizeQuranLoadError,
  QuranMalformedResponseError,
} from './errors'
import { getQuranChapters } from './get-chapters'

const pageCache = new Map<number, Promise<QuranPage>>()

function isValidPage(pageNumber: number): boolean {
  return Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 604
}

export async function loadQuranPage(
  pageNumber: number,
  client: ServerClient,
  chapters: Promise<Map<number, QuranChapter>>,
): Promise<QuranPage> {
  if (!isValidPage(pageNumber)) {
    throw new QuranMalformedResponseError()
  }

  let verses
  let chapterMap: Map<number, QuranChapter>
  try {
    ;[verses, chapterMap] = await Promise.all([
      client.content.v4.verses.byPage(String(pageNumber) as PageNumber, {
        fields: { chapterId: true, textUthmani: true },
        mushaf: 4,
        perPage: 50,
        words: false,
      }),
      chapters,
    ])
  } catch (error) {
    throw normalizeQuranLoadError(error)
  }

  if (!Array.isArray(verses) || verses.length === 0) {
    throw new QuranMalformedResponseError()
  }

  const normalizedVerses = verses.map((verse) => {
    const chapterId = Number(verse.chapterId)
    if (
      !Number.isInteger(chapterId) ||
      typeof verse.verseKey !== 'string' ||
      typeof verse.verseNumber !== 'number' ||
      typeof verse.textUthmani !== 'string' ||
      verse.textUthmani.trim() === '' ||
      verse.pageNumber !== pageNumber
    ) {
      throw new QuranMalformedResponseError()
    }
    return {
      chapterId,
      chapterNameArabic: chapterMap.get(chapterId)?.nameArabic ?? null,
      verseKey: verse.verseKey,
      verseNumber: verse.verseNumber,
      uthmaniText: verse.textUthmani,
    }
  })

  return { pageNumber, verses: normalizedVerses }
}

export function getQuranPage(pageNumber: number): Promise<QuranPage> {
  const cached = pageCache.get(pageNumber)
  if (cached) return cached

  const request = loadQuranPage(
    pageNumber,
    getQuranFoundationClient(),
    getQuranChapters(),
  ).catch((error) => {
    pageCache.delete(pageNumber)
    throw error
  })
  pageCache.set(pageNumber, request)
  return request
}
