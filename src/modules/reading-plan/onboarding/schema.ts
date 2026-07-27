export const MIN_PAGE = 1
export const MAX_PAGE = 604
export const MIN_DAILY_PAGES = 1
export const MAX_SESSIONS = 6

export type ValidationResult = { error?: string }

export function isValidPage(value: number) {
  return Number.isInteger(value) && value >= MIN_PAGE && value <= MAX_PAGE
}

export function isValidDailyPages(value: number) {
  return Number.isInteger(value) && value >= MIN_DAILY_PAGES && value <= MAX_PAGE
}

export function isValidSessionsCount(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_SESSIONS
}

export function isValidTime(text: string) {
  if (!/^[0-2][0-9]:[0-5][0-9]$/.test(text)) return false
  const [hour, minute] = text.split(':').map(Number)
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

export function validateStartPage(value: number): ValidationResult {
  if (!isValidPage(value)) {
    return { error: 'رقم الصفحة الابتدائية يجب أن يكون بين 1 و 604.' }
  }
  return {}
}

export function validateDailyPages(value: number): ValidationResult {
  if (!isValidDailyPages(value)) {
    return { error: 'عدد الصفحات اليومية يجب أن يكون بين 1 و 604.' }
  }
  return {}
}

export function validateSessionsCount(value: number, dailyPages: number): ValidationResult {
  if (!isValidSessionsCount(value)) {
    return { error: 'يجب اختيار من 1 إلى 6 جلسات.' }
  }
  if (value > dailyPages) {
    return { error: 'عدد الجلسات لا يجب أن يتجاوز الصفحات اليومية.' }
  }
  return {}
}

export function validateSessionTimes(times: string[]): ValidationResult {
  if (!Array.isArray(times) || times.length === 0) {
    return { error: 'يجب إدخال وقت لكل جلسة.' }
  }

  const seen = new Set<string>()
  let previous: string | null = null

  for (const time of times) {
    if (!isValidTime(time)) {
      return { error: 'صيغة الوقت يجب أن تكون HH:mm.' }
    }
    if (seen.has(time)) {
      return { error: 'يجب ألا تتكرر أوقات الجلسات.' }
    }
    seen.add(time)
    if (previous && time <= previous) {
      return { error: 'يجب أن تكون أوقات الجلسات متزايدة زمنياً.' }
    }
    previous = time
  }

  return {}
}

export function formatEffectiveDate(date: string) {
  return date
}

export function getLocalEffectiveDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatEstimateDays(startPage: number, dailyPages: number) {
  const remaining = MAX_PAGE - startPage + 1
  if (dailyPages <= 0) return 'حوالي 0 يوم'
  const days = Math.ceil(remaining / dailyPages)
  return `حوالي ${days} يوم`
}
