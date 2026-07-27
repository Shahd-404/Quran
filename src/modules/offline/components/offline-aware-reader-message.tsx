'use client'

import { useEffect, useState } from 'react'

export function OfflineAwareReaderMessage({ fallback }: { fallback: string }) {
  const [message, setMessage] = useState(fallback)
  useEffect(() => {
    if (!navigator.onLine) setMessage('تعذر تحميل صفحة القرآن لعدم وجود اتصال بالإنترنت.')
  }, [])
  return <p className="mt-4 leading-7 text-stone-600">{message}</p>
}
