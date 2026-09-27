import React, { useState, useEffect } from 'react';
import { X, Users, Award, Shield, UserCheck, Sparkles } from 'lucide-react';
import { subscribeToCommittee } from './services/firebase';
import { INITIAL_COMMITTEE } from './ExecutiveCommitteePage';
import { ExecutiveMember } from './types';

interface ExecutiveCommitteeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutiveCommittee({ isOpen, onClose }: ExecutiveCommitteeProps) {
  const [members, setMembers] = useState<ExecutiveMember[]>(() => {
    try {
      const cached = localStorage.getItem('ngdcsc_firebase_committee_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return INITIAL_COMMITTEE;
  });

  // Real-time listener: Any change in Admin reflects immediately in this drawer on all devices
  useEffect(() => {
    const unsubscribe = subscribeToCommittee((liveList) => {
      if (liveList && liveList.length > 0) {
        setMembers(liveList);
      }
    }, INITIAL_COMMITTEE);

    return () => unsubscribe();
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer from the right */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md bg-white/95 backdrop-blur-2xl border-l border-white/80 shadow-[0_0_50px_rgba(0,0,0,0.2)] flex flex-col h-full animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-white/80 sticky top-0 z-10">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Executive Committee
                  </h2>
                  <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300">
                    Session 2026–2027
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content / Member List (Connected to Live Database) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-slate-100">
            {members.map((member, idx) => {
              const roleLower = (member.role || '').toLowerCase();
              const isConvener = roleLower.includes('convener');
              const isPresident = roleLower.includes('president') && !roleLower.includes('vice');
              const isLeadership = roleLower.includes('vice president') || roleLower.includes('secretary') || roleLower.includes('treasurer');

              return (
                <div 
                  key={member.id || idx}
                  className={`pt-3 first:pt-0 rounded-2xl transition-all ${
                    isConvener 
                      ? 'p-3 bg-linear-to-r from-emerald-50 to-teal-50/70 border border-emerald-200/80 shadow-xs' 
                      : isPresident
                        ? 'p-3 bg-linear-to-r from-white to-emerald-50/60 border border-emerald-200/60 shadow-xs'
                        : 'p-2 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Executive Member Photo */}
                    <div className="relative shrink-0">
                      {member.image ? (
                        <img 
                          src={member.image} 
                          alt={member.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                          {member.name ? member.name.charAt(0) : '?'}
                        </div>
                      )}
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white ${
                        isConvener ? 'bg-emerald-600' : isPresident ? 'bg-slate-900' : isLeadership ? 'bg-teal-600' : 'bg-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`block text-[11px] font-bold uppercase tracking-wider ${
                        isConvener 
                          ? 'text-emerald-800' 
                          : isPresident 
                            ? 'text-emerald-700 font-extrabold' 
                            : isLeadership
                              ? 'text-teal-700'
                              : 'text-slate-500'
                      }`}>
                        {member.role}
                      </span>
                      <h3 className={`font-extrabold text-slate-900 leading-snug truncate ${
                        isConvener ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                      }`}>
                        {member.name}
                      </h3>
                      {member.batch && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Batch: {member.batch}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-white/90 text-center sticky bottom-0">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              NGDC Science Club &bull; 2026–2027
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              New Government Degree College, Rajshahi
            </p>
          </div>

        </aside>
      </div>
    </div>
  );
}
