export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

const CLUB_LOGO_ICON = '/assets/club-logo.png';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw-notify.js', { scope: '/' })
      .then((reg) => reg)
      .catch(() => null);
  }
  return swRegistrationPromise;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayEqual(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return false;
  const view = new Uint8Array(a);
  if (view.length !== b.length) return false;
  for (let i = 0; i < view.length; i++) {
    if (view[i] !== b[i]) return false;
  }
  return true;
}

export async function syncPushSubscriptionForUser(idToken: string): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !idToken ||
    !('Notification' in window) ||
    Notification.permission !== 'granted' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return false;
  }

  try {
    await registerNotificationServiceWorker();
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.pushManager) return false;

    const keyRes = await fetch('/api/push/public-key');
    if (!keyRes.ok) return false;
    const { publicKey } = (await keyRes.json()) as { publicKey?: string };
    if (!publicKey) return false;

    const desiredKey = urlBase64ToUint8Array(publicKey);
    let sub = await reg.pushManager.getSubscription();

    if (sub && sub.options?.applicationServerKey && !uint8ArrayEqual(sub.options.applicationServerKey, desiredKey)) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: desiredKey
      });
    }

    const regRes = await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ subscription: sub.toJSON() })
    });
    return regRes.ok;
  } catch {
    return false;
  }
}

export async function triggerRecipientWebPush(params: {
  idToken: string;
  targetEmails: string[];
  targetUid?: string | null;
  title: string;
  body: string;
  tag: string;
  url?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !params.idToken) return;
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.idToken}`
      },
      body: JSON.stringify({
        targetEmails: params.targetEmails,
        targetUid: params.targetUid || undefined,
        title: params.title,
        body: params.body,
        tag: params.tag,
        url: params.url || '/dashboard?open=inbox'
      })
    });
  } catch {
    // ignore network/static fallback errors
  }
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  registerNotificationServiceWorker();

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    const result = await new Promise<NotificationPermission>((resolve) => {
      try {
        const maybePromise = Notification.requestPermission((cbPermission) => {
          resolve(cbPermission);
        });
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(resolve).catch(() => resolve(Notification.permission));
        }
      } catch {
        resolve(Notification.permission);
      }
    });
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function dispatchBrowserNotification(params: {
  title: string;
  body: string;
  tag: string;
  onClick?: () => void;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  // 1. Synchronous Notification constructor first (instant on Chrome/Edge/Firefox/Safari desktop)
  try {
    const notif = new Notification(params.title, {
      body: params.body,
      icon: CLUB_LOGO_ICON,
      badge: CLUB_LOGO_ICON,
      tag: params.tag,
      renotify: true
    } as NotificationOptions);
    notif.onclick = () => {
      window.focus();
      params.onClick?.();
      notif.close();
    };
    return true;
  } catch {
    // Mobile/Android Chrome requires ServiceWorkerRegistration.showNotification
  }

  // 2. Fallback to Service Worker showNotification (Android Chrome & mobile browsers)
  if ('serviceWorker' in navigator) {
    try {
      const reg =
        (await registerNotificationServiceWorker()) ||
        (await navigator.serviceWorker.ready);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(params.title, {
          body: params.body,
          icon: CLUB_LOGO_ICON,
          badge: CLUB_LOGO_ICON,
          tag: params.tag,
          renotify: true,
          data: { url: '/dashboard?open=inbox' }
        } as NotificationOptions);
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
