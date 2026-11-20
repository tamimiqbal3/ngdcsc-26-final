import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { auth } from '../services/firebase';
import {
  enableNotificationsForUser,
  getBrowserNotificationPermission,
  hasSeenNotificationPrompt,
  isInEmbeddedIframe,
  isIosNonStandalone,
  markNotificationPromptSeen,
  registerNotificationServiceWorker
} from '../utils/browserNotifications';

interface NotificationPermissionBannerProps {
  suppressWhenToastVisible?: boolean;
}

export default function NotificationPermissionBanner({
  suppressWhenToastVisible = false
}: NotificationPermissionBannerProps) {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (hasSeenNotificationPrompt()) return false;
    if (isInEmbeddedIframe() || isIosNonStandalone()) return false;
    return getBrowserNotificationPermission() === 'default';
  });
  const [toggledOn, setToggledOn] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    registerNotificationServiceWorker();

    const handleSync = () => {
      if (getBrowserNotificationPermission() !== 'default') {
        setVisible(false);
      }
    };
    window.addEventListener('ngdcsc-notif-permission-changed', handleSync);
    return () => {
      window.removeEventListener('ngdcsc-notif-permission-changed', handleSync);
    };
  }, []);

  const handleDismiss = () => {
    markNotificationPromptSeen();
    setVisible(false);
  };

  const handleToggleEnable = async () => {
    if (requesting) return;
    setRequesting(true);
    setToggledOn(true);
    try {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await enableNotificationsForUser(token);
      setVisible(false);
      if (res.permission === 'granted') {
        setJustEnabled(true);
        window.setTimeout(() => {
          setJustEnabled(false);
        }, 2000);
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

  if (suppressWhenToastVisible || !visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enable Message Notifications"
      className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-slate-900" />

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shadow-xs">
            <img
              src="/assets/club-logo.png"
              alt="NGDC Science Club"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              NGDC Science Club
            </p>
            <h3 className="text-lg font-black text-slate-900">
              Message Notifications
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Turn on notifications to receive instant alerts even when the website is closed.
            </p>
          </div>

          {/* Clean Interactive Toggle Card */}
          <button
            type="button"
            role="switch"
            aria-checked={toggledOn}
            disabled={requesting}
            onClick={handleToggleEnable}
            className="w-full p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 flex items-center justify-between gap-3 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900">Instant Device Alerts</p>
                <p className="text-[11px] text-slate-500">Tap to allow on this device</p>
              </div>
            </div>

            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                toggledOn ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform ${
                  toggledOn ? 'translate-x-5.5' : 'translate-x-1'
                }`}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
