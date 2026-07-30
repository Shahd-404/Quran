'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleCheck, Mail, TriangleAlert } from 'lucide-react'
import {
  isValidRecoveryEmail,
  PASSWORD_RECOVERY_COOLDOWN_SECONDS,
  PASSWORD_RECOVERY_GENERIC_MESSAGE,
  PASSWORD_RECOVERY_RATE_LIMIT_MESSAGE,
  PASSWORD_RECOVERY_UNEXPECTED_MESSAGE,
} from '@/modules/auth/password-recovery'

type ForgotPasswordResponse = {
  ok?: unknown
  code?: unknown
}

type SubmissionResult =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | null

function parseResponse(payload: unknown): ForgotPasswordResponse {
  return payload && typeof payload === 'object'
    ? (payload as ForgotPasswordResponse)
    : {}
}

export default function ForgotPasswordPage() {
  const submittingRef = useRef(false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [result, setResult] = useState<SubmissionResult>(null)

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || cooldown > 0) return

    const normalizedEmail = email.trim()
    setEmailError(null)
    setResult(null)

    if (!isValidRecoveryEmail(normalizedEmail)) {
      setEmailError('أدخلي عنوان بريد إلكتروني صالحًا.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setCooldown(PASSWORD_RECOVERY_COOLDOWN_SECONDS)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const payload = parseResponse(
        await response.json().catch(() => null),
      )

      if (response.ok && payload.ok === true) {
        setResult({
          kind: 'success',
          message: PASSWORD_RECOVERY_GENERIC_MESSAGE,
        })
        return
      }

      if (payload.code === 'rate_limited') {
        setResult({
          kind: 'error',
          message: PASSWORD_RECOVERY_RATE_LIMIT_MESSAGE,
        })
        return
      }

      setResult({
        kind: 'error',
        message: PASSWORD_RECOVERY_UNEXPECTED_MESSAGE,
      })
    } catch {
      setResult({
        kind: 'error',
        message: PASSWORD_RECOVERY_UNEXPECTED_MESSAGE,
      })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const disabled = submitting || cooldown > 0

  return (
    <main className="page-shell flex items-center" dir="rtl">
      <section className="surface-card mx-auto grid w-full max-w-4xl overflow-hidden shadow-lift md:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden bg-hero p-9 text-white md:block">
          <div
            aria-hidden="true"
            className="absolute -left-16 -top-16 h-48 w-48 rounded-full border border-white/10"
          />
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-hero-muted">
            <Mail
              aria-hidden="true"
              focusable="false"
              size={22}
              strokeWidth={1.8}
            />
          </div>
          <h2 className="mt-5 text-2xl font-semibold leading-tight">
            عودي إلى وردك بأمان
          </h2>
          <p className="mt-4 leading-8 text-white/75">
            سنرسل رابطًا مخصصًا لتعيين كلمة مرور جديدة، دون تغيير خطتك أو
            سجل قراءتك.
          </p>
          <p className="absolute bottom-9 right-9 text-sm font-semibold text-hero-muted">
            ورد · استعادة آمنة للحساب
          </p>
        </aside>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="p-6 sm:p-9"
          aria-labelledby="forgot-password-title"
        >
          <p className="eyebrow">أمان الحساب</p>
          <h1 id="forgot-password-title" className="page-title">
            استعادة كلمة المرور
          </h1>
          <p className="page-description !mt-2">
            أدخلي بريدك الإلكتروني وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور
            جديدة.
          </p>

          <label
            className="field-label mt-8"
            htmlFor="forgot-password-email"
          >
            البريد الإلكتروني
            <input
              autoFocus
              id="forgot-password-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              className="field-control text-base"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (emailError) setEmailError(null)
              }}
              aria-invalid={Boolean(emailError)}
              aria-describedby={
                emailError ? 'forgot-password-email-error' : undefined
              }
            />
          </label>

          {emailError ? (
            <p
              id="forgot-password-email-error"
              role="alert"
              className="mt-2 text-sm text-danger"
            >
              {emailError}
            </p>
          ) : null}

          <div aria-live="polite" aria-atomic="true">
            {result ? (
              <div
                role={result.kind === 'error' ? 'alert' : 'status'}
                className={`${result.kind === 'error' ? 'status-danger' : 'status-success'} mt-5 flex items-start gap-2 text-sm leading-7 whitespace-pre-line`}
              >
                {result.kind === 'error' ? (
                  <TriangleAlert
                    aria-hidden="true"
                    focusable="false"
                    className="mt-1 shrink-0"
                    size={18}
                    strokeWidth={1.8}
                  />
                ) : (
                  <CircleCheck
                    aria-hidden="true"
                    focusable="false"
                    className="mt-1 shrink-0"
                    size={18}
                    strokeWidth={1.8}
                  />
                )}
                <span>{result.message}</span>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="btn-primary mt-6 w-full"
          >
            {submitting
              ? 'جارٍ إرسال الرابط…'
              : cooldown > 0
                ? `إعادة المحاولة بعد ${new Intl.NumberFormat('ar-EG').format(cooldown)} ثانية`
                : 'إرسال رابط الاستعادة'}
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            تذكّرتِ كلمة المرور؟{' '}
            <a
              href="/login"
              className="font-semibold text-primary-muted underline-offset-4 hover:underline"
            >
              العودة إلى تسجيل الدخول
            </a>
          </p>
        </form>
      </section>
    </main>
  )
}
