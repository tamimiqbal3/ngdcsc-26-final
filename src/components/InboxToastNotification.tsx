import React, { useEffect, useRef, useState } from 'react';
import { BellRing, ChevronRight, X } from 'lucide-react';
import { auth } from '../services/firebase';
import {
  BrowserNotificationPermission,
  dispatchBrowserNotification,
  enableNotificationsForUser,
  getBrowserNotificationPermission,
  registerFirebaseMessagingServiceWorker,
  registerNotificationServiceWorker
} from '../utils/browserNotifications';

interface InboxToastNotificationProps {
  unreadCount: number;
  latestEventKey: string;
  notifTag?: string;
  isCurrentlyViewingInbox?: boolean;
  onOpenInbox: () => void;
  buttonLabel?: string;
  senderHint?: string;
}

function playInboxNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 320);
  } catch {
    // ignore browser autoplay restriction
  }
}

export default function InboxToastNotification({
  unreadCount,
  latestEventKey,
  notifTag,
  isCurrentlyViewingInbox = false,
  onOpenInbox,
  buttonLabel = 'Check Dashboard'
}: InboxToastNotificationProps) {
  const [dismissedKey, setDismissedKey] = useState<string>('');
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission()
  );

  const lastAlertedKeyRef = useRef<string>('');
  const onOpenInboxRef = useRef(onOpenInbox);
  onOpenInboxRef.current = onOpenInbox;
  const baseTitleRef = useRef<string>(
    typeof document !== 'undefined' ? document.title.replace(/^\(\d+\)\s*/, '') : 'NGDC SCIENCE CLUB'
  );

  useEffect(() => {
    registerNotificationServiceWorker();
    registerFirebaseMessagingServiceWorker();

    const handlePermissionSync = (e: Event) => {
      const detail = (e as CustomEvent<BrowserNotificationPermission>).detail;
      setNotifPermission(detail || getBrowserNotificationPermission());
    };
    window.addEventListener('ngdcsc-notif-permission-changed', handlePermissionSync);

    const handleSwMessage = (event: MessageEvent) => {
      if (
        event.data &&
        (event.data.type === 'OPEN_INBOX' ||
          (event.data.isFirebaseMessaging && event.data.messageType === 'notification-clicked'))
      ) {
        onOpenInboxRef.current();
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('ngdcsc-notif-permission-changed', handlePermissionSync);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  // Sync browser tab title with live unread count
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle = baseTitleRef.current || 'NGDC Science Club';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);

  // Trigger sound + native browser notification for new unread inbox messages
  useEffect(() => {
    if (unreadCount <= 0 || !latestEventKey) {
      lastAlertedKeyRef.current = '';
      setDismissedKey('');
      return;
    }

    const alertToken = `${latestEventKey}|perm:${notifPermission}`;
    if (lastAlertedKeyRef.current === alertToken) return;
    lastAlertedKeyRef.current = alertToken;

    if (!isCurrentlyViewingInbox) {
      playInboxNotificationSound();
    }

    if (
      notifPermission === 'granted' &&
      (!isCurrentlyViewingInbox || (typeof document !== 'undefined' && document.hidden))
    ) {
      const countTitle =
        unreadCount === 1 ? '1 New Message' : `${unreadCount} New Messages`;

      dispatchBrowserNotification({
        title: `NGDC Science Club • ${countTitle}`,
        body: 'Check your dashboard.',
        tag: notifTag || latestEventKey,
        onClick: () => onOpenInboxRef.current()
      });
    }
  }, [unreadCount, latestEventKey, notifTag, isCurrentlyViewingInbox, notifPermission]);

  const handleEnableBrowserAlerts = async () => {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    const res = await enableNotificationsForUser(token);
    setNotifPermission(res.permission);
  };

  if (unreadCount <= 0 || isCurrentlyViewingInbox || (latestEventKey && dismissedKey === latestEventKey)) {
    return null;
  }

  const countLabel =
    unreadCount === 1 ? '1 New Message' : `${unreadCount} New Messages`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.18)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-rose-500" />

        <div className="p-4 flex items-center gap-3.5 relative">
          <button
            type="button"
            onClick={() => setDismissedKey(latestEventKey)}
            aria-label="Close notification"
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Website Logo + Unread Count Badge */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center">
              <img
                src="/assets/club-logo.png"
                alt="NGDC Science Club"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
              {unreadCount}
            </span>
          </div>

          {/* Simple Formal Notification Text */}
          <div className="flex-1 min-w-0 pr-4 space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              NGDC Science Club
            </p>
            <h4 className="text-sm font-black text-slate-900 leading-tight">
              {countLabel}
            </h4>
            <p className="text-xs text-slate-600">
              Check your dashboard.
            </p>

            <div className="pt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenInbox}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>{buttonLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {notifPermission === 'default' && (
                <button
                  type="button"
                  onClick={handleEnableBrowserAlerts}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <BellRing className="w-3 h-3" />
                  <span>Allow</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
