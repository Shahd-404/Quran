export type DeleteReadingDataCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_CONFIRMATION'
  | 'DELETE_READING_DATA_FAILED'
  | 'INTERNAL_ERROR'

export type DeletedReadingDataCounts = {
  plansDeleted: number
  khatmasDeleted: number
  schedulesDeleted: number
  assignmentsDeleted: number
  sessionsDeleted: number
  progressEventsDeleted: number
  subscriptionsDeleted: number
  deliveriesDeleted: number
}

export type DeleteReadingDataResult =
  | { success: true; deleted: DeletedReadingDataCounts }
  | { success: false; code: DeleteReadingDataCode; message: string }

const messages: Record<DeleteReadingDataCode, string> = {
  UNAUTHENTICATED: 'يرجى تسجيل الدخول أولًا.',
  INVALID_CONFIRMATION: 'عبارة التأكيد غير مطابقة.',
  DELETE_READING_DATA_FAILED: 'تعذر مسح بيانات القراءة. لم يتم حذف أي بيانات.',
  INTERNAL_ERROR: 'تعذر مسح بيانات القراءة الآن. حاول مرة أخرى لاحقًا.',
}

function mapDatabaseError(error: unknown): DeleteReadingDataCode {
  const safeText =
    typeof error === 'object' && error !== null
      ? `${String((error as { message?: unknown }).message ?? '')} ${String((error as { details?: unknown }).details ?? '')}`
      : ''
  if (safeText.includes('UNAUTHENTICATED')) return 'UNAUTHENTICATED'
  if (safeText.includes('INVALID_CONFIRMATION')) return 'INVALID_CONFIRMATION'
  if (safeText.includes('DELETE_READING_DATA_FAILED')) return 'DELETE_READING_DATA_FAILED'
  return 'INTERNAL_ERROR'
}

function readCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}

function parseDeletedCounts(data: unknown): DeletedReadingDataCounts | null {
  if (typeof data !== 'object' || data === null) return null
  const result = data as Record<string, unknown>
  if (result.success !== true || typeof result.deleted !== 'object' || result.deleted === null) {
    return null
  }
  const deleted = result.deleted as Record<string, unknown>
  const counts = {
    plansDeleted: readCount(deleted.plans_deleted),
    khatmasDeleted: readCount(deleted.khatmas_deleted),
    schedulesDeleted: readCount(deleted.schedules_deleted),
    assignmentsDeleted: readCount(deleted.assignments_deleted),
    sessionsDeleted: readCount(deleted.sessions_deleted),
    progressEventsDeleted: readCount(deleted.progress_events_deleted),
    subscriptionsDeleted: readCount(deleted.subscriptions_deleted),
    deliveriesDeleted: readCount(deleted.deliveries_deleted),
  }
  return Object.values(counts).every((count) => count !== null)
    ? counts as DeletedReadingDataCounts
    : null
}

export async function deleteReadingData(
  client: {
    auth: { getUser: () => Promise<{ data?: { user?: unknown } }> }
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<{ data?: unknown; error?: unknown }>
  },
  confirmation: string,
): Promise<DeleteReadingDataResult> {
  if (confirmation !== 'حذف بياناتي') {
    return { success: false, code: 'INVALID_CONFIRMATION', message: messages.INVALID_CONFIRMATION }
  }

  const { data } = await client.auth.getUser()
  if (!data?.user) {
    return { success: false, code: 'UNAUTHENTICATED', message: messages.UNAUTHENTICATED }
  }

  const { data: rpcData, error } = await client.rpc('delete_my_reading_data', {
    p_confirmation: confirmation,
  })
  if (error) {
    const code = mapDatabaseError(error)
    return { success: false, code, message: messages[code] }
  }
  const deleted = parseDeletedCounts(rpcData)
  if (!deleted) {
    return { success: false, code: 'INTERNAL_ERROR', message: messages.INTERNAL_ERROR }
  }
  return { success: true, deleted }
}
