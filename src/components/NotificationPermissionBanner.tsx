import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, ExternalLink, RefreshCw, Share, X } from 'lucide-react';
import { auth } from '../services/firebase';
import {
  BrowserNotificationPermission,
  PushSyncStatus,
  getBrowserNotificationPermission,
  getLastPushSyncStatus,
  isInEmbeddedIframe,
  isIosNonStandalone,
  registerNotificationServiceWorker,
  requestBrowserNotificationPermission,
  syncPushSubscriptionForUser
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
  const [pushStatus, setPushStatus] = useState<PushSyncStatus>(() => getLastPushSyncStatus());
  // Only hide for current page session if user taps "Not Now" so next visit asks again until active
  const [dismissedThisVisit, setDismissedThisVisit] = useState<boolean>(false);
  const [requesting, setRequesting] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  const inIframe = isInEmbeddedIframe();
  const needsIosA2hs = isIosNonStandalone();

  useEffect(() => {
    registerNotificationServiceWorker();

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<BrowserNotificationPermission>).detail;
      setPermission(detail || getBrowserNotificationPermission());
    };
    const handlePushStatus = (e: Event) => {
      const detail = (e as CustomEvent<PushSyncStatus>).detail;
      if (detail) {
        setPushStatus(detail);
      }
    };
    window.addEventListener('ngdcsc-notif-permission-changed', handleSync);
    window.addEventListener('ngdcsc-push-status-changed', handlePushStatus);
    return () => {
      window.removeEventListener('ngdcsc-notif-permission-changed', handleSync);
      window.removeEventListener('ngdcsc-push-status-changed', handlePushStatus);
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
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken().catch(() => null);
          const ok = token ? await syncPushSubscriptionForUser(token) : false;
          if (ok) {
            setJustEnabled(true);
            setTimeout(() => {
              setJustEnabled(false);
            }, 2000);
          } else {
            // Keep retry card visible if push registration failed
            setDismissedThisVisit(false);
          }
        } else {
          setJustEnabled(true);
          setTimeout(() => {
            setJustEnabled(false);
          }, 2000);
        }
      } else {
        setDismissedThisVisit(true);
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleRetryPushSync = async () => {
    setRequesting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken().catch(() => null);
        if (token) {
          const ok = await syncPushSubscriptionForUser(token);
          if (ok) {
            setJustEnabled(true);
            setTimeout(() => {
              setJustEnabled(false);
            }, 2000);
          }
        }
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

  const pushRetryNeeded =
    permission === 'granted' &&
    pushStatus.checked &&
    !pushStatus.ok &&
    pushStatus.reason === 'push-failed';

  const iframeBlocked =
    inIframe &&
    (!pushStatus.checked || !pushStatus.ok) &&
    (permission !== 'granted' || pushStatus.reason === 'iframe');

  const iosGuideNeeded =
    needsIosA2hs && (permission === 'unsupported' || (pushStatus.checked && pushStatus.reason === 'ios-a2hs'));

  const deniedGuideNeeded = permission === 'denied' && !inIframe && !iosGuideNeeded;

  const permissionNeeded = permission === 'default' && !inIframe && !iosGuideNeeded;

  if (
    suppressWhenToastVisible ||
    (!iframeBlocked && !iosGuideNeeded && !deniedGuideNeeded && !permissionNeeded && !pushRetryNeeded)
  ) {
    return null;
  }

  // If dismissed this visit, keep subtle reminder pill so user can re-open cleanly
  if (dismissedThisVisit) {
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

          {iframeBlocked ? (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  NGDC Science Club
                </p>
                <h3 className="text-lg font-black text-slate-900">
                  Open in Browser Tab
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Open this portal in a full browser tab and tap Allow so phone alerts arrive even when closed.
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
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDismissedThisVisit(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Tab</span>
                </a>
              </div>
            </>
          ) : iosGuideNeeded ? (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  NGDC Science Club
                </p>
                <h3 className="text-lg font-black text-slate-900">
                  Add to Home Screen
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  On iPhone/iPad, tap <span className="font-bold text-slate-800 inline-flex items-center gap-0.5"><Share className="w-3 h-3" /> Share</span> then <span className="font-bold text-slate-800">Add to Home Screen</span>, and open it from your Home Screen to get alerts when closed.
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setDismissedThisVisit(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </>
          ) : deniedGuideNeeded ? (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  NGDC Science Club
                </p>
                <h3 className="text-lg font-black text-slate-900">
                  Enable Browser Notifications
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Notifications are blocked in your browser. Tap the settings/lock icon in the address bar → <span className="font-bold text-slate-800">Permissions → Notifications → Allow</span>, then reload.
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
                  onClick={() => window.location.reload()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload</span>
                </button>
              </div>
            </>
          ) : pushRetryNeeded ? (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  NGDC Science Club
                </p>
                <h3 className="text-lg font-black text-slate-900">
                  Activate Background Alerts
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tap Retry to register this device for instant message alerts even when the website is closed.
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
                  onClick={handleRetryPushSync}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${requesting ? 'animate-spin' : ''}`} />
                  <span>{requesting ? 'Activating...' : 'Retry'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  NGDC Science Club
                </p>
                <h3 className="text-lg font-black text-slate-900">
                  Allow Notifications
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Get instant message alerts even when the website is closed.
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
