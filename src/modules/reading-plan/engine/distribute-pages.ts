import { InputParams, DistributionResult } from './types'
import { InvalidInputError } from './errors'
import { generateSessionRanges } from './generate-session-ranges'

export function distributePages(input: InputParams): DistributionResult {
  const params = { ...input }
  const totalPages = params.totalPages ?? 604

  // Validation
  if (!Number.isInteger(params.currentPage) || params.currentPage < 1 || params.currentPage > totalPages) {
    throw new InvalidInputError('currentPage must be an integer between 1 and totalPages')
  }
  if (!Number.isInteger(params.dailyPages) || params.dailyPages < 1) {
    throw new InvalidInputError('dailyPages must be an integer >= 1')
  }
  if (!Number.isInteger(params.sessionsCount) || params.sessionsCount < 1) {
    throw new InvalidInputError('sessionsCount must be an integer >= 1')
  }
  if (params.sessionsCount > 6) {
    throw new InvalidInputError('sessionsCount must not exceed 6')
  }
  if (params.sessionsCount > params.dailyPages) {
    throw new InvalidInputError('sessionsCount must not exceed dailyPages')
  }
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new InvalidInputError('totalPages must be an integer >= 1')
  }

  const remainingPages = totalPages - params.currentPage + 1
  const requestedPages = params.dailyPages
  const assignedPages = Math.min(requestedPages, Math.max(0, remainingPages))

  if (assignedPages === 0) {
    return {
      requestedPages,
      assignedPages: 0,
      remainingPagesInKhatma: remainingPages,
      reachesEndOfKhatma: remainingPages === 0,
      nextUnreadPage: remainingPages === 0 ? null : params.currentPage,
      sessions: []
    }
  }

  const sessionsToUse = Math.min(params.sessionsCount, assignedPages)
  const sessions = generateSessionRanges(params.currentPage, assignedPages, sessionsToUse, totalPages)

  const reachesEnd = params.currentPage + assignedPages - 1 >= totalPages
  const nextUnread = reachesEnd ? null : params.currentPage + assignedPages

  return {
    requestedPages,
    assignedPages,
    remainingPagesInKhatma: Math.max(0, remainingPages - assignedPages),
    reachesEndOfKhatma: reachesEnd,
    nextUnreadPage: nextUnread,
    sessions
  }
}
