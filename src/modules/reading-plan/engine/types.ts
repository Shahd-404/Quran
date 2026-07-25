export type InputParams = {
  currentPage: number
  dailyPages: number
  sessionsCount: number
  totalPages?: number
}

export type SessionRange = {
  sessionOrder: number
  startPage: number
  endPage: number
  pageCount: number
}

export type DistributionResult = {
  requestedPages: number
  assignedPages: number
  remainingPagesInKhatma: number
  reachesEndOfKhatma: boolean
  nextUnreadPage: number | null
  sessions: SessionRange[]
}
