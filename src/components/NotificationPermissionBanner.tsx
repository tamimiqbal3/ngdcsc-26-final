import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import {
  attemptFirstEntryPermissionRequest,
  BrowserNotificationPermission,
  getBrowserNotificationPermission,
  isEmbeddedIframe,
  markPermissionBannerDismissed,
  registerNotificationServiceWorker,
  requestBrowserNotificationPermission,
  wasPermissionBannerRecentlyDismissed
} from '../utils/browserNotifications';

interface NotificationPermissionBannerProps {
  suppressWhenToastVisible?: boolean;
}

export default function NotificationPermissionBanner({
  suppressWhenToastVisible = false
}: NotificationPermissionBannerProps) {
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission()
  );
  const [dismissed, setDismissed] = useState<boolean>(() =>
    wasPermissionBannerRecentlyDismissed()
  );
  const [requesting, setRequesting] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    registerNotificationServiceWorker();

    if (getBrowserNotificationPermission() === 'default') {
      attemptFirstEntryPermissionRequest().then((nextPerm) => {
        setPermission(nextPerm);
        window.dispatchEvent(
          new CustomEvent('ngdcsc-notif-permission-changed', { detail: nextPerm })
        );
      });
    }

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<BrowserNotificationPermission>).detail;
      setPermission(detail || getBrowserNotificationPermission());
    };
    window.addEventListener('ngdcsc-notif-permission-changed', handleSync);
    return () => {
      window.removeEventListener('ngdcsc-notif-permission-changed', handleSync);
    };
  }, []);

  const handleAllow = async () => {
    setRequesting(true);
    try {
      const nextPerm = await requestBrowserNotificationPermission();
      setPermission(nextPerm);
      window.dispatchEvent(
        new CustomEvent('ngdcsc-notif-permission-changed', { detail: nextPerm })
      );
      if (nextPerm === 'granted') {
        setJustEnabled(true);
        setTimeout(() => {
          setJustEnabled(false);
        }, 2500);
      } else if (nextPerm === 'denied') {
        markPermissionBannerDismissed();
        setDismissed(true);
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    markPermissionBannerDismissed();
    setDismissed(true);
  };

  if (justEnabled) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 w-[calc(100vw-2rem)] max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans"
      >
        <div className="bg-emerald-950 text-white rounded-2xl border border-emerald-700/60 shadow-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-bold leading-snug">
            Real-time Inbox notifications enabled.
          </div>
        </div>
      </div>
    );
  }

  if (
    suppressWhenToastVisible ||
    dismissed ||
    permission !== 'default' ||
    isEmbeddedIframe()
  ) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Enable Browser Notifications"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 w-[calc(100vw-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.16)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-slate-800" />
        <div className="p-4 flex items-start gap-3.5 relative">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification permission prompt"
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
            <img
              src="/assets/club-logo.png"
              alt="NGDC Science Club"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0 pr-5 space-y-1">
            <div className="flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                NGDC Science Club
              </span>
            </div>

            <h4 className="text-sm font-black text-slate-900 leading-snug">
              Allow Inbox Notifications
            </h4>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enable browser alerts to receive real-time notifications whenever a new message arrives in your Inbox.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={requesting}
                onClick={handleAllow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{requesting ? 'Requesting...' : 'Allow Notifications'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
