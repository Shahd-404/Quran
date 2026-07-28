'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const RESEND_COOLDOWN_SECONDS = 60
const EMAIL_RATE_LIMIT_MESSAGE =
  'تم إرسال رسائل كثيرة مؤخرًا. انتظري قليلًا ثم حاولي مرة أخرى.'

type ApiResponse = {
  ok?: unknown
  code?: unknown
  requiresEmailConfirmation?: unknown
}

function parseApiResponse(value: unknown): ApiResponse {
  return value && typeof value === 'object' ? (value as ApiResponse) : {}
}

function registrationErrorMessage(code: unknown): string {
  switch (code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return EMAIL_RATE_LIMIT_MESSAGE
    case 'email_address_invalid':
      return 'تعذر استخدام عنوان البريد الإلكتروني هذا. راجعيه ثم حاولي مرة أخرى.'
    case 'weak_password':
      return 'كلمة المرور لا تستوفي متطلبات الأمان. استخدمي كلمة مرور أقوى.'
    case 'validation_failed':
      return 'تعذر إنشاء الحساب بهذه البيانات. راجعيها ثم حاولي مرة أخرى.'
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'إنشاء الحسابات غير متاح حاليًا. حاولي مرة أخرى لاحقًا.'
    default:
      return 'تعذر إنشاء الحساب الآن. حاولي مرة أخرى لاحقًا.'
  }
}

function resendErrorMessage(code: unknown): string {
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit'
  ) {
    return EMAIL_RATE_LIMIT_MESSAGE
  }

  return 'تعذر إرسال رسالة التأكيد الآن. حاولي مرة أخرى لاحقًا.'
}

export default function RegisterPage() {
  const router = useRouter()
  const submittingRef = useRef(false)
  const resendingRef = useRef(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || confirmationRequired) return

    setError(null)
    if (password.length < 8) {
      setError('يجب أن تكون كلمة المرور 8 أحرف على الأقل.')
      return
    }
    if (password !== confirm) {
      setError('تأكيد كلمة المرور غير مطابق.')
      return
    }

    submittingRef.current = true
    setLoading(true)
    const normalizedEmail = email.trim()

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: normalizedEmail,
          password,
        }),
      })
      const data = parseApiResponse(
        await response.json().catch(() => null),
      )

      if (!response.ok || data.ok !== true) {
        setError(registrationErrorMessage(data.code))
        return
      }

      if (data.requiresEmailConfirmation === true) {
        setSubmittedEmail(normalizedEmail)
        setPassword('')
        setConfirm('')
        setConfirmationRequired(true)
        return
      }

      if (data.requiresEmailConfirmation === false) {
        setPassword('')
        setConfirm('')
        router.push('/app')
        return
      }

      setError('تعذر إكمال إنشاء الحساب الآن. حاولي مرة أخرى لاحقًا.')
    } catch {
      setError('تعذر الاتصال بالخدمة الآن. تحققي من اتصالك ثم حاولي مرة أخرى.')
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  async function handleResend() {
    if (
      !submittedEmail ||
      resendingRef.current ||
      resendCooldown > 0
    ) {
      return
    }

    resendingRef.current = true
    setResending(true)
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    setResendMessage(null)
    setResendError(null)

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submittedEmail }),
      })
      const data = parseApiResponse(
        await response.json().catch(() => null),
      )

      if (!response.ok || data.ok !== true) {
        setResendError(resendErrorMessage(data.code))
        return
      }

      setResendMessage(
        'إذا كان البريد بحاجة إلى تأكيد، فقد أرسلنا رسالة جديدة.',
      )
    } catch {
      setResendError(
        'تعذر إرسال رسالة التأكيد الآن. تحققي من اتصالك ثم حاولي مرة أخرى.',
      )
    } finally {
      resendingRef.current = false
      setResending(false)
    }
  }

  function changeEmail() {
    setConfirmationRequired(false)
    setSubmittedEmail('')
    setPassword('')
    setConfirm('')
    setError(null)
    setResendMessage(null)
    setResendError(null)
    setResendCooldown(0)
  }

  if (confirmationRequired) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-4"
        dir="rtl"
      >
        <section
          aria-labelledby="registration-success-title"
          className="w-full max-w-md rounded bg-white p-6 shadow"
        >
          <h1
            id="registration-success-title"
            className="mb-4 text-xl font-semibold text-emerald-800"
          >
            تم إنشاء حسابك بنجاح
          </h1>

          <p className="mb-3 text-stone-800">
            أرسلنا رسالة تأكيد إلى بريدك الإلكتروني.
            <br />
            افتحي الرسالة واضغطي على رابط التأكيد لتفعيل حسابك، ثم عودي
            لتسجيل الدخول.
          </p>

          <div className="mb-5 rounded border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm text-stone-600">أرسلنا رسالة التأكيد إلى:</p>
            <p className="mt-1 break-all font-medium" dir="ltr">
              {submittedEmail}
            </p>
          </div>

          {resendMessage ? (
            <p className="mb-3 text-sm text-emerald-700" role="status">
              {resendMessage}
            </p>
          ) : null}
          {resendError ? (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {resendError}
            </p>
          ) : null}

          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full rounded bg-blue-600 p-2 text-center text-white"
            >
              فتح صفحة تسجيل الدخول
            </a>

            <button
              type="button"
              disabled={resending || resendCooldown > 0}
              onClick={handleResend}
              className="w-full rounded border border-blue-600 p-2 text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending
                ? 'جارٍ إرسال رسالة التأكيد...'
                : resendCooldown > 0
                  ? `إعادة الإرسال بعد ${resendCooldown} ثانية`
                  : 'إعادة إرسال رسالة التأكيد'}
            </button>

            <button
              type="button"
              onClick={changeEmail}
              className="w-full p-2 text-stone-700 underline"
            >
              تغيير البريد الإلكتروني
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      dir="rtl"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded bg-white p-6 shadow"
      >
        <h1 className="mb-4 text-xl font-semibold">ورد</h1>
        <p className="mb-4">التسجيل</p>

        <label className="mb-2 block">
          الاسم (اختياري)
          <input
            name="display_name"
            autoComplete="name"
            className="mt-1 w-full rounded border p-2"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            aria-label="display_name"
          />
        </label>

        <label className="mb-2 block">
          البريد الإلكتروني
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded border p-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'register-error' : undefined}
          />
        </label>

        <label className="mb-2 block">
          كلمة المرور
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-1 w-full rounded border p-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-label="password"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'register-error' : undefined}
          />
        </label>

        <label className="mb-2 block">
          تأكيد كلمة المرور
          <input
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-1 w-full rounded border p-2"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-label="confirm"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'register-error' : undefined}
          />
        </label>

        {error ? (
          <div
            id="register-error"
            role="alert"
            className="mb-2 text-red-700"
          >
            {error}
          </div>
        ) : null}

        <p className="mb-3 mt-4 text-sm text-stone-600">
          بعد إنشاء الحساب، سنرسل لك رسالة لتأكيد بريدك الإلكتروني.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب'}
        </button>

        <div className="mt-4 text-sm">
          لديك حساب؟{' '}
          <a href="/login" className="text-blue-600">
            تسجيل الدخول
          </a>
        </div>
      </form>
    </main>
  )
}
