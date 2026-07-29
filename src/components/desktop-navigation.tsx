'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  History,
  House,
  Settings,
  type LucideIcon,
} from 'lucide-react'

type DesktopNavigationItem = {
  href: string
  label: string
  Icon: LucideIcon
}

const items: readonly DesktopNavigationItem[] = [
  { href: '/app', label: 'لوحة الورد', Icon: House },
  { href: '/app/history', label: 'السجل', Icon: History },
  { href: '/app/plan/settings', label: 'الخطة', Icon: CalendarDays },
  {
    href: '/app/settings/privacy',
    label: 'الإعدادات',
    Icon: Settings,
  },
]

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DesktopNavigation() {
  const pathname = usePathname()

  return (
    <nav
      className="hidden items-center md:flex"
      aria-label="التنقل الرئيسي"
    >
      {items.map(({ href, label, Icon }) => {
        const active = isActiveRoute(pathname, href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-offset-2 lg:px-4 ${
              active
                ? 'bg-primary-soft text-primary-muted'
                : 'text-muted hover:bg-elevated hover:text-ink'
            }`}
          >
            <Icon
              aria-hidden="true"
              focusable="false"
              size={18}
              strokeWidth={1.8}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
