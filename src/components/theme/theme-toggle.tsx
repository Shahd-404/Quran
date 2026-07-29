'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  window.localStorage.setItem('wird-theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
  const label =
    nextTheme === 'dark' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        applyTheme(nextTheme)
        setTheme(nextTheme)
      }}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-ink shadow-sm transition hover:border-primary/40 hover:bg-primary-soft"
    >
      {theme === 'dark' ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
          <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
          <path d="M20.3 15.2A8 8 0 018.8 3.7 8.5 8.5 0 1020.3 15.2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      )}
    </button>
  )
}
