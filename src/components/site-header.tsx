import Link from 'next/link'
import { BookOpen, History, House } from 'lucide-react'
import { ThemeToggle } from './theme/theme-toggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[3.75rem] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:min-h-[4.25rem] sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-2xl"
          aria-label="ورد — الصفحة الرئيسية"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm transition group-hover:bg-primary-strong sm:h-10 sm:w-10 sm:rounded-2xl">
            <BookOpen aria-hidden="true" focusable="false" size={20} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-base font-semibold leading-none text-ink sm:text-lg">ورد</span>
            <span className="mt-1 hidden text-xs text-muted sm:block">رفيق القراءة اليومية</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="hidden items-center md:flex" aria-label="التنقل الرئيسي">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-elevated hover:text-ink sm:px-4"
            >
              <House aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
              لوحة الورد
            </Link>
            <Link
              href="/app/history"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted transition hover:bg-elevated hover:text-ink"
            >
              <History aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
              السجل
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
