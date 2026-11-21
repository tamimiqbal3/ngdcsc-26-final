import React, { useEffect, useState } from 'react';
import { Bell, BellOff, ExternalLink, Share, X } from 'lucide-react';
import { auth } from '../services/firebase';
import {
  PushSyncFailureReason,
  disableNotificationsForUser,
  enableNotificationsForUser,
  getLastPushSyncStatus,
  isDeviceNotificationsEnabled,
  isInEmbeddedIframe
} from '../utils/browserNotifications';

interface NotificationToggleControlProps {
  compact?: boolean;
}

function computeEffectiveToggleOn(): boolean {
  if (!isDeviceNotificationsEnabled() || isInEmbeddedIframe()) return false;
  const status = getLastPushSyncStatus();
  if (status.checked && !status.ok) return false;
  return true;
}

export default function NotificationToggleControl({
  compact = false
}: NotificationToggleControlProps) {
  const [enabled, setEnabled] = useState<boolean>(() => computeEffectiveToggleOn());
  const [busy, setBusy] = useState(false);
  const [tipReason, setTipReason] = useState<PushSyncFailureReason | null>(null);

  useEffect(() => {
    const syncState = () => {
      setEnabled(computeEffectiveToggleOn());
    };
    window.addEventListener('ngdcsc-notif-permission-changed', syncState);
    window.addEventListener('ngdcsc-push-status-changed', syncState);
    return () => {
      window.removeEventListener('ngdcsc-notif-permission-changed', syncState);
      window.removeEventListener('ngdcsc-push-status-changed', syncState);
    };
  }, []);

  const handleToggle = async () => {
    if (busy) return;
    if (isInEmbeddedIframe()) {
      setTipReason('iframe');
      return;
    }
    setBusy(true);
    setTipReason(null);
    try {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (enabled) {
        await disableNotificationsForUser(token);
        setEnabled(false);
      } else {
        const res = await enableNotificationsForUser(token);
        setEnabled(computeEffectiveToggleOn());
        if (!res.pushActive && res.reason) {
          setTipReason(res.reason);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle message notifications"
        disabled={busy}
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-full border transition-all cursor-pointer disabled:opacity-60 ${
          compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
        } ${
          enabled
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        {enabled ? (
          <Bell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        ) : (
          <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <span className="text-[11px] font-bold hidden sm:inline">
          Alerts
        </span>
        <span
          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-emerald-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform ${
              enabled ? 'translate-x-3.5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>

      {tipReason && (
        <div
          role="dialog"
          aria-label="Browser notification setup"
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setTipReason(null)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 text-center space-y-3 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setTipReason(null)}
              aria-label="Close"
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center">
              <img
                src="/assets/club-logo.png"
                alt="NGDC Science Club"
                className="w-full h-full object-contain"
              />
            </div>

            {tipReason === 'iframe' ? (
              <>
                <h4 className="text-sm font-black text-slate-900">Open in Browser Tab</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open this portal in a regular browser tab and switch Alerts ON to receive notifications when the website is closed.
                </p>
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setTipReason(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Tab</span>
                </a>
              </>
            ) : tipReason === 'ios-a2hs' ? (
              <>
                <h4 className="text-sm font-black text-slate-900">Add to Home Screen</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  On iPhone/iPad, tap <span className="font-bold text-slate-800 inline-flex items-center gap-0.5"><Share className="w-3 h-3" /> Share</span> → <span className="font-bold text-slate-800">Add to Home Screen</span>, then open the Home Screen app and turn Alerts ON.
                </p>
                <button
                  type="button"
                  onClick={() => setTipReason(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Got It
                </button>
              </>
            ) : tipReason === 'push-failed' ? (
              <>
                <h4 className="text-sm font-black text-slate-900">Background Push Blocked</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your browser allowed site alerts but blocked background push registration. Use a normal (non-Incognito) Chrome/Edge/Safari window and enable Google push messaging if using Brave.
                </p>
                <button
                  type="button"
                  onClick={() => setTipReason(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Got It
                </button>
              </>
            ) : (
              <>
                <h4 className="text-sm font-black text-slate-900">Allow in Browser Settings</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Notifications are blocked by your browser. Tap the lock icon next to the address bar → Permissions → Notifications → Allow.
                </p>
                <button
                  type="button"
                  onClick={() => setTipReason(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Got It
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
