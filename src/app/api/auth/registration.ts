import { getTrustedSiteOrigin } from '@/lib/site-url'

export const EMAIL_RATE_LIMIT_MESSAGE =
  'تم إرسال رسائل كثيرة مؤخرًا. انتظري قليلًا ثم حاولي مرة أخرى.'

export type SafeAuthErrorCode =
  | 'email_address_invalid'
  | 'email_provider_disabled'
  | 'over_email_send_rate_limit'
  | 'over_request_rate_limit'
  | 'signup_disabled'
  | 'unexpected_failure'
  | 'validation_failed'
  | 'weak_password'

type AuthErrorLike = {
  code?: unknown
}

const PUBLIC_AUTH_ERROR_CODES = new Set<SafeAuthErrorCode>([
  'email_address_invalid',
  'email_provider_disabled',
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'signup_disabled',
  'unexpected_failure',
  'validation_failed',
  'weak_password',
])

export type SafeAuthFailure = {
  code: SafeAuthErrorCode
  message: string
  status: number
}

export function getAuthErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unexpected_failure'

  const code = (error as AuthErrorLike).code
  return typeof code === 'string' && code.length > 0 ? code : 'unexpected_failure'
}

export function isExistingAccountError(error: unknown): boolean {
  const code = getAuthErrorCode(error)
  return code === 'email_exists' || code === 'user_already_exists'
}

export function isPrivateResendError(error: unknown): boolean {
  const code = getAuthErrorCode(error)
  return (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    code === 'user_not_found'
  )
}

export function mapAuthFailure(error: unknown): SafeAuthFailure {
  const rawCode = getAuthErrorCode(error)
  const code = PUBLIC_AUTH_ERROR_CODES.has(rawCode as SafeAuthErrorCode)
    ? (rawCode as SafeAuthErrorCode)
    : 'unexpected_failure'

  switch (code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return {
        code,
        message: EMAIL_RATE_LIMIT_MESSAGE,
        status: 429,
      }
    case 'email_address_invalid':
      return {
        code,
        message: 'تعذر استخدام عنوان البريد الإلكتروني هذا. راجعيه ثم حاولي مرة أخرى.',
        status: 400,
      }
    case 'weak_password':
      return {
        code,
        message: 'كلمة المرور لا تستوفي متطلبات الأمان. استخدمي كلمة مرور أقوى.',
        status: 400,
      }
    case 'signup_disabled':
    case 'email_provider_disabled':
      return {
        code,
        message: 'إنشاء الحسابات غير متاح حاليًا. حاولي مرة أخرى لاحقًا.',
        status: 503,
      }
    case 'validation_failed':
      return {
        code,
        message: 'تعذر إنشاء الحساب بهذه البيانات. راجعيها ثم حاولي مرة أخرى.',
        status: 400,
      }
    default:
      return {
        code: 'unexpected_failure',
        message: 'تعذر إنشاء الحساب الآن. حاولي مرة أخرى لاحقًا.',
        status: 502,
      }
  }
}

export function getEmailRedirectTo(): string | null {
  const siteOrigin = getTrustedSiteOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
  )
  if (!siteOrigin) return null

  const redirectUrl = new URL('/login', siteOrigin)
  redirectUrl.searchParams.set('emailConfirmed', '1')
  return redirectUrl.toString()
}
