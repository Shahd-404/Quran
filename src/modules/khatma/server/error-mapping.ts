import { StartNewKhatmaErrorCode } from './types'

const KNOWN_CODES: StartNewKhatmaErrorCode[] = [
  'UNAUTHENTICATED',
  'PROFILE_NOT_FOUND',
  'ACTIVE_PLAN_EXISTS',
  'ACTIVE_KHATMA_EXISTS',
  'COMPLETED_PLAN_NOT_FOUND',
  'COMPLETED_KHATMA_NOT_FOUND',
  'INVALID_PREVIOUS_PLAN_CONFIGURATION',
  'INVALID_EFFECTIVE_DATE',
  'INVALID_TIMEZONE',
  'INTERNAL_ERROR',
]

export function mapStartNewKhatmaDatabaseError(
  databaseMessage: string,
): StartNewKhatmaErrorCode {
  return (
    KNOWN_CODES.find((code) => databaseMessage.includes(code)) ??
    'INTERNAL_ERROR'
  )
}

export function startNewKhatmaCodeToArabic(
  code: StartNewKhatmaErrorCode,
): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى للمتابعة.'
    case 'ACTIVE_PLAN_EXISTS':
    case 'ACTIVE_KHATMA_EXISTS':
      return 'لديك ختمة نشطة بالفعل. انتقل إلى لوحة الورد لمتابعتها.'
    case 'INVALID_EFFECTIVE_DATE':
      return 'اختر تاريخ اليوم أو تاريخًا لاحقًا لبدء الخطة.'
    case 'COMPLETED_PLAN_NOT_FOUND':
    case 'COMPLETED_KHATMA_NOT_FOUND':
      return 'لم نعثر على ختمة مكتملة يمكن بدء دورة جديدة منها.'
    case 'PROFILE_NOT_FOUND':
    case 'INVALID_PREVIOUS_PLAN_CONFIGURATION':
    case 'INVALID_TIMEZONE':
    case 'INTERNAL_ERROR':
      return 'تعذّر بدء الختمة الجديدة الآن. حاول مرة أخرى بعد قليل.'
  }
}
