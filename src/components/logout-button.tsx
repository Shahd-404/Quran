'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import {
  clearAllOfflineData,
  hasUnsyncedOfflineActions,
} from '@/modules/offline/client/offline-db'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (loading) return
    setLoading(true)
    try {
      if (
        await hasUnsyncedOfflineActions() &&
        !window.confirm(
          'توجد إجراءات إكمال لم تصل إلى الخادم. تسجيل الخروج سيحذفها من هذا الجهاز. هل تريد المتابعة؟',
        )
      ) {
        setLoading(false)
        return
      }
      await clearAllOfflineData()
    } catch {
      if (
        !window.confirm(
          'تعذّر التحقق من حذف محتوى القراءة المحفوظ. يمكنك إلغاء الخروج ومسح بيانات الموقع يدويًا، أو المتابعة مع احتمال بقاء النسخة المحلية. هل تريد المتابعة؟',
        )
      ) {
        setLoading(false)
        return
      }
    }
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
