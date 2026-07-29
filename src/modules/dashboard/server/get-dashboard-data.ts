import { SupabaseClient } from '@supabase/supabase-js'
import { ensureCurrentAssignment } from '@/modules/daily-assignment/server/ensure-current-assignment'
import {
  formatAssignmentDate,
  formatCompletionDate,
  formatSessionTime,
  getLocalDateString,
} from '../formatting'
import { calculateDailyProgress, calculateKhatmaProgress } from '../progress'
import { deriveSessionState, selectHighlightedSession } from '../session-state'
import {
  DashboardDataResult,
  DashboardErrorCode,
  DashboardSession,
  PersistedSessionStatus,
} from '../types'

const SAFE_ERROR_MESSAGE = 'تعذّر تجهيز لوحة الورد الآن. حاول مرة أخرى بعد قليل.'
const MISSING_SESSIONS_MESSAGE = 'تعذّر عرض جلسات الورد بسبب نقص في إعدادات التكليف.'
const MISSING_KHATMA_MESSAGE = 'تعذّر العثور على الختمة النشطة المرتبطة بخطة الورد.'

type ProfileRow = { display_name: string | null }
type PlanRow = {
  id: string
  status: 'active' | 'completed'
  start_page: number
  current_unread_page: number
  daily_pages: number
  sessions_per_day: number
  timezone: string
  effective_from: string
  completed_at: string | null
}
type AssignmentRow = {
  id: string
  local_date: string
  target_pages: number
  status: 'pending' | 'in_progress' | 'completed'
}
type SessionRow = {
  id: string
  session_order: number
  start_page: number
  end_page: number
  scheduled_for: string
  status: PersistedSessionStatus
}
type KhatmaRow = {
  id: string
  status: 'active' | 'completed'
  start_page: number
  cycle_number: number
  completed_at: string | null
}

function errorResult(
  displayName: string | null,
  code: DashboardErrorCode,
  message = SAFE_ERROR_MESSAGE,
): DashboardDataResult {
  return { status: 'error', displayName, code, message }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseProfile(value: unknown): ProfileRow | null {
  if (!isRecord(value)) return null
  return typeof value.display_name === 'string' || value.display_name === null
    ? { display_name: value.display_name }
    : null
}

function parsePlan(value: unknown): PlanRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !['active', 'completed'].includes(String(value.status)) ||
    !isNumber(value.start_page) ||
    !isNumber(value.current_unread_page) ||
    !isNumber(value.daily_pages) ||
    !isNumber(value.sessions_per_day) ||
    typeof value.timezone !== 'string' ||
    typeof value.effective_from !== 'string' ||
    (typeof value.completed_at !== 'string' && value.completed_at !== null)
  ) {
    return null
  }
  return value as PlanRow
}

function parseAssignment(value: unknown): AssignmentRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.local_date !== 'string' ||
    !isNumber(value.target_pages) ||
    !['pending', 'in_progress', 'completed'].includes(String(value.status))
  ) {
    return null
  }
  return value as AssignmentRow
}

function parseSessions(value: unknown): SessionRow[] | null {
  if (!Array.isArray(value)) return null
  const validStatuses: PersistedSessionStatus[] = ['pending', 'in_progress', 'completed']
  const rows = value.filter(
    (row): row is SessionRow =>
      isRecord(row) &&
      typeof row.id === 'string' &&
      isNumber(row.session_order) &&
      isNumber(row.start_page) &&
      isNumber(row.end_page) &&
      typeof row.scheduled_for === 'string' &&
      validStatuses.includes(row.status as PersistedSessionStatus),
  )
  return rows.length === value.length ? rows : null
}

function parseKhatma(value: unknown): KhatmaRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !['active', 'completed'].includes(String(value.status)) ||
    !isNumber(value.start_page) ||
    !isNumber(value.cycle_number) ||
    (typeof value.completed_at !== 'string' && value.completed_at !== null)
  ) return null
  return value as KhatmaRow
}

export async function getDashboardData(
  client: SupabaseClient,
  now = new Date(),
): Promise<DashboardDataResult> {
  const { data: userData, error: userError } = await client.auth.getUser()
  const user = userData?.user
  if (userError || !user) return { status: 'unauthenticated' }

  const profileResult = await client
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  if (profileResult.error) return errorResult(null, 'PROFILE_QUERY_FAILED')
  const profile = parseProfile(profileResult.data)
  if (!profile) return errorResult(null, 'MALFORMED_DATA')
  const displayName = profile.display_name

  const planResult = await client
    .from('reading_plans')
    .select(
      'id,status,start_page,current_unread_page,daily_pages,sessions_per_day,timezone,effective_from,completed_at',
    )
    .eq('user_id', user.id)
    .in('status', ['active', 'completed'])
    .order('status', { ascending: true })
    .order('completed_at', { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle()
  if (planResult.error) return errorResult(displayName, 'PLAN_QUERY_FAILED')
  if (planResult.data === null) return { status: 'no_active_plan', displayName }
  const plan = parsePlan(planResult.data)
  if (!plan) return errorResult(displayName, 'MALFORMED_DATA')

  if (plan.status === 'completed') {
    const khatmaResult = await client
      .from('khatmas')
      .select('id,status,start_page,cycle_number,completed_at')
      .eq('user_id', user.id)
      .eq('reading_plan_id', plan.id)
      .eq('status', 'completed')
      .maybeSingle()
    if (khatmaResult.error) return errorResult(displayName, 'KHATMA_QUERY_FAILED')
    const khatma = parseKhatma(khatmaResult.data)
    if (!khatma || khatma.status !== 'completed' || !khatma.completed_at) {
      return errorResult(displayName, 'KHATMA_QUERY_FAILED', MISSING_KHATMA_MESSAGE)
    }

    try {
      return {
        status: 'completed_khatma',
        data: {
          profile: { displayName },
          plan: {
            id: plan.id,
            dailyPageTarget: plan.daily_pages,
            sessionsPerDay: plan.sessions_per_day,
            timezone: plan.timezone,
          },
          khatma: {
            id: khatma.id,
            cycleNumber: khatma.cycle_number,
            startPage: khatma.start_page,
            completedPages: 604 - khatma.start_page + 1,
            completedAt: khatma.completed_at,
            formattedCompletionDate: formatCompletionDate(
              khatma.completed_at,
              plan.timezone,
            ),
          },
        },
      }
    } catch {
      return errorResult(displayName, 'MALFORMED_DATA')
    }
  }

  try {
    if (plan.effective_from > getLocalDateString(now, plan.timezone)) {
      return {
        status: 'future_plan',
        data: {
          profile: { displayName },
          plan: {
            id: plan.id,
            effectiveFrom: plan.effective_from,
            formattedEffectiveDate: formatAssignmentDate(
              plan.effective_from,
              plan.timezone,
            ),
            currentUnreadPage: plan.current_unread_page,
            dailyPageTarget: plan.daily_pages,
            sessionsPerDay: plan.sessions_per_day,
            timezone: plan.timezone,
          },
        },
      }
    }
  } catch {
    return errorResult(displayName, 'MALFORMED_DATA')
  }

  let createdNow = false
  let carriedOver = false
  const ensuredAssignment = await ensureCurrentAssignment(client)
  if (!ensuredAssignment.success) {
    return errorResult(displayName, 'ASSIGNMENT_GENERATION_FAILED', ensuredAssignment.message)
  }
  createdNow = ensuredAssignment.createdNow
  carriedOver = ensuredAssignment.carriedOver
  const assignmentResult = await client
    .from('daily_assignments')
    .select('id,local_date,target_pages,status')
    .eq('id', ensuredAssignment.assignmentId)
    .eq('reading_plan_id', plan.id)
    .maybeSingle()
  if (assignmentResult.error) return errorResult(displayName, 'ASSIGNMENT_QUERY_FAILED')
  const assignment = parseAssignment(assignmentResult.data)
  if (!assignment) return errorResult(displayName, 'MALFORMED_DATA')

  const sessionsResult = await client
    .from('reading_sessions')
    .select('id,session_order,start_page,end_page,scheduled_for,status')
    .eq('daily_assignment_id', assignment.id)
    .order('session_order', { ascending: true })
  if (sessionsResult.error) return errorResult(displayName, 'ASSIGNMENT_QUERY_FAILED')
  const sessionRows = parseSessions(sessionsResult.data)
  if (!sessionRows) return errorResult(displayName, 'MALFORMED_DATA')
  if (sessionRows.length === 0) {
    return errorResult(displayName, 'MISSING_SESSIONS', MISSING_SESSIONS_MESSAGE)
  }

  const khatmaResult = await client
    .from('khatmas')
    .select('id,status,start_page,cycle_number,completed_at')
    .eq('user_id', user.id)
    .eq('reading_plan_id', plan.id)
    .eq('status', 'active')
    .maybeSingle()
  if (khatmaResult.error) return errorResult(displayName, 'KHATMA_QUERY_FAILED')
  const khatma = parseKhatma(khatmaResult.data)
  if (!khatma) return errorResult(displayName, 'KHATMA_QUERY_FAILED', MISSING_KHATMA_MESSAGE)

  try {
    const sessions: DashboardSession[] = sessionRows.map((session) => ({
      id: session.id,
      sessionOrder: session.session_order,
      startPage: session.start_page,
      endPage: session.end_page,
      pageCount: session.end_page - session.start_page + 1,
      scheduledFor: session.scheduled_for,
      formattedTime: formatSessionTime(session.scheduled_for, plan.timezone),
      persistedStatus: session.status,
      presentationState: deriveSessionState({
        persistedStatus: session.status,
        assignmentLocalDate: assignment.local_date,
        scheduledFor: session.scheduled_for,
        timezone: plan.timezone,
        now,
      }),
    }))

    const dailyProgress = calculateDailyProgress(sessions, assignment.target_pages)
    const khatmaProgress = calculateKhatmaProgress(
      plan.current_unread_page,
      khatma.start_page,
      khatma.status === 'completed',
    )

    return {
      status: 'success',
      data: {
        profile: { displayName },
        plan: {
          id: plan.id,
          status: plan.status,
          startPage: plan.start_page,
          currentUnreadPage: plan.current_unread_page,
          dailyPageTarget: plan.daily_pages,
          sessionsPerDay: plan.sessions_per_day,
          timezone: plan.timezone,
          effectiveFrom: plan.effective_from,
        },
        khatma: {
          id: khatma.id,
          status: khatma.status,
          startPage: khatma.start_page,
          ...khatmaProgress,
        },
        assignment: {
          id: assignment.id,
          localDate: assignment.local_date,
          formattedDate: formatAssignmentDate(assignment.local_date, plan.timezone),
          targetPages: assignment.target_pages,
          status: assignment.status,
          createdNow,
          carriedOver,
          ...dailyProgress,
        },
        sessions,
        highlightedSession: selectHighlightedSession(sessions),
      },
    }
  } catch {
    return errorResult(displayName, 'MALFORMED_DATA')
  }
}
