export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

const CLUB_LOGO_ICON = '/assets/club-logo.png';
const AUTO_PERM_SESSION_KEY = 'ngdcsc_notif_auto_prompt_v1';
const PROMPT_DISMISS_LS_KEY = 'ngdcsc_notif_banner_dismissed_at';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function isEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
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
      .register('/sw-notify.js', { scope: '/' })
      .then((reg) => reg)
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  await registerNotificationServiceWorker();

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

/**
 * Attempts to request native permission once right on first page entry
 * for browsers that allow immediate prompts on load.
 */
export async function attemptFirstEntryPermissionRequest(): Promise<BrowserNotificationPermission> {
  const current = getBrowserNotificationPermission();
  if (current !== 'default') return current;
  if (isEmbeddedIframe()) return current;

  try {
    if (sessionStorage.getItem(AUTO_PERM_SESSION_KEY) === '1') {
      return current;
    }
    sessionStorage.setItem(AUTO_PERM_SESSION_KEY, '1');
  } catch {
    // ignore storage errors
  }

  return requestBrowserNotificationPermission();
}

export function wasPermissionBannerRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(PROMPT_DISMISS_LS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    // Allow re-asking after 12 hours if permission is still default
    return Date.now() - ts < 12 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function markPermissionBannerDismissed(): void {
  try {
    localStorage.setItem(PROMPT_DISMISS_LS_KEY, String(Date.now()));
  } catch {
    // ignore
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

  // Prefer ServiceWorkerRegistration.showNotification so Android Chrome & desktop both work cleanly
  if ('serviceWorker' in navigator) {
    try {
      const reg =
        (await registerNotificationServiceWorker()) ||
        (await navigator.serviceWorker.getRegistration());
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(params.title, {
          body: params.body,
          icon: CLUB_LOGO_ICON,
          badge: CLUB_LOGO_ICON,
          tag: params.tag,
          renotify: true,
          data: { url: '/dashboard' }
        } as NotificationOptions);
        return true;
      }
    } catch {
      // fall through to window.Notification
    }
  }

  try {
    const notif = new Notification(params.title, {
      body: params.body,
      icon: CLUB_LOGO_ICON,
      badge: CLUB_LOGO_ICON,
      tag: params.tag
    });
    notif.onclick = () => {
      window.focus();
      params.onClick?.();
      notif.close();
    };
    return true;
  } catch {
    return false;
  }
}
