import { getApp, getApps } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported as isMessagingSupported,
  onMessage,
  type Messaging
} from 'firebase/messaging';

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

export type PushSyncFailureReason =
  | 'iframe'
  | 'ios-a2hs'
  | 'unsupported'
  | 'permission-needed'
  | 'denied'
  | 'disabled'
  | 'push-failed';

export interface PushSyncStatus {
  checked: boolean;
  ok: boolean;
  reason?: PushSyncFailureReason;
  detail?: string;
}

const CLUB_LOGO_ICON = '/assets/club-logo.png';
const USER_DISABLED_KEY = 'ngdcsc_notif_user_disabled_v1';
const PROMPT_SEEN_KEY = 'ngdcsc_notif_prompt_seen_v1';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let fcmSwRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let syncInFlightPromise: Promise<boolean> | null = null;
let foregroundFcmAttached = false;
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

export function hasSeenNotificationPrompt(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PROMPT_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markNotificationPromptSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROMPT_SEEN_KEY, '1');
  } catch {
    // ignore
  }
}

export function isUserDisabledNotifications(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(USER_DISABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function isDeviceNotificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted' && !isUserDisabledNotifications();
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

let lastSwRegisterError = '';

export function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    lastSwRegisterError = '';
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        return reg;
      })
      .catch((err: any) => {
        lastSwRegisterError = err?.message || err?.name || 'SW registration rejected';
        console.warn('[NGDCSC Push] SW register error:', lastSwRegisterError);
        swRegistrationPromise = null;
        return null;
      });
  }
  return swRegistrationPromise;
}

export function registerFirebaseMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!fcmSwRegistrationPromise) {
    fcmSwRegistrationPromise = navigator.serviceWorker
      .register('/firebase-messaging-sw.js', {
        scope: FCM_SW_SCOPE,
        updateViaCache: 'none'
      })
      .then((reg) => {
        reg.update().catch(() => {});
        return reg;
      })
      .catch((err: any) => {
        const msg = err?.message || err?.name || 'FCM SW registration rejected';
        console.warn('[NGDCSC Push] FCM SW register error:', msg);
        fcmSwRegistrationPromise = null;
        return null;
      });
  }
  return fcmSwRegistrationPromise;
}

async function waitForActiveServiceWorker(
  reg: ServiceWorkerRegistration,
  allowReadyFallback = true
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
      const timer = window.setTimeout(done, 10000);
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

  if (!allowReadyFallback) {
    return null;
  }

  try {
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10000))
    ]);
    return readyReg?.active || null;
  } catch {
    return null;
  }
}

function attachForegroundFcmListener(messaging: Messaging) {
  if (foregroundFcmAttached || typeof window === 'undefined') return;
  foregroundFcmAttached = true;
  try {
    onMessage(messaging, (payload) => {
      window.dispatchEvent(
        new CustomEvent('ngdcsc-fcm-push-received', { detail: payload })
      );
    });
  } catch {
    foregroundFcmAttached = false;
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
): Promise<{ sub: PushSubscription | null; error?: string }> {
  let sub = await reg.pushManager.getSubscription();
  if (
    sub &&
    sub.options?.applicationServerKey &&
    !uint8ArrayEqual(sub.options.applicationServerKey, applicationServerKey)
  ) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }

  if (sub) return { sub };

  let lastErrMsg = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      return { sub: created };
    } catch (err: any) {
      lastErrMsg = `${err?.name || 'Error'}: ${err?.message || 'Push subscribe failed'}`;
      const existing = await reg.pushManager.getSubscription().catch(() => null);
      if (existing) {
        await existing.unsubscribe().catch(() => {});
      }
      if (attempt < 2) {
        await new Promise((r) => window.setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  return { sub: null, error: lastErrMsg || 'Push subscribe failed' };
}

async function acquirePushSubscription(publicKey: string): Promise<{
  sub: PushSubscription | null;
  fcmToken?: string;
  error?: string;
}> {
  const desiredKey = urlBase64ToUint8Array(publicKey);

  // Register both root SW (/sw.js) and dedicated Firebase Messaging SW (/firebase-messaging-sw.js)
  const [fcmReg, swReg] = await Promise.all([
    registerFirebaseMessagingServiceWorker(),
    registerNotificationServiceWorker()
  ]);

  let fcmError = '';
  if (fcmReg && fcmReg.pushManager) {
    const activeFcmSw = await waitForActiveServiceWorker(fcmReg, false);
    if (activeFcmSw) {
      // Ensure stale key mismatches are cleared before getToken() reads existing subscription
      const existingFcmSub = await fcmReg.pushManager.getSubscription().catch(() => null);
      if (
        existingFcmSub &&
        existingFcmSub.options?.applicationServerKey &&
        !uint8ArrayEqual(existingFcmSub.options.applicationServerKey, desiredKey)
      ) {
        await existingFcmSub.unsubscribe().catch(() => {});
      }

      let fcmToken: string | undefined;
      try {
        const supported = await isMessagingSupported().catch(() => false);
        if (supported && getApps().length > 0) {
          const messaging = getMessaging(getApp());
          attachForegroundFcmListener(messaging);
          const token = await getToken(messaging, {
            vapidKey: publicKey,
            serviceWorkerRegistration: fcmReg
          }).catch(() => null);
          if (token) {
            fcmToken = token;
          }
        }
      } catch {
        // continue with PushManager fallback on fcmReg
      }

      const { sub: fcmSub, error: subErr } = await subscribePushWithRetry(fcmReg, desiredKey);
      if (fcmSub) {
        // Avoid duplicate notifications by removing redundant push subscription from root SW
        if (swReg && swReg.pushManager) {
          const dupSub = await swReg.pushManager.getSubscription().catch(() => null);
          if (dupSub && dupSub.endpoint !== fcmSub.endpoint) {
            await dupSub.unsubscribe().catch(() => {});
          }
        }
        return { sub: fcmSub, fcmToken };
      }
      fcmError = subErr || '';
    }
  }

  if (!swReg || !swReg.pushManager) {
    return {
      sub: null,
      error: fcmError || lastSwRegisterError || 'Service worker registration unavailable'
    };
  }

  const activeSw = await waitForActiveServiceWorker(swReg, true);
  if (!activeSw) {
    return { sub: null, error: fcmError || 'Service worker did not activate in time' };
  }

  const { sub: swSub, error: swErr } = await subscribePushWithRetry(swReg, desiredKey);
  return { sub: swSub, error: swErr || fcmError };
}

async function parseJsonSafely<T>(res: Response, endpointLabel: string): Promise<T> {
  const raw = await res.text();
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${endpointLabel} returned empty response (HTTP ${res.status})`);
  }
  if (trimmed.startsWith('<')) {
    throw new Error(
      `Push API unreachable (${endpointLabel} returned HTML instead of JSON, HTTP ${res.status})`
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${endpointLabel} returned invalid JSON (HTTP ${res.status})`);
  }
}

export function syncPushSubscriptionForUser(idToken: string): Promise<boolean> {
  if (typeof window === 'undefined' || !idToken) {
    return Promise.resolve(false);
  }
  if (syncInFlightPromise) {
    return syncInFlightPromise;
  }
  syncInFlightPromise = runSyncPushSubscriptionForUser(idToken).finally(() => {
    syncInFlightPromise = null;
  });
  return syncInFlightPromise;
}

async function runSyncPushSubscriptionForUser(idToken: string): Promise<boolean> {
  if (isUserDisabledNotifications()) {
    emitPushSyncStatus({ checked: true, ok: false, reason: 'disabled' });
    return false;
  }

  if (isInEmbeddedIframe()) {
    emitPushSyncStatus({ checked: true, ok: false, reason: 'iframe' });
    return false;
  }

  try {
    let publicKey: string | undefined;
    try {
      const syncRes = await fetch('/api/push/sync-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Token': idToken
        },
        body: JSON.stringify({ idToken })
      });
      if (syncRes.ok) {
        const data = await parseJsonSafely<{ publicKey?: string }>(syncRes, '/api/push/sync-keys');
        publicKey = data?.publicKey?.trim();
      }
    } catch {
      // fallback below
    }

    if (isIosNonStandalone() && (!('Notification' in window) || !('PushManager' in window))) {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'ios-a2hs' });
      return false;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'unsupported' });
      return false;
    }

    if (Notification.permission === 'denied') {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'denied' });
      return false;
    }

    if (Notification.permission !== 'granted') {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'permission-needed' });
      return false;
    }

    if (!publicKey) {
      const keyRes = await fetch('/api/push/public-key', { cache: 'no-store' });
      if (!keyRes.ok) {
        const detail = `Public key fetch failed (HTTP ${keyRes.status})`;
        console.warn('[NGDCSC Push]', detail);
        emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed', detail });
        return false;
      }
      const data = await parseJsonSafely<{ publicKey?: string }>(keyRes, '/api/push/public-key');
      publicKey = data?.publicKey?.trim();
    }
    if (!publicKey) {
      emitPushSyncStatus({
        checked: true,
        ok: false,
        reason: 'push-failed',
        detail: 'Empty VAPID public key'
      });
      return false;
    }

    const { sub, fcmToken, error: subErr } = await acquirePushSubscription(publicKey);
    if (!sub) {
      const detail = subErr || 'PushManager.subscribe rejected';
      console.warn('[NGDCSC Push]', detail);
      emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed', detail });
      return false;
    }

    const regRes = await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Firebase-Token': idToken
      },
      body: JSON.stringify({ idToken, subscription: sub.toJSON(), fcmToken })
    });
    if (!regRes.ok) {
      const detail = `Server register failed (HTTP ${regRes.status})`;
      console.warn('[NGDCSC Push]', detail);
      emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed', detail });
      return false;
    }

    const regData = await parseJsonSafely<{
      ok?: boolean;
      publicKey?: string;
    }>(regRes, '/api/push/register');

    if (regData?.publicKey && regData.publicKey.trim() !== publicKey) {
      await sub.unsubscribe().catch(() => {});
      const {
        sub: rotatedSub,
        fcmToken: rotatedFcmToken,
        error: rotErr
      } = await acquirePushSubscription(regData.publicKey.trim());
      if (!rotatedSub) {
        emitPushSyncStatus({
          checked: true,
          ok: false,
          reason: 'push-failed',
          detail: rotErr || 'Key rotation subscribe failed'
        });
        return false;
      }
      const retryRes = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Token': idToken
        },
        body: JSON.stringify({
          idToken,
          subscription: rotatedSub.toJSON(),
          fcmToken: rotatedFcmToken
        })
      });
      const ok = retryRes.ok;
      emitPushSyncStatus(
        ok
          ? { checked: true, ok: true }
          : {
              checked: true,
              ok: false,
              reason: 'push-failed',
              detail: `Server retry failed (HTTP ${retryRes.status})`
            }
      );
      return ok;
    }

    emitPushSyncStatus({ checked: true, ok: true });
    return true;
  } catch (err: any) {
    const detail = err?.message || String(err);
    console.warn('[NGDCSC Push] Sync error:', detail);
    emitPushSyncStatus({
      checked: true,
      ok: false,
      reason: isIosNonStandalone() ? 'ios-a2hs' : 'push-failed',
      detail
    });
    return false;
  }
}

export async function enableNotificationsForUser(idToken?: string | null): Promise<{
  permission: BrowserNotificationPermission;
  pushActive: boolean;
  reason?: PushSyncFailureReason;
  detail?: string;
}> {
  if (typeof window === 'undefined') {
    return { permission: 'unsupported', pushActive: false, reason: 'unsupported' };
  }

  markNotificationPromptSeen();

  try {
    localStorage.removeItem(USER_DISABLED_KEY);
  } catch {
    // ignore
  }

  if (isIosNonStandalone() && (!('Notification' in window) || !('PushManager' in window))) {
    emitPushSyncStatus({ checked: true, ok: false, reason: 'ios-a2hs' });
    return { permission: 'unsupported', pushActive: false, reason: 'ios-a2hs' };
  }

  if (!('Notification' in window)) {
    const reason = isInEmbeddedIframe() ? 'iframe' : 'unsupported';
    emitPushSyncStatus({ checked: true, ok: false, reason });
    return { permission: 'unsupported', pushActive: false, reason };
  }

  const perm = await requestBrowserNotificationPermission();
  window.dispatchEvent(new CustomEvent('ngdcsc-notif-permission-changed', { detail: perm }));

  if (perm !== 'granted') {
    const reason = isInEmbeddedIframe() ? 'iframe' : perm === 'denied' ? 'denied' : 'permission-needed';
    emitPushSyncStatus({ checked: true, ok: false, reason });
    return { permission: perm, pushActive: false, reason };
  }

  let pushActive = false;
  let preLoginError: string | undefined;
  if (idToken) {
    pushActive = await syncPushSubscriptionForUser(idToken);
  } else {
    try {
      const keyRes = await fetch('/api/push/public-key', { cache: 'no-store' });
      if (!keyRes.ok) {
        preLoginError = `Public key fetch failed (HTTP ${keyRes.status})`;
      } else {
        const data = await parseJsonSafely<{ publicKey?: string }>(keyRes, '/api/push/public-key');
        if (data?.publicKey) {
          const { sub, error: subErr } = await acquirePushSubscription(data.publicKey.trim());
          if (sub) {
            pushActive = true;
          } else {
            preLoginError = subErr || 'PushManager.subscribe rejected';
          }
        } else {
          preLoginError = 'Empty VAPID public key';
        }
      }
    } catch (err: any) {
      preLoginError = err?.message || String(err);
    }
    if (!pushActive && preLoginError) {
      emitPushSyncStatus({ checked: true, ok: false, reason: 'push-failed', detail: preLoginError });
    }
  }

  // Send immediate confirmation system notification so user confirms OS alerts work
  dispatchBrowserNotification({
    title: 'NGDC Science Club',
    body: 'Notifications are now enabled for this device.',
    tag: 'ngdcsc-notif-enabled'
  }).catch(() => {});

  return {
    permission: perm,
    pushActive,
    reason: pushActive ? undefined : (lastPushSyncStatus.reason || 'push-failed'),
    detail: pushActive ? undefined : (preLoginError || lastPushSyncStatus.detail)
  };
}

export async function unregisterCurrentPushEndpoint(idToken?: string | null): Promise<void> {
  if (typeof window === 'undefined' || !idToken || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const seen = new Set<string>();
    for (const reg of regs) {
      const sub = await reg?.pushManager?.getSubscription().catch(() => null);
      if (sub?.endpoint && !seen.has(sub.endpoint)) {
        seen.add(sub.endpoint);
        await fetch('/api/push/unregister', {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'X-Firebase-Token': idToken
          },
          body: JSON.stringify({ idToken, endpoint: sub.endpoint })
        }).catch(() => {});
      }
    }
  } catch {
    // ignore
  }
}

export async function disableNotificationsForUser(idToken?: string | null): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_DISABLED_KEY, '1');
  } catch {
    // ignore
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const seen = new Set<string>();
      for (const reg of regs) {
        const sub = await reg?.pushManager?.getSubscription().catch(() => null);
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe().catch(() => {});
          if (idToken && endpoint && !seen.has(endpoint)) {
            seen.add(endpoint);
            await fetch('/api/push/unregister', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Firebase-Token': idToken
              },
              body: JSON.stringify({ idToken, endpoint })
            }).catch(() => {});
          }
        }
      }
    }
  } catch {
    // ignore
  }

  emitPushSyncStatus({ checked: true, ok: false, reason: 'disabled' });
  window.dispatchEvent(
    new CustomEvent('ngdcsc-notif-permission-changed', {
      detail: getBrowserNotificationPermission()
    })
  );
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
        'X-Firebase-Token': params.idToken
      },
      body: JSON.stringify({
        idToken: params.idToken,
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
  registerFirebaseMessagingServiceWorker();

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
  if (Notification.permission !== 'granted' || isUserDisabledNotifications()) {
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
