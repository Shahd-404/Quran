import Link from 'next/link'
import { ThemeToggle } from './theme/theme-toggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-2xl"
          aria-label="ورد — الصفحة الرئيسية"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-xl font-bold text-white shadow-sm transition group-hover:bg-primary-strong">
            و
          </span>
          <span>
            <span className="block text-lg font-bold leading-none text-ink">ورد</span>
            <span className="mt-1 hidden text-xs text-muted sm:block">رفيق القراءة اليومية</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="flex items-center" aria-label="التنقل الرئيسي">
            <Link
              href="/app"
              className="rounded-xl px-3 py-2 text-sm font-bold text-muted transition hover:bg-elevated hover:text-ink sm:px-4"
            >
              لوحة الورد
            </Link>
            <Link
              href="/app/history"
              className="hidden rounded-xl px-4 py-2 text-sm font-bold text-muted transition hover:bg-elevated hover:text-ink sm:inline-flex"
            >
              السجل
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
