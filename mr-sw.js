// Master Register service worker: makes the page installable and opens fast.
// Only the app shell is cached. Your data always comes live from Supabase.
const CACHE = "mr-shell-v1";
const SHELL = ["/master-register.html", "/master-register.webmanifest", "/mr-icon-192.png", "/mr-icon-512.png", "/mr-icon-maskable-512.png"];
const CDN = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("mr-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // never touch Supabase or any other API traffic
  if (url.hostname.endsWith("supabase.co")) return;
  const isShell = url.origin === location.origin && (url.pathname === "/master-register.html" || SHELL.includes(url.pathname));
  const isCdn = CDN.includes(url.hostname);
  if (!isShell && !isCdn) return;
  if (isShell) {
    // network first, so pushes show up straight away; cache when offline
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname === "/master-register.html" ? "/master-register.html" : req, copy)); return res; })
      .catch(() => caches.match(url.pathname === "/master-register.html" ? "/master-register.html" : req)));
  } else {
    // libraries and fonts: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
  }
});
