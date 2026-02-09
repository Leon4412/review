const CACHE_NAME = 'car-inspection-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/auto.png',
  '/cartech.png',
  '/wheels.png'
];

// Установка Service Worker и кэширование ресурсов
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker и очистка старых кэшей
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Стратегия Cache First, затем Network
self.addEventListener('fetch', (event) => {
  // Игнорируем запросы не-GET (например, POST при сохранении формы)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Если ресурс в кэше - возвращаем его
        if (response) {
          console.log('[Service Worker] Found in cache:', event.request.url);
          return response;
        }

        // Если нет в кэше - загружаем из сети
        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Проверяем что получили валидный ответ
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Клонируем ответ
          const responseToCache = response.clone();

          // Добавляем в кэш
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch((error) => {
          console.log('[Service Worker] Fetch failed:', error);
          // Можно вернуть fallback страницу для офлайн режима
          return new Response('Офлайн режим. Проверьте подключение к интернету.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
