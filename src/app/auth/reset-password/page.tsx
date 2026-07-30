'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CircleCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  TriangleAlert,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/browser'
import {
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
} from '@/modules/auth/password-policy'
import { isInvalidRecoverySessionError } from '@/modules/auth/password-recovery'

type RecoveryPhase = 'checking' | 'ready' | 'invalid' | 'success'
type PasswordField = 'password' | 'confirmPassword'
type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>

const INVALID_RECOVERY_MESSAGE =
  'انتهت صلاحية رابط تغيير كلمة المرور أو تم استخدامه.\nاطلبي رابط استعادة جديدًا.'

function clearRecoveryParameters() {
  if (!window.location.search && !window.location.hash) return
  window.history.replaceState(
    window.history.state,
    '',
    '/auth/reset-password',
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const clientRef = useRef<BrowserSupabaseClient | null>(null)
  const recoverySeenRef = useRef(false)
  const completedRef = useRef(false)
  const submittingRef = useRef(false)
  const continuingRef = useRef(false)
  const [phase, setPhase] = useState<RecoveryPhase>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState<{
    field: PasswordField
    message: string
  } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [continuing, setContinuing] = useState(false)

  useEffect(() => {
    let disposed = false
    let unsubscribe: (() => void) | null = null

    try {
      const client = createBrowserClient()
      clientRef.current = client

      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (disposed || completedRef.current) return

        if (event === 'PASSWORD_RECOVERY' && session) {
          recoverySeenRef.current = true
          clearRecoveryParameters()
          setPhase('ready')
          return
        }

        if (event === 'INITIAL_SESSION' && !recoverySeenRef.current) {
          clearRecoveryParameters()
          setPhase('invalid')
          return
        }

        if (event === 'SIGNED_OUT' && !recoverySeenRef.current) {
          clearRecoveryParameters()
          setPhase('invalid')
        }
      })

      unsubscribe = () => data.subscription.unsubscribe()
    } catch {
      clearRecoveryParameters()
      setPhase('invalid')
    }

    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      phase !== 'ready' ||
      submittingRef.current ||
      !clientRef.current
    ) {
      return
    }

    setFieldError(null)
    setFormError(null)

    const validation = validateNewPassword(password, confirmPassword)
    if (validation) {
      setFieldError(validation)
      return
    }

    submittingRef.current = true
    setSubmitting(true)

    try {
      const { error } = await clientRef.current.auth.updateUser({
        password,
      })

      if (error) {
        if (isInvalidRecoverySessionError(error)) {
          setPassword('')
          setConfirmPassword('')
          setPhase('invalid')
          return
        }

        setFormError(
          'تعذّر حفظ كلمة المرور الجديدة الآن. حاولي مرة أخرى.',
        )
        return
      }

      completedRef.current = true
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setPhase('success')
    } catch {
      setFormError(
        'تعذّر حفظ كلمة المرور الجديدة الآن. تحققي من اتصالك ثم حاولي مرة أخرى.',
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function continueToLogin() {
    if (continuingRef.current) return

    continuingRef.current = true
    setContinuing(true)
    try {
      await clientRef.current?.auth.signOut({ scope: 'local' })
    } catch {
      // The password is already changed. Navigation remains safe and local.
    }

    router.push('/login')
    router.refresh()
  }

  if (phase === 'checking') {
    return (
      <main className="page-shell flex items-center" dir="rtl">
        <section
          className="surface-card mx-auto w-full max-w-lg p-7 text-center shadow-lift sm:p-9"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle
            aria-hidden="true"
            focusable="false"
            className="mx-auto animate-spin text-primary-muted"
            size={28}
            strokeWidth={1.8}
          />
          <h1 className="mt-4 text-xl font-semibold text-ink">
            جارٍ التحقق من رابط الاستعادة…
          </h1>
          <p className="mt-2 leading-7 text-muted">
            لحظات قليلة للتأكد من صلاحية الرابط.
          </p>
        </section>
      </main>
    )
  }

  if (phase === 'invalid') {
    return (
      <main className="page-shell flex items-center" dir="rtl">
        <section
          className="surface-card mx-auto w-full max-w-lg p-7 text-center shadow-lift sm:p-9"
          aria-labelledby="invalid-recovery-title"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
            <TriangleAlert
              aria-hidden="true"
              focusable="false"
              size={24}
              strokeWidth={1.8}
            />
          </div>
          <h1
            id="invalid-recovery-title"
            className="mt-4 text-xl font-semibold text-ink"
          >
            تعذّر استخدام رابط الاستعادة
          </h1>
          <p className="mt-3 whitespace-pre-line leading-8 text-muted">
            {INVALID_RECOVERY_MESSAGE}
          </p>
          <a href="/forgot-password" className="btn-primary mt-6 w-full">
            طلب رابط استعادة جديد
          </a>
          <a href="/login" className="btn-ghost mt-2 w-full">
            العودة إلى تسجيل الدخول
          </a>
        </section>
      </main>
    )
  }

  if (phase === 'success') {
    return (
      <main className="page-shell flex items-center" dir="rtl">
        <section
          className="surface-card mx-auto w-full max-w-lg p-7 text-center shadow-lift sm:p-9"
          aria-labelledby="password-reset-success-title"
          aria-live="polite"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary-muted">
            <CircleCheck
              aria-hidden="true"
              focusable="false"
              size={24}
              strokeWidth={1.8}
            />
          </div>
          <h1
            id="password-reset-success-title"
            className="mt-4 text-xl font-semibold text-ink"
          >
            تم تغيير كلمة المرور بنجاح.
          </h1>
          <p className="mt-3 leading-8 text-muted">
            يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
          </p>
          <button
            type="button"
            disabled={continuing}
            onClick={continueToLogin}
            className="btn-primary mt-6 w-full"
          >
            {continuing
              ? 'جارٍ الانتقال…'
              : 'الانتقال إلى تسجيل الدخول'}
          </button>
        </section>
      </main>
    )
  }

  const inputType = showPassword ? 'text' : 'password'
  const toggleLabel = showPassword
    ? 'إخفاء كلمة المرور'
    : 'إظهار كلمة المرور'

  return (
    <main className="page-shell flex items-center" dir="rtl">
      <section className="surface-card mx-auto grid w-full max-w-4xl overflow-hidden shadow-lift md:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden bg-hero p-9 text-white md:block">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-hero-muted">
            <LockKeyhole
              aria-hidden="true"
              focusable="false"
              size={22}
              strokeWidth={1.8}
            />
          </div>
          <h2 className="mt-5 text-2xl font-semibold leading-tight">
            اختاري كلمة مرور خاصة بك
          </h2>
          <p className="mt-4 leading-8 text-white/75">
            لن تتغير خطة القراءة أو سجل التقدم عند تحديث كلمة المرور.
          </p>
        </aside>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="p-6 sm:p-9"
          aria-labelledby="reset-password-title"
        >
          <p className="eyebrow">أمان الحساب</p>
          <h1 id="reset-password-title" className="page-title">
            تعيين كلمة مرور جديدة
          </h1>
          <p className="page-description !mt-2">
            استخدمي كلمة مرور لا تقل عن {MIN_PASSWORD_LENGTH} أحرف ولا
            تشاركيها مع أي شخص.
          </p>

          <div className="mt-8 space-y-5">
            <label
              className="field-label"
              htmlFor="new-password"
            >
              كلمة المرور الجديدة
              <span className="relative block">
                <input
                  autoFocus
                  id="new-password"
                  name="new-password"
                  type={inputType}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  className="field-control pl-14 text-base"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (fieldError?.field === 'password') {
                      setFieldError(null)
                    }
                  }}
                  aria-invalid={fieldError?.field === 'password'}
                  aria-describedby={
                    fieldError?.field === 'password'
                      ? 'new-password-error'
                      : 'password-policy-help'
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute left-2 top-1/2 mt-1 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-elevated hover:text-ink"
                  aria-label={toggleLabel}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff
                      aria-hidden="true"
                      focusable="false"
                      size={19}
                      strokeWidth={1.8}
                    />
                  ) : (
                    <Eye
                      aria-hidden="true"
                      focusable="false"
                      size={19}
                      strokeWidth={1.8}
                    />
                  )}
                </button>
              </span>
            </label>
            <p id="password-policy-help" className="-mt-3 text-xs text-muted">
              الحد الأدنى {MIN_PASSWORD_LENGTH} أحرف، دون مسافات في البداية
              أو النهاية.
            </p>
            {fieldError?.field === 'password' ? (
              <p
                id="new-password-error"
                role="alert"
                className="-mt-3 text-sm text-danger"
              >
                {fieldError.message}
              </p>
            ) : null}

            <label
              className="field-label"
              htmlFor="confirm-new-password"
            >
              تأكيد كلمة المرور الجديدة
              <span className="relative block">
                <input
                  id="confirm-new-password"
                  name="confirm-new-password"
                  type={inputType}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  className="field-control pl-14 text-base"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    if (fieldError?.field === 'confirmPassword') {
                      setFieldError(null)
                    }
                  }}
                  aria-invalid={
                    fieldError?.field === 'confirmPassword'
                  }
                  aria-describedby={
                    fieldError?.field === 'confirmPassword'
                      ? 'confirm-new-password-error'
                      : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute left-2 top-1/2 mt-1 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-elevated hover:text-ink"
                  aria-label={toggleLabel}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff
                      aria-hidden="true"
                      focusable="false"
                      size={19}
                      strokeWidth={1.8}
                    />
                  ) : (
                    <Eye
                      aria-hidden="true"
                      focusable="false"
                      size={19}
                      strokeWidth={1.8}
                    />
                  )}
                </button>
              </span>
            </label>
            {fieldError?.field === 'confirmPassword' ? (
              <p
                id="confirm-new-password-error"
                role="alert"
                className="-mt-3 text-sm text-danger"
              >
                {fieldError.message}
              </p>
            ) : null}
          </div>

          <div aria-live="assertive" aria-atomic="true">
            {formError ? (
              <div
                role="alert"
                className="status-danger mt-5 flex items-start gap-2 text-sm leading-7"
              >
                <TriangleAlert
                  aria-hidden="true"
                  focusable="false"
                  className="mt-1 shrink-0"
                  size={18}
                  strokeWidth={1.8}
                />
                <span>{formError}</span>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary mt-6 w-full"
          >
            {submitting
              ? 'جارٍ حفظ كلمة المرور…'
              : 'حفظ كلمة المرور الجديدة'}
          </button>
        </form>
      </section>
    </main>
  )
}
