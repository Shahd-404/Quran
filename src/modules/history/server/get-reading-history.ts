import { SupabaseClient } from '@supabase/supabase-js'
import { groupHistoryEvents } from '../group-history-events'
import { ReadingHistoryResult } from '../types'
import {
  buildPagination,
  HISTORY_EVENT_SELECT,
  HISTORY_PAGE_SIZE,
  normalizeHistoryPage,
  parseHistoryEvents,
  parseKhatmaRows,
  SAFE_HISTORY_ERROR,
} from './shared'

type SummaryRow = {
  total_completed_pages: number | string
  total_completed_sessions: number | string
  total_completed_khatmas: number | string
}

function parseCount(value: unknown): number | null {
  const parsed =
    typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : value
  return Number.isSafeInteger(parsed) && Number(parsed) >= 0
    ? Number(parsed)
    : null
}

function parseSummary(value: unknown): {
  totalCompletedPages: number
  totalCompletedSessions: number
  totalCompletedKhatmas: number
} | null {
  const row = Array.isArray(value) ? value[0] : null
  if (typeof row !== 'object' || row === null) return null
  const typed = row as SummaryRow
  const totalCompletedPages = parseCount(typed.total_completed_pages)
  const totalCompletedSessions = parseCount(
    typed.total_completed_sessions,
  )
  const totalCompletedKhatmas = parseCount(
    typed.total_completed_khatmas,
  )
  return totalCompletedPages === null ||
    totalCompletedSessions === null ||
    totalCompletedKhatmas === null
    ? null
    : {
        totalCompletedPages,
        totalCompletedSessions,
        totalCompletedKhatmas,
      }
}

export async function getReadingHistory(
  client: SupabaseClient,
  pageInput: string | string[] | number | undefined,
): Promise<ReadingHistoryResult> {
  const { data: authData, error: authError } =
    await client.auth.getUser()
  const user = authData?.user
  if (authError || !user) return { status: 'unauthenticated' }

  const page = normalizeHistoryPage(pageInput)
  const offset = (page - 1) * HISTORY_PAGE_SIZE

  const summaryResult = await client.rpc('get_reading_history_summary')
  if (summaryResult.error) {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }

  const archiveResult = await client.rpc('get_khatma_history_archive')
  if (archiveResult.error) {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }

  const eventResult = await client
    .from('reading_progress_events')
    .select(HISTORY_EVENT_SELECT, { count: 'exact' })
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + HISTORY_PAGE_SIZE - 1)
  if (eventResult.error) {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }

  try {
    const summary = parseSummary(summaryResult.data)
    const khatmas = parseKhatmaRows(archiveResult.data)
    const events = parseHistoryEvents(eventResult.data)
    const totalEvents = parseCount(eventResult.count)
    if (!summary || !khatmas || !events || totalEvents === null) {
      return { status: 'error', message: SAFE_HISTORY_ERROR }
    }

    return {
      status: 'success',
      data: {
        ...summary,
        currentKhatma:
          khatmas.find((khatma) => khatma.status === 'active') ?? null,
        completedKhatmas: khatmas.filter(
          (khatma) => khatma.status === 'completed',
        ),
        recentCompletedSessions: events.slice(0, 5),
        dayGroups: groupHistoryEvents(events),
        pagination: buildPagination(page, totalEvents),
      },
    }
  } catch {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }
}
