/* lumolog PWA service worker —— 手写实现，借鉴 swpp 的规则化缓存与版本增量清理思路 */

const VERSION = 'v1';
const CACHE_NAME = `lumolog-cache-${VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/images/lumolog-mark.svg',
  '/images/photo-fallback.svg',
  '/images/icons/icon-192.png',
  '/images/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

/* 版本增量清理：仅保留当前版本的缓存库，旧版本全部移除 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('lumolog-cache-') && n !== CACHE_NAME).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

/** 规则表：借鉴 swpp matchCacheRule，按 URL 形态决定缓存策略 */
function matchRule(url, request) {
  if (request.method !== 'GET') return 'pass';
  if (url.origin !== self.location.origin) {
    // 远程图库图片（IMAGE_REMOTE_ORIGINS 白名单来源）：cache-first + 后台更新
    return request.destination === 'image' ? 'swr' : 'pass';
  }
  if (url.pathname.startsWith('/api/')) return 'pass'; // 数据保持实时
  if (url.pathname.startsWith('/_next/static/')) return 'cache-first'; // 内容哈希，天然永久
  if (url.pathname.startsWith('/_next/image')) return 'swr';
  if (url.pathname.startsWith('/images/')) return 'swr';
  if (request.mode === 'navigate') return 'network-first';
  return 'pass';
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || network;
}

function offlineResponse() {
  return new Response(
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线 · 克喵Gallery</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141414;color:#f5f5f5;font-family:system-ui,sans-serif;text-align:center}main{padding:2rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#a3a3a3;margin:0;font-size:.9rem}</style></head><body><main><h1>当前处于离线状态</h1><p>这个页面还没有被缓存，联网后浏览过的内容会自动缓存下来。</p></main></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const rule = matchRule(url, request);
  if (rule === 'pass') return;

  if (rule === 'cache-first') {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  if (rule === 'swr') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // network-first：优先拿最新页面，断网时回退已缓存内容
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') return offlineResponse();
        return Response.error();
      })
  );
});
