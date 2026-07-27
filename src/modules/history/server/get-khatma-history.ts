import { SupabaseClient } from '@supabase/supabase-js'
import { groupHistoryEvents } from '../group-history-events'
import { KhatmaHistoryResult } from '../types'
import {
  buildPagination,
  HISTORY_EVENT_SELECT,
  HISTORY_PAGE_SIZE,
  normalizeHistoryPage,
  parseHistoryEvents,
  parseKhatmaRows,
  SAFE_HISTORY_ERROR,
  UUID_PATTERN,
} from './shared'

export async function getKhatmaHistory(
  client: SupabaseClient,
  khatmaId: string,
  pageInput: string | string[] | number | undefined,
): Promise<KhatmaHistoryResult> {
  const { data: authData, error: authError } =
    await client.auth.getUser()
  const user = authData?.user
  if (authError || !user) return { status: 'unauthenticated' }
  if (!UUID_PATTERN.test(khatmaId)) return { status: 'not_found' }

  const detailsResult = await client.rpc('get_khatma_history_details', {
    p_khatma_id: khatmaId,
  })
  if (detailsResult.error) {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }

  let khatmaRows
  try {
    khatmaRows = parseKhatmaRows(detailsResult.data)
  } catch {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }
  if (!khatmaRows) {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }
  if (khatmaRows.length === 0) return { status: 'not_found' }
  if (khatmaRows.length !== 1 || khatmaRows[0].id !== khatmaId) {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }

  const page = normalizeHistoryPage(pageInput)
  const offset = (page - 1) * HISTORY_PAGE_SIZE
  const eventResult = await client
    .from('reading_progress_events')
    .select(HISTORY_EVENT_SELECT, { count: 'exact' })
    .eq('user_id', user.id)
    .eq('khatma_id', khatmaId)
    .order('completed_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + HISTORY_PAGE_SIZE - 1)
  if (eventResult.error) {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }

  try {
    const events = parseHistoryEvents(eventResult.data)
    const totalEvents =
      typeof eventResult.count === 'number' &&
      Number.isSafeInteger(eventResult.count) &&
      eventResult.count >= 0
        ? eventResult.count
        : null
    if (
      !events ||
      totalEvents === null ||
      events.some((event) => event.khatmaId !== khatmaId)
    ) {
      return { status: 'error', message: SAFE_HISTORY_ERROR }
    }

    return {
      status: 'success',
      data: {
        khatma: khatmaRows[0],
        dayGroups: groupHistoryEvents(events),
        pagination: buildPagination(page, totalEvents),
      },
    }
  } catch {
    return { status: 'error', message: SAFE_HISTORY_ERROR }
  }
}
