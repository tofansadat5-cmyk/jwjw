/* Service Worker - دفتر کهاته سلطان
   صفحه و کتابخانه‌های Firebase را کش می‌کند تا برنامه آفلاین هم باز شود.
   وقتی نسخه‌ی جدید index.html آپلود کردی، عدد VERSION را عوض کن. */
const VERSION = 'v1';
const CACHE = 'khata-sultan-' + VERSION;
const CORE = ['./', './index.html', './manifest.json', './offline-bot.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(CORE.map(u => c.add(u).catch(() => {})))   // اگر فایلی نبود، نصب خراب نشود
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('khata-sultan-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const firebaseLib = url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
  if (!sameOrigin && !firebaseLib) return;   // درخواست‌های Firestore/Auth و غیره دست‌نخورده

  if (firebaseLib) {
    // کتابخانه‌ها نسخه‌دار هستند: اول کش
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // فایل‌های خود برنامه: اول اینترنت (تا آپدیت‌ها برسند)، اگر نبود از کش
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(hit =>
        hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});
