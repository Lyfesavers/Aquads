/**
 * Minimal service worker for PWA installability (Chrome/Edge desktop).
 * Pass-through only - no offline caching. Required for beforeinstallprompt to fire.
 */
const CACHE_VERSION = 'aquads-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass all requests through to network - no caching
  event.respondWith(fetch(event.request));
});
