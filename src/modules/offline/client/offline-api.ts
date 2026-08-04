'use client'

import type {
  OfflineApiFailure,
  OfflineAccountScope,
  OfflineDownloadBundle,
  OfflineDownloadManifest,
  OfflineDownloadSession,
} from '../types'
import type { QuranPage, QuranVerse } from '@/modules/quran/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSession(value: unknown): value is OfflineDownloadSession {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.assignmentDate === 'string' &&
    Number.isInteger(value.sessionOrder) &&
    Number.isInteger(value.startPage) &&
    Number(value.startPage) >= 1 &&
    Number.isInteger(value.endPage) &&
    Number(value.endPage) <= 604 &&
    Number(value.startPage) <= Number(value.endPage) &&
    typeof value.scheduledFor === 'string' &&
    (value.status === 'pending' || value.status === 'in_progress')
  )
}

function isVerse(value: unknown): value is QuranVerse {
  return (
    isRecord(value) &&
    Number.isInteger(value.chapterId) &&
    (typeof value.chapterNameArabic === 'string' || value.chapterNameArabic === null) &&
    typeof value.verseKey === 'string' &&
    Number.isInteger(value.verseNumber) &&
    typeof value.uthmaniText === 'string' &&
    value.uthmaniText.length > 0
  )
}

function isPage(value: unknown): value is QuranPage {
  return (
    isRecord(value) &&
    Number.isInteger(value.pageNumber) &&
    Number(value.pageNumber) >= 1 &&
    Number(value.pageNumber) <= 604 &&
    Array.isArray(value.verses) &&
    value.verses.length > 0 &&
    value.verses.every(isVerse)
  )
}

function parseFailure(value: unknown): OfflineApiFailure | null {
  if (
    !isRecord(value) ||
    value.success !== false ||
    typeof value.code !== 'string' ||
    typeof value.message !== 'string'
  ) {
    return null
  }
  return value as OfflineApiFailure
}

export function parseOfflineManifest(value: unknown): OfflineDownloadManifest | OfflineApiFailure | null {
  const failure = parseFailure(value)
  if (failure) return failure
  if (
    !isRecord(value) ||
    value.success !== true ||
    typeof value.scopeKey !== 'string' ||
    typeof value.localDate !== 'string' ||
    typeof value.includeNextDays !== 'boolean' ||
    !Array.isArray(value.sessions) ||
    !value.sessions.every(isSession)
  ) {
    return null
  }
  return value as OfflineDownloadManifest
}

export function parseOfflineBundle(value: unknown): OfflineDownloadBundle | OfflineApiFailure | null {
  const failure = parseFailure(value)
  if (failure) return failure
  if (
    !isRecord(value) ||
    value.success !== true ||
    typeof value.scopeKey !== 'string' ||
    typeof value.generatedAt !== 'string' ||
    typeof value.expiresAt !== 'string' ||
    !Array.isArray(value.sessions) ||
    !value.sessions.every(isSession) ||
    !Array.isArray(value.pages) ||
    !value.pages.every(isPage)
  ) {
    return null
  }
  return value as OfflineDownloadBundle
}

export function parseOfflineScope(value: unknown): OfflineAccountScope | OfflineApiFailure | null {
  const failure = parseFailure(value)
  if (failure) return failure
  if (!isRecord(value) || value.success !== true || typeof value.scopeKey !== 'string') return null
  return { success: true, scopeKey: value.scopeKey }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchOfflineManifest(includeNextDays: boolean) {
  const response = await fetch(`/api/offline-wird?days=${includeNextDays ? '7' : '0'}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const result = parseOfflineManifest(await readJson(response))
  if (!result) throw new Error('MALFORMED_OFFLINE_MANIFEST')
  return result
}

export async function fetchOfflineScope() {
  const response = await fetch('/api/offline-wird?scope=1', {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const result = parseOfflineScope(await readJson(response))
  if (!result) throw new Error('MALFORMED_OFFLINE_SCOPE')
  return result
}

export async function fetchOfflineBundle(sessionIds: string[]) {
  const response = await fetch('/api/offline-wird', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionIds }),
  })
  const result = parseOfflineBundle(await readJson(response))
  if (!result) throw new Error('MALFORMED_OFFLINE_BUNDLE')
  return result
}
