import { SupabaseClient } from '@supabase/supabase-js'
import {
  PreviousPlanConfiguration,
  PreviousPlanResult,
} from './types'

type CompletedPlanRow = {
  id: string
  daily_pages: number
  sessions_per_day: number
  timezone: string
}

type CompletedKhatmaRow = {
  cycle_number: number
}

type ScheduleRow = {
  session_order: number
  scheduled_time: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parsePlan(value: unknown): CompletedPlanRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !Number.isInteger(value.daily_pages) ||
    !Number.isInteger(value.sessions_per_day) ||
    typeof value.timezone !== 'string'
  ) {
    return null
  }
  return value as CompletedPlanRow
}

function parseKhatma(value: unknown): CompletedKhatmaRow | null {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.cycle_number) ||
    Number(value.cycle_number) < 1
  ) {
    return null
  }
  return value as CompletedKhatmaRow
}

function parseSchedules(
  value: unknown,
  expectedCount: number,
): PreviousPlanConfiguration['schedules'] | null {
  if (!Array.isArray(value) || value.length !== expectedCount) return null
  const rows = value.map((item): ScheduleRow | null => {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.session_order) ||
      typeof item.scheduled_time !== 'string'
    ) {
      return null
    }
    return item as ScheduleRow
  })
  if (rows.some((row) => row === null)) return null

  const schedules = (rows as ScheduleRow[]).map((row) => ({
    sessionOrder: row.session_order,
    scheduledTime: row.scheduled_time.slice(0, 5),
  }))
  const isComplete = schedules.every(
    (schedule, index) =>
      schedule.sessionOrder === index + 1 &&
      /^\d{2}:\d{2}$/.test(schedule.scheduledTime),
  )
  return isComplete ? schedules : null
}

export async function getPreviousPlan(
  client: SupabaseClient,
): Promise<PreviousPlanResult> {
  const { data: userData, error: userError } = await client.auth.getUser()
  const user = userData?.user
  if (userError || !user) return { status: 'unauthenticated' }

  const activePlanResult = await client
    .from('reading_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (activePlanResult.error) return { status: 'error' }
  if (activePlanResult.data) return { status: 'active_plan' }

  const planResult = await client
    .from('reading_plans')
    .select('id,daily_pages,sessions_per_day,timezone')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (planResult.error) return { status: 'error' }
  if (!planResult.data) return { status: 'not_found' }
  const plan = parsePlan(planResult.data)
  if (!plan) return { status: 'error' }

  const khatmaResult = await client
    .from('khatmas')
    .select('cycle_number')
    .eq('user_id', user.id)
    .eq('reading_plan_id', plan.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (khatmaResult.error) return { status: 'error' }
  const khatma = parseKhatma(khatmaResult.data)
  if (!khatma) return { status: 'not_found' }

  const schedulesResult = await client
    .from('plan_schedule_times')
    .select('session_order,scheduled_time')
    .eq('plan_id', plan.id)
    .order('session_order', { ascending: true })
  if (schedulesResult.error) return { status: 'error' }
  const schedules = parseSchedules(
    schedulesResult.data,
    plan.sessions_per_day,
  )
  if (!schedules) return { status: 'error' }

  return {
    status: 'success',
    data: {
      planId: plan.id,
      dailyPages: plan.daily_pages,
      sessionsPerDay: plan.sessions_per_day,
      timezone: plan.timezone,
      previousCycleNumber: khatma.cycle_number,
      schedules,
    },
  }
}
