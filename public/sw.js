/**
 * Minimal service worker for PWA installability (Chrome/Edge desktop).
 * No fetch listener: we were not caching — only re-fetching through the worker,
 * which duplicates failures and floods the console with FetchEvent / sw.js errors
 * when third-party requests fail. Default browser fetch avoids that extra hop.
 */
const CACHE_VERSION = 'aquads-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

