const STATIC_CACHE = 'wird-static-v3'
const QCF_FONT_CACHE = 'wird-qcf-v2-fonts-v2'
const QCF_FONT_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const OFFLINE_URL = '/offline.html'
const WIRD_CACHE_PREFIX = 'wird-'
const ACTIVE_CACHES = new Set([STATIC_CACHE, QCF_FONT_CACHE])
const STATIC_ASSETS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/wird-192.svg',
  '/icons/wird-512.svg',
  '/icons/wird-maskable.svg',
]
const DEFAULT_URL = '/app'
const SESSION_URL = /^\/app\/read\/[0-9a-f]{8}-[0-9a-f-]{27}$/i
const AUTHENTICATED_PATH = /^\/app(?:\/|$)/
const API_PATH = /^\/api(?:\/|$)/
const QCF_V2_PAGE_FONT = /^https:\/\/verses\.quran\.foundation\/fonts\/quran\/hafs\/v2\/woff2\/p(?:[1-9]|[1-9]\d|[1-5]\d{2}|60[0-4])\.woff2$/
const QCF_V2_UNICODE_FONT = 'https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2'

function safeNotificationPath(value) {
  if (value === DEFAULT_URL) return DEFAULT_URL
  return typeof value === 'string' && SESSION_URL.test(value) ? value : DEFAULT_URL
}

function isSafeStaticRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false
  if (API_PATH.test(url.pathname)) return false
  return url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/manifest.webmanifest'
    || url.pathname === OFFLINE_URL
}

function isOfficialQcfFontRequest(request, url) {
  return request.method === 'GET'
    && (QCF_V2_PAGE_FONT.test(url.href) || url.href === QCF_V2_UNICODE_FONT)
}

function qcfFontMetadataRequest(request) {
  const metadataUrl = new URL(request.url)
  metadataUrl.searchParams.set('__wird_cached_at', '1')
  return new Request(metadataUrl.href)
}

async function getFreshQcfFont(cache, request) {
  const metadataRequest = qcfFontMetadataRequest(request)
  const [cachedFont, cachedMetadata] = await Promise.all([
    cache.match(request),
    cache.match(metadataRequest),
  ])
  if (!cachedFont || !cachedMetadata) return null

  const cachedAt = Number(await cachedMetadata.text())
  if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > QCF_FONT_CACHE_MAX_AGE_MS) {
    await Promise.all([
      cache.delete(request),
      cache.delete(metadataRequest),
    ])
    return null
  }
  return cachedFont
}

async function loadOfficialQcfFont(request) {
  const cache = await caches.open(QCF_FONT_CACHE)
  const cached = await getFreshQcfFont(cache, request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const validationResponse = response.clone()
    const buffer = await validationResponse.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const isWoff2 =
      bytes.length > 4 &&
      bytes[0] === 0x77 &&
      bytes[1] === 0x4f &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x32

    if (isWoff2) {
      await Promise.all([
        cache.put(request, response.clone()),
        cache.put(
          qcfFontMetadataRequest(request),
          new Response(String(Date.now()), {
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      ])
    }
  }
  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter((name) => name.startsWith(WIRD_CACHE_PREFIX) && !ACTIVE_CACHES.has(name))
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
  if (isOfficialQcfFontRequest(request, url)) {
    event.respondWith(loadOfficialQcfFont(request))
    return
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (API_PATH.test(url.pathname)) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      return cached || Response.error()
    }))
    return
  }
  if (AUTHENTICATED_PATH.test(url.pathname)) return
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
