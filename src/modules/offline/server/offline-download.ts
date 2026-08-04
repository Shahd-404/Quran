import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalDateString } from '@/modules/dashboard/formatting'
import { getQuranPage } from '@/modules/quran/server/get-page'
import type { QuranPage } from '@/modules/quran/types'
import {
  OFFLINE_MAX_PAGES,
  OFFLINE_MAX_SESSIONS,
  OFFLINE_RETENTION_MS,
  type OfflineApiFailure,
  type OfflineDownloadBundle,
  type OfflineDownloadManifest,
  type OfflineDownloadSession,
  type OfflineAccountScope,
} from '../types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DOWNLOAD_CONCURRENCY = 4

const SAFE_MESSAGES = {
  UNAUTHENTICATED: 'سجّل الدخول لتنزيل وردك للقراءة دون اتصال.',
  INVALID_REQUEST: 'تعذّر بدء التنزيل لأن الطلب غير صالح.',
  NO_ACTIVE_PLAN: 'لا توجد خطة ورد نشطة يمكن تنزيل جلساتها.',
  SESSION_NOT_ELIGIBLE: 'تغيّرت جلسات الورد أو لم تعد مؤهلة للتنزيل. حدّث القائمة وحاول مجددًا.',
  DOWNLOAD_TOO_LARGE: 'حجم التنزيل المطلوب أكبر من الحد الآمن. اختر جلسات أقل.',
  RATE_LIMITED: 'تم الوصول إلى حد التنزيل المؤقت. حاول مرة أخرى بعد قليل.',
  CONTENT_UNAVAILABLE: 'تعذّر تجهيز نص الورد كاملًا الآن. لم يُحفظ تنزيل جزئي.',
  INTERNAL_ERROR: 'تعذّر تجهيز التنزيل الآن. حاول مرة أخرى بعد قليل.',
} as const

type ActivePlan = { id: string; timezone: string }
type AssignmentRow = { id: string; local_date: string }
type SessionRow = {
  id: string
  daily_assignment_id: string
  session_order: number
  start_page: number
  end_page: number
  scheduled_for: string
  status: 'pending' | 'in_progress'
}

type ManifestContext = {
  scopeKey: string
  localDate: string
  sessions: OfflineDownloadSession[]
}

type OfflineDownloadResult = OfflineDownloadBundle | OfflineApiFailure
type OfflineManifestResult = OfflineDownloadManifest | OfflineApiFailure
type PageLoader = (pageNumber: number) => Promise<QuranPage>

function failure(code: keyof typeof SAFE_MESSAGES): OfflineApiFailure {
  return { success: false, code, message: SAFE_MESSAGES[code] }
}

function isFailure(value: ManifestContext | OfflineApiFailure): value is OfflineApiFailure {
  return 'success' in value && value.success === false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isQuranPage(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 604
}

function parsePlan(value: unknown): ActivePlan | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.timezone !== 'string') {
    return null
  }
  return { id: value.id, timezone: value.timezone }
}

function parseAssignments(value: unknown): AssignmentRow[] | null {
  if (!Array.isArray(value)) return null
  const assignments = value.filter(
    (row): row is AssignmentRow =>
      isRecord(row) && typeof row.id === 'string' && typeof row.local_date === 'string',
  )
  return assignments.length === value.length ? assignments : null
}

function parseSessions(value: unknown): SessionRow[] | null {
  if (!Array.isArray(value)) return null
  const sessions = value.filter(
    (row): row is SessionRow =>
      isRecord(row) &&
      typeof row.id === 'string' &&
      typeof row.daily_assignment_id === 'string' &&
      Number.isInteger(row.session_order) &&
      Number(row.session_order) >= 1 &&
      isQuranPage(row.start_page) &&
      isQuranPage(row.end_page) &&
      Number(row.start_page) <= Number(row.end_page) &&
      typeof row.scheduled_for === 'string' &&
      (row.status === 'pending' || row.status === 'in_progress'),
  )
  return sessions.length === value.length ? sessions : null
}

function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function accountScope(userId: string): string {
  return createHash('sha256')
    .update(`wird-offline-scope:v1:${userId}`)
    .digest('base64url')
}

export async function getOfflineAccountScope(
  client: SupabaseClient,
): Promise<OfflineAccountScope | OfflineApiFailure> {
  const { data: authData, error } = await client.auth.getUser()
  const user = authData?.user
  return error || !user
    ? failure('UNAUTHENTICATED')
    : { success: true, scopeKey: accountScope(user.id) }
}

async function loadEligibleSessions(
  client: SupabaseClient,
  includeNextDays: boolean,
  now: Date,
): Promise<ManifestContext | OfflineApiFailure> {
  const { data: authData, error: authError } = await client.auth.getUser()
  const user = authData?.user
  if (authError || !user) return failure('UNAUTHENTICATED')

  const planResult = await client
    .from('reading_plans')
    .select('id,timezone')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (planResult.error) return failure('INTERNAL_ERROR')
  const plan = parsePlan(planResult.data)
  if (!plan) return failure('NO_ACTIVE_PLAN')

  let localDate: string
  try {
    localDate = getLocalDateString(now, plan.timezone)
  } catch {
    return failure('INTERNAL_ERROR')
  }
  const maxDate = addLocalDays(localDate, includeNextDays ? 7 : 0)
  const assignmentResult = await client
    .from('daily_assignments')
    .select('id,local_date')
    .eq('user_id', user.id)
    .eq('reading_plan_id', plan.id)
    .lte('local_date', maxDate)
    .neq('status', 'completed')
    .order('local_date', { ascending: false })
    .limit(OFFLINE_MAX_SESSIONS)
  if (assignmentResult.error) return failure('INTERNAL_ERROR')
  const assignments = parseAssignments(assignmentResult.data)
  if (!assignments) return failure('INTERNAL_ERROR')
  const carriedDate = assignments
    .map((assignment) => assignment.local_date)
    .filter((assignmentDate) => assignmentDate <= localDate)
    .sort()
    .at(-1)
  const eligibleAssignments = assignments.filter(
    (assignment) =>
      assignment.local_date >= localDate || assignment.local_date === carriedDate,
  )
  if (eligibleAssignments.length === 0) {
    return { scopeKey: accountScope(user.id), localDate, sessions: [] }
  }

  const assignmentDates = new Map(eligibleAssignments.map((row) => [row.id, row.local_date]))
  const sessionResult = await client
    .from('reading_sessions')
    .select('id,daily_assignment_id,session_order,start_page,end_page,scheduled_for,status')
    .eq('user_id', user.id)
    .in('daily_assignment_id', eligibleAssignments.map((row) => row.id))
    .in('status', ['pending', 'in_progress'])
    .order('scheduled_for', { ascending: true })
  if (sessionResult.error) return failure('INTERNAL_ERROR')
  const rows = parseSessions(sessionResult.data)
  if (!rows) return failure('INTERNAL_ERROR')

  const sessions = rows.flatMap<OfflineDownloadSession>((row) => {
    const assignmentDate = assignmentDates.get(row.daily_assignment_id)
    return assignmentDate
      ? [{
          id: row.id,
          assignmentDate,
          sessionOrder: row.session_order,
          startPage: row.start_page,
          endPage: row.end_page,
          scheduledFor: row.scheduled_for,
          status: row.status,
        }]
      : []
  })
  if (sessions.length > OFFLINE_MAX_SESSIONS) return failure('DOWNLOAD_TOO_LARGE')
  return { scopeKey: accountScope(user.id), localDate, sessions }
}

function selectedPageNumbers(sessions: OfflineDownloadSession[]): number[] {
  const numbers = new Set<number>()
  sessions.forEach((session) => {
    for (let page = session.startPage; page <= session.endPage; page += 1) numbers.add(page)
  })
  return [...numbers].sort((left, right) => left - right)
}

async function loadPages(pageNumbers: number[], loadPage: PageLoader): Promise<QuranPage[]> {
  const pages: QuranPage[] = []
  for (let offset = 0; offset < pageNumbers.length; offset += DOWNLOAD_CONCURRENCY) {
    const batch = pageNumbers.slice(offset, offset + DOWNLOAD_CONCURRENCY)
    const loaded = await Promise.all(batch.map((pageNumber) => loadPage(pageNumber)))
    loaded.forEach((page, index) => {
      if (page.pageNumber !== batch[index]) throw new Error('OFFLINE_PAGE_MISMATCH')
      pages.push(page)
    })
  }
  return pages
}

export async function getOfflineDownloadManifest(
  client: SupabaseClient,
  includeNextDays: boolean,
  now = new Date(),
): Promise<OfflineManifestResult> {
  const context = await loadEligibleSessions(client, includeNextDays, now)
  if (isFailure(context)) return context
  return {
    success: true,
    scopeKey: context.scopeKey,
    localDate: context.localDate,
    includeNextDays,
    sessions: context.sessions,
  }
}

export async function createOfflineDownloadBundle(
  client: SupabaseClient,
  sessionIds: string[],
  now = new Date(),
  loadPage: PageLoader = getQuranPage,
): Promise<OfflineDownloadResult> {
  if (
    sessionIds.length === 0 ||
    sessionIds.length > OFFLINE_MAX_SESSIONS ||
    new Set(sessionIds).size !== sessionIds.length ||
    sessionIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    return failure('INVALID_REQUEST')
  }

  const context = await loadEligibleSessions(client, true, now)
  if (isFailure(context)) return context
  const eligibleById = new Map(context.sessions.map((session) => [session.id, session]))
  const sessions = sessionIds.flatMap((id) => {
    const session = eligibleById.get(id)
    return session ? [session] : []
  })
  if (sessions.length !== sessionIds.length) return failure('SESSION_NOT_ELIGIBLE')

  const pageNumbers = selectedPageNumbers(sessions)
  if (pageNumbers.length > OFFLINE_MAX_PAGES) return failure('DOWNLOAD_TOO_LARGE')

  const rateResult = await client.rpc('reserve_offline_quran_download')
  if (rateResult.error) return failure('INTERNAL_ERROR')
  if (rateResult.data !== true) return failure('RATE_LIMITED')

  let pages: QuranPage[]
  try {
    pages = await loadPages(pageNumbers, loadPage)
  } catch {
    return failure('CONTENT_UNAVAILABLE')
  }

  const generatedAt = now.toISOString()
  return {
    success: true,
    scopeKey: context.scopeKey,
    generatedAt,
    expiresAt: new Date(now.getTime() + OFFLINE_RETENTION_MS).toISOString(),
    sessions,
    pages,
  }
}
