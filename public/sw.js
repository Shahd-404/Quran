const STATIC_CACHE = 'wird-static-v1'
const OFFLINE_URL = '/offline.html'
const WIRD_CACHE_PREFIX = 'wird-'
const STATIC_ASSETS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/wird-192.svg',
  '/icons/wird-512.svg',
  '/icons/wird-maskable.svg',
]
const DEFAULT_URL = '/app'
const SESSION_URL = /^\/app\/read\/[0-9a-f]{8}-[0-9a-f-]{27}$/i

function safeNotificationPath(value) {
  if (value === DEFAULT_URL) return DEFAULT_URL
  return typeof value === 'string' && SESSION_URL.test(value) ? value : DEFAULT_URL
}

function isSafeStaticRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/api/')) return false
  return url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/manifest.webmanifest'
    || url.pathname === OFFLINE_URL
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter((name) => name.startsWith(WIRD_CACHE_PREFIX) && name !== STATIC_CACHE)
      .map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      return cached || Response.error()
    }))
    return
  }
  if (isSafeStaticRequest(request, url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(STATIC_CACHE)
        await cache.put(request, response.clone())
      }
      return response
    })())
  }
})

function safePayload(data) {
  if (!data || data.kind !== 'session_due') return null
  if (data.title !== 'حان وقت وردك' || data.body !== 'جلسة الورد جاهزة للقراءة.') return null
  if (typeof data.url !== 'string' || !SESSION_URL.test(data.url)) return null
  if (typeof data.tag !== 'string' || !/^reading-session-[0-9a-f-]{36}$/i.test(data.tag)) return null
  return data
}

self.addEventListener('push', (event) => {
  let payload = null
  try { payload = safePayload(event.data?.json()) } catch { payload = null }
  if (!payload) return
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, tag: payload.tag, data: { url: payload.url }, dir: 'rtl', lang: 'ar',
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = safeNotificationPath(event.notification.data?.url)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const target = new URL(path, self.location.origin)
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.navigate(target.href); return existing.focus() }
    return self.clients.openWindow(target.href)
  })())
})
