import { SessionCompletionErrorCode } from './types'

const SAFE_MESSAGES: Record<SessionCompletionErrorCode, string> = {
  UNAUTHENTICATED: 'يجب تسجيل الدخول أولًا لإكمال جلسة الورد.',
  OFFLINE_ACTION_INVALID: 'تعذّر التحقق من إجراء الإكمال المحفوظ. أعد فتح الجلسة وحاول مرة أخرى.',
  SESSION_NOT_FOUND: 'تعذّر العثور على جلسة الورد المطلوبة.',
  SESSION_OWNERSHIP_INVALID: 'تعذّر التحقق من ملكية جلسة الورد.',
  INVALID_SESSION_STATE: 'لا يمكن إكمال جلسة الورد في حالتها الحالية.',
  PLAN_NOT_FOUND: 'تعذّر العثور على خطة الورد المرتبطة بهذه الجلسة.',
  KHATMA_NOT_FOUND: 'تعذّر العثور على الختمة المرتبطة بهذه الجلسة.',
  INVALID_PROGRESS_CONFIGURATION:
    'تعذّر تحديث تقدّم القراءة بسبب خلل في إعدادات الورد.',
  INTERNAL_ERROR:
    'تعذّر تسجيل إكمال الجلسة الآن. حاول مرة أخرى بعد قليل.',
}

const KNOWN_CODES = Object.keys(
  SAFE_MESSAGES,
) as SessionCompletionErrorCode[]

export function mapCompletionDatabaseError(
  value: string | null | undefined,
): SessionCompletionErrorCode {
  if (!value) return 'INTERNAL_ERROR'
  return (
    KNOWN_CODES.find((code) => value.includes(code)) ?? 'INTERNAL_ERROR'
  )
}

export function completionCodeToArabic(
  code: SessionCompletionErrorCode,
): string {
  return SAFE_MESSAGES[code]
}
