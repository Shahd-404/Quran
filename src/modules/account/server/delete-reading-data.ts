export type DeleteReadingDataCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_CONFIRMATION'
  | 'DELETE_FAILED'
  | 'INTERNAL_ERROR'

export type DeleteReadingDataResult =
  | { success: true }
  | { success: false; code: DeleteReadingDataCode; message: string }

const messages: Record<DeleteReadingDataCode, string> = {
  UNAUTHENTICATED: 'يرجى تسجيل الدخول أولًا.',
  INVALID_CONFIRMATION: 'عبارة التأكيد غير مطابقة.',
  DELETE_FAILED: 'تعذر مسح بيانات القراءة. لم يتم حذف أي بيانات.',
  INTERNAL_ERROR: 'تعذر مسح بيانات القراءة الآن. حاول مرة أخرى لاحقًا.',
}

function mapDatabaseError(error: unknown): DeleteReadingDataCode {
  const safeText =
    typeof error === 'object' && error !== null
      ? `${String((error as { message?: unknown }).message ?? '')} ${String((error as { details?: unknown }).details ?? '')}`
      : ''
  if (safeText.includes('UNAUTHENTICATED')) return 'UNAUTHENTICATED'
  if (safeText.includes('INVALID_CONFIRMATION')) return 'INVALID_CONFIRMATION'
  if (safeText.includes('DELETE_FAILED')) return 'DELETE_FAILED'
  return 'INTERNAL_ERROR'
}

export async function deleteReadingData(
  client: {
    auth: { getUser: () => Promise<{ data?: { user?: unknown } }> }
    rpc: (name: string, params: Record<string, unknown>) => Promise<{ error?: unknown }>
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

  const { error } = await client.rpc('delete_my_reading_data', {
    p_confirmation: confirmation,
  })
  if (error) {
    const code = mapDatabaseError(error)
    return { success: false, code, message: messages[code] }
  }
  return { success: true }
}
