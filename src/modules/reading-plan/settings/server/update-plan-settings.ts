import { SupabaseClient } from '@supabase/supabase-js'
import {
  mapUpdatePlanSettingsDatabaseError,
  updatePlanSettingsCodeToArabic,
} from './error-mapping'
import {
  PlanSettingsSchedule,
  UpdatePlanSettingsErrorCode,
  UpdatePlanSettingsInput,
  UpdatePlanSettingsResult,
} from './types'

type RpcError = {
  code?: string
  message?: string
  details?: string
}

type UpdateRow = {
  plan_id: string
  daily_pages: number
  sessions_per_day: number
  updated_at: string
}

function failure(code: UpdatePlanSettingsErrorCode): UpdatePlanSettingsResult {
  return { success: false, code, message: updatePlanSettingsCodeToArabic(code) }
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function isValidSchedule(
  schedule: PlanSettingsSchedule,
  index: number,
  previousTime: string | null,
): boolean {
  return (
    Number.isInteger(schedule.sessionOrder) &&
    schedule.sessionOrder === index + 1 &&
    isValidTime(schedule.scheduledTime) &&
    (previousTime === null || schedule.scheduledTime > previousTime)
  )
}

function validateInput(
  input: UpdatePlanSettingsInput,
): UpdatePlanSettingsErrorCode | null {
  if (
    !Number.isInteger(input.dailyPages) ||
    input.dailyPages < 1 ||
    input.dailyPages > 604
  ) {
    return 'INVALID_DAILY_PAGES'
  }
  if (
    !Array.isArray(input.sessions) ||
    input.sessions.length < 1 ||
    input.sessions.length > 6 ||
    input.sessions.length > input.dailyPages
  ) {
    return 'INVALID_SESSIONS'
  }

  let previousTime: string | null = null
  for (let index = 0; index < input.sessions.length; index += 1) {
    const schedule = input.sessions[index]
    if (!isValidSchedule(schedule, index, previousTime)) {
      return 'INVALID_SCHEDULE'
    }
    previousTime = schedule.scheduledTime
  }
  return null
}

function isUpdateRow(value: unknown): value is UpdateRow {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.plan_id === 'string' &&
    Number.isInteger(row.daily_pages) &&
    Number(row.daily_pages) >= 1 &&
    Number(row.daily_pages) <= 604 &&
    Number.isInteger(row.sessions_per_day) &&
    Number(row.sessions_per_day) >= 1 &&
    Number(row.sessions_per_day) <= 6 &&
    typeof row.updated_at === 'string' &&
    !Number.isNaN(Date.parse(row.updated_at))
  )
}

export async function updatePlanSettings(
  client: SupabaseClient,
  input: UpdatePlanSettingsInput,
): Promise<UpdatePlanSettingsResult> {
  const validationCode = validateInput(input)
  if (validationCode) return failure(validationCode)

  const { data, error } = (await client.rpc(
    'update_active_reading_plan',
    {
      p_daily_pages: input.dailyPages,
      p_sessions: input.sessions.map((session) => ({
        sessionOrder: session.sessionOrder,
        scheduledTime: session.scheduledTime,
      })),
    },
  )) as { data: unknown; error: RpcError | null }

  if (error) {
    const code = mapUpdatePlanSettingsDatabaseError(
      `${error.message ?? ''} ${error.details ?? ''}`,
    )
    console.error('[updatePlanSettings] RPC failed', {
      databaseCode: error.code ?? 'unknown',
      mappedCode: code,
    })
    return failure(code)
  }

  const row = Array.isArray(data) ? data[0] : null
  if (
    !isUpdateRow(row) ||
    row.daily_pages !== input.dailyPages ||
    row.sessions_per_day !== input.sessions.length
  ) {
    return failure('INTERNAL_ERROR')
  }

  return {
    success: true,
    planId: row.plan_id,
    dailyPages: row.daily_pages,
    sessionsPerDay: row.sessions_per_day,
    updatedAt: row.updated_at,
  }
}
