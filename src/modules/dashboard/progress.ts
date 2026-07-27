import { DashboardSession } from './types'

export const QURAN_FINAL_PAGE = 604

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function calculateDailyProgress(
  sessions: DashboardSession[],
  assignmentTargetPages: number,
): { completedPages: number; percentage: number } {
  const completedPages = sessions
    .filter((session) => session.persistedStatus === 'completed')
    .reduce((total, session) => total + session.pageCount, 0)

  const percentage =
    assignmentTargetPages > 0
      ? clamp(Math.round((completedPages / assignmentTargetPages) * 100), 0, 100)
      : 0

  return { completedPages, percentage }
}

export function calculateKhatmaProgress(
  currentUnreadPage: number,
  khatmaStartPage: number,
  khatmaCompleted = false,
): { completedPages: number; totalPages: number; percentage: number } {
  const totalPages = QURAN_FINAL_PAGE - khatmaStartPage + 1
  const completedPages = khatmaCompleted
    ? totalPages
    : clamp(currentUnreadPage - khatmaStartPage, 0, totalPages)
  const percentage = totalPages > 0 ? clamp(Math.round((completedPages / totalPages) * 100), 0, 100) : 0

  return { completedPages, totalPages, percentage }
}
