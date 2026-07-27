import { SupabaseClient } from '@supabase/supabase-js'
import {
  ReaderPersistedStatus,
  ReaderSession,
  ReaderSessionResult,
} from '../types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SAFE_LOAD_ERROR =
  'تعذّر تحميل جلسة الورد الآن. حاول مرة أخرى بعد قليل.'

type SessionRow = {
  id: string
  daily_assignment_id: string
  session_order: number
  start_page: number
  end_page: number
  status: ReaderPersistedStatus
  last_opened_page: number | null
  first_opened_at: string | null
  last_opened_at: string | null
}

type AssignmentRow = {
  id: string
  reading_plan_id: string
  local_date: string
  status: 'pending' | 'in_progress' | 'completed'
}

type PlanRow = {
  id: string
  current_unread_page: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function parseSession(value: unknown): SessionRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.daily_assignment_id !== 'string' ||
    typeof value.session_order !== 'number' ||
    typeof value.start_page !== 'number' ||
    typeof value.end_page !== 'number' ||
    !['pending', 'in_progress', 'completed'].includes(String(value.status)) ||
    !(
      value.last_opened_page === null ||
      typeof value.last_opened_page === 'number'
    ) ||
    !isNullableString(value.first_opened_at) ||
    !isNullableString(value.last_opened_at)
  ) {
    return null
  }
  return value as SessionRow
}

function parseAssignment(value: unknown): AssignmentRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.reading_plan_id !== 'string' ||
    typeof value.local_date !== 'string' ||
    !['pending', 'in_progress', 'completed'].includes(String(value.status))
  ) {
    return null
  }
  return value as AssignmentRow
}

function parsePlan(value: unknown): PlanRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.current_unread_page !== 'number'
  ) {
    return null
  }
  return value as PlanRow
}

export async function getReaderSession(
  client: SupabaseClient,
  sessionId: string,
): Promise<ReaderSessionResult> {
  const { data: authData } = await client.auth.getUser()
  const user = authData?.user
  if (!user) return { status: 'unauthenticated' }

  if (!UUID_PATTERN.test(sessionId)) {
    return { status: 'not_found' }
  }

  const sessionResult = await client
    .from('reading_sessions')
    .select(
      'id,daily_assignment_id,session_order,start_page,end_page,status,last_opened_page,first_opened_at,last_opened_at',
    )
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (sessionResult.error) {
    return { status: 'error', message: SAFE_LOAD_ERROR }
  }
  if (!sessionResult.data) {
    return { status: 'not_found' }
  }

  const session = parseSession(sessionResult.data)
  if (!session) {
    return { status: 'error', message: SAFE_LOAD_ERROR }
  }

  const assignmentResult = await client
    .from('daily_assignments')
    .select('id,reading_plan_id,local_date,status')
    .eq('id', session.daily_assignment_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (assignmentResult.error) {
    return { status: 'error', message: SAFE_LOAD_ERROR }
  }
  const assignment = parseAssignment(assignmentResult.data)
  if (!assignment) {
    return { status: 'not_found' }
  }

  const planResult = await client
    .from('reading_plans')
    .select('id,current_unread_page')
    .eq('id', assignment.reading_plan_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (planResult.error) {
    return { status: 'error', message: SAFE_LOAD_ERROR }
  }
  const plan = parsePlan(planResult.data)
  if (!plan) {
    return { status: 'not_found' }
  }

  const normalized: ReaderSession = {
    id: session.id,
    assignmentId: assignment.id,
    planId: plan.id,
    sessionOrder: session.session_order,
    startPage: session.start_page,
    endPage: session.end_page,
    status: session.status,
    lastOpenedPage: session.last_opened_page,
    firstOpenedAt: session.first_opened_at,
    lastOpenedAt: session.last_opened_at,
    assignmentDate: assignment.local_date,
    assignmentStatus: assignment.status,
    currentUnreadPage: plan.current_unread_page,
  }
  return { status: 'success', session: normalized }
}
