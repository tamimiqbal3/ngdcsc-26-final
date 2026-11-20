const ASSET_CACHE = 'ngdcsc-push-assets-v1';
const CLUB_LOGO = '/assets/club-logo.png';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) => cache.add(CLUB_LOGO).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== ASSET_CACHE && k.startsWith('ngdcsc-'))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    if (event.request.method === 'GET' && url.pathname === CLUB_LOGO) {
      event.respondWith(
        caches.match(CLUB_LOGO).then((cached) => cached || fetch(event.request))
      );
    }
  } catch {
    // pass through
  }
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'NGDC Science Club • 1 New Message',
    body: 'Check your dashboard.',
    icon: CLUB_LOGO,
    badge: CLUB_LOGO,
    tag: `ngdcsc-push-${Date.now()}`,
    url: '/dashboard?open=inbox'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = {
          title: parsed.title || payload.title,
          body: parsed.body || payload.body,
          icon: parsed.icon || payload.icon,
          badge: parsed.badge || payload.badge,
          tag: parsed.tag || payload.tag,
          url: parsed.url || payload.url
        };
      }
    } catch {
      const txt = event.data.text();
      if (txt) payload.body = txt;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: true,
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      data: { url: payload.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/dashboard?open=inbox';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          try {
            if ('focus' in client) {
              await client.focus();
            }
            client.postMessage({ type: 'OPEN_INBOX' });
            return;
          } catch {
            // continue to next client or openWindow
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch('/api/push/public-key', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const publicKey = data && data.publicKey;
        if (!publicKey) return;

        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });

        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
        }
      } catch {
        // ignore; active client will re-sync on next open
      }
    })()
  );
});
