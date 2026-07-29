import Link from 'next/link'
import { CalendarDays, History, House, Settings } from 'lucide-react'

const items = [
  { href: '/app', label: 'اليوم', Icon: House },
  { href: '/app/history', label: 'السجل', Icon: History },
  { href: '/app/plan/settings', label: 'الخطة', Icon: CalendarDays },
  { href: '/app/settings/privacy', label: 'الإعدادات', Icon: Settings },
] as const

export function MobileBottomNavigation() {
  return (
    <nav
      aria-label="التنقل في التطبيق"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-4">
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.6875rem] font-medium text-muted transition hover:bg-primary-soft hover:text-primary-muted focus-visible:text-primary-muted"
          >
            <Icon
              aria-hidden="true"
              focusable="false"
              size={20}
              strokeWidth={1.8}
            />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
