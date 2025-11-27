const CACHE_NAME = 'gympro-STABLE-FIX-v5.0'; // Zmieniona nazwa cache
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // Ikony
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap',
  // WAŻNE: Dodajemy Firebase do cache, żeby aplikacja nie umierała bez sieci!
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js'
];

// 1. Instalacja
self.addEventListener('install', (e) => {
  self.skipWaiting(); 
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Aktywacja - Czyszczenie starego bałaganu
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('Usuwanie starego cache:', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => self.clients.claim())
  );
});

// 3. Pobieranie
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
