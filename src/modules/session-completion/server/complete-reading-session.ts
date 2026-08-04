import { SupabaseClient } from '@supabase/supabase-js'
import {
  completionCodeToArabic,
  mapCompletionDatabaseError,
} from './error-mapping'
import {
  CompleteReadingSessionResult,
  OfflineCompletionAction,
  SessionCompletionFailure,
} from './types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RpcError = {
  code?: string
  message?: string
  details?: string
}

type CompletionRow = {
  session_id: string
  session_completed: boolean
  assignment_completed: boolean
  khatma_completed: boolean
  plan_completed: boolean
  current_unread_page: number
  already_completed: boolean
}

function failure(code: SessionCompletionFailure['code']): SessionCompletionFailure {
  return { success: false, code, message: completionCodeToArabic(code) }
}

function isCompletionRow(value: unknown): value is CompletionRow {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.session_id === 'string' &&
    row.session_completed === true &&
    typeof row.assignment_completed === 'boolean' &&
    typeof row.khatma_completed === 'boolean' &&
    typeof row.plan_completed === 'boolean' &&
    Number.isInteger(row.current_unread_page) &&
    Number(row.current_unread_page) >= 1 &&
    Number(row.current_unread_page) <= 604 &&
    typeof row.already_completed === 'boolean'
  )
}

export async function completeReadingSession(
  client: SupabaseClient,
  sessionId: string,
  offlineAction?: OfflineCompletionAction,
  now = new Date(),
): Promise<CompleteReadingSessionResult> {
  if (!UUID_PATTERN.test(sessionId)) {
    return failure('SESSION_NOT_FOUND')
  }

  let rpcName = 'complete_reading_session'
  let rpcArguments: Record<string, string> = { p_session_id: sessionId }
  if (offlineAction) {
    const occurredAt = Date.parse(offlineAction.occurredAt)
    if (
      !UUID_PATTERN.test(offlineAction.idempotencyKey) ||
      !Number.isFinite(occurredAt) ||
      occurredAt < now.getTime() - 8 * 24 * 60 * 60 * 1000 ||
      occurredAt > now.getTime() + 5 * 60 * 1000
    ) {
      return failure('OFFLINE_ACTION_INVALID')
    }
    rpcName = 'complete_offline_reading_session'
    rpcArguments = {
      p_session_id: sessionId,
      p_idempotency_key: offlineAction.idempotencyKey,
      p_occurred_at: new Date(occurredAt).toISOString(),
    }
  }

  const { data, error } = (await client.rpc(rpcName, rpcArguments)) as {
    data: unknown
    error: RpcError | null
  }

  if (error) {
    const code = mapCompletionDatabaseError(
      `${error.message ?? ''} ${error.details ?? ''}`,
    )
    console.error('[completeReadingSession] RPC failed', {
      databaseCode: error.code ?? 'unknown',
      mappedCode: code,
    })
    return failure(code)
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!isCompletionRow(row) || row.session_id !== sessionId) {
    return failure('INTERNAL_ERROR')
  }

  return {
    success: true,
    sessionId: row.session_id,
    sessionCompleted: true,
    assignmentCompleted: row.assignment_completed,
    khatmaCompleted: row.khatma_completed,
    planCompleted: row.plan_completed,
    currentUnreadPage: row.current_unread_page,
    alreadyCompleted: row.already_completed,
  }
}
