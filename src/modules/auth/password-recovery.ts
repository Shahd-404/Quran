import { getTrustedAppUrl } from '@/lib/site-url'

export const PASSWORD_RECOVERY_REDIRECT_PATH = '/auth/reset-password'
export const PASSWORD_RECOVERY_COOLDOWN_SECONDS = 60

export const PASSWORD_RECOVERY_GENERIC_MESSAGE =
  'إذا كان هناك حساب مرتبط بهذا البريد، فستصلك رسالة لتغيير كلمة المرور.'

export const PASSWORD_RECOVERY_RATE_LIMIT_MESSAGE =
  'تم طلب رسائل كثيرة مؤخرًا.\nانتظري قليلًا ثم حاولي مرة أخرى.'

export const PASSWORD_RECOVERY_UNEXPECTED_MESSAGE =
  'تعذّر إرسال رابط الاستعادة الآن. تحققي من اتصالك ثم حاولي مرة أخرى.'

type AuthErrorLike = {
  code?: unknown
  status?: unknown
}

export type PasswordRecoveryFailure = {
  code: 'rate_limited' | 'unexpected_failure'
  message: string
  status: 429 | 502
}

export function getPasswordRecoveryRedirectTo(
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
): string | null {
  return getTrustedAppUrl(
    PASSWORD_RECOVERY_REDIRECT_PATH,
    configuredSiteUrl,
  )
}

export function isValidRecoveryEmail(email: string): boolean {
  if (email.length > 254 || /\s/.test(email)) return false
  return /^[^@]+@[^@]+\.[^@]+$/.test(email)
}

export function isPrivateRecoveryLookupError(error: unknown): boolean {
  const code = getAuthErrorCode(error)
  return (
    code === 'user_not_found' ||
    code === 'email_not_found' ||
    code === 'identity_not_found'
  )
}

export function mapPasswordRecoveryFailure(
  error: unknown,
): PasswordRecoveryFailure {
  const code = getAuthErrorCode(error)
  const status = getAuthStatus(error)

  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit'
  ) {
    return {
      code: 'rate_limited',
      message: PASSWORD_RECOVERY_RATE_LIMIT_MESSAGE,
      status: 429,
    }
  }

  return {
    code: 'unexpected_failure',
    message: PASSWORD_RECOVERY_UNEXPECTED_MESSAGE,
    status: 502,
  }
}

export function isInvalidRecoverySessionError(error: unknown): boolean {
  const code = getAuthErrorCode(error)
  return (
    code === 'session_not_found' ||
    code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    code === 'jwt_expired' ||
    code === 'bad_jwt' ||
    code === 'otp_expired'
  )
}

function getAuthErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const code = (error as AuthErrorLike).code
  return typeof code === 'string' ? code : ''
}

function getAuthStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const status = (error as AuthErrorLike).status
  return typeof status === 'number' ? status : null
}
