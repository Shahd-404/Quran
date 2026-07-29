'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

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
        <Sun aria-hidden="true" focusable="false" size={19} strokeWidth={1.8} />
      ) : (
        <Moon aria-hidden="true" focusable="false" size={19} strokeWidth={1.8} />
      )}
    </button>
  )
}
