import React from 'react';
import { ShieldAlert, Home, ArrowLeft, Lock, FileText, Users, Bell, AlertTriangle } from 'lucide-react';
import ScienceBackground from './ScienceBackground';

interface NotFoundPageProps {
  onGoHome: () => void;
  onGoAdmin: () => void;
  onGoNotices: () => void;
  onGoCommittee: () => void;
}

export default function NotFoundPage({
  onGoHome,
  onGoAdmin,
  onGoNotices,
  onGoCommittee,
}: NotFoundPageProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className="relative min-h-screen text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Light Animated Science Grid Background */}
      <ScienceBackground />

      <div className="relative z-10 max-w-lg w-full bg-white/85 backdrop-blur-2xl border border-rose-200/90 rounded-3xl p-6 sm:p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] formal-page-enter">
        {/* Official Club Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png"
            alt="NGDC Science Club Logo"
            className="h-20 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* 404 / Forbidden Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black uppercase tracking-wider mb-4 shadow-xs">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>404 • Forbidden / Page Not Found</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
          Access Restricted
        </h1>
        <p className="text-sm font-bold text-rose-600 font-mono mb-4">
          Route: <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-rose-800">{currentPath || 'Unknown Path'}</span>
        </p>

        <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 text-left space-y-2 mb-6">
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            ⚠️ <strong className="text-slate-900">The requested page was not found or is a protected route.</strong> Please use the buttons below to return to the official club website, registration form, or notices.
          </p>
          <p className="text-[11px] text-slate-500 leading-normal">
            The URL you requested does not exist or you do not have permission to view it.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home / Registration</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onGoNotices}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-xs text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-600" />
              <span>Notice Board</span>
            </button>

            <button
              type="button"
              onClick={onGoCommittee}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-xs text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Committee</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onGoAdmin}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 text-[11px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Official Admin Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
