import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { fetchCommitteeFromFirebase, subscribeToCommittee } from './services/firebase';
import { ExecutiveMember } from './types';

export type CommitteeMember = ExecutiveMember;

// Curated list of Executive Committee members (2026-2027) - Porosh removed as requested
export const INITIAL_COMMITTEE: CommitteeMember[] = [
  {
    id: 'convener',
    role: 'Convener',
    name: 'Prof. Dr. Md. Sayedur Rahman Farid',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'president',
    role: 'President',
    name: 'Tamim Iqbal',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'vp',
    role: 'Vice President',
    name: 'Md. Aynul Islam Sabbir',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'treasurer',
    role: 'Treasurer',
    name: 'Fabiha Lamisa Khushboo',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'hr-sec',
    role: 'HR Secretary',
    name: 'Amir Hamza Kabbo',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'gs',
    role: 'General Secretary',
    name: 'Ahmed Al Alahi Shoccho',
    image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'academic-coord',
    role: 'Academic Co-ordinator',
    name: 'Ayesha Siddika Moutushi',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'media-mgr',
    role: 'Media & Publication Manager',
    name: 'Tahmid Ahmmed',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'logistics-sec',
    role: 'Logistics Secretary',
    name: 'Abu Akhter Rahi',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'exec-1',
    role: 'Executive Member',
    name: 'Md. Asif Khan',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'exec-2',
    role: 'Executive Member',
    name: 'Nahim Rahman',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'exec-3',
    role: 'Executive Member',
    name: 'Rifa Tamanna',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'exec-4',
    role: 'Executive Member',
    name: 'Md. Ishtiak Ahmed',
    image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'exec-5',
    role: 'Executive Member',
    name: 'Samiul Islam Bashir',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
  }
];

interface ExecutiveCommitteePageProps {
  onBackToRegistration: () => void;
}

export default function ExecutiveCommitteePage({ onBackToRegistration }: ExecutiveCommitteePageProps) {
  const [members, setMembers] = useState<CommitteeMember[]>(() => {
    try {
      const saved = localStorage.getItem('ngdcsc_firebase_committee_cache');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_COMMITTEE;
  });

  // Real-time listener for live updates from Admin Panel
  useEffect(() => {
    const unsubscribe = subscribeToCommittee((liveList) => {
      if (liveList && liveList.length > 0) {
        setMembers(liveList);
      }
    }, INITIAL_COMMITTEE);

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full max-w-6xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-12 formal-page-enter">

      {/* Top Bar with Clean Back Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBackToRegistration}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/90 text-slate-700 hover:text-slate-900 text-xs font-medium shadow-xs transition-all cursor-pointer group backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
          Session 2026–2027
        </span>
      </div>

      {/* Header Section */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <img 
            src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png" 
            alt="NGDC Science Club Logo" 
            className="h-20 sm:h-24 w-auto object-contain hover:scale-105 transition-transform drop-shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Executive Committee
        </h1>
        <p className="text-sm sm:text-base font-bold text-emerald-700 tracking-wide uppercase mt-1">
          NGDC Science Club (2026–2027)
        </p>
      </div>

      {/* COMMITTEE MEMBERS GRID - APPLE LIGHT TRANSLUCENT FROSTED CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {members.map((member) => {
          const isExecMember = member.role.toLowerCase().includes('executive member');
          return (
            <div
              key={member.id}
              className="group relative rounded-3xl p-4 sm:p-5 bg-white/85 hover:bg-white backdrop-blur-xl border border-slate-200/90 hover:border-emerald-500/40 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] transition-all duration-300 flex flex-col items-center text-center"
            >
              {/* LARGE PHOTO */}
              <div className="relative w-full aspect-4/5 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group-hover:border-emerald-400/50 transition-colors shadow-xs mb-4">
                <img 
                  src={member.image} 
                  alt={member.name} 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=00E599,10b981,0f172a`;
                  }}
                />
              </div>

              {/* TITLE / ROLE */}
              <p className={`text-xs sm:text-sm font-black uppercase tracking-wider mb-1 ${
                isExecMember ? 'text-slate-500' : 'text-emerald-700'
              }`}>
                {member.role}
              </p>

              {/* MEMBER NAME */}
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {member.name}
              </h3>

            </div>
          );
        })}
      </div>

    </div>
  );
}
