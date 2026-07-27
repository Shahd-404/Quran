import { SupabaseClient } from '@supabase/supabase-js'
import {
  LoadPlanSettingsResult,
  PlanSettingsModel,
} from './types'

type PlanRow = {
  id: string
  current_unread_page: number
  daily_pages: number
  sessions_per_day: number
  timezone: string
}

type ScheduleRow = {
  session_order: number
  scheduled_time: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parsePlan(value: unknown): PlanRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !Number.isInteger(value.current_unread_page) ||
    !Number.isInteger(value.daily_pages) ||
    !Number.isInteger(value.sessions_per_day) ||
    typeof value.timezone !== 'string'
  ) {
    return null
  }
  return value as PlanRow
}

function parseSchedules(
  value: unknown,
  expectedCount: number,
): PlanSettingsModel['schedules'] | null {
  if (!Array.isArray(value) || value.length !== expectedCount) return null
  const schedules = value.map((item, index) => {
    if (
      !isRecord(item) ||
      item.session_order !== index + 1 ||
      typeof item.scheduled_time !== 'string'
    ) {
      return null
    }
    const scheduledTime = item.scheduled_time.slice(0, 5)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) return null
    return {
      sessionOrder: item.session_order as number,
      scheduledTime,
    }
  })
  return schedules.some((item) => item === null)
    ? null
    : (schedules as PlanSettingsModel['schedules'])
}

export async function getPlanSettings(
  client: SupabaseClient,
): Promise<LoadPlanSettingsResult> {
  const { data: userData, error: userError } = await client.auth.getUser()
  const user = userData?.user
  if (userError || !user) return { status: 'unauthenticated' }

  const planResult = await client
    .from('reading_plans')
    .select('id,current_unread_page,daily_pages,sessions_per_day,timezone')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (planResult.error) return { status: 'error' }
  if (!planResult.data) return { status: 'no_active_plan' }
  const plan = parsePlan(planResult.data)
  if (!plan) return { status: 'error' }

  const scheduleResult = await client
    .from('plan_schedule_times')
    .select('session_order,scheduled_time')
    .eq('plan_id', plan.id)
    .order('session_order', { ascending: true })
  if (scheduleResult.error) return { status: 'error' }
  const schedules = parseSchedules(
    scheduleResult.data,
    plan.sessions_per_day,
  )
  if (!schedules) return { status: 'error' }

  return {
    status: 'success',
    data: {
      planId: plan.id,
      currentUnreadPage: plan.current_unread_page,
      dailyPages: plan.daily_pages,
      sessionsPerDay: plan.sessions_per_day,
      timezone: plan.timezone,
      schedules,
    },
  }
}
