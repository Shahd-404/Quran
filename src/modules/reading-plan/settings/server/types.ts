export type PlanSettingsSchedule = {
  sessionOrder: number
  scheduledTime: string
}

export type PlanSettingsModel = {
  planId: string
  currentUnreadPage: number
  dailyPages: number
  sessionsPerDay: number
  timezone: string
  schedules: PlanSettingsSchedule[]
}

export type LoadPlanSettingsResult =
  | { status: 'unauthenticated' }
  | { status: 'no_active_plan' }
  | { status: 'error' }
  | { status: 'success'; data: PlanSettingsModel }

export type UpdatePlanSettingsErrorCode =
  | 'UNAUTHENTICATED'
  | 'PROFILE_NOT_FOUND'
  | 'ACTIVE_PLAN_NOT_FOUND'
  | 'INVALID_DAILY_PAGES'
  | 'INVALID_SESSIONS'
  | 'INVALID_SCHEDULE'
  | 'PLAN_UPDATE_CONFLICT'
  | 'INTERNAL_ERROR'

export type UpdatePlanSettingsInput = {
  dailyPages: number
  sessions: PlanSettingsSchedule[]
}

export type UpdatePlanSettingsResult =
  | {
      success: true
      planId: string
      dailyPages: number
      sessionsPerDay: number
      updatedAt: string
    }
  | {
      success: false
      code: UpdatePlanSettingsErrorCode
      message: string
    }
