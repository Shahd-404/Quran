import { ServerClient } from '@quranjs/api/server'
import { QuranChapter } from '../types'
import { getQuranFoundationClient } from './client'
import {
  normalizeQuranLoadError,
  QuranMalformedResponseError,
} from './errors'

let chaptersPromise: Promise<Map<number, QuranChapter>> | null = null

export async function loadQuranChapters(
  client: ServerClient,
): Promise<Map<number, QuranChapter>> {
  let chapters
  try {
    chapters = await client.content.v4.chapters.list({ language: 'ar' })
  } catch (error) {
    throw normalizeQuranLoadError(error)
  }

  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new QuranMalformedResponseError()
  }

  const normalized = new Map<number, QuranChapter>()
  for (const chapter of chapters) {
    if (
      typeof chapter.id !== 'number' ||
      typeof chapter.nameArabic !== 'string' ||
      chapter.nameArabic.trim() === ''
    ) {
      throw new QuranMalformedResponseError()
    }
    normalized.set(chapter.id, {
      id: chapter.id,
      nameArabic: chapter.nameArabic,
    })
  }
  return normalized
}

export function getQuranChapters(): Promise<Map<number, QuranChapter>> {
  if (!chaptersPromise) {
    chaptersPromise = loadQuranChapters(getQuranFoundationClient()).catch((error) => {
      chaptersPromise = null
      throw error
    })
  }
  return chaptersPromise
}
