import React, { useEffect } from 'react';
import { X, Users, Award, Shield, UserCheck, Sparkles } from 'lucide-react';

interface ExecutiveCommitteeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommitteeMember {
  role: string;
  name: string;
  isSpecial?: 'convener' | 'president' | 'leadership' | 'executive';
}

const COMMITTEE_MEMBERS: CommitteeMember[] = [
  { role: 'Convener', name: 'Prof. Dr. Md. Sayedur Rahman Farid', isSpecial: 'convener' },
  { role: 'President', name: 'Tamim Iqbal', isSpecial: 'president' },
  { role: 'Vice President', name: 'Md. Aynul Islam Sabbir', isSpecial: 'leadership' },
  { role: 'Treasurer', name: 'Fabiha Lamisa Khushboo', isSpecial: 'leadership' },
  { role: 'HR Secretary', name: 'Amir Hamza Kabbo', isSpecial: 'leadership' },
  { role: 'General Secretary', name: 'Ahmed Al Alahi Shoccho', isSpecial: 'leadership' },
  { role: 'Academic Co-ordinator', name: 'Ayesha Siddika Moutushi', isSpecial: 'leadership' },
  { role: 'Media & Publication Manager', name: 'Tahmid Ahmmed', isSpecial: 'leadership' },
  { role: 'Logistics Secretary', name: 'Abu Akhter Rahi', isSpecial: 'leadership' },
  { role: 'Executive Member', name: 'Md. Asif Khan', isSpecial: 'executive' },
  { role: 'Executive Member', name: 'Nahim Rahman', isSpecial: 'executive' },
  { role: 'Executive Member', name: 'Rifa Tamanna', isSpecial: 'executive' },
  { role: 'Executive Member', name: 'Md. Ishtiak Ahmed', isSpecial: 'executive' },
  { role: 'Executive Member', name: 'Samiul Islam Bashir', isSpecial: 'executive' },
];

export default function ExecutiveCommittee({ isOpen, onClose }: ExecutiveCommitteeProps) {
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer from the right ("navbar dane open hbe") */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md bg-white/90 backdrop-blur-2xl border-l border-white/80 shadow-[0_0_50px_rgba(0,0,0,0.15)] flex flex-col h-full animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 border-b border-[#EAE4D8] flex items-center justify-between bg-white/70">
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

          {/* Drawer Content / Member List */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 divide-y divide-slate-100">
            {COMMITTEE_MEMBERS.map((member, idx) => {
              const isConvener = member.isSpecial === 'convener';
              const isPresident = member.isSpecial === 'president';
              const isExec = member.isSpecial === 'executive';

              return (
                <div 
                  key={idx}
                  className={`pt-3.5 first:pt-0 rounded-2xl transition-all ${
                    isConvener 
                      ? 'p-3.5 bg-linear-to-r from-emerald-50/90 to-blue-50/70 border border-emerald-200/80 shadow-xs' 
                      : isPresident
                        ? 'p-3.5 bg-linear-to-r from-white to-emerald-50/50 border border-emerald-200/60 shadow-xs'
                        : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isConvener
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isPresident
                          ? 'bg-slate-900 text-[#00E599] shadow-xs'
                          : isExec
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isConvener ? (
                        <Award className="w-4 h-4" />
                      ) : isPresident ? (
                        <Shield className="w-4 h-4" />
                      ) : isExec ? (
                        <UserCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`block text-[11px] font-bold uppercase tracking-wider ${
                        isConvener 
                          ? 'text-emerald-800' 
                          : isPresident 
                            ? 'text-emerald-600' 
                            : 'text-slate-400'
                      }`}>
                        {member.role}
                      </span>
                      <h3 className={`font-extrabold text-slate-900 leading-snug truncate ${
                        isConvener ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                      }`}>
                        {member.name}
                      </h3>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 sm:p-5 border-t border-[#EAE4D8] bg-white/80 text-center">
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
