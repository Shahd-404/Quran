import {
  DashboardSession,
  PersistedSessionStatus,
  SessionPresentationState,
} from './types'

type DeriveSessionStateInput = {
  persistedStatus: PersistedSessionStatus
  assignmentLocalDate: string
  scheduledFor: string
  timezone: string
  now: Date
}

export function getDateKeyInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Unable to format local date')
  }

  return `${year}-${month}-${day}`
}

export function deriveSessionState({
  persistedStatus,
  assignmentLocalDate,
  scheduledFor,
  timezone,
  now,
}: DeriveSessionStateInput): SessionPresentationState {
  if (persistedStatus === 'completed') return 'completed'
  if (persistedStatus === 'in_progress') return 'in_progress'

  const currentLocalDate = getDateKeyInTimezone(now, timezone)
  if (assignmentLocalDate < currentLocalDate) return 'missed'

  const scheduledAt = new Date(scheduledFor)
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error('Invalid scheduled timestamp')
  }

  return scheduledAt.getTime() > now.getTime() ? 'upcoming' : 'available'
}

export function selectHighlightedSession(sessions: DashboardSession[]): DashboardSession | null {
  const orderedSessions = [...sessions].sort((left, right) => left.sessionOrder - right.sessionOrder)
  return (
    orderedSessions.find((session) => session.presentationState === 'in_progress') ??
    orderedSessions.find((session) => session.presentationState !== 'completed') ??
    null
  )
}
