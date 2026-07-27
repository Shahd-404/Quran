import { SupabaseClient } from '@supabase/supabase-js'
import { ReaderSession } from '../types'

export type RecordReadingPositionResult =
  | { success: true; changed: boolean }
  | { success: false; message: string }

const SAFE_SAVE_WARNING =
  'تعذّر حفظ موضع القراءة هذه المرة. يمكنك متابعة القراءة والمحاولة مجددًا عند الانتقال.'

export async function recordReadingPosition(
  client: SupabaseClient,
  session: ReaderSession,
  pageNumber: number,
): Promise<RecordReadingPositionResult> {
  if (
    pageNumber < session.startPage ||
    pageNumber > session.endPage ||
    pageNumber < 1 ||
    pageNumber > 604
  ) {
    return { success: false, message: SAFE_SAVE_WARNING }
  }

  if (
    session.status === 'completed' ||
    (session.status === 'in_progress' &&
      session.lastOpenedPage === pageNumber)
  ) {
    return { success: true, changed: false }
  }

  const { error } = await client.rpc('record_reading_position', {
    p_session_id: session.id,
    p_page: pageNumber,
  })

  if (error) {
    return { success: false, message: SAFE_SAVE_WARNING }
  }
  return { success: true, changed: true }
}
