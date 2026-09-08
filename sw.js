// ChitChat Service Worker v5 — Data-saving + media caching strategy
// ─────────────────────────────────────────────────────────────────
// Static assets (icons, fonts, audio)  → CACHE-FIRST  (zero bytes on repeat)
// App code (HTML, JS)                  → NETWORK-FIRST (bug fixes always reach phone)
// Cloudinary/media images & videos     → CACHE-FIRST after first download
// Firebase API calls                   → BYPASS (never intercept, always live)
//
// v5: cache version bumped specifically to force every device to drop its
// old cached copies of index.html/js/*.js and pull the current fixed
// files fresh. If a previous round of fixes didn't seem to take effect
// on a real device/browser, a stale Cache Storage entry from an older
// service worker version was the most likely reason — this forces a
// clean break from it. The fetch handler below was already
// network-first for app code, but that only helps once a NEW service
// worker version (this file) actually activates; bumping the version
// number is what triggers that.

var STATIC_CACHE  = 'chitchat-static-v5';
var MEDIA_CACHE   = 'chitchat-media-v5';

var PRECACHE_FILES = [
  '/index.html',
  '/js/firebase-app.js',
  '/js/firebase-database.js',
  '/js/firebase-auth.js',
  '/js/chat.js',
  '/js/ui.js',
  '/js/auth.js',
  '/js/config.js',
  '/js/cloudinary.js',
  '/js/groups.js',
  '/js/share.js',
  '/js/android-touch.js',
  '/js/android-status.js',
  '/icons/default.png',
  '/icons/default_grp.png',
  '/icons/profile.png',
  '/icons/background.png',
  '/icons/bg.png',
  '/icons/send.png',
  '/icons/icon112x112.png',
  '/icons/icon56x56.png',
  '/notification.mp3',
  '/manifest.webapp'
];

// Hosts whose responses should NEVER be intercepted
var BYPASS_HOSTS = [
  'firebaseio.com',
  'googleapis.com',
  'firebase.google.com',
  'firebaseapp.com',
  'gstatic.com'
];

function isBypassHost(url) {
  return BYPASS_HOSTS.some(function(h) { return url.hostname.indexOf(h) !== -1; });
}

function isMediaUrl(url) {
  // Cloudinary, Firebase Storage, or any remote image/video
  var h = url.hostname;
  if (h.indexOf('cloudinary.com') !== -1) return true;
  if (h.indexOf('firebasestorage') !== -1) return true;
  return /\.(jpe?g|png|gif|webp|mp4|webm|ogg|mp3|m4a)$/i.test(url.pathname);
}

function isImmutableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  var p = url.pathname;
  return p.indexOf('/icons/') === 0 ||
         /\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp3|ogg)$/i.test(p);
}

function isAppCode(url) {
  if (url.origin !== self.location.origin) return false;
  var p = url.pathname;
  return p === '/' || p === '/index.html' || p.indexOf('/js/') === 0 || p === '/manifest.webapp';
}

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(PRECACHE_FILES);
    }).catch(function() {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) {
        return k !== STATIC_CACHE && k !== MEDIA_CACHE;
      }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url;
  try { url = new URL(e.request.url); } catch(err) { return; }

  // 1. Never intercept Firebase / Google API calls
  if (isBypassHost(url)) return;

  // 2. Media (Cloudinary, Storage): cache-first — saves huge data on revisit
  if (isMediaUrl(url)) {
    e.respondWith(
      caches.open(MEDIA_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(resp) {
            if (resp && resp.ok && resp.status === 200) {
              // Only cache same-origin or CORS-ok responses
              cache.put(e.request, resp.clone());
            }
            return resp;
          }).catch(function() { return cached || new Response('', {status: 503}); });
        });
      })
    );
    return;
  }

  // 3. Local static assets (icons, fonts, audio): cache-first
  if (isImmutableAsset(url)) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(resp) {
          if (resp && resp.ok) {
            caches.open(STATIC_CACHE).then(function(c) { c.put(e.request, resp.clone()); });
          }
          return resp;
        });
      })
    );
    return;
  }

  // 4. App code (HTML/JS): network-first so fixes always reach the device
  if (isAppCode(url)) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.ok) {
          caches.open(STATIC_CACHE).then(function(c) { c.put(e.request, resp.clone()); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }
});
