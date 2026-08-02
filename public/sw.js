const CACHE_NAME = 'bach-hoa-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
];

self.oninstall = (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
};

self.onactivate = (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
};

self.onfetch = (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Chỉ cache các file tĩnh (js, css, hình ảnh, fonts)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2?|ico)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // 2. Không cache HTML và các request động (API, trang web)
  // Luôn fetch từ mạng (network-only) để lấy dữ liệu mới nhất
  // Tránh lỗi hiển thị data cũ (stale cache) trên Mobile / PWA
  event.respondWith(fetch(event.request));
};
