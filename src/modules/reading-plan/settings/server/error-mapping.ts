import { UpdatePlanSettingsErrorCode } from './types'

const KNOWN_CODES: UpdatePlanSettingsErrorCode[] = [
  'UNAUTHENTICATED',
  'PROFILE_NOT_FOUND',
  'ACTIVE_PLAN_NOT_FOUND',
  'INVALID_DAILY_PAGES',
  'INVALID_SESSIONS',
  'INVALID_SCHEDULE',
  'PLAN_UPDATE_CONFLICT',
  'INTERNAL_ERROR',
]

export function mapUpdatePlanSettingsDatabaseError(
  message: string,
): UpdatePlanSettingsErrorCode {
  return KNOWN_CODES.find((code) => message.includes(code)) ?? 'INTERNAL_ERROR'
}

export function updatePlanSettingsCodeToArabic(
  code: UpdatePlanSettingsErrorCode,
): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى للمتابعة.'
    case 'ACTIVE_PLAN_NOT_FOUND':
      return 'لم نعثر على خطة نشطة يمكن تعديلها.'
    case 'INVALID_DAILY_PAGES':
      return 'عدد الصفحات اليومية يجب أن يكون بين 1 و604.'
    case 'INVALID_SESSIONS':
      return 'اختر من جلسة واحدة إلى 6 جلسات، دون أن تتجاوز عدد الصفحات.'
    case 'INVALID_SCHEDULE':
      return 'يجب أن تكون مواعيد الجلسات صحيحة، مختلفة، ومتزايدة زمنيًا.'
    case 'PLAN_UPDATE_CONFLICT':
      return 'تغيّرت الخطة أثناء الحفظ. راجع الإعدادات الحالية وحاول مرة أخرى.'
    case 'PROFILE_NOT_FOUND':
    case 'INTERNAL_ERROR':
      return 'تعذّر حفظ تعديلات الخطة الآن. حاول مرة أخرى بعد قليل.'
  }
}
