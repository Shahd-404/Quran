'use client'

import { useState } from 'react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed', error)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-2xl bg-red-600 px-4 py-3 text-white font-semibold shadow-sm hover:bg-red-700 disabled:opacity-60"
    >
      {loading ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
    </button>
  )
}
