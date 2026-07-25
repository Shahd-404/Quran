'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('يجب أن تكون كلمة المرور 8 أحرف على الأقل')
    if (password !== confirm) return setError('تأكيد كلمة المرور غير مطابق')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim(), email: email.trim(), password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'فشل التسجيل')
      // If registration returns session, redirect to /app, otherwise show verify message
      if (data?.requiresVerification) {
        router.push('/login')
      } else {
        router.push('/app')
      }
    } catch (err: any) {
      setError(err.message || 'خطأ غير متوقع')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold mb-4">ورد</h1>
        <p className="mb-4">التسجيل</p>

        <label className="block mb-2">الاسم (اختياري)
          <input className="w-full mt-1 p-2 border rounded" value={displayName} onChange={e=>setDisplayName(e.target.value)} aria-label="display_name" />
        </label>

        <label className="block mb-2">البريد الإلكتروني
          <input className="w-full mt-1 p-2 border rounded" value={email} onChange={e=>setEmail(e.target.value)} aria-label="email" />
        </label>

        <label className="block mb-2">كلمة المرور
          <input type="password" className="w-full mt-1 p-2 border rounded" value={password} onChange={e=>setPassword(e.target.value)} aria-label="password" />
        </label>

        <label className="block mb-2">تأكيد كلمة المرور
          <input type="password" className="w-full mt-1 p-2 border rounded" value={confirm} onChange={e=>setConfirm(e.target.value)} aria-label="confirm" />
        </label>

        {error && <div role="alert" className="text-red-600 mb-2">{error}</div>}

        <button type="submit" disabled={loading} className="w-full p-2 bg-blue-600 text-white rounded">
          {loading ? 'جارٍ...' : 'إنشاء حساب'}
        </button>

        <div className="mt-4 text-sm">
          لديك حساب؟ <a href="/login" className="text-blue-600">تسجيل الدخول</a>
        </div>
      </form>
    </div>
  )
}
