export function formatAssignmentDate(localDate: string, timezone: string): string {
  const date = new Date(`${localDate}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid assignment date')

  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatCompletionDate(completedAt: string, timezone: string): string {
  const date = new Date(completedAt)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid completion timestamp')

  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getLocalDateString(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  if (!values.year || !values.month || !values.day) {
    throw new Error('Unable to calculate local date')
  }
  return `${values.year}-${values.month}-${values.day}`
}

export function formatSessionTime(scheduledFor: string, timezone: string): string {
  const date = new Date(scheduledFor)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid session timestamp')

  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatArabicNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value)
}
