'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'

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
      className="btn-secondary w-full text-danger hover:border-danger/30 hover:bg-danger-soft"
    >
      <LogOut aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
      {loading ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
    </button>
  )
}
