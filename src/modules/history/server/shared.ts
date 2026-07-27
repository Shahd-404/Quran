import {
  formatHistoryTime,
  formatHistoryTimestampDate,
  isValidLocalDate,
  isValidTimezone,
  localDateFromTimestamp,
} from '../formatting'
import {
  HistoryEvent,
  HistoryPagination,
  KhatmaHistorySummary,
} from '../types'

export const HISTORY_PAGE_SIZE = 20
export const SAFE_HISTORY_ERROR =
  'تعذّر تحميل سجل القراءة الآن. حاول مرة أخرى بعد قليل.'
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type EventRow = {
  id: string
  reading_session_id: string
  reading_plan_id: string
  khatma_id: string
  daily_assignment_id: string
  start_page: number
  end_page: number
  completed_at: string
  daily_assignments: unknown
  reading_sessions: unknown
  reading_plans: unknown
}

type KhatmaRow = {
  khatma_id: string
  reading_plan_id: string | null
  cycle_number: number
  khatma_status: string
  start_page: number
  started_at: string
  completed_at: string | null
  timezone: string
  current_unread_page: number | null
  completed_pages: number | string
  completed_sessions: number | string
}

export const HISTORY_EVENT_SELECT = [
  'id',
  'reading_session_id',
  'reading_plan_id',
  'khatma_id',
  'daily_assignment_id',
  'start_page',
  'end_page',
  'completed_at',
  'daily_assignments(local_date,timezone)',
  'reading_sessions(session_order)',
  'reading_plans(timezone)',
].join(',')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function relatedRecord(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value
  if (Array.isArray(value) && value.length === 1 && isRecord(value[0])) {
    return value[0]
  }
  return null
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0
}

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : value
  return Number.isSafeInteger(parsed) && Number(parsed) >= 0
    ? Number(parsed)
    : null
}

function validTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    !Number.isNaN(new Date(value).getTime())
  )
}

export function normalizeHistoryPage(
  value: string | string[] | number | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d+$/.test(raw)
        ? Number(raw)
        : Number.NaN
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 10_000
    ? parsed
    : 1
}

export function buildPagination(
  page: number,
  totalEvents: number,
): HistoryPagination {
  const totalPages = Math.max(1, Math.ceil(totalEvents / HISTORY_PAGE_SIZE))
  return {
    page,
    pageSize: HISTORY_PAGE_SIZE,
    totalEvents,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  }
}

export function parseHistoryEvents(value: unknown): HistoryEvent[] | null {
  if (!Array.isArray(value)) return null
  const events: HistoryEvent[] = []

  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.reading_session_id !== 'string' ||
      typeof item.reading_plan_id !== 'string' ||
      typeof item.khatma_id !== 'string' ||
      typeof item.daily_assignment_id !== 'string' ||
      !positiveInteger(item.start_page) ||
      !positiveInteger(item.end_page) ||
      item.start_page > item.end_page ||
      item.end_page > 604 ||
      !validTimestamp(item.completed_at)
    ) {
      return null
    }

    const row = item as EventRow
    const assignment = relatedRecord(row.daily_assignments)
    const session = relatedRecord(row.reading_sessions)
    const plan = relatedRecord(row.reading_plans)
    const assignmentTimezone =
      assignment && typeof assignment.timezone === 'string'
        ? assignment.timezone
        : null
    const planTimezone =
      plan && typeof plan.timezone === 'string' ? plan.timezone : null
    const timezone = assignmentTimezone ?? planTimezone
    if (!timezone || !isValidTimezone(timezone)) return null

    const savedLocalDate =
      assignment && typeof assignment.local_date === 'string'
        ? assignment.local_date
        : null
    const localDate =
      savedLocalDate && isValidLocalDate(savedLocalDate)
        ? savedLocalDate
        : localDateFromTimestamp(row.completed_at, timezone)
    const sessionOrder =
      session && positiveInteger(session.session_order)
        ? Number(session.session_order)
        : null

    events.push({
      id: row.id,
      readingSessionId: row.reading_session_id,
      readingPlanId: row.reading_plan_id,
      khatmaId: row.khatma_id,
      assignmentId: row.daily_assignment_id,
      sessionOrder,
      startPage: row.start_page,
      endPage: row.end_page,
      pageCount: row.end_page - row.start_page + 1,
      completedAt: row.completed_at,
      localDate,
      timezone,
      formattedCompletionTime: formatHistoryTime(
        row.completed_at,
        timezone,
      ),
    })
  }

  return events
}

export function parseKhatmaRows(
  value: unknown,
): KhatmaHistorySummary[] | null {
  if (!Array.isArray(value)) return null
  const khatmas: KhatmaHistorySummary[] = []

  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.khatma_id !== 'string' ||
      !(
        typeof item.reading_plan_id === 'string' ||
        item.reading_plan_id === null
      ) ||
      !positiveInteger(item.cycle_number) ||
      !['active', 'completed'].includes(String(item.khatma_status)) ||
      !positiveInteger(item.start_page) ||
      item.start_page > 604 ||
      !validTimestamp(item.started_at) ||
      !(
        item.completed_at === null ||
        validTimestamp(item.completed_at)
      ) ||
      typeof item.timezone !== 'string' ||
      !isValidTimezone(item.timezone) ||
      !(
        item.current_unread_page === null ||
        (positiveInteger(item.current_unread_page) &&
          item.current_unread_page <= 604)
      )
    ) {
      return null
    }

    const row = item as KhatmaRow
    const completedPages = parseNonNegativeInteger(row.completed_pages)
    const completedSessions = parseNonNegativeInteger(
      row.completed_sessions,
    )
    if (completedPages === null || completedSessions === null) return null
    if (row.khatma_status === 'active' && row.current_unread_page === null) {
      return null
    }
    if (row.khatma_status === 'completed' && row.completed_at === null) {
      return null
    }

    const totalPages = 604 - row.start_page + 1
    const percentage = Math.min(
      100,
      Math.max(0, Math.round((completedPages / totalPages) * 100)),
    )
    khatmas.push({
      id: row.khatma_id,
      readingPlanId: row.reading_plan_id,
      cycleNumber: row.cycle_number,
      status: row.khatma_status as 'active' | 'completed',
      startPage: row.start_page,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      timezone: row.timezone,
      currentUnreadPage: row.current_unread_page,
      completedPages,
      completedSessions,
      totalPages,
      percentage,
      formattedStartDate: formatHistoryTimestampDate(
        row.started_at,
        row.timezone,
      ),
      formattedCompletionDate: row.completed_at
        ? formatHistoryTimestampDate(row.completed_at, row.timezone)
        : null,
    })
  }

  return khatmas
}
