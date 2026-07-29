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
    expect(source).toContain("const AUTHENTICATED_PATH = /^\\/app(?:\\/|$)/")
    expect(source).toContain('if (AUTHENTICATED_PATH.test(url.pathname)) return')
  })
  it('keeps authenticated navigation network-only with an offline fallback', () => {
    expect(source).toContain("request.mode === 'navigate'")
    expect(source).toContain('caches.match(OFFLINE_URL)')
    const navigationBranch = source.slice(
      source.indexOf("if (request.mode === 'navigate')"),
      source.indexOf('if (AUTHENTICATED_PATH.test(url.pathname))'),
    )
    expect(navigationBranch).not.toContain('cache.put')
  })
  it('activates updates only after the explicit update message', () => {
    expect(source).toContain("event.data?.type === 'SKIP_WAITING'")
    const installHandler = source.slice(
      source.indexOf("addEventListener('install'"),
      source.indexOf("addEventListener('activate'"),
    )
    expect(installHandler).not.toContain('skipWaiting')
  })
  it('deletes only old Wird-owned caches', () => {
    expect(source).toContain("const STATIC_CACHE = 'wird-static-v2'")
    expect(source).toContain('name.startsWith(WIRD_CACHE_PREFIX)')
    expect(source).toContain('name !== STATIC_CACHE')
  })
})
