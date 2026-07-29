export type PersistedSessionStatus = 'pending' | 'in_progress' | 'completed'

export type SessionPresentationState =
  | 'upcoming'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'missed'

export type DashboardSession = {
  id: string
  sessionOrder: number
  startPage: number
  endPage: number
  pageCount: number
  scheduledFor: string
  formattedTime: string
  persistedStatus: PersistedSessionStatus
  presentationState: SessionPresentationState
}

export type DashboardModel = {
  profile: {
    displayName: string | null
  }
  plan: {
    id: string
    status: 'active' | 'completed'
    startPage: number
    currentUnreadPage: number
    dailyPageTarget: number
    sessionsPerDay: number
    timezone: string
    effectiveFrom: string
  }
  khatma: {
    id: string
    status: 'active' | 'completed'
    startPage: number
    completedPages: number
    totalPages: number
    percentage: number
  }
  assignment: {
    id: string
    localDate: string
    formattedDate: string
    targetPages: number
    status: 'pending' | 'in_progress' | 'completed'
    createdNow: boolean
    carriedOver: boolean
    completedPages: number
    percentage: number
  }
  sessions: DashboardSession[]
  highlightedSession: DashboardSession | null
}

export type CompletedKhatmaDashboardModel = {
  profile: {
    displayName: string | null
  }
  plan: {
    id: string
    dailyPageTarget: number
    sessionsPerDay: number
    timezone: string
  }
  khatma: {
    id: string
    cycleNumber: number
    startPage: number
    completedPages: number
    completedAt: string
    formattedCompletionDate: string
  }
}

export type FuturePlanDashboardModel = {
  profile: {
    displayName: string | null
  }
  plan: {
    id: string
    effectiveFrom: string
    formattedEffectiveDate: string
    currentUnreadPage: number
    dailyPageTarget: number
    sessionsPerDay: number
    timezone: string
  }
}

export type DashboardErrorCode =
  | 'PROFILE_QUERY_FAILED'
  | 'PLAN_QUERY_FAILED'
  | 'ASSIGNMENT_GENERATION_FAILED'
  | 'ASSIGNMENT_QUERY_FAILED'
  | 'MISSING_SESSIONS'
  | 'KHATMA_QUERY_FAILED'
  | 'MALFORMED_DATA'

export type DashboardDataResult =
  | { status: 'unauthenticated' }
  | { status: 'no_active_plan'; displayName: string | null }
  | { status: 'completed_khatma'; data: CompletedKhatmaDashboardModel }
  | { status: 'future_plan'; data: FuturePlanDashboardModel }
  | { status: 'error'; displayName: string | null; code: DashboardErrorCode; message: string }
  | { status: 'success'; data: DashboardModel }
