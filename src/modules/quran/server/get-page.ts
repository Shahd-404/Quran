import { ApiParams, PageNumber, VerseKey } from '@quranjs/api'
import { ServerClient } from '@quranjs/api/server'
import { QuranChapter, QuranPage } from '../types'
import { QCF_V2_MUSHAF_ID, isValidQuranPage } from '../qcf-v2'
import { getQuranFoundationClient } from './client'
import {
  normalizeQuranLoadError,
  QuranMalformedResponseError,
} from './errors'
import { getQuranChapters } from './get-chapters'
import {
  normalizeQcfV2Page,
  pageRequiresBismillah,
} from './normalize-qcf-page'

const pageCache = new Map<number, Promise<QuranPage>>()
const bismillahCache = new WeakMap<ServerClient, Promise<string>>()

const QCF_V2_PAGE_QUERY: ApiParams = {
  fields: {
    chapterId: true,
    textUthmani: true,
    v2Page: true,
  },
  mushaf: QCF_V2_MUSHAF_ID,
  perPage: 50,
  wordFields: {
    charTypeName: true,
    codeV2: true,
    lineNumber: true,
    pageNumber: true,
    position: true,
    textQpcHafs: true,
    textUthmani: true,
    v2Page: true,
    verseKey: true,
  },
  words: true,
}

async function loadOfficialBismillahText(
  client: ServerClient,
): Promise<string> {
  let verse
  try {
    verse = await client.content.v4.verses.byKey('1:1' as VerseKey, {
      fields: { textUthmani: true },
      mushaf: QCF_V2_MUSHAF_ID,
      words: false,
    })
  } catch (error) {
    throw normalizeQuranLoadError(error)
  }

  if (typeof verse.textUthmani !== 'string' || verse.textUthmani.trim() === '') {
    throw new QuranMalformedResponseError()
  }
  return verse.textUthmani
}

function getOfficialBismillahText(client: ServerClient): Promise<string> {
  const cached = bismillahCache.get(client)
  if (cached) return cached

  const request = loadOfficialBismillahText(client).catch((error) => {
    bismillahCache.delete(client)
    throw error
  })
  bismillahCache.set(client, request)
  return request
}

export async function loadQuranPage(
  pageNumber: number,
  client: ServerClient,
  chapters: Promise<Map<number, QuranChapter>>,
): Promise<QuranPage> {
  if (!isValidQuranPage(pageNumber)) {
    throw new QuranMalformedResponseError()
  }

  let verses
  let chapterMap: Map<number, QuranChapter>
  try {
    ;[verses, chapterMap] = await Promise.all([
      client.content.v4.verses.byPage(String(pageNumber) as PageNumber, {
        ...QCF_V2_PAGE_QUERY,
      }),
      chapters,
    ])
  } catch (error) {
    throw normalizeQuranLoadError(error)
  }

  if (!Array.isArray(verses) || verses.length === 0) {
    throw new QuranMalformedResponseError()
  }

  const bismillahText = pageRequiresBismillah(
    pageNumber,
    verses,
    chapterMap,
  )
    ? await getOfficialBismillahText(client)
    : null

  return normalizeQcfV2Page(
    pageNumber,
    verses,
    chapterMap,
    bismillahText,
  )
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
