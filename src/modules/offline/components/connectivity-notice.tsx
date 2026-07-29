'use client'

import { useEffect, useState } from 'react'

export function ConnectivityNotice() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(navigator.onLine)
    const showOnline = () => setOnline(true)
    const showOffline = () => setOnline(false)
    window.addEventListener('online', showOnline)
    window.addEventListener('offline', showOffline)
    return () => {
      window.removeEventListener('online', showOnline)
      window.removeEventListener('offline', showOffline)
    }
  }, [])
  if (online) return null
  return <div role="status" className="sticky top-[4.5rem] z-50 border-b border-warning/25 bg-warning-soft px-4 py-2 text-center text-sm font-semibold text-warning">أنتِ الآن دون اتصال. قد لا تتوفر بعض البيانات.</div>
}
