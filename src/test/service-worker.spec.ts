import fs from 'node:fs'
import vm from 'node:vm'
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
    expect(source).toContain('API_PATH.test(url.pathname)')
    expect(source).toContain("const AUTHENTICATED_PATH = /^\\/app(?:\\/|$)/")
    expect(source).toContain('if (AUTHENTICATED_PATH.test(url.pathname)) return')
  })
  it('does not intercept APIs, Quran Foundation, Supabase, or token requests', () => {
    const listeners = new Map<string, (event: {
      request: { method: string; mode: string; url: string }
      respondWith: (response: unknown) => void
    }) => void>()
    const context = {
      URL,
      Date,
      Headers,
      Request,
      Response,
      console,
      fetch: async () => ({ ok: false }),
      caches: {
        keys: async () => [],
        match: async () => null,
        open: async () => ({
          addAll: async () => undefined,
          match: async () => null,
          put: async () => undefined,
          delete: async () => true,
        }),
        delete: async () => true,
      },
      self: {
        location: { origin: 'https://wird.example' },
        addEventListener: (
          type: string,
          listener: (event: {
            request: { method: string; mode: string; url: string }
            respondWith: (response: unknown) => void
          }) => void,
        ) => listeners.set(type, listener),
        clients: {
          claim: async () => undefined,
          matchAll: async () => [],
          openWindow: async () => undefined,
        },
        registration: {
          showNotification: async () => undefined,
        },
        skipWaiting: async () => undefined,
      },
    }
    vm.runInNewContext(source, context)
    const fetchHandler = listeners.get('fetch')
    expect(fetchHandler).toBeDefined()

    const isIntercepted = (url: string, mode = 'cors') => {
      let intercepted = false
      fetchHandler?.({
        request: { method: 'GET', mode, url },
        respondWith: () => {
          intercepted = true
        },
      })
      return intercepted
    }

    expect(isIntercepted('https://wird.example/api/quran', 'navigate')).toBe(
      false,
    )
    expect(
      isIntercepted(
        'https://apis.quran.foundation/content/api/v4/verses/by_page/80',
      ),
    ).toBe(false)
    expect(
      isIntercepted(
        'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p80.woff2',
      ),
    ).toBe(true)
    expect(
      isIntercepted(
        'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p605.woff2',
      ),
    ).toBe(false)
    expect(
      isIntercepted('https://project.supabase.co/rest/v1/reading_sessions'),
    ).toBe(false)
    expect(
      isIntercepted('https://oauth2.quran.foundation/oauth2/token'),
    ).toBe(false)
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
    expect(source).toContain("const STATIC_CACHE = 'wird-static-v3'")
    expect(source).toContain("const QCF_FONT_CACHE = 'wird-qcf-v2-fonts-v1'")
    expect(source).toContain('name.startsWith(WIRD_CACHE_PREFIX)')
    expect(source).toContain('!ACTIVE_CACHES.has(name)')
  })
  it('keeps only complete official QCF fonts for at most seven days', () => {
    expect(source).toContain('QCF_FONT_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000')
    expect(source).toContain('QCF_V2_PAGE_FONT.test(url.href)')
    expect(source).toContain("metadataUrl.searchParams.set('__wird_cached_at', '1')")
    expect(source).toContain('Date.now() - cachedAt > QCF_FONT_CACHE_MAX_AGE_MS')
    expect(source).toContain('if (response.ok)')
  })
})
