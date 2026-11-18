// Myova on-device PWA service worker.
// - Navigations: network-first (so new versions appear), fall back to cached shell offline.
// - Hashed assets: cache-first (immutable).
// Bump CACHE to force old caches out on deploy.
const CACHE = 'myova-v2'

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE)
    try { await c.addAll(['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']) } catch {}
    self.skipWaiting()
  })())
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const isNav = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')

  if (isNav) {
    // Network-first for the app shell so updates are picked up; cache as fallback.
    e.respondWith((async () => {
      try {
        const res = await fetch(request)
        const c = await caches.open(CACHE); c.put('./index.html', res.clone()).catch(() => {})
        return res
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error()
      }
    })())
    return
  }

  // Cache-first for everything else (hashed assets, icons).
  e.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
      const res = await fetch(request)
      const c = await caches.open(CACHE); c.put(request, res.clone()).catch(() => {})
      return res
    } catch {
      return Response.error()
    }
  })())
})
