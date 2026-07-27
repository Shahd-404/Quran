export type HistoryEvent = {
  id: string
  readingSessionId: string
  readingPlanId: string
  khatmaId: string
  assignmentId: string
  sessionOrder: number | null
  startPage: number
  endPage: number
  pageCount: number
  completedAt: string
  localDate: string
  timezone: string
  formattedCompletionTime: string
}

export type HistoryDayGroup = {
  localDate: string
  formattedDate: string
  totalPages: number
  sessionCount: number
  events: HistoryEvent[]
}

export type HistoryPagination = {
  page: number
  pageSize: number
  totalEvents: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export type KhatmaHistorySummary = {
  id: string
  readingPlanId: string | null
  cycleNumber: number
  status: 'active' | 'completed'
  startPage: number
  startedAt: string
  completedAt: string | null
  timezone: string
  currentUnreadPage: number | null
  completedPages: number
  completedSessions: number
  totalPages: number
  percentage: number
  formattedStartDate: string
  formattedCompletionDate: string | null
}

export type ReadingHistoryModel = {
  totalCompletedPages: number
  totalCompletedSessions: number
  totalCompletedKhatmas: number
  currentKhatma: KhatmaHistorySummary | null
  completedKhatmas: KhatmaHistorySummary[]
  recentCompletedSessions: HistoryEvent[]
  dayGroups: HistoryDayGroup[]
  pagination: HistoryPagination
}

export type ReadingHistoryResult =
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ReadingHistoryModel }

export type KhatmaHistoryModel = {
  khatma: KhatmaHistorySummary
  dayGroups: HistoryDayGroup[]
  pagination: HistoryPagination
}

export type KhatmaHistoryResult =
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: KhatmaHistoryModel }
