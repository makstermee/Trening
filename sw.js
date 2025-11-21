const CACHE_NAME = 'gympro-v6'; 
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap'
];

// 1. Instalacja - AGRESYWNA (skipWaiting)
self.addEventListener('install', (e) => {
  self.skipWaiting(); 
  
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Aktywacja - PRZEJĘCIE KONTROLI (clients.claim)
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// 3. Pobieranie (Cache First)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
