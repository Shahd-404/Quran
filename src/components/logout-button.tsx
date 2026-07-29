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
      className="btn-danger w-full"
    >
      {loading ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
    </button>
  )
}
