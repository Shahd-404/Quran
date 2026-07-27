const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function validTimestamp(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('ar-EG', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export function isValidLocalDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function localDateFromTimestamp(
  timestamp: string,
  timezone: string,
): string {
  const date = validTimestamp(timestamp)
  if (!date || !isValidTimezone(timezone)) {
    throw new Error('Invalid historical timestamp or timezone')
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  const year = values.get('year')
  const month = values.get('month')
  const day = values.get('day')
  if (!year || !month || !day) {
    throw new Error('Unable to derive historical local date')
  }
  return `${year}-${month}-${day}`
}

export function formatHistoryLocalDate(localDate: string): string {
  if (!isValidLocalDate(localDate)) {
    throw new Error('Invalid historical local date')
  }
  const [year, month, day] = localDate.split('-').map(Number)
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

export function formatHistoryTime(
  timestamp: string,
  timezone: string,
): string {
  const date = validTimestamp(timestamp)
  if (!date || !isValidTimezone(timezone)) {
    throw new Error('Invalid historical timestamp or timezone')
  }
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatHistoryTimestampDate(
  timestamp: string,
  timezone: string,
): string {
  const date = validTimestamp(timestamp)
  if (!date || !isValidTimezone(timezone)) {
    throw new Error('Invalid historical timestamp or timezone')
  }
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
