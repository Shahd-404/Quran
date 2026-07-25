'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'فشل تسجيل الدخول')
      router.push('/app')
    } catch (err: any) {
      setError(err.message || 'خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold mb-4">ورد</h1>
        <p className="mb-4">تسجيل الدخول</p>

        <label className="block mb-2">البريد الإلكتروني
          <input className="w-full mt-1 p-2 border rounded" value={email} onChange={e=>setEmail(e.target.value)} aria-label="email" />
        </label>

        <label className="block mb-2">كلمة المرور
          <input type="password" className="w-full mt-1 p-2 border rounded" value={password} onChange={e=>setPassword(e.target.value)} aria-label="password" />
        </label>

        {error && <div role="alert" className="text-red-600 mb-2">{error}</div>}

        <button type="submit" disabled={loading} className="w-full p-2 bg-blue-600 text-white rounded">
          {loading ? 'جارٍ...' : 'تسجيل الدخول'}
        </button>

        <div className="mt-4 text-sm">
          لا تملك حسابًا؟ <a href="/register" className="text-blue-600">التسجيل</a>
        </div>
      </form>
    </div>
  )
}
