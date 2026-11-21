/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

const CLUB_LOGO = '/assets/club-logo.png';
const DEFAULT_TARGET_URL = '/dashboard?open=inbox';

firebase.initializeApp({
  apiKey: 'AIzaSyC-J4YtNcvqUQYUA9WgFckP7pQC9KtDNMo',
  authDomain: 'ngdcsc-a8228.firebaseapp.com',
  databaseURL: 'https://ngdcsc-a8228-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'ngdcsc-a8228',
  storageBucket: 'ngdcsc-a8228.firebasestorage.app',
  messagingSenderId: '315370542065',
  appId: '1:315370542065:web:740142776b5a4450152a50',
  measurementId: 'G-SMC8605ZNP'
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // If payload already includes an FCM `notification` block, firebase-messaging-compat
  // automatically calls showNotification; skip here to avoid duplicate system alerts.
  if (payload && payload.notification) {
    return;
  }

  const data = (payload && payload.data) || {};
  const title = data.title || 'NGDC Science Club • 1 New Message';
  const body = data.body || 'Check your dashboard.';
  const icon = data.icon || CLUB_LOGO;
  const badge = data.badge || CLUB_LOGO;
  const tag = data.tag || `ngdcsc-push-${Date.now()}`;
  const url = data.url || DEFAULT_TARGET_URL;

  return self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: { url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || DEFAULT_TARGET_URL;

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
            // try next client or openWindow
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
