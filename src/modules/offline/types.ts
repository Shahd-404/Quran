import type { QuranPage } from '@/modules/quran/types'

export const OFFLINE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
export const OFFLINE_MAX_SESSIONS = 64
export const OFFLINE_MAX_PAGES = 120

export type OfflineSessionStatus = 'pending' | 'in_progress'

export type OfflineDownloadSession = {
  id: string
  assignmentDate: string
  sessionOrder: number
  startPage: number
  endPage: number
  scheduledFor: string
  status: OfflineSessionStatus
}

export type OfflineDownloadManifest = {
  success: true
  scopeKey: string
  localDate: string
  includeNextDays: boolean
  sessions: OfflineDownloadSession[]
}

export type OfflineAccountScope = {
  success: true
  scopeKey: string
}

export type OfflineDownloadBundle = {
  success: true
  scopeKey: string
  generatedAt: string
  expiresAt: string
  sessions: OfflineDownloadSession[]
  pages: QuranPage[]
}

export type OfflineApiFailureCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_REQUEST'
  | 'NO_ACTIVE_PLAN'
  | 'SESSION_NOT_ELIGIBLE'
  | 'DOWNLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'CONTENT_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export type OfflineApiFailure = {
  success: false
  code: OfflineApiFailureCode
  message: string
}
