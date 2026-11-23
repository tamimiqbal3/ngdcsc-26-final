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
  Lock,
  LogIn,
  UserCheck,
  Eye,
  EyeOff,
  Link2
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  MembershipFormData, 
  SubmissionRecord, 
  SectionType, 
  BatchType, 
  ClubNotice, 
  MembershipRegistrationSetting, 
  RegistrationStatusMode,
  DEFAULT_SKILL_OPTIONS,
  detectGroupFromRoll,
  GROUP_BADGE_STYLES
} from './types';
import ScienceBackground from './ScienceBackground';
import ExecutiveCommitteePage from './ExecutiveCommitteePage';
import NoticesPage from './NoticesPage';
import MemberStatusSearch from './MemberStatusSearch';
import ConfirmationSlipPage from './ConfirmationSlipPage';
import AdminPanel from './AdminPanel';
import NotFoundPage from './NotFoundPage';
import MemberAuthPage from './MemberAuthPage';
import MemberDashboard from './MemberDashboard';
import NoticeDetailPage from './NoticeDetailPage';
import ImageAdjustModal from './components/ImageAdjustModal';
import DotLoader from './components/DotLoader';
import InboxToastNotification from './components/InboxToastNotification';
import NotificationPermissionBanner from './components/NotificationPermissionBanner';
import { syncPushSubscriptionForUser } from './utils/browserNotifications';
import { applyRouteSeo } from './utils/seoManager';
import { 
  auth,
  saveMemberToFirebase, 
  registerMemberAccount,
  formatAuthError,
  subscribeToNotices, 
  subscribeToActiveMemberCount,
  getCachedActiveMemberCount,
  getCachedNotices,
  getCachedRegistrationSetting,
  subscribeRegistrationSetting,
  DEFAULT_REGISTRATION_SETTING,
  isPresidentEmail,
  subscribeToPresidentInboxThreads,
  subscribeToMemberInboxThread,
  markNoticeAsReadForUser
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

type ViewType = 'home' | 'form' | 'committee' | 'notices' | 'notice_detail' | 'status' | 'slip' | 'login' | 'dashboard' | 'admin' | '404';

const getNoticeIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const directId = searchParams.get('id');
  if (directId) return directId;
  const hash = window.location.hash;
  if (hash.includes('?')) {
    const hashParams = new URLSearchParams(hash.split('?')[1]);
    return hashParams.get('id');
  }
  return null;
};

// Helper to determine view from current URL path & hash
const resolveCurrentView = (): ViewType => {
  if (typeof window === 'undefined') return 'home';
  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');

  if (hash === 'admin' || rawPath === '/admin' || rawPath.endsWith('/admin')) return 'admin';
  if (hash === 'login' || hash === 'signin' || rawPath === '/login' || rawPath.endsWith('/login')) return 'login';
  if (hash === 'dashboard' || hash === 'my-dashboard' || rawPath === '/dashboard' || rawPath === '/my-dashboard' || rawPath.endsWith('/dashboard')) return 'dashboard';
  if (hash === 'notices' || hash.startsWith('notices?') || rawPath === '/notices' || rawPath.endsWith('/notices')) {
    return getNoticeIdFromUrl() ? 'notice_detail' : 'notices';
  }
  if (hash === 'committee' || rawPath === '/committee' || rawPath.endsWith('/committee')) return 'committee';
  if (hash === 'status' || hash === 'check-status' || rawPath === '/status' || rawPath.endsWith('/status')) return 'status';
  if (hash.startsWith('slip') || rawPath === '/slip' || rawPath.endsWith('/slip')) return 'slip';
  if (hash === 'form' || hash === 'register' || hash === 'signup' || rawPath === '/form' || rawPath === '/register' || rawPath === '/signup' || rawPath.endsWith('/form') || rawPath.endsWith('/register')) return 'form';
  if (rawPath === '' || rawPath === '/' || rawPath === '/index.html' || hash === '' || hash === 'home') return 'home';

  // Any other URL shows our themed 404 forbidden page
  return '404';
};

function ClubFooter() {
  return (
    <footer className="mt-auto w-full max-w-5xl mx-auto pt-10 pb-8 text-center flex flex-col items-center gap-3 relative z-10 px-4 border-t border-slate-200/70">
      <div className="flex items-center justify-center gap-4 text-slate-500">
        <a 
          href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-1.5 hover:text-[#25D366] transition-colors"
          title="Official WhatsApp Community"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
          </svg>
        </a>

        <a 
          href="https://facebook.com/ngdcsc" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-1.5 hover:text-blue-600 transition-colors"
          title="Official Facebook Page"
        >
          <Facebook className="w-4 h-4" />
        </a>

        <a 
          href="https://instagram.com/ngdcsc_" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-1.5 hover:text-pink-600 transition-colors"
          title="Official Instagram"
        >
          <Instagram className="w-4 h-4" />
        </a>

        <a 
          href="mailto:ngdcsc.org@gmail.com" 
          className="p-1.5 hover:text-emerald-700 transition-colors"
          title="Official Email"
        >
          <Mail className="w-4 h-4" />
        </a>
      </div>

      <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-slate-500 font-medium">
        <span>© 2026 NGDC Science Club • New Government Degree College, Rajshahi</span>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <a
          href="https://portfolio.tamimiq.shop"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors font-semibold"
          title="Visit Portfolio of Developer Tamim Iqbal"
        >
          <span className="font-normal text-slate-500">Developed by</span>
          <span>Tamim Iqbal</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </a>
      </div>
    </footer>
  );
}

function HomePage({ 
  onGoToForm,
  onGoToNotices,
  onGoToStatus,
  registrationSetting,
  latestNotice,
  onOpenNotice,
  activeMemberCount
}: { 
  onGoToForm: () => void;
  onGoToNotices: () => void;
  onGoToCommittee: () => void;
  onGoToStatus: () => void;
  registrationSetting?: MembershipRegistrationSetting;
  latestNotice?: ClubNotice;
  onOpenNotice?: (notice: ClubNotice) => void;
  activeMemberCount: number | null;
}) {
  return (
    <div className="w-full max-w-5xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-10 formal-page-enter flex-1 flex flex-col items-center">
      
      {/* 1. HERO SECTION */}
      <div className="w-full max-w-3xl text-center space-y-4 pt-2 pb-8">
        <div className="inline-flex items-center gap-2 text-slate-600 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>New Govt. Degree College • Rajshahi</span>
        </div>

        <div className="flex justify-center pt-1">
          <img 
            src="/assets/club-logo.png" 
            alt="NGDC Science Club Crest" 
            decoding="async"
            className="h-20 sm:h-24 w-auto object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            NGDC Science Club
          </h1>
          <p className="text-base sm:text-lg font-semibold text-emerald-700 tracking-tight">
            New Govt. Degree College, Rajshahi
          </p>
        </div>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          The official science club of New Govt. Degree College. Empowering students in Science Olympiads, robotics, research projects, and scientific innovations.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onGoToForm}
            className="px-6 py-3 rounded-full bg-slate-900 hover:bg-black text-white font-medium text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
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
            className="px-5 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs sm:text-sm border border-slate-200/90 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
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

        {/* Live Notice Banner */}
        {latestNotice && (
          <div className="pt-2 px-1">
            <button
              type="button"
              onClick={() => onOpenNotice && onOpenNotice(latestNotice)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-emerald-50/40 border border-emerald-200 text-xs text-slate-700 transition-all cursor-pointer group max-w-full sm:max-w-xl text-left shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-emerald-800 shrink-0">Announcement:</span>
              <span className="truncate text-slate-800 group-hover:text-emerald-700 transition-colors min-w-0">
                {latestNotice.title}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        )}
      </div>

      {/* 2. UNIFIED OVERVIEW DOCUMENT (Clean single surface with hairline dividers, no nested boxes) */}
      <div className="w-full bg-white border border-slate-200/90 rounded-2xl shadow-xs divide-y divide-slate-100 text-left">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-5 text-center">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block tabular-nums">
              {activeMemberCount !== null ? activeMemberCount : '...'}
            </span>
            <span className="text-xs font-semibold text-slate-700 mt-1 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active Members</span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">HSC 27 &amp; 28 Batches</span>
          </div>

          <div className="p-5 text-center">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">20+</span>
            <span className="text-xs font-semibold text-slate-700 block mt-1">Olympiad Awards</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Math, Physics, Bio &amp; Chem</span>
          </div>

          <div className="p-5 text-center">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">6 Wings</span>
            <span className="text-xs font-semibold text-slate-700 block mt-1">Activity Wings</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Workshops &amp; projects</span>
          </div>

          <div className="p-5 text-center">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">1st Fest</span>
            <span className="text-xs font-semibold text-slate-700 block mt-1">Annual Science Fest</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">College science event</span>
          </div>
        </div>

        {/* About */}
        <div className="p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              About NGDC Science Club
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
              <strong>NGDC Science Club (NGDCSC)</strong> is the official student science organization of New Govt. Degree College, Rajshahi, providing a collaborative platform for Class 11 and Class 12 science students to participate in Science Olympiads, robotics, research projects, and inter-college competitions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Olympiad Coaching</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Preparation and mentorship for Math, Physics, Chemistry, Biology, and Astronomy Olympiads.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Robotics &amp; Innovation</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hands-on workshops covering embedded microcontrollers, electronics, Python algorithms, and hardware.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Annual Science Fest</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Host of the Inter-College Science Festival, project exhibitions, wall magazines, and quizzes.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Scientific Wings */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Specialized Wings
            </h2>
            <span className="text-xs font-medium text-emerald-700">Class 11 &amp; 12</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Astronomy &amp; Astrophysics</span>
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stargazing sessions, cosmological simulations, telescope handling, and observation camps.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Atom className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Chemistry &amp; Molecular</span>
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reaction workshops, organic synthesis study circles, and Chemistry Olympiad training.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Biology &amp; Biotechnology</span>
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Microbiology, genetics exploration, botanical study, and Biology Olympiad preparation.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Mathematics &amp; Logic</span>
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Number theory, geometry problem-solving, and Bangladesh Math Olympiad mentoring.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Robotics &amp; Programming</span>
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Arduino, sensor integration, Python scripting, automated bots, and computing challenges.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Projects &amp; Publications</span>
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scientific wall magazine editorial design, research posters, and innovation exhibits.
              </p>
            </div>
          </div>
        </div>

        {/* Flagship Science Fest */}
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
          <div className="w-full md:w-5/12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            <img 
              src="https://plain-apac-prod-public.komododecks.com/202609/24/YmHrAHI7CXKAZBKyvjDY/image.jpg" 
              alt="1st NGDC Science Fest Event" 
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="w-full md:w-7/12 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Annual Campus Event • Rajshahi
            </span>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              The 1st NGDC Science Fest
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Organized by NGDC Science Club featuring Science Project Displays, Olympiads, Rubik's Cube Speedcubing, Wall Magazines, and Science Quizzes.
            </p>
            <div className="pt-1">
              <a
                href="https://facebook.com/events/s/the-1st-new-govt-degree-colleg/1068668486164256/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-slate-900 hover:bg-black text-white font-medium text-xs transition-all cursor-pointer group"
              >
                <span>View Fest Details</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
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
  const [accountPassword, setAccountPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Auth state for Member Login & My Dashboard
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [authInitialized, setAuthInitialized] = useState(() => Boolean(auth.currentUser));
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [inboxAlertMeta, setInboxAlertMeta] = useState<{
    unreadCount: number;
    latestEventKey: string;
    notifTag?: string;
    senderHint?: string;
  }>({ unreadCount: 0, latestEventKey: '' });
  const [activeDashboardPage, setActiveDashboardPage] = useState<'slip' | 'attendance' | 'inbox' | 'edit' | 'password'>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('open') === 'inbox') return 'inbox';
    }
    return 'slip';
  });
  const [requestedDashboardPage, setRequestedDashboardPage] = useState<{
    page: 'slip' | 'attendance' | 'inbox' | 'edit' | 'password';
    nonce: number;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('open') === 'inbox') return { page: 'inbox', nonce: Date.now() };
    }
    return null;
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    let lastAttemptAt = 0;
    let syncedOnce = false;
    const retryTimers: number[] = [];

    const runSync = async (force = false) => {
      if (cancelled) return;
      const now = Date.now();
      if (!force && syncedOnce && now - lastAttemptAt < 30000) return;
      lastAttemptAt = now;
      try {
        const token = await authUser.getIdToken();
        if (!token || cancelled) return;
        const ok = await syncPushSubscriptionForUser(token);
        if (ok) {
          syncedOnce = true;
        }
      } catch {
        // ignore transient network errors
      }
    };

    runSync(true).then(() => {
      if (
        !cancelled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        retryTimers.push(window.setTimeout(() => { if (!syncedOnce) runSync(true); }, 3000));
        retryTimers.push(window.setTimeout(() => { if (!syncedOnce) runSync(true); }, 10000));
      }
    });

    const handleForceSync = () => runSync(true);
    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        runSync(false);
      }
    };
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        runSync(true);
      }
    };

    window.addEventListener('ngdcsc-notif-permission-changed', handleForceSync);
    window.addEventListener('online', handleForceSync);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      cancelled = true;
      retryTimers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('ngdcsc-notif-permission-changed', handleForceSync);
      window.removeEventListener('online', handleForceSync);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      setInboxUnreadCount(0);
      setInboxAlertMeta({ unreadCount: 0, latestEventKey: '' });
      return;
    }
    if (isPresidentEmail(authUser.email)) {
      return subscribeToPresidentInboxThreads((list) => {
        const unreadThreads = list.filter((t) => (t.unreadByPresident || 0) > 0);
        const unread = unreadThreads.reduce((sum, t) => sum + (t.unreadByPresident || 0), 0);
        setInboxUnreadCount(unread);
        if (unread > 0) {
          const latest = unreadThreads[0];
          const senderHint =
            unreadThreads.length === 1
              ? `From ${latest?.memberName || 'Club Member'}`
              : `From ${unreadThreads.length} members`;
          setInboxAlertMeta({
            unreadCount: unread,
            latestEventKey: `pres:${unread}:${latest?.id || ''}:${latest?.lastMessageAt || ''}`,
            notifTag: latest?.id && latest?.lastMessageAt ? `ngdcsc-msg-${latest.id}-${latest.lastMessageAt}` : undefined,
            senderHint
          });
        } else {
          setInboxAlertMeta({ unreadCount: 0, latestEventKey: '' });
        }
      });
    }
    return subscribeToMemberInboxThread(authUser.uid, authUser.email, (thread) => {
      const unread = thread?.unreadByMember || 0;
      setInboxUnreadCount(unread);
      if (unread > 0) {
        setInboxAlertMeta({
          unreadCount: unread,
          latestEventKey: `member:${authUser.uid}:${unread}:${thread?.id || ''}:${thread?.lastMessageAt || ''}`,
          notifTag: thread?.id && thread?.lastMessageAt ? `ngdcsc-msg-${thread.id}-${thread.lastMessageAt}` : undefined,
          senderHint: 'From Tamim Iqbal (President)'
        });
      } else {
        setInboxAlertMeta({ unreadCount: 0, latestEventKey: '' });
      }
    });
  }, [authUser]);

  // URL detection for /admin, /notices, /committee, /, and unknown routes -> 404
  const [currentView, setCurrentView] = useState<ViewType>(resolveCurrentView);

  const [menuOpen, setMenuOpen] = useState(false);
  const [liveNotices, setLiveNotices] = useState<ClubNotice[]>(() => getCachedNotices());
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(() => getNoticeIdFromUrl());
  const [noticeReturnView, setNoticeReturnView] = useState<'home' | 'notices' | 'dashboard'>('notices');
  const [activeMemberCount, setActiveMemberCount] = useState<number | null>(() => getCachedActiveMemberCount());

  // Real-time listener for notices
  useEffect(() => {
    const unsubscribe = subscribeToNotices((data) => {
      setLiveNotices(data);
    });
    return () => unsubscribe();
  }, []);

  // Lightweight listener for active (approved) members count
  useEffect(() => {
    const unsubscribe = subscribeToActiveMemberCount((count) => {
      setActiveMemberCount(count);
    });
    return () => unsubscribe();
  }, []);

  // Registration portal open/closed setting
  const [registrationSetting, setRegistrationSetting] = useState<MembershipRegistrationSetting>(() => getCachedRegistrationSetting());

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
    if (view !== 'notice_detail') {
      setSelectedNoticeId(null);
    }
    setCurrentView(view);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const targetPath = view === 'home' ? '/' : view === 'notice_detail' ? '/notices' : `/${view}`;
      window.history.pushState(null, '', targetPath);
    } catch {
      // ignore
    }
  };

  const openNoticeDetailPage = (notice: ClubNotice, returnTo: 'home' | 'notices' | 'dashboard') => {
    setSelectedNoticeId(notice.id);
    setNoticeReturnView(returnTo);
    setCurrentView('notice_detail');
    setMenuOpen(false);
    if (authUser?.uid) {
      markNoticeAsReadForUser(authUser.uid, notice.id);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    try {
      window.history.pushState(null, '', `/notices?id=${encodeURIComponent(notice.id)}`);
    } catch {
      // ignore
    }
  };

  // Listen to popstate & hashchange for browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setSelectedNoticeId(getNoticeIdFromUrl());
      setCurrentView(resolveCurrentView());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Keep per-URL SEO metadata, 100+ bilingual keywords, canonical link, and JSON-LD synced
  useEffect(() => {
    const activeNotice =
      currentView === 'notice_detail' && selectedNoticeId
        ? liveNotices.find((n) => n.id === selectedNoticeId) || null
        : null;
    applyRouteSeo(currentView, activeNotice);
  }, [currentView, selectedNoticeId, liveNotices]);

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
    if (!accountPassword || accountPassword.length < 6) {
      setErrorMsg('Please create an account password (at least 6 characters).');
      const pwEl = document.getElementById('student-password');
      if (pwEl) pwEl.focus();
      return;
    }
    if (accountPassword !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      const cpwEl = document.getElementById('student-confirm-password');
      if (cpwEl) cpwEl.focus();
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

    let memberUid: string | undefined;
    try {
      const createdUser = await registerMemberAccount(
        formData.email,
        accountPassword,
        formData.name
      );
      memberUid = createdUser.uid;
    } catch (authErr: any) {
      setErrorMsg(formatAuthError(authErr));
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const newRecord: SubmissionRecord = {
      ...formData,
      academicGroup: detectGroupFromRoll(formData.studentId) || formData.academicGroup || '',
      uid: memberUid,
      membershipId: undefined,
      status: 'pending',
      submittedAt: new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Dhaka'
      })
    };

    // 1. Save directly to cloud database
    try {
      const fbId = await saveMemberToFirebase(newRecord);
      newRecord.id = fbId;
    } catch (err) {
      console.warn('Database save warning:', err);
    }

    // 2. Save locally for instant offline preview
    const updated = [newRecord, ...submissions];
    setSubmissions(updated);
    try {
      localStorage.setItem('ngdc_sc_submissions_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }

    setSubmittedData(newRecord);
    setIsSubmitting(false);
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setSubmittedData(null);
    setErrorMsg(null);
    setAccountPassword('');
    setConfirmPassword('');
    setShowRegPassword(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // If in Admin View, show full Admin Panel dashboard
  if (currentView === 'admin') {
    return <AdminPanel onExit={() => navigateTo('form')} />;
  }

  // If in Slip View, show full Confirmation Slip Page
  if (currentView === 'slip') {
    return (
      <>
        <ConfirmationSlipPage onBack={() => navigateTo('status')} />
        <NotificationPermissionBanner
          suppressWhenToastVisible={Boolean(authUser && inboxAlertMeta.unreadCount > 0)}
        />
        {authUser && (
          <InboxToastNotification
            unreadCount={inboxAlertMeta.unreadCount}
            latestEventKey={inboxAlertMeta.latestEventKey}
            notifTag={inboxAlertMeta.notifTag}
            senderHint={inboxAlertMeta.senderHint}
            isCurrentlyViewingInbox={false}
            onOpenInbox={() => {
              setRequestedDashboardPage({ page: 'inbox', nonce: Date.now() });
              navigateTo('dashboard');
            }}
          />
        )}
      </>
    );
  }

  const isFullScreenInbox = Boolean(
    authUser &&
      (currentView === 'dashboard' || currentView === 'login') &&
      activeDashboardPage === 'inbox'
  );

  return (
    <div className="relative min-h-screen text-slate-800 flex flex-col items-center justify-between selection:bg-emerald-500/20 selection:text-emerald-950 font-sans">
      {/* Subtle Luminous Science Canvas Animation Background */}
      {!isFullScreenInbox && <ScienceBackground />}

      {/* Modern Floating Navigation Bar */}
      {!isFullScreenInbox && (
      <header className="fixed top-3 sm:top-4 inset-x-0 mx-auto max-w-5xl z-50 px-3 sm:px-4">
        <div className="w-full bg-white/90 backdrop-blur-md border border-black/[0.08] rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.05)] px-3 sm:px-4 py-2 flex items-center justify-between transition-all">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 cursor-pointer text-left group"
          >
            <img
              src="/assets/club-logo.png"
              alt="NGDC Science Club"
              decoding="async"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain group-hover:scale-105 transition-transform"
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

          {/* Desktop Segmented Navigation Tabs (Including Login / Sign Up tab) */}
          <nav className="hidden md:flex items-center gap-1 bg-black/[0.03] p-1 rounded-full border border-black/[0.04]">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
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
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                currentView === 'notices' || currentView === 'notice_detail'
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
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
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
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                currentView === 'status'
                  ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              Check Status
            </button>

            <button
              type="button"
              onClick={() => navigateTo(authUser ? 'dashboard' : 'login')}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                currentView === 'login' || currentView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : authUser
                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-white/80 text-slate-800 hover:bg-white hover:text-emerald-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              }`}
            >
              {authUser ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>My Dashboard</span>
                  {inboxUnreadCount > 0 && (
                    <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none shadow-2xs">
                      {inboxUnreadCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Login / Sign Up</span>
                </>
              )}
            </button>
          </nav>

          {/* Right Action Buttons (Visible on Mobile + Compact Hamburger) */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateTo(authUser ? 'dashboard' : 'login')}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 border text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                currentView === 'login' || currentView === 'dashboard'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : authUser
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {authUser ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Dashboard</span>
                  {inboxUnreadCount > 0 && (
                    <span className="px-1.5 py-0.5 min-w-[16px] text-center rounded-full bg-red-600 text-white text-[9.5px] font-black leading-none">
                      {inboxUnreadCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>Login / Sign Up</span>
                </>
              )}
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
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
            className="md:hidden mt-2 p-3 bg-white border border-black/[0.08] rounded-2xl shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-150 text-slate-800"
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
              onClick={() => navigateTo(authUser ? 'dashboard' : 'login')}
              className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs font-semibold flex items-center justify-between cursor-pointer ${
                currentView === 'login' || currentView === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{authUser ? 'My Dashboard' : 'Login / Sign Up'}</span>
                {authUser && inboxUnreadCount > 0 && (
                  <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none">
                    {inboxUnreadCount}
                  </span>
                )}
              </span>
              {authUser ? (
                <UserCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <LogIn className="w-4 h-4 text-emerald-600" />
              )}
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
      <main className={isFullScreenInbox ? 'w-full h-[100dvh] flex flex-col overflow-hidden' : 'w-full flex-1 flex flex-col items-center'}>
        {currentView === 'committee' ? (
          <ExecutiveCommitteePage 
            onBackToRegistration={() => navigateTo('home')} 
          />
      ) : currentView === 'notices' ? (
        <NoticesPage
          onBack={() => navigateTo('home')}
          onOpenNotice={(notice) => openNoticeDetailPage(notice, 'notices')}
          onOpenAdmin={() => navigateTo('admin')}
        />
      ) : currentView === 'notice_detail' ? (
        <NoticeDetailPage
          notice={liveNotices.find((n) => n.id === selectedNoticeId) || null}
          loading={liveNotices.length === 0}
          backLabel={
            noticeReturnView === 'dashboard'
              ? 'Back to Dashboard'
              : noticeReturnView === 'home'
              ? 'Back to Home'
              : 'Back to Notices'
          }
          onBack={() => navigateTo(noticeReturnView)}
          onViewAllNotices={() => navigateTo('notices')}
          onNoticeViewed={(id) => {
            if (authUser?.uid) markNoticeAsReadForUser(authUser.uid, id);
          }}
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
          onOpenSlipPage={() => navigateTo('slip')}
        />
      ) : currentView === 'login' ? (
        !authInitialized ? (
          <div className="w-full max-w-md pt-32 pb-16 text-center">
            <DotLoader size="md" color="emerald" />
          </div>
        ) : authUser ? (
          <MemberDashboard
            user={authUser}
            registrationSetting={registrationSetting}
            onBackToHome={() => navigateTo('home')}
            onGoToRegistration={() => navigateTo('form')}
            onSignedOut={() => navigateTo('login')}
            onOpenNotice={(notice) => openNoticeDetailPage(notice, 'dashboard')}
            requestedPage={requestedDashboardPage}
            onActivePageChange={setActiveDashboardPage}
          />
        ) : (
          <MemberAuthPage
            onBackToHome={() => navigateTo('home')}
            onGoToRegister={() => navigateTo('form')}
            onLoginSuccess={() => navigateTo('dashboard')}
          />
        )
      ) : currentView === 'dashboard' ? (
        !authInitialized ? (
          <div className="w-full max-w-md pt-32 pb-16 text-center">
            <DotLoader size="md" color="emerald" />
          </div>
        ) : authUser ? (
          <MemberDashboard
            user={authUser}
            registrationSetting={registrationSetting}
            onBackToHome={() => navigateTo('home')}
            onGoToRegistration={() => navigateTo('form')}
            onSignedOut={() => navigateTo('login')}
            onOpenNotice={(notice) => openNoticeDetailPage(notice, 'dashboard')}
            requestedPage={requestedDashboardPage}
            onActivePageChange={setActiveDashboardPage}
          />
        ) : (
          <MemberAuthPage
            onBackToHome={() => navigateTo('home')}
            onGoToRegister={() => navigateTo('form')}
            onLoginSuccess={() => navigateTo('dashboard')}
          />
        )
      ) : currentView === 'home' ? (
        <HomePage 
          onGoToForm={() => navigateTo('form')} 
          onGoToNotices={() => navigateTo('notices')} 
          onGoToCommittee={() => navigateTo('committee')} 
          onGoToStatus={() => navigateTo('status')}
          registrationSetting={registrationSetting}
          latestNotice={liveNotices.length > 0 ? liveNotices[0] : undefined}
          onOpenNotice={(notice) => openNoticeDetailPage(notice, 'home')}
          activeMemberCount={activeMemberCount}
        />
      ) : (
        /* Registration Form Container */
        <div className="w-full max-w-3xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-12 formal-page-enter">
          {/* Top Navigation Bar */}
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Back to Home</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('status')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>Check Status</span>
            </button>
          </div>
        
          {/* Formal Header */}
          <div className="text-center mb-7 space-y-2">
            <div className="flex justify-center">
              <img 
                src="/assets/club-logo.png" 
                alt="NGDC Science Club Logo" 
                decoding="async"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Membership Registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              NGDC Science Club • New Government Degree College, Rajshahi (HSC 27 &amp; HSC 28)
            </p>
          </div>

        {/* SUBMISSION SUCCESS VIEW */}
        {submittedData ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200">
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
                onClick={() => navigateTo('dashboard')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open My Dashboard</span>
              </button>
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
          /* FORMAL REGISTRATION NOTICE (CLOSED / COMING SOON) */
          <div className={`bg-white rounded-2xl border shadow-sm p-6 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200 space-y-6 ${
            registrationSetting.status === 'closed'
              ? 'border-rose-200'
              : 'border-amber-200'
          }`}>
            {/* Club Identity Header */}
            <div className="flex flex-col items-center justify-center gap-2">
              <img 
                src="/assets/club-logo.png" 
                alt="NGDC Science Club Logo" 
                decoding="async"
                className="h-16 sm:h-20 w-auto object-contain"
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
          /* REGISTRATION FORM - CLEAN SINGLE-SURFACE FORMAL LAYOUT */
          <form 
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 text-left"
            id="ngdc-science-club-form"
          >
            {/* Compact Status / Sign-in Line */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-slate-100 text-xs">
              {authUser ? (
                <>
                  <span className="text-slate-600">
                    Signed in as <strong className="text-slate-900">{authUser.email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateTo('dashboard')}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <span>Open My Dashboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-slate-500">Already registered with the club?</span>
                  <button
                    type="button"
                    onClick={() => navigateTo('login')}
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-emerald-700 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Member Sign In</span>
                  </button>
                </>
              )}
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION 1: PERSONAL INFORMATION & PHOTOGRAPH */}
            <div className="space-y-5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Personal Information
              </h2>

              {/* Passport Photo Upload */}
              <div id="photo-upload-section" className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Passport Size Photo <span className="text-rose-500">*</span>
                  </label>
                  {formData.photo && (
                    <button
                      type="button"
                      onClick={() => setAdjustingPhoto(formData.photo)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Crop / Adjust</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-24 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all overflow-hidden bg-slate-50 shrink-0 ${
                      dragActive 
                        ? 'border-emerald-500 bg-emerald-50/40' 
                        : formData.photo 
                          ? 'border-emerald-500' 
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
                        <div className="absolute inset-0 bg-slate-900/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Camera className="w-4 h-4 mb-0.5" />
                          <span className="text-[10px] font-medium">Change</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                          className="absolute top-1 right-1 p-1 bg-white/95 text-slate-600 hover:text-rose-600 rounded-full shadow-xs"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 flex flex-col items-center">
                        <Camera className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-700">Upload</span>
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

                  <div className="text-xs text-slate-500 space-y-1.5">
                    <p className="text-slate-700 font-medium">Front-facing student photograph</p>
                    <p>JPG, PNG or WebP up to 8MB.</p>
                    {formData.photo && (
                      <div className="flex items-center gap-3 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setAdjustingPhoto(formData.photo)}
                          className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Crop &amp; Center
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                        >
                          Replace
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="student-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="student-name"
                    required
                    placeholder="Full name as registered in college"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: CONTACT & ACCOUNT CREDENTIALS */}
            <div className="pt-7 border-t border-slate-100 space-y-5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Contact &amp; Account Login
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number */}
                <div>
                  <label htmlFor="student-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all font-mono font-medium"
                    />
                  </div>
                </div>

                {/* WhatsApp Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="student-whatsapp" className="text-xs font-semibold text-slate-700">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <label htmlFor="same-phone-tick" className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 select-none">
                      <input
                        type="checkbox"
                        id="same-phone-tick"
                        checked={formData.sameAsPhone}
                        onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                      />
                      <span>Same as phone</span>
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
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-mono font-medium ${
                        formData.sameAsPhone
                          ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-white hover:border-slate-300 border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="student-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              {/* Account Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="student-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      id="student-password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="student-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      id="student-confirm-password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: ACADEMIC DETAILS */}
            <div className="pt-7 border-t border-slate-100 space-y-5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Academic Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="student-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    College Roll / Student ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="student-id"
                      required
                      placeholder="(Full Roll)"
                      value={formData.studentId}
                      onChange={(e) => {
                        const nextRoll = e.target.value;
                        const detected = detectGroupFromRoll(nextRoll);
                        setFormData(prev => ({
                          ...prev,
                          studentId: nextRoll,
                          academicGroup: detected || ''
                        }));
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all font-mono font-medium"
                    />
                  </div>
                  {detectGroupFromRoll(formData.studentId) && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500">Auto-detected Group:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                          GROUP_BADGE_STYLES[detectGroupFromRoll(formData.studentId)!]
                        }`}
                      >
                        {detectGroupFromRoll(formData.studentId)}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="student-dob" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date of Birth <span className="text-rose-500">*</span>
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  College Section <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2.5" id="section-selector-group">
                  {(['A', 'B', 'C', 'D'] as SectionType[]).map((sec) => {
                    const isSelected = formData.section === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        id={`section-${sec.toLowerCase()}`}
                        onClick={() => setFormData(prev => ({ ...prev, section: sec }))}
                        className={`py-2.5 px-3 rounded-xl border text-center font-semibold text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Section {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HSC Batch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  HSC Batch <span className="text-rose-500">*</span>
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
                        className={`px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="text-sm font-bold block">{batch}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 4: WINGS, SKILLS & EXPERIENCE */}
            <div className="pt-7 border-t border-slate-100 space-y-5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Interests &amp; Skills
              </h2>

              {/* Interested Segments */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Interested Science Wings <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="segments-checkbox-group">
                  {CLUB_SEGMENTS.map((segment) => {
                    const isChecked = formData.interestedSegments.includes(segment);
                    return (
                      <label
                        key={segment}
                        onClick={() => toggleSegment(segment)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none transition-colors ${
                          isChecked 
                            ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs leading-snug">{segment}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Skills &amp; Talents <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" id="skills-checkbox-group">
                  {((registrationSetting.skills && registrationSetting.skills.length > 0) ? registrationSetting.skills : DEFAULT_SKILL_OPTIONS).map((skill) => {
                    const isChecked = (formData.skills || []).includes(skill);
                    return (
                      <label
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer select-none transition-colors ${
                          isChecked 
                            ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs leading-snug">{skill}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Experience */}
              <div>
                <label htmlFor="experience-achievements" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Experience or Achievements <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="experience-achievements"
                  rows={3}
                  required
                  placeholder="List past Olympiads, science projects, skills, or write 'None'"
                  value={formData.experienceAchievements || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, experienceAchievements: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all leading-relaxed resize-y"
                />
              </div>
            </div>

            {/* SECTION 5: CLUB RULES & DECLARATION */}
            <div className="pt-7 border-t border-slate-100 space-y-4" id="rules-regulations-card">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Club Rules &amp; Declaration
              </h2>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
                <li>
                  <strong className="text-slate-800">Attendance:</strong> Missing two consecutive sessions without prior notice may result in membership cancellation.
                </li>
                <li>
                  <strong className="text-slate-800">Participation:</strong> Members actively participate in Science Olympiads, science fairs, and project exhibitions.
                </li>
                <li>
                  <strong className="text-slate-800">Conduct:</strong> Uphold academic integrity, mutual respect, and college discipline at all times.
                </li>
                <li>
                  <strong className="text-slate-800">Commitment:</strong> Complete assigned club tasks and follow guidelines set by the Executive Committee.
                </li>
              </ol>

              <label 
                id="rules-agreement-checkbox"
                onClick={() => setFormData(prev => ({ ...prev, agreedToRules: !prev.agreedToRules }))}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-colors ${
                  formData.agreedToRules
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  formData.agreedToRules ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                }`}>
                  {formData.agreedToRules && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs leading-snug">
                  I agree to abide by all the rules and regulations of NGDC Science Club. <span className="text-rose-500">*</span>
                </span>
              </label>
            </div>

            {/* SUBMIT */}
            <div className="pt-2">
              <button
                type="submit"
                id="submit-form-button"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <DotLoader size="sm" color="white" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <span>Submit Membership Application</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      )}
      </main>

      {/* First-entry browser notification permission prompt */}
      <NotificationPermissionBanner
        suppressWhenToastVisible={Boolean(
          authUser &&
            inboxAlertMeta.unreadCount > 0 &&
            !(
              (currentView === 'dashboard' || currentView === 'login') &&
              activeDashboardPage === 'inbox'
            )
        )}
      />

      {/* Real-time Recipient-Only Inbox Notification Popup */}
      {authUser && (
        <InboxToastNotification
          unreadCount={inboxAlertMeta.unreadCount}
          latestEventKey={inboxAlertMeta.latestEventKey}
          notifTag={inboxAlertMeta.notifTag}
          senderHint={inboxAlertMeta.senderHint}
          isCurrentlyViewingInbox={
            (currentView === 'dashboard' || currentView === 'login') &&
            activeDashboardPage === 'inbox'
          }
          onOpenInbox={() => {
            setRequestedDashboardPage({ page: 'inbox', nonce: Date.now() });
            navigateTo('dashboard');
          }}
        />
      )}

      {/* Global Club Footer on EVERY single page except dedicated full-screen Inbox */}
      {!isFullScreenInbox && <ClubFooter />}
    </div>
  );
}
