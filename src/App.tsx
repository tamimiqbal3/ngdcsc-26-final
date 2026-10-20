import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  User, 
  Phone, 
  MessageSquare, 
  Mail, 
  Hash, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X, 
  RotateCcw, 
  Instagram, 
  Facebook, 
  Check, 
  Users, 
  MoreVertical, 
  FileText,
  Menu,
  ShieldCheck,
  Bell,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Download,
  Home,
  ArrowLeft,
  Trophy,
  Atom,
  Rocket,
  Cpu,
  Award,
  Search,
  Copy,
  CreditCard,
  Clock,
  Scissors,
  Lock
} from 'lucide-react';
import { 
  MembershipFormData, 
  SubmissionRecord, 
  SectionType, 
  BatchType, 
  ClubNotice, 
  MembershipRegistrationSetting, 
  RegistrationStatusMode,
  DEFAULT_SKILL_OPTIONS
} from './types';
import ScienceBackground from './ScienceBackground';
import ExecutiveCommitteePage from './ExecutiveCommitteePage';
import NoticesPage from './NoticesPage';
import MemberStatusSearch from './MemberStatusSearch';
import AdminPanel from './AdminPanel';
import NotFoundPage from './NotFoundPage';
import ImageAdjustModal from './components/ImageAdjustModal';
import { 
  saveMemberToFirebase, 
  fetchNoticesFromFirebase, 
  subscribeToNotices, 
  getNextMembershipId, 
  generateNextMembershipId,
  subscribeRegistrationSetting,
  DEFAULT_REGISTRATION_SETTING
} from './services/firebase';

const CLUB_SEGMENTS = [
  'Science Olympiad (Math, Physics, Bio, Chem)',
  'Science Project & Innovation',
  'Science Quizzing',
  'Robotics & Programming',
  'Astronomy & Space Science',
  'Scientific Wall Magazine & Publication'
];

const INITIAL_FORM: MembershipFormData = {
  photo: null,
  name: '',
  phone: '',
  whatsapp: '',
  sameAsPhone: true,
  email: '',
  studentId: '',
  section: 'A',
  dob: '',
  batch: 'HSC 27',
  interestedSegments: [],
  skills: [],
  experienceAchievements: '',
  agreedToRules: false
};

type ViewType = 'home' | 'form' | 'committee' | 'notices' | 'status' | 'admin' | '404';

// Helper to determine view from current URL path & hash
const resolveCurrentView = (): ViewType => {
  if (typeof window === 'undefined') return 'home';
  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');

  if (hash === 'admin' || rawPath === '/admin' || rawPath.endsWith('/admin')) return 'admin';
  if (hash === 'notices' || rawPath === '/notices' || rawPath.endsWith('/notices')) return 'notices';
  if (hash === 'committee' || rawPath === '/committee' || rawPath.endsWith('/committee')) return 'committee';
  if (hash === 'status' || hash === 'check-status' || rawPath === '/status' || rawPath.endsWith('/status')) return 'status';
  if (hash === 'form' || hash === 'register' || rawPath === '/form' || rawPath === '/register' || rawPath.endsWith('/form') || rawPath.endsWith('/register')) return 'form';
  if (rawPath === '' || rawPath === '/' || rawPath === '/index.html' || hash === '' || hash === 'home') return 'home';

  // Any other URL shows our themed 404 forbidden page
  return '404';
};

function ClubFooter({ onGoToAdmin }: { onGoToAdmin?: () => void }) {
  return (
    <footer className="mt-auto pt-12 pb-6 text-center w-full flex flex-col items-center gap-3 relative z-10 px-4">
      {/* Sleek Apple Frosted Social Pills */}
      <div className="flex items-center justify-center gap-2">
        <a 
          href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-8 h-8 rounded-full bg-white/75 hover:bg-[#25D366]/15 border border-slate-200/80 hover:border-[#25D366]/40 text-slate-600 hover:text-[#25D366] flex items-center justify-center transition-all shadow-xs backdrop-blur-md"
          title="Official WhatsApp Community"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
          </svg>
        </a>

        <a 
          href="https://facebook.com/ngdcsc" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-8 h-8 rounded-full bg-white/75 hover:bg-blue-500/15 border border-slate-200/80 hover:border-blue-400/40 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-all shadow-xs backdrop-blur-md"
          title="Official Facebook Page"
        >
          <Facebook className="w-3.5 h-3.5" />
        </a>

        <a 
          href="https://instagram.com/ngdcsc_" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-8 h-8 rounded-full bg-white/75 hover:bg-pink-500/15 border border-slate-200/80 hover:border-pink-400/40 text-slate-600 hover:text-pink-600 flex items-center justify-center transition-all shadow-xs backdrop-blur-md"
          title="Official Instagram"
        >
          <Instagram className="w-3.5 h-3.5" />
        </a>

        <a 
          href="mailto:ngdcsc.org@gmail.com" 
          className="w-8 h-8 rounded-full bg-white/75 hover:bg-emerald-500/15 border border-slate-200/80 hover:border-emerald-400/40 text-slate-600 hover:text-emerald-700 flex items-center justify-center transition-all shadow-xs backdrop-blur-md"
          title="Official Email"
        >
          <Mail className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap text-[11px] text-slate-500 font-medium">
        <span>© 2026 NGDC Science Club • New Government Degree College, Rajshahi.</span>
        {onGoToAdmin && (
          <>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={onGoToAdmin}
              className="text-[10px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Official Admin Portal Access"
            >
              Admin Portal
            </button>
          </>
        )}
      </div>

      {/* Developer Credit Pill */}
      <div className="flex items-center justify-center">
        <a
          href="https://portfolio.tamimiq.shop"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/75 hover:bg-white border border-slate-200/80 hover:border-slate-300 shadow-[0_1px_8px_rgba(0,0,0,0.03)] backdrop-blur-xl transition-all duration-200 text-[11px]"
          title="Visit Portfolio of Developer Tamim Iqbal"
        >
          <span className="text-slate-500 font-normal">
            Developed by
          </span>
          <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
            Tamim Iqbal
          </span>
          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 transition-colors" />
        </a>
      </div>
    </footer>
  );
}

function HomePage({ 
  onGoToForm,
  onGoToNotices,
  onGoToCommittee,
  onGoToStatus,
  registrationSetting,
  latestNotice,
  onOpenNotice
}: { 
  onGoToForm: () => void;
  onGoToNotices: () => void;
  onGoToCommittee: () => void;
  onGoToStatus: () => void;
  registrationSetting?: MembershipRegistrationSetting;
  latestNotice?: ClubNotice;
  onOpenNotice?: (notice: ClubNotice) => void;
}) {
  return (
    <div className="w-full max-w-5xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-8 formal-page-enter flex-1 flex flex-col items-center">
      
      {/* 1. HERO SECTION (Minimalist Apple Style) */}
      <div className="w-full max-w-3xl text-center space-y-4 pt-2 pb-6">
        {/* College Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/75 backdrop-blur-xl border border-black/[0.07] text-slate-700 text-xs font-medium shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>New Govt. Degree College • Rajshahi</span>
        </div>

        {/* Official Club Logo */}
        <div className="flex justify-center pt-1">
          <img 
            src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png" 
            alt="NGDC Science Club Crest" 
            className="h-20 sm:h-24 w-auto object-contain hover:scale-105 transition-transform duration-300 drop-shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Headline */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            NGDC Science Club
          </h1>
          <p className="text-base sm:text-lg font-semibold text-emerald-700 tracking-tight">
            New Govt. Degree College, Rajshahi
          </p>
        </div>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          The official science club of New Govt. Degree College. Empowering students in Science Olympiads, robotics, research projects, and scientific innovations.
        </p>

        {/* Apple Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onGoToForm}
            className="px-6 py-3 rounded-full bg-slate-900 hover:bg-black text-white font-medium text-xs sm:text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>
              {registrationSetting?.status === 'closed'
                ? 'Check Portal Status'
                : registrationSetting?.status === 'coming_soon'
                ? 'Registration Notice'
                : 'Register for Membership'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onGoToStatus}
            className="px-5 py-3 rounded-full bg-white/80 hover:bg-white text-slate-800 font-medium text-xs sm:text-sm border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl transform hover:-translate-y-0.5"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>Check Application Status</span>
          </button>

          <button
            type="button"
            onClick={onGoToNotices}
            className="px-4 py-3 rounded-full bg-transparent hover:bg-black/[0.04] text-slate-600 hover:text-slate-950 font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-4 h-4 text-slate-500" />
            <span>Notices</span>
          </button>
        </div>

        {/* Live Notice Banner Pill */}
        {latestNotice && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenNotice && onOpenNotice(latestNotice)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white border border-emerald-300/80 shadow-xs backdrop-blur-xl text-xs text-slate-700 transition-all cursor-pointer group max-w-xl text-left"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-emerald-800 shrink-0">Announcement:</span>
              <span className="truncate text-slate-800 group-hover:text-emerald-700 transition-colors">
                {latestNotice.title}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        )}
      </div>

      {/* 2. STATS OVERVIEW (Minimal Apple Cards) */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 my-5">
        <div className="p-4 rounded-3xl bg-white/70 hover:bg-white/85 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all group">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-2 border border-emerald-100">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">500+</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Active Students</span>
          <span className="text-[11px] text-slate-500">HSC 27 &amp; 28 Batches</span>
        </div>

        <div className="p-4 rounded-3xl bg-white/70 hover:bg-white/85 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all group">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center mb-2 border border-blue-100">
            <Award className="w-4 h-4" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">20+</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Olympiad Awards</span>
          <span className="text-[11px] text-slate-500">Math, Physics, Bio &amp; Chem</span>
        </div>

        <div className="p-4 rounded-3xl bg-white/70 hover:bg-white/85 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all group">
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 mx-auto flex items-center justify-center mb-2 border border-purple-100">
            <Atom className="w-4 h-4" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">6 Wings</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Activity Wings</span>
          <span className="text-[11px] text-slate-500">Workshops &amp; projects</span>
        </div>

        <div className="p-4 rounded-3xl bg-white/70 hover:bg-white/85 backdrop-blur-xl border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all group">
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center mb-2 border border-amber-100">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">1st Fest</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Annual Science Fest</span>
          <span className="text-[11px] text-slate-500">College science event</span>
        </div>
      </div>

      {/* 3. BENTO GRID: macOS Window Style Cards */}
      <div className="w-full space-y-4 my-2">
        
        {/* BENTO CARD 1: Society Overview & Identity (macOS Window) */}
        <div className="w-full bg-white/75 hover:bg-white/85 backdrop-blur-2xl border border-black/[0.07] rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-left transition-all">
          {/* macOS Window Controls */}
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.05] mb-5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block" />
            </div>
            <span className="text-[11px] font-mono text-slate-400">society_profile.app</span>
            <span className="text-[11px] font-semibold text-slate-500 bg-black/[0.03] px-2.5 py-0.5 rounded-full">
              Rajshahi, Bangladesh
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                About NGDC Science Club
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official student science club of New Govt. Degree College, Rajshahi
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              <strong>NGDC Science Club (NGDCSC)</strong> is the official club for science students at New Govt. Degree College, Rajshahi. The club provides a collaborative platform for Class 11 and Class 12 students to engage in Science Olympiads, robotics, practical scientific experiments, and inter-college competitions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Olympiad Coaching</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Rigorous preparation and mentorship for Math, Physics, Chemistry, Biology, and Astronomy Olympiads.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>Robotics &amp; Innovation</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Practical workshops covering embedded microcontrollers, electronics, Python algorithms, and hardware.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Annual Science Fest</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Host of the Inter-College Science Festival, research project fairs, scientific wall magazines, and quizzes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BENTO CARD 2: The 6 Scientific Wings */}
        <div className="w-full bg-white/75 hover:bg-white/85 backdrop-blur-2xl border border-black/[0.07] rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-left transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.05] mb-5">
            <div className="space-y-0.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                The 6 Specialized Wings
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Six dedicated scientific divisions open to enrolled club members
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Class 11 &amp; 12
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-emerald-600" />
                <span>Astronomy &amp; Astrophysics</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Stargazing sessions, cosmological simulations, telescope handling, and astronomical observation camps.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Atom className="w-4 h-4 text-blue-600" />
                <span>Chemistry &amp; Molecular</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Reaction investigation workshops, organic synthesis study circles, and National Chemistry Olympiad preparation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Biology &amp; Biotechnology</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Microbiology, genetics exploration, botanical identification, and National Biology Olympiad preparation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Mathematics &amp; Logic</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Discrete math, number theory, geometry problem-solving, and intensive training for Bangladesh Math Olympiad.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Robotics &amp; Programming</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Arduino, sensor integration, Python scripting, automated bots, and computing challenges.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Projects &amp; Publications</span>
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Scientific wall magazine editorial design, research poster displays, and innovation exhibits.
              </p>
            </div>
          </div>
        </div>

        {/* BENTO CARD 3: Flagship Science Fest */}
        <div className="w-full bg-white/75 hover:bg-white/85 backdrop-blur-2xl border border-black/[0.07] rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-left transition-all">
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="w-full md:w-5/12 rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100 shadow-sm shrink-0">
              <img 
                src="https://plain-apac-prod-public.komododecks.com/202609/24/YmHrAHI7CXKAZBKyvjDY/image.jpg" 
                alt="1st NGDC Science Fest Event" 
                className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="w-full md:w-7/12 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Annual Event
                </span>
                <span className="text-xs text-slate-500 font-medium">NGDC Campus • Rajshahi</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                The 1st NGDC Science Fest
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Organized by NGDC Science Club featuring Science Project Displays, Olympiads, Rubik's Cube Speedcubing, Wall Magazines, and Science Quizzes.
              </p>
              <div className="pt-1">
                <a
                  href="https://facebook.com/events/s/the-1st-new-govt-degree-colleg/1068668486164256/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <span>View Fest Details</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default function App() {
  const [formData, setFormData] = useState<MembershipFormData>(INITIAL_FORM);
  const [submittedData, setSubmittedData] = useState<SubmissionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [adjustingPhoto, setAdjustingPhoto] = useState<string | null>(null);
  
  // URL detection for /admin, /notices, /committee, /, and unknown routes -> 404
  const [currentView, setCurrentView] = useState<ViewType>(resolveCurrentView);

  const [menuOpen, setMenuOpen] = useState(false);
  const [liveNotices, setLiveNotices] = useState<ClubNotice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<ClubNotice | null>(null);

  // Real-time listener for notices: guarantees latest notices on banner across all devices without refresh
  useEffect(() => {
    const unsubscribe = subscribeToNotices((data) => {
      setLiveNotices(data);
    });
    return () => unsubscribe();
  }, []);

  // Registration portal open/closed setting
  const [registrationSetting, setRegistrationSetting] = useState<MembershipRegistrationSetting>(DEFAULT_REGISTRATION_SETTING);

  // Real-time listener for registration setting
  useEffect(() => {
    const unsubscribe = subscribeRegistrationSetting((data) => {
      setRegistrationSetting(data);
    });
    return () => unsubscribe();
  }, []);

  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ngdc_sc_submissions_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync browser URL history on view change
  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const targetPath = view === 'home' ? '/' : `/${view}`;
      window.history.pushState(null, '', targetPath);
    } catch {
      // ignore
    }
  };

  // Listen to popstate & hashchange for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(resolveCurrentView());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Phone input handler with auto-sync for WhatsApp if sameAsPhone is checked
  const handlePhoneChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      phone: val,
      whatsapp: prev.sameAsPhone ? val : prev.whatsapp
    }));
  };

  const handleSameAsPhoneToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sameAsPhone: checked,
      whatsapp: checked ? prev.phone : prev.whatsapp
    }));
  };

  const toggleSegment = (segment: string) => {
    setFormData(prev => {
      const exists = prev.interestedSegments.includes(segment);
      return {
        ...prev,
        interestedSegments: exists
          ? prev.interestedSegments.filter(s => s !== segment)
          : [...prev.interestedSegments, segment]
      };
    });
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => {
      const currentSkills = prev.skills || [];
      const exists = currentSkills.includes(skill);
      return {
        ...prev,
        skills: exists
          ? currentSkills.filter(s => s !== skill)
          : [...currentSkills, skill]
      };
    });
  };

  // Image Upload Handling with client-side compression & Adjuster
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size cannot exceed 8MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawData = e.target?.result as string;
      if (rawData) {
        setAdjustingPhoto(rawData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdjustedPhoto = (adjustedDataUrl: string) => {
    setFormData(prev => ({ ...prev, photo: adjustedDataUrl }));
    setAdjustingPhoto(null);
    setErrorMsg(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Photo is strictly compulsory
    if (!formData.photo) {
      setErrorMsg('Photo is strictly required! Please upload a passport-size student photo.');
      const photoEl = document.getElementById('photo-upload-section');
      if (photoEl) photoEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!formData.name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!formData.studentId.trim()) {
      setErrorMsg('Please enter your Student ID / Roll.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (!formData.whatsapp.trim()) {
      setErrorMsg('Please enter your WhatsApp number.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Please enter your mail address.');
      return;
    }
    if (!formData.dob) {
      setErrorMsg('Please enter your date of birth.');
      return;
    }
    if (formData.interestedSegments.length === 0) {
      setErrorMsg('Please select at least one interested club segment.');
      return;
    }
    if (!formData.skills || formData.skills.length === 0) {
      setErrorMsg('Please select at least one skill or technical talent.');
      const skillsEl = document.getElementById('skills-checkbox-group');
      if (skillsEl) skillsEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!formData.experienceAchievements?.trim()) {
      setErrorMsg('Please fill in your experience or achievements (or write "None" if you have no prior experience).');
      const expEl = document.getElementById('experience-achievements');
      if (expEl) expEl.focus();
      return;
    }
    if (!formData.agreedToRules) {
      setErrorMsg('You must agree to the club rules and regulations before submitting.');
      return;
    }

    setIsSubmitting(true);

    const newRecord: SubmissionRecord = {
      ...formData,
      membershipId: undefined,
      status: 'pending',
      submittedAt: new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Dhaka'
      })
    };

    // 1. Save directly to Firebase Firestore
    try {
      const fbId = await saveMemberToFirebase(newRecord);
      newRecord.id = fbId;
    } catch (err) {
      console.warn('Firebase save warning:', err);
    }

    // 2. Save locally for instant offline preview
    const updated = [newRecord, ...submissions];
    setSubmissions(updated);
    try {
      localStorage.setItem('ngdc_sc_submissions_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }

    setTimeout(() => {
      setSubmittedData(newRecord);
      setIsSubmitting(false);
    }, 400);
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setSubmittedData(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // If in Admin View, show full Admin Panel dashboard
  if (currentView === 'admin') {
    return <AdminPanel onExit={() => navigateTo('form')} />;
  }

  return (
    <div className="relative min-h-screen text-slate-800 flex flex-col items-center justify-between selection:bg-emerald-500/20 selection:text-emerald-950 font-sans">
      {/* Subtle Luminous Science Canvas Animation Background */}
      <ScienceBackground />

      {/* Modern Apple macOS Floating Glass Navigation Bar */}
      <header className="fixed top-3 sm:top-4 inset-x-0 mx-auto max-w-5xl z-50 px-3 sm:px-4">
        <div className="w-full bg-white/75 hover:bg-white/85 backdrop-blur-2xl border border-black/[0.08] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.06)] px-3 sm:px-4 py-2 flex items-center justify-between transition-all">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 cursor-pointer text-left group"
          >
            <img
              src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png"
              alt="NGDC Science Club"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
                <span>NGDC Science Club</span>
                <span className="hidden md:inline-block text-[10px] font-medium text-slate-500 bg-black/[0.04] px-1.5 py-0.5 rounded-full border border-black/[0.04]">
                  Rajshahi
                </span>
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:block font-normal">
                New Govt. Degree College
              </span>
            </div>
          </button>

          {/* Desktop macOS Segmented Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-black/[0.03] p-1 rounded-full border border-black/[0.04]">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentView === 'home'
                  ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() => navigateTo('notices')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'notices'
                  ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              <span>Notices</span>
              {liveNotices.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigateTo('committee')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentView === 'committee'
                  ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              Committee
            </button>

            <button
              type="button"
              onClick={() => navigateTo('status')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentView === 'status'
                  ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              Check Status
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Register Pill */}
            <button
              type="button"
              onClick={() => navigateTo('form')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'form'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-900 hover:bg-black text-white shadow-xs'
              }`}
            >
              <span>{registrationSetting?.status === 'closed' ? 'Portal Status' : 'Register'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Sheet */}
        {menuOpen && (
          <div 
            ref={menuRef}
            className="md:hidden mt-2 p-3 bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-3xl shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-150 text-slate-800"
          >
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                currentView === 'home' ? 'bg-slate-100 font-semibold text-slate-950' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Overview</span>
              <Home className="w-4 h-4 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('form')}
              className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                currentView === 'form' ? 'bg-slate-100 font-semibold text-slate-950' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Membership Registration</span>
              <FileText className="w-4 h-4 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('status')}
              className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                currentView === 'status' ? 'bg-slate-100 font-semibold text-slate-950' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Check Application Status</span>
              <Search className="w-4 h-4 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('notices')}
              className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                currentView === 'notices' ? 'bg-slate-100 font-semibold text-slate-950' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Notice Board</span>
              <Bell className="w-4 h-4 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('committee')}
              className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                currentView === 'committee' ? 'bg-slate-100 font-semibold text-slate-950' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Executive Committee</span>
              <Users className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        )}
      </header>

      {/* Selected Notice Modal (When clicking scrolling marquee notice) - Apple Frosted Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 text-slate-800 relative">
            <button 
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                {selectedNotice.category || 'Official Notice'}
              </span>
              <span className="text-xs font-mono text-slate-500">{selectedNotice.date}</span>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-3">{selectedNotice.title}</h3>

            {selectedNotice.content && (
              <p className="text-xs text-slate-700 mb-4 whitespace-pre-line leading-relaxed">{selectedNotice.content}</p>
            )}

            {selectedNotice.fileUrl && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Attached Notice Document</span>
                  </p>
                  <a
                    href={selectedNotice.fileUrl}
                    download={selectedNotice.fileName || 'NGDCSC_Notice'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
                {(selectedNotice.fileType === 'image' || selectedNotice.fileUrl.startsWith('data:image')) && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 mb-3 max-h-[65vh] bg-slate-100 flex items-center justify-center p-1.5">
                    <img src={selectedNotice.fileUrl} alt="Notice document" className="w-full h-auto max-h-[65vh] object-contain rounded-lg" />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Adjust / Crop Modal */}
      {adjustingPhoto && (
        <ImageAdjustModal
          imageSrc={adjustingPhoto}
          onApply={handleAdjustedPhoto}
          onClose={() => setAdjustingPhoto(null)}
        />
      )}

      {/* Main Page Views Container - flex-1 ensures natural flow and footer at the bottom */}
      <main className="w-full flex-1 flex flex-col items-center">
        {currentView === 'committee' ? (
          <ExecutiveCommitteePage 
            onBackToRegistration={() => navigateTo('home')} 
          />
      ) : currentView === 'notices' ? (
        <NoticesPage
          onBack={() => navigateTo('home')}
          onOpenAdmin={() => navigateTo('admin')}
        />
      ) : currentView === '404' ? (
        <NotFoundPage
          onGoHome={() => navigateTo('home')}
          onGoAdmin={() => navigateTo('admin')}
          onGoNotices={() => navigateTo('notices')}
          onGoCommittee={() => navigateTo('committee')}
        />
      ) : currentView === 'status' ? (
        <MemberStatusSearch
          onBackToHome={() => navigateTo('home')}
          onGoToRegistration={() => navigateTo('form')}
        />
      ) : currentView === 'home' ? (
        <HomePage 
          onGoToForm={() => navigateTo('form')} 
          onGoToNotices={() => navigateTo('notices')} 
          onGoToCommittee={() => navigateTo('committee')} 
          onGoToStatus={() => navigateTo('status')}
          registrationSetting={registrationSetting}
          latestNotice={liveNotices.length > 0 ? liveNotices[0] : undefined}
          onOpenNotice={(notice) => setSelectedNotice(notice)}
        />
      ) : (
        /* Form Container with macOS layout and top clearance for floating navbar */
        <div className="w-full max-w-3xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-12 formal-page-enter">
          {/* Back to Home Navigation & Check Status */}
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200/90 shadow-xs transition-all cursor-pointer group backdrop-blur-md"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Home</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('status')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 shadow-xs transition-all cursor-pointer backdrop-blur-md"
            >
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>Check Status</span>
            </button>
          </div>
        
          {/* Simple Clean Header: Official Club Logo with No Background */}
          <div className="text-center mb-7 space-y-1.5">
            <div className="flex justify-center mb-3">
              <img 
                src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png" 
                alt="NGDC Science Club Logo" 
                className="h-20 sm:h-24 w-auto object-contain hover:scale-105 transition-transform drop-shadow-[0_10px_25px_rgba(0,0,0,0.06)]"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Session 2026–2027 • HSC 27 &amp; HSC 28</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              NGDC SCIENCE CLUB
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-emerald-700 tracking-wider uppercase">
              Official Membership Registration Portal
            </p>
          </div>

        {/* SUBMISSION SUCCESS VIEW - APPLE LIGHT FROSTED CARD */}
        {submittedData ? (
          <div className="bg-white/85 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-7 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Membership Submission Received!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-4">
              Thank you, <strong className="text-slate-900">{submittedData.name}</strong>. Your membership form has been submitted to NGDC Science Club.
            </p>

            {/* Serial Membership ID Banner / Pending Banner */}
            {submittedData.status === 'approved' && submittedData.membershipId ? (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Your Serial Membership ID
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono tracking-widest">
                      {submittedData.membershipId}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submittedData.membershipId!);
                    alert('Copied Membership ID: ' + submittedData.membershipId);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </button>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                      Application Status: Pending Review
                    </span>
                    <span className="text-sm font-bold text-slate-700 block">
                      Membership ID: Will be assigned upon Admin approval
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('status')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Check Status</span>
                </button>
              </div>
            )}

            {/* Clean summary of submitted details */}
            <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-5 text-left mb-6 space-y-3.5">
              <div className="flex items-center gap-4 pb-3.5 border-b border-slate-200">
                <div className="w-14 h-16 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                  {submittedData.photo ? (
                    <img src={submittedData.photo} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{submittedData.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 border border-slate-300 text-slate-700">
                      {submittedData.batch}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Section {submittedData.section}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Student ID</span>
                  <span className="font-bold text-slate-900 font-mono">{submittedData.studentId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Date of Birth</span>
                  <span className="font-medium text-slate-800">{submittedData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Phone</span>
                  <span className="font-bold text-slate-900 font-mono">{submittedData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">WhatsApp</span>
                  <span className="font-bold text-emerald-700 font-mono">{submittedData.whatsapp}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Mail</span>
                  <span className="font-medium text-slate-800">{submittedData.email}</span>
                </div>
                {submittedData.interestedSegments.length > 0 && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Interested Segments
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {submittedData.interestedSegments.map(seg => (
                        <span key={seg} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                          {seg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {submittedData.skills && submittedData.skills.length > 0 && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Skills &amp; Co-Curricular Talents
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {submittedData.skills.map(sk => (
                        <span key={sk} className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {submittedData.experienceAchievements && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Experience &amp; Achievements
                    </span>
                    <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 font-medium whitespace-pre-line leading-relaxed">
                      {submittedData.experienceAchievements}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Official WhatsApp Group Join - Clean & Minimal */}
            <div className="my-5 p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 text-center">
              <p className="text-xs text-slate-700 font-medium mb-3 leading-relaxed">
                Stay updated with official club notices, science competitions, events, and workshops by joining our official WhatsApp group.
              </p>
              <a
                href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
                </svg>
                <span>Join Official WhatsApp Group</span>
              </a>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => navigateTo('status')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Check Application Status</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Submit Another Response</span>
              </button>
            </div>
          </div>
        ) : registrationSetting.status !== 'open' ? (
          /* FORMAL REGISTRATION NOTICE (FORM REPLACED BY FORMAL CLOSED / COMING SOON NOTICE - APPLE LIGHT THEME) */
          <div className={`backdrop-blur-2xl rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200 space-y-6 ${
            registrationSetting.status === 'closed'
              ? 'bg-white/85 border-rose-200'
              : 'bg-white/85 border-amber-200'
          }`}>
            {/* Club Identity Header with Official Logo */}
            <div className="flex flex-col items-center justify-center gap-2">
              <img 
                src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png" 
                alt="NGDC Science Club Logo" 
                className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                referrerPolicy="no-referrer"
              />
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-wider uppercase">
                  NGDC Science Club
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  New Government Degree College, Rajshahi
                </p>
              </div>
            </div>

            {/* Status Icon */}
            <div className="flex justify-center">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xs border ${
                registrationSetting.status === 'closed'
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}>
                {registrationSetting.status === 'closed' ? (
                  <Lock className="w-8 h-8 text-rose-600" />
                ) : (
                  <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                )}
              </div>
            </div>

            {/* Formal Status Badge */}
            <div className="flex justify-center">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                registrationSetting.status === 'closed'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  registrationSetting.status === 'closed' ? 'bg-rose-500' : 'bg-amber-500 animate-ping'
                }`} />
                <span>
                  {registrationSetting.status === 'closed' ? 'Registration Closed' : 'Coming Soon'}
                </span>
              </span>
            </div>

            {/* Headline and Formal Text */}
            <div className="space-y-3 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {registrationSetting.headline || (
                  registrationSetting.status === 'closed'
                    ? 'NGDC Science Club Membership Registration is Currently Closed'
                    : 'NGDC Science Club Membership Registration Coming Soon'
                )}
              </h2>
              
              <div className={`text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line p-4 sm:p-5 rounded-2xl border text-left sm:text-center space-y-2 ${
                registrationSetting.status === 'closed'
                  ? 'bg-rose-50/50 border-rose-200'
                  : 'bg-amber-50/50 border-amber-200'
              }`}>
                <p>
                  {registrationSetting.message || (
                    registrationSetting.status === 'closed'
                      ? 'The membership registration window for NGDC Science Club (New Government Degree College, Rajshahi) is currently closed for this session. Thank you for your interest. Please check our official notices for future announcements.'
                      : 'The official membership registration for NGDC Science Club (New Government Degree College, Rajshahi) will open shortly for HSC 27 and HSC 28 sessions. Eleventh and twelfth grade science students are requested to keep their college information and passport photograph ready.'
                  )}
                </p>
              </div>
            </div>

            {/* Official Email Contact Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border text-center max-w-lg mx-auto transition-all ${
              registrationSetting.status === 'closed'
                ? 'bg-rose-50/70 border-rose-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <Mail className={`w-4 h-4 ${registrationSetting.status === 'closed' ? 'text-rose-600' : 'text-amber-600'}`} />
                <span className={`text-xs font-black uppercase tracking-wider ${
                  registrationSetting.status === 'closed' ? 'text-rose-800' : 'text-amber-800'
                }`}>
                  Need Assistance or Have Questions?
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mb-3.5 leading-relaxed">
                If you need any information, assistance, or have questions regarding NGDC Science Club membership, please contact us directly via our official email:
              </p>
              <a
                href="mailto:ngdcsc.org@gmail.com"
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  registrationSetting.status === 'closed'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-200'
                }`}
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>Contact via Email: ngdcsc.org@gmail.com</span>
              </a>
            </div>

            {/* Actions for Students */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => navigateTo('status')}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer ${
                  registrationSetting.status === 'closed'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Check Application Status</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('notices')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-600" />
                <span>View Club Notices</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('home')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM - APPLE TRANSLUCENT FROSTED CARD */
          <form 
            onSubmit={handleSubmit}
            className="bg-white/85 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-10 space-y-7 transition-all text-left"
            id="ngdc-science-club-form"
          >
            {/* macOS Window Title Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-2xs" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-2xs" />
              </div>
              <span className="text-[11px] font-mono text-slate-400">membership_application.form</span>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                Admission Form
              </span>
            </div>

            {/* Quick Link Banner for Checking Status */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Search className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Already applied? Verify your review status or Membership ID anytime.</span>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('status')}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 shadow-2xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <span>Check Status</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION 1: APPLICANT IDENTITY & PHOTOGRAPH */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                <div className="w-6 h-6 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Applicant Identity &amp; Photograph
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Provide formal passport photograph and full legal name
                  </p>
                </div>
              </div>

              {/* Photo Upload Zone */}
              <div id="photo-upload-section" className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Passport Size Photo <span className="text-emerald-600 font-bold">*</span>
                  </label>
                  {formData.photo && (
                    <button
                      type="button"
                      onClick={() => setAdjustingPhoto(formData.photo)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Adjust / Crop Photo</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-28 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all overflow-hidden bg-slate-50 shrink-0 ${
                      dragActive 
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                        : formData.photo 
                          ? 'border-emerald-500 shadow-xs' 
                          : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-100/70'
                    }`}
                    id="photo-upload-area"
                  >
                    {formData.photo ? (
                      <div className="relative w-full h-full group">
                        <img 
                          src={formData.photo} 
                          alt="Uploaded student preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Camera className="w-5 h-5 mb-0.5 text-white" />
                          <span className="text-[10px] font-semibold">Change</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                          className="absolute top-1.5 right-1.5 p-1 bg-white/95 text-slate-600 hover:text-rose-600 rounded-full shadow-xs transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-1 text-slate-500 shadow-2xs">
                          <Camera className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800">Upload Photo</span>
                        <span className="text-[9px] text-slate-400 font-medium">Max 8MB</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
                      accept="image/*" 
                      className="hidden" 
                      id="photo-input"
                    />
                  </div>

                  <div className="text-center sm:text-left text-xs text-slate-600 space-y-1.5 flex-1">
                    <p className="font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1">
                      <span>Official Formal Student Photograph</span>
                      <span className="text-emerald-600 font-bold">*</span>
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Upload a front-facing passport photograph with clear lighting. Drag and drop file or click the upload box. Zoom, rotation, and face centering can be adjusted after selection.
                    </p>
                    {formData.photo && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => setAdjustingPhoto(formData.photo)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Scissors className="w-3 h-3 text-emerald-600" />
                          <span>Crop &amp; Center</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer transition-colors"
                        >
                          Change Photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name Field */}
              <div>
                <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="student-name"
                    required
                    placeholder="Enter full name as registered in college"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: CONTACT & COMMUNICATIONS */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                <div className="w-6 h-6 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Contact &amp; Communications
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Used for official club notices, event invites, and emergency outreach
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number */}
                <div>
                  <label htmlFor="student-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number <span className="text-emerald-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      id="student-phone"
                      required
                      placeholder="01XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono font-medium shadow-xs"
                    />
                  </div>
                </div>

                {/* WhatsApp Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label htmlFor="student-whatsapp" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      WhatsApp Number <span className="text-emerald-600 font-bold">*</span>
                    </label>
                    {/* Apple Style Same as Phone Toggle */}
                    <label 
                      htmlFor="same-phone-tick" 
                      className={`inline-flex items-center gap-1.5 cursor-pointer text-xs select-none px-2.5 py-0.5 rounded-full border transition-all ${
                        formData.sameAsPhone 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id="same-phone-tick"
                        checked={formData.sameAsPhone}
                        onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                        className="w-3 h-3 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-[10px]">Same as Phone</span>
                    </label>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                    </div>
                    <input
                      type="tel"
                      id="student-whatsapp"
                      required
                      readOnly={formData.sameAsPhone}
                      placeholder="01XXXXXXXXX"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-mono font-medium shadow-xs ${
                        formData.sameAsPhone
                          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-white hover:border-slate-300 focus:bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="student-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="student-email"
                    required
                    placeholder="student@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: ACADEMIC DETAILS & SESSION */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                <div className="w-6 h-6 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Academic Record &amp; College Batch
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    College identity, section division, and academic session
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student ID / Roll */}
                <div>
                  <label htmlFor="student-id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student ID / College Roll <span className="text-emerald-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="student-id"
                      required
                      placeholder="Enter college roll or student ID"
                      value={formData.studentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono font-medium shadow-xs"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="student-dob" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date of Birth <span className="text-emerald-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      id="student-dob"
                      required
                      value={formData.dob}
                      onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section Selector (A, B, C, D) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  College Section <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2 sm:gap-3" id="section-selector-group">
                  {(['A', 'B', 'C', 'D'] as SectionType[]).map((sec) => {
                    const isSelected = formData.section === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        id={`section-${sec.toLowerCase()}`}
                        onClick={() => setFormData(prev => ({ ...prev, section: sec }))}
                        className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-black'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        Section {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HSC Batches (HSC 27, HSC 28) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  HSC Batch Session <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3" id="batch-selector-group">
                  {(['HSC 27', 'HSC 28'] as BatchType[]).map((batch) => {
                    const isSelected = formData.batch === batch;
                    return (
                      <button
                        key={batch}
                        type="button"
                        id={`batch-${batch.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={() => setFormData(prev => ({ ...prev, batch }))}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className={`text-sm font-extrabold block ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                            {batch}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {batch === 'HSC 27' ? 'Class 12 • Senior Science' : 'Class 11 • Junior Science'}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 4: SCIENTIFIC WINGS & TALENTS */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                <div className="w-6 h-6 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    Scientific Wings, Talents &amp; Experience
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Choose your focus disciplines and co-curricular strengths
                  </p>
                </div>
              </div>

              {/* Interested Segments Checkboxes (Mandatory) */}
              <div>
                <div className="mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Interested Science Wings <span className="text-emerald-600 font-bold">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select at least one discipline you would like to participate in (Mandatory):
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="segments-checkbox-group">
                  {CLUB_SEGMENTS.map((segment) => {
                    const isChecked = formData.interestedSegments.includes(segment);
                    return (
                      <label
                        key={segment}
                        onClick={() => toggleSegment(segment)}
                        className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-300 text-emerald-950 font-semibold shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold leading-snug">
                          {segment}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Skills & Co-Curricular Talents */}
              <div>
                <div className="mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Skills &amp; Technical Talents <span className="text-emerald-600 font-bold">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select your skills across technology, design, coordination, and lab work (Select at least one):
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" id="skills-checkbox-group">
                  {((registrationSetting.skills && registrationSetting.skills.length > 0) ? registrationSetting.skills : DEFAULT_SKILL_OPTIONS).map((skill) => {
                    const isChecked = (formData.skills || []).includes(skill);
                    return (
                      <label
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-300 text-emerald-950 font-semibold shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold leading-snug">
                          {skill}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Experience or Achievements */}
              <div>
                <div className="mb-1.5">
                  <label htmlFor="experience-achievements" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Experience or Achievements <span className="text-emerald-600 font-bold">*</span>
                  </label>
                </div>
                <textarea
                  id="experience-achievements"
                  rows={3}
                  required
                  placeholder="Share your past science olympiad participation, science projects, coding skills, or type 'None' if you are beginning your scientific journey"
                  value={formData.experienceAchievements || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, experienceAchievements: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium leading-relaxed resize-y shadow-xs"
                />
              </div>
            </div>

            {/* SECTION 5: RULES & UNDERTAKING */}
            <div className="rounded-2xl p-5 sm:p-6 bg-slate-50/90 border border-slate-200/90 space-y-4 shadow-xs" id="rules-regulations-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Club Rules &amp; Regulations
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Official code of conduct and attendance requirements
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed font-medium pl-1">
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-600 shrink-0">1.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Attendance &amp; Cancellation:</strong> Missing two (2) consecutive club sessions, workshops, or weekly meetings without prior notice or valid written approval will result in automatic cancellation of club membership.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-600 shrink-0">2.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Mandatory Olympiad Participation:</strong> All members must actively prepare for and regularly participate in Science Olympiads (Math, Physics, Bio, Chem, Informatics, Astronomy), science fairs, and project exhibitions.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-600 shrink-0">3.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Discipline &amp; Conduct:</strong> Every member must uphold strict academic integrity, mutual respect, ethical standards, and represent New Government Degree College with dignity.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-600 shrink-0">4.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Active Dedication:</strong> Members must complete assigned scientific tasks, collaborate respectfully in group activities, and adhere to guidelines set by the Executive Committee.
                  </p>
                </div>
              </div>

              {/* Mandatory Agreement Checkbox */}
              <label 
                id="rules-agreement-checkbox"
                onClick={() => setFormData(prev => ({ ...prev, agreedToRules: !prev.agreedToRules }))}
                className={`mt-2 flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                  formData.agreedToRules
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs ring-1 ring-emerald-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  formData.agreedToRules ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                }`}>
                  {formData.agreedToRules && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-bold leading-snug">
                  I have read, understood, and agree to strictly abide by all the Rules &amp; Regulations of NGDC Science Club. <span className="text-emerald-600 font-bold">*</span>
                </span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 space-y-2 text-center">
              <button
                type="submit"
                id="submit-form-button"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transform hover:-translate-y-0.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Submit Membership Application</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 font-normal">
                Your application will be officially recorded and assigned an application tracking status.
              </p>
            </div>
          </form>
        )}
      </div>
      )}
      </main>

      {/* Global Club Footer on EVERY single page */}
      <ClubFooter onGoToAdmin={() => navigateTo('admin')} />
    </div>
  );
}
