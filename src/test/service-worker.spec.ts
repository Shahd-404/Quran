import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync('public/sw.js', 'utf8')

describe('shared Service Worker', () => {
  it('preserves Web Push behavior', () => {
    expect(source).toContain("addEventListener('push'")
    expect(source).toContain("addEventListener('notificationclick'")
  })
  it('accepts the safe test destination and rejects external destinations', () => {
    expect(source).toContain('if (value === DEFAULT_URL) return DEFAULT_URL')
    expect(source).toContain("const DEFAULT_URL = '/app'")
    expect(source).toContain('SESSION_URL.test(value) ? value : DEFAULT_URL')
    expect(source).toContain('safeNotificationPath(event.notification.data?.url)')
    expect(source).toContain('existing.navigate(target.href)')
    expect(source).toContain('self.clients.openWindow(target.href)')
  })
  it('restricts cache candidates to same-origin GET and excludes APIs', () => {
    expect(source).toContain("request.method !== 'GET'")
    expect(source).toContain('url.origin !== self.location.origin')
    expect(source).toContain("url.pathname.startsWith('/api/')")
  })
  it('uses an offline navigation fallback and explicit update action', () => {
    expect(source).toContain("request.mode === 'navigate'")
    expect(source).toContain('caches.match(OFFLINE_URL)')
    expect(source).toContain("event.data?.type === 'SKIP_WAITING'")
  })
  it('deletes only old Wird-owned caches', () => {
    expect(source).toContain('name.startsWith(WIRD_CACHE_PREFIX)')
    expect(source).toContain('name !== STATIC_CACHE')
  })
})
