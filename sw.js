const CACHE_NAME = 'notex-v2';
const ASSETS = [
    '/notex/',
    '/notex/index.html',
    '/notex/style.css',
    '/notex/script.js',
    '/notex/manifest.json',
    '/notex/markdown-it.min.js',
    '/notex/lz-string.min.js',
    '/notex/prism.min.js',
    '/notex/prism-markdown.min.js',
    '/notex/prism-tomorrow.min.css',
    '/notex/icons/icon-192.png',
    '/notex/icons/icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
