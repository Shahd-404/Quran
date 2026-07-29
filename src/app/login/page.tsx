'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type LoginResponse = {
  message?: unknown
}

function getLoginError(payload: unknown): string {
  if (
    payload &&
    typeof payload === 'object' &&
    typeof (payload as LoginResponse).message === 'string'
  ) {
    return String((payload as LoginResponse).message)
  }
  return 'تعذّر تسجيل الدخول بهذه البيانات.'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getLoginError(payload))
      router.push('/app')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'تعذّر الاتصال الآن. تحقق من اتصالك وحاول مرة أخرى.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell flex items-center">
      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-card border border-line bg-surface shadow-lift md:grid-cols-[0.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden bg-hero p-9 text-white md:block">
          <div aria-hidden="true" className="absolute -left-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
          <p className="text-sm font-bold text-hero-muted">مرحبًا بعودتك</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">
            وردك ينتظرك بهدوء
          </h1>
          <p className="mt-4 leading-8 text-white/75">
            تابع من الصفحة التي توقفت عندها، ولن يتقدّم سجلك إلا بعد تأكيدك.
          </p>
          <p className="absolute bottom-9 right-9 text-sm font-semibold text-hero-muted">
            ورد · قراءة ثابتة كل يوم
          </p>
        </aside>

        <form onSubmit={handleSubmit} className="p-6 sm:p-9">
          <p className="eyebrow">تسجيل الدخول</p>
          <h1 className="page-title !text-3xl">أهلًا بك في ورد</h1>
          <p className="page-description !mt-2">
            أدخل بياناتك للعودة إلى خطة القراءة.
          </p>

          <div className="mt-7 space-y-5">
            <label className="field-label" htmlFor="login-email">
              البريد الإلكتروني
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="field-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-label="email"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </label>

            <label className="field-label" htmlFor="login-password">
              كلمة المرور
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="field-control"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-label="password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </label>
          </div>

          {error ? (
            <div id="login-error" role="alert" className="status-danger mt-5 text-sm leading-6">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            لا تملك حسابًا؟{' '}
            <a href="/register" className="font-bold text-primary-muted underline-offset-4 hover:underline">
              إنشاء حساب جديد
            </a>
          </p>
        </form>
      </div>
    </main>
  )
}
