export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

const CLUB_LOGO_ICON = '/assets/club-logo.png';
const PROMPT_DISMISS_LS_KEY = 'ngdcsc_notif_popup_dismissed_at';

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

export function wasPermissionBannerRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(PROMPT_DISMISS_LS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < 24 * 60 * 60 * 1000;
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

  // 1. Try standard Notification constructor first (instant on Chrome/Edge/Firefox/Safari desktop)
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
    // Expected on Android Chrome & mobile PWAs: requires ServiceWorkerRegistration.showNotification
  }

  // 2. Fallback to Service Worker showNotification (works on Android Chrome & mobile browsers)
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
          data: { url: '/dashboard' }
        } as NotificationOptions);
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
