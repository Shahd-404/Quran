export type StartNewKhatmaErrorCode =
  | 'UNAUTHENTICATED'
  | 'PROFILE_NOT_FOUND'
  | 'ACTIVE_PLAN_EXISTS'
  | 'ACTIVE_KHATMA_EXISTS'
  | 'COMPLETED_PLAN_NOT_FOUND'
  | 'COMPLETED_KHATMA_NOT_FOUND'
  | 'INVALID_PREVIOUS_PLAN_CONFIGURATION'
  | 'INVALID_EFFECTIVE_DATE'
  | 'INVALID_TIMEZONE'
  | 'INTERNAL_ERROR'

export type StartNewKhatmaResult =
  | {
      success: true
      planId: string
      khatmaId: string
      cycleNumber: number
      effectiveFrom: string
    }
  | {
      success: false
      code: StartNewKhatmaErrorCode
      message: string
    }

export type PreviousPlanConfiguration = {
  planId: string
  dailyPages: number
  sessionsPerDay: number
  timezone: string
  previousCycleNumber: number
  schedules: Array<{
    sessionOrder: number
    scheduledTime: string
  }>
}

export type PreviousPlanResult =
  | { status: 'unauthenticated' }
  | { status: 'active_plan' }
  | { status: 'not_found' }
  | { status: 'error' }
  | { status: 'success'; data: PreviousPlanConfiguration }
