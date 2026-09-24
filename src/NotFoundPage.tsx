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
    <div className="relative min-h-screen text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Dark Animated Science Grid Background */}
      <ScienceBackground />

      <div className="relative z-10 max-w-lg w-full bg-slate-950/80 backdrop-blur-2xl border border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(244,63,94,0.15)] formal-page-enter">
        {/* Official Club Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png"
            alt="NGDC Science Club Logo"
            className="h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,229,153,0.3)] hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* 404 / Forbidden Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider mb-4 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>404 • Forbidden / Page Not Found</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
          Access Restricted
        </h1>
        <p className="text-sm font-bold text-rose-400 font-mono mb-4">
          Route: <span className="bg-slate-900 px-2 py-0.5 rounded border border-rose-500/30">{currentPath || 'Unknown Path'}</span>
        </p>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-left space-y-2 mb-6">
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            ⚠️ <strong className="text-white">অনুরোধকৃত পেইজটি পাওয়া যায়নি অথবা এটি একটি সংরক্ষিত রুট।</strong> ক্লাবের অফিসিয়াল ওয়েবসাইট, মেম্বারশিপ ফর্ম অথবা নোটিশ দেখতে নিচের বাটনগুলো ব্যবহার করুন।
          </p>
          <p className="text-[11px] text-slate-400 leading-normal">
            The URL you requested does not exist or you do not have permission to view it.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,153,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home / Registration</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onGoNotices}
              className="py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Notice Board</span>
            </button>

            <button
              type="button"
              onClick={onGoCommittee}
              className="py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Committee</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onGoAdmin}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 text-slate-400 hover:text-slate-200 border border-white/5 text-[11px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Official Admin Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
