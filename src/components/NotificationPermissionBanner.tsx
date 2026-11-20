import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import {
  BrowserNotificationPermission,
  getBrowserNotificationPermission,
  registerNotificationServiceWorker,
  requestBrowserNotificationPermission
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
  // Only hide for current page session if user taps "Not Now" so next visit asks again until permission is granted
  const [dismissedThisVisit, setDismissedThisVisit] = useState<boolean>(false);
  const [requesting, setRequesting] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    registerNotificationServiceWorker();

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
        }, 2000);
      } else {
        setDismissedThisVisit(true);
      }
    } finally {
      setRequesting(false);
    }
  };

  if (justEnabled) {
    return (
      <div
        role="status"
        className="fixed bottom-5 right-5 z-[100] animate-in fade-in slide-in-from-bottom-3 duration-200 font-sans"
      >
        <div className="bg-emerald-950 text-white rounded-2xl border border-emerald-700/60 shadow-xl px-4 py-3 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">Notifications enabled.</span>
        </div>
      </div>
    );
  }

  if (suppressWhenToastVisible || permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  // If permission was not granted yet and user minimized modal this visit, show a subtle reminder pill to re-open/allow
  if (dismissedThisVisit || permission === 'denied') {
    if (permission === 'denied') {
      return null;
    }
    return (
      <button
        type="button"
        onClick={() => setDismissedThisVisit(false)}
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md border border-emerald-300 shadow-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-all cursor-pointer font-sans"
      >
        <BellRing className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
        <span>Enable Notifications</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Allow Notifications"
      className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-slate-900" />

        <button
          type="button"
          onClick={() => setDismissedThisVisit(true)}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shadow-xs">
            <img
              src="/assets/club-logo.png"
              alt="NGDC Science Club"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              NGDC Science Club
            </p>
            <h3 className="text-lg font-black text-slate-900">
              Allow Notifications
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Get instant message alerts even when you are not on the site.
            </p>
          </div>

          <div className="pt-1 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDismissedThisVisit(true)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Not Now
            </button>
            <button
              type="button"
              disabled={requesting}
              onClick={handleAllow}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{requesting ? 'Allowing...' : 'Allow'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
