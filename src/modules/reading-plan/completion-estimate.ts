export const QURAN_FIRST_PAGE = 1
export const QURAN_FINAL_PAGE = 604
export const COMPLETION_ESTIMATE_FALLBACK_ARABIC =
  'سيظهر موعد الختم المتوقع بعد اكتمال إعداد الخطة.'

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export type CompletionEstimateVariant = 'new-plan' | 'active-plan'

export type CompletionEstimate = {
  remainingPages: number
  expectedReadingDays: number
  estimatedRemainingSessions: number | null
  readingStartDate: string | null
  expectedCompletionDate: string | null
}

export type CompletionEstimateInput = {
  currentUnreadPage?: number | null
  pagesPerDay?: number | null
  sessionsPerDay?: number | null
  timezone?: string | null
  effectiveFrom?: string | null
  completed?: boolean
  now?: Date
}

export type ArabicCompletionEstimateCopy = {
  title: string
  remainingText: string | null
  primaryText: string
  expectedDatePrefix: string | null
  formattedExpectedDate: string | null
  encouragement: string | null
}

function isValidQuranPage(
  value: number | null | undefined,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= QURAN_FIRST_PAGE &&
    value <= QURAN_FINAL_PAGE
  )
}

function isValidPagesPerDay(
  value: number | null | undefined,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= QURAN_FINAL_PAGE
  )
}

function isValidSessionsPerDay(
  value: number | null | undefined,
  pagesPerDay: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 6 &&
    value <= pagesPerDay
  )
}

function isValidTimezone(
  timezone: string | null | undefined,
): timezone is string {
  if (typeof timezone !== 'string' || timezone.trim().length === 0) return false

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

function isValidLocalDate(value: string): boolean {
  const match = LOCAL_DATE_PATTERN.exec(value)
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

function getLocalDateString(date: Date, timezone: string): string | null {
  if (Number.isNaN(date.getTime()) || !isValidTimezone(timezone)) return null

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    )
    if (!values.year || !values.month || !values.day) return null
    return `${values.year}-${values.month}-${values.day}`
  } catch {
    return null
  }
}

function addLocalCalendarDays(localDate: string, days: number): string | null {
  if (!isValidLocalDate(localDate) || !Number.isInteger(days)) return null

  const match = LOCAL_DATE_PATTERN.exec(localDate)
  if (!match) return null

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function getRemainingQuranPages(
  currentUnreadPage: number | null | undefined,
  completed = false,
): number | null {
  if (!isValidQuranPage(currentUnreadPage)) return null
  if (completed) return 0
  return QURAN_FINAL_PAGE - currentUnreadPage + 1
}

export function calculateExpectedReadingDays(
  remainingPages: number,
  pagesPerDay: number | null | undefined,
): number | null {
  if (
    !Number.isInteger(remainingPages) ||
    remainingPages < 0 ||
    remainingPages > QURAN_FINAL_PAGE ||
    !isValidPagesPerDay(pagesPerDay)
  ) {
    return null
  }

  return Math.ceil(remainingPages / pagesPerDay)
}

export function calculateExpectedReadingSessions(
  remainingPages: number,
  pagesPerDay: number | null | undefined,
  sessionsPerDay: number | null | undefined,
): number | null {
  if (
    !Number.isInteger(remainingPages) ||
    remainingPages < 0 ||
    remainingPages > QURAN_FINAL_PAGE ||
    !isValidPagesPerDay(pagesPerDay) ||
    !isValidSessionsPerDay(sessionsPerDay, pagesPerDay)
  ) {
    return null
  }

  const completeReadingDays = Math.floor(remainingPages / pagesPerDay)
  const finalDayPages = remainingPages % pagesPerDay

  return (
    completeReadingDays * sessionsPerDay +
    Math.min(finalDayPages, sessionsPerDay)
  )
}

export function calculateExpectedCompletionDate({
  expectedReadingDays,
  timezone,
  effectiveFrom,
  now = new Date(),
}: {
  expectedReadingDays: number
  timezone?: string | null
  effectiveFrom?: string | null
  now?: Date
}): { readingStartDate: string; expectedCompletionDate: string } | null {
  if (
    !Number.isInteger(expectedReadingDays) ||
    expectedReadingDays < 1 ||
    !isValidTimezone(timezone)
  ) {
    return null
  }

  const currentLocalDate = getLocalDateString(now, timezone)
  if (!currentLocalDate) return null

  if (
    effectiveFrom !== undefined &&
    effectiveFrom !== null &&
    !isValidLocalDate(effectiveFrom)
  ) {
    return null
  }

  const readingStartDate =
    effectiveFrom && effectiveFrom > currentLocalDate
      ? effectiveFrom
      : currentLocalDate
  const expectedCompletionDate = addLocalCalendarDays(
    readingStartDate,
    expectedReadingDays - 1,
  )

  return expectedCompletionDate
    ? { readingStartDate, expectedCompletionDate }
    : null
}

export function getCompletionEstimate({
  currentUnreadPage,
  pagesPerDay,
  sessionsPerDay,
  timezone,
  effectiveFrom,
  completed = false,
  now = new Date(),
}: CompletionEstimateInput): CompletionEstimate | null {
  const remainingPages = getRemainingQuranPages(
    currentUnreadPage,
    completed,
  )
  if (remainingPages === null) return null

  const expectedReadingDays = calculateExpectedReadingDays(
    remainingPages,
    pagesPerDay,
  )
  if (expectedReadingDays === null) return null
  const estimatedRemainingSessions = calculateExpectedReadingSessions(
    remainingPages,
    pagesPerDay,
    sessionsPerDay,
  )

  if (expectedReadingDays === 0) {
    return {
      remainingPages,
      expectedReadingDays,
      estimatedRemainingSessions,
      readingStartDate: null,
      expectedCompletionDate: null,
    }
  }

  const dates = calculateExpectedCompletionDate({
    expectedReadingDays,
    timezone,
    effectiveFrom,
    now,
  })
  if (!dates) return null

  return {
    remainingPages,
    expectedReadingDays,
    estimatedRemainingSessions,
    ...dates,
  }
}

export function formatArabicNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value)
}

export function formatCompletionDateArabic(localDate: string): string | null {
  if (!isValidLocalDate(localDate)) return null

  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${localDate}T12:00:00Z`))
  } catch {
    return null
  }
}

function formatExpectedDuration(
  expectedReadingDays: number,
  includeQuran: boolean,
): string {
  const subject = includeQuran ? 'القرآن ' : ''
  if (expectedReadingDays === 1) {
    return `متوقع تختمي ${subject}اليوم بإذن الله.`
  }
  if (expectedReadingDays === 2) {
    return `متوقع تختمي ${subject}خلال يومين بإذن الله.`
  }
  return `متوقع تختمي ${subject}خلال ${formatArabicNumber(expectedReadingDays)} يومًا بإذن الله.`
}

export function formatCompletionEstimateArabic(
  estimate: CompletionEstimate,
  pagesPerDay: number | null | undefined,
  variant: CompletionEstimateVariant,
): ArabicCompletionEstimateCopy | null {
  if (!isValidPagesPerDay(pagesPerDay)) return null

  if (estimate.expectedReadingDays === 0) {
    return {
      title: 'موعد الختم المتوقع',
      remainingText: null,
      primaryText: 'أتممتِ الختمة، تقبّل الله منكِ.',
      expectedDatePrefix: null,
      formattedExpectedDate: null,
      encouragement: null,
    }
  }

  if (!estimate.expectedCompletionDate) return null
  const formattedExpectedDate = formatCompletionDateArabic(
    estimate.expectedCompletionDate,
  )
  if (!formattedExpectedDate) return null

  const dailyTarget = formatArabicNumber(pagesPerDay)
  const duration = formatExpectedDuration(
    estimate.expectedReadingDays,
    variant === 'new-plan',
  )

  return {
    title: 'موعد الختم المتوقع',
    remainingText:
      variant === 'active-plan'
        ? `باقي لكِ ${formatArabicNumber(estimate.remainingPages)} صفحة.`
        : null,
    primaryText:
      variant === 'new-plan'
        ? `مع قراءة ${dailyTarget} صفحات يوميًا، ${duration}`
        : `مع الاستمرار على ${dailyTarget} صفحات يوميًا، ${duration}`,
    expectedDatePrefix: 'موعد الختم المتوقع:',
    formattedExpectedDate,
    encouragement: 'كل صفحة تقرّبك من الختمة.',
  }
}
