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
  return <div role="status" className="sticky top-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-950">أنتِ الآن دون اتصال. قد لا تتوفر بعض البيانات.</div>
}
