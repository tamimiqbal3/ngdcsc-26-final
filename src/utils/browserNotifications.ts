export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

export type PushSyncFailureReason =
  | 'iframe'
  | 'ios-a2hs'
  | 'unsupported'
  | 'permission-needed'
  | 'denied'
  | 'push-failed';

export interface PushSyncStatus {
  checked: boolean;
  ok: boolean;
  reason?: PushSyncFailureReason;
}

const CLUB_LOGO_ICON = '/assets/club-logo.png';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let lastPushSyncStatus: PushSyncStatus = { checked: false, ok: false };

function emitPushSyncStatus(status: PushSyncStatus) {
  lastPushSyncStatus = status;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<PushSyncStatus>('ngdcsc-push-status-changed', { detail: status })
    );
  }
}

export function getLastPushSyncStatus(): PushSyncStatus {
  return lastPushSyncStatus;
}

export function isInEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isIosNonStandalone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  if (!isIos) return false;
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    Boolean((navigator as any).standalone);
  return !isStandalone;
}

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
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        return reg;
      })
      .catch(() => {
        swRegistrationPromise = null;
        return null;
      });
  }
  return swRegistrationPromise;
}

async function waitForActiveServiceWorker(
  reg: ServiceWorkerRegistration
): Promise<ServiceWorker | null> {
  if (reg.active) return reg.active;

  const pendingWorker = reg.installing || reg.waiting;
  if (pendingWorker) {
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timer = window.setTimeout(done, 6000);
      const onState = () => {
        if (pendingWorker.state === 'activated' || pendingWorker.state === 'redundant') {
          window.clearTimeout(timer);
          pendingWorker.removeEventListener('statechange', onState);
          done();
        }
      };
      pendingWorker.addEventListener('statechange', onState);
      if (pendingWorker.state === 'activated' || pendingWorker.state === 'redundant') {
        window.clearTimeout(timer);
        pendingWorker.removeEventListener('statechange', onState);
        done();
      }
    });
  }

  if (reg.active) return reg.active;

  try {
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 6000))
    ]);
    return readyReg?.active || null;
  } catch {
    return null;
  }
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

async function subscribePushWithRetry(
  reg: ServiceWorkerRegistration,
  applicationServerKey: Uint8Array<ArrayBuffer>
): Promise<PushSubscription | null> {
  let sub = await reg.pushManager.getSubscription();
  if (
    sub &&
    sub.options?.applicationServerKey &&
    !uint8ArrayEqual(sub.options.applicationServerKey, applicationServerKey)
  ) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }

  if (sub) return sub;

  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  } catch {
    const existing = await reg.pushManager.getSubscription().catch(() => null);
    if (existing) {
      await existing.unsubscribe().catch(() => {});
    }
    await new Promise((r) => window.setTimeout(r, 400));
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  }
}

export async function syncPushSubscriptionForUser(idToken: string): Promise<boolean> {
  if (typeof window === 'undefined' || !idToken) {
    return false;
  }

  try {
    let publicKey: string | undefined;
    try {
      const syncRes = await fetch('/api/push/sync-keys', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (syncRes.ok) {
        const data = (await syncRes.json()) as { publicKey?: string };
        publicKey = data?.publicKey;
      }
    } catch {
      // fallback below
    }

    if (isIosNonStandalone() && (!('Notification' in window) || !('PushManager' in window))) {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'ios-a2hs' });
      return false;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      emitPushSyncStatus({
        checked: true,
        ok: false,
        reason: isInEmbeddedIframe() ? 'iframe' : 'unsupported'
      });
      return false;
    }

    if (Notification.permission === 'denied') {
      emitPushSyncStatus({
        checked: true,
        ok: false,
        reason: isInEmbeddedIframe() ? 'iframe' : 'denied'
      });
      return false;
    }

    if (Notification.permission !== 'granted') {
      emitPushSyncStatus({
        checked: true,
        ok: false,
        reason: isInEmbeddedIframe() ? 'iframe' : 'permission-needed'
      });
      return false;
    }

    const reg = await registerNotificationServiceWorker();
    if (!reg || !reg.pushManager) {
      emitPushSyncStatus({
        checked: true,
        ok: false,
        reason: isInEmbeddedIframe() ? 'iframe' : 'push-failed'
      });
      return false;
    }

    const activeSw = await waitForActiveServiceWorker(reg);
    if (!activeSw) {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed' });
      return false;
    }

    if (!publicKey) {
      const keyRes = await fetch('/api/push/public-key', { cache: 'no-store' });
      if (!keyRes.ok) {
        emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed' });
        return false;
      }
      const data = (await keyRes.json()) as { publicKey?: string };
      publicKey = data?.publicKey;
    }
    if (!publicKey) {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed' });
      return false;
    }

    const desiredKey = urlBase64ToUint8Array(publicKey);
    const sub = await subscribePushWithRetry(reg, desiredKey);
    if (!sub) {
      emitPushSyncStatus({
        checked: true,
        ok: false,
        reason: isInEmbeddedIframe() ? 'iframe' : 'push-failed'
      });
      return false;
    }

    const regRes = await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ subscription: sub.toJSON() })
    });
    if (!regRes.ok) {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed' });
      return false;
    }

    const regData = (await regRes.json().catch(() => null)) as {
      ok?: boolean;
      publicKey?: string;
    } | null;

    if (regData?.publicKey && regData.publicKey !== publicKey) {
      await sub.unsubscribe().catch(() => {});
      const rotatedKey = urlBase64ToUint8Array(regData.publicKey);
      const rotatedSub = await subscribePushWithRetry(reg, rotatedKey);
      if (!rotatedSub) {
        emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed' });
        return false;
      }
      const retryRes = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ subscription: rotatedSub.toJSON() })
      });
      const ok = retryRes.ok;
      emitPushSyncStatus(ok ? { checked: true, ok: true } : { checked: true, ok: false, reason: 'push-failed' });
      return ok;
    }

    emitPushSyncStatus({ checked: true, ok: true });
    return true;
  } catch {
    emitPushSyncStatus({
      checked: true,
      ok: false,
      reason: isInEmbeddedIframe() ? 'iframe' : isIosNonStandalone() ? 'ios-a2hs' : 'push-failed'
    });
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
      keepalive: true,
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
