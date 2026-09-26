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
  Scissors
} from 'lucide-react';
import { MembershipFormData, SubmissionRecord, SectionType, BatchType, ClubNotice } from './types';
import ScienceBackground from './ScienceBackground';
import ExecutiveCommitteePage from './ExecutiveCommitteePage';
import NoticesPage from './NoticesPage';
import MemberStatusSearch from './MemberStatusSearch';
import AdminPanel from './AdminPanel';
import NotFoundPage from './NotFoundPage';
import ImageAdjustModal from './components/ImageAdjustModal';
import { saveMemberToFirebase, fetchNoticesFromFirebase, getNextMembershipId, generateNextMembershipId } from './services/firebase';

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

function ClubFooter() {
  return (
    <footer className="mt-auto pt-6 pb-2 text-center w-full flex flex-col items-center gap-3">
      {/* Sleek, compact social icons */}
      <div className="flex items-center justify-center gap-2.5">
        <a 
          href="https://chat.whatsapp.com/EKt85N1Te5CLY3Rby76Z0A" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-[#25D366]/20 border border-white/15 hover:border-[#25D366]/50 text-slate-300 hover:text-[#25D366] flex items-center justify-center transition-all shadow-xs"
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
          className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-blue-500/20 border border-white/15 hover:border-blue-400/50 text-slate-300 hover:text-blue-400 flex items-center justify-center transition-all shadow-xs"
          title="Official Facebook Page"
        >
          <Facebook className="w-3.5 h-3.5" />
        </a>

        <a 
          href="https://instagram.com/ngdcsc_" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-pink-500/20 border border-white/15 hover:border-pink-400/50 text-slate-300 hover:text-pink-400 flex items-center justify-center transition-all shadow-xs"
          title="Official Instagram"
        >
          <Instagram className="w-3.5 h-3.5" />
        </a>

        <a 
          href="mailto:ngdcsc.org@gmail.com" 
          className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-400/50 text-slate-300 hover:text-emerald-400 flex items-center justify-center transition-all shadow-xs"
          title="Official Email"
        >
          <Mail className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Prominent Glossy Glass Badge: Developed by: Tamim Iqbal */}
      <div className="flex items-center justify-center pt-0.5">
        <a
          href="https://portfolio.tamimiq.shop"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/85 via-slate-900/95 to-teal-950/85 border border-emerald-400/60 hover:border-emerald-300 shadow-[0_0_20px_rgba(0,229,153,0.3),inset_0_1px_1px_rgba(255,255,255,0.45)] hover:shadow-[0_0_30px_rgba(0,229,153,0.6),inset_0_1px_2px_rgba(255,255,255,0.8)] backdrop-blur-2xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-0.5"
          title="Visit Portfolio of Developer Tamim Iqbal"
        >
          {/* Continuous subtle glossy light sheen + hover swipe */}
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
          
          <span className="text-slate-300 font-medium text-[11px] tracking-wide">
            Developed by:
          </span>
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-white to-teal-200 drop-shadow-[0_1px_8px_rgba(0,229,153,0.6)] underline decoration-emerald-400 underline-offset-2 group-hover:decoration-white transition-colors text-xs">
            Tamim Iqbal
          </span>
          <ExternalLink className="w-3 h-3 text-emerald-400 group-hover:text-white group-hover:rotate-12 transition-all shrink-0" />
        </a>
      </div>
    </footer>
  );
}

function HomePage({ 
  onGoToForm,
  onGoToNotices,
  onGoToCommittee,
  onGoToStatus
}: { 
  onGoToForm: () => void;
  onGoToNotices: () => void;
  onGoToCommittee: () => void;
  onGoToStatus: () => void;
}) {
  return (
    <div className="w-full max-w-2xl relative z-10 px-4 sm:px-6 pt-4 pb-2 formal-page-enter flex-1 flex flex-col items-center justify-between">
      <div className="w-full flex flex-col items-center space-y-4">
        {/* Club Logo & Official Title */}
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <img 
              src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png" 
              alt="NGDC Science Club Logo" 
              className="h-20 sm:h-24 w-auto object-contain hover:scale-105 transition-transform drop-shadow-[0_0_20px_rgba(0,229,153,0.3)]"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            NGDC SCIENCE CLUB
          </h1>
          <p className="text-xs sm:text-sm font-bold text-emerald-400 tracking-wide uppercase mt-0.5">
            New Government Degree College, Rajshahi
          </p>
        </div>

        {/* Featured Event Section: 1st Inter-College Science Fest */}
        <div className="w-full bg-slate-950/70 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-[0_0_35px_rgba(0,229,153,0.15)] space-y-3.5">
          <div className="flex items-center justify-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-wider">
              <Trophy className="w-3 h-3 text-emerald-400" />
              <span>Featured Science Fest</span>
            </span>
          </div>

          {/* Event Banner Image */}
          <div className="w-full rounded-2xl overflow-hidden border border-emerald-500/25 bg-slate-900 shadow-md group">
            <img 
              src="https://plain-apac-prod-public.komododecks.com/202609/24/YmHrAHI7CXKAZBKyvjDY/image.jpg" 
              alt="NGDC Science Club 1st Inter-College Science Fest Event" 
              className="w-full h-auto object-cover rounded-2xl group-hover:scale-[1.01] transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              The 1st New Govt. Degree College Science Fest
            </h2>
          </div>

          {/* See More Button for Event */}
          <div>
            <a
              href="https://facebook.com/events/s/the-1st-new-govt-degree-colleg/1068668486164256/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-[0_0_18px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 border border-blue-400/30"
            >
              <span>See More</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Standalone Dedicated Membership Registration Card */}
        <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/50 via-slate-950/90 to-teal-950/50 border border-emerald-500/40 shadow-[0_0_30px_rgba(0,229,153,0.18)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Membership Registration</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Join the official NGDC Science Club community for HSC Batches
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToForm}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_22px_rgba(0,229,153,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 shrink-0"
          >
            <span>Registration Form</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dedicated Member Application Status Search Card */}
        <div className="w-full p-4 sm:p-4.5 rounded-3xl bg-slate-950/70 border border-emerald-500/30 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3.5 group hover:border-emerald-400/50 transition-all">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center justify-center sm:justify-start gap-2">
                <span>Check Application Status</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Status</span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Enter your phone number to check if your membership is Pending, Approved, or Rejected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToStatus}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Check Status</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fast Navigation Cards: Notice Board & Executive Committee */}
        <div className="w-full grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onGoToNotices}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/25 hover:border-emerald-400/60 text-left transition-all group backdrop-blur-md cursor-pointer hover:bg-slate-900/80 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
              <span>Notice Board</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Official circulars, schedules &amp; announcements
            </p>
          </button>

          <button
            type="button"
            onClick={onGoToCommittee}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/15 hover:border-white/40 text-left transition-all group backdrop-blur-md cursor-pointer hover:bg-slate-900/80 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-blue-300 transition-colors flex items-center justify-between">
              <span>Executive Panel</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Club executives, coordinators &amp; advisors
            </p>
          </button>
        </div>

        {/* Club Segments Overview (without emojis) */}
        <div className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-3">
          <div className="flex items-center gap-2">
            <Atom className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              Club Specialization Segments
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
              <span className="font-bold text-white block text-[11px]">Science Olympiad</span>
              <span className="text-[10px] text-slate-400">Math, Physics, Bio &amp; Chem</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
              <span className="font-bold text-white block text-[11px]">Science Projects</span>
              <span className="text-[10px] text-slate-400">Inventions &amp; models</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
              <span className="font-bold text-white block text-[11px]">Robotics &amp; Tech</span>
              <span className="text-[10px] text-slate-400">Coding, sensors &amp; AI</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
              <span className="font-bold text-white block text-[11px]">Astronomy &amp; Space</span>
              <span className="text-[10px] text-slate-400">Stargazing &amp; astrophysics</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
              <span className="font-bold text-white block text-[11px]">Science Quiz</span>
              <span className="text-[10px] text-slate-400">Buzzer &amp; speed rounds</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
              <span className="font-bold text-white block text-[11px]">Wall Magazine</span>
              <span className="text-[10px] text-slate-400">Articles &amp; editorials</span>
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

  // Fetch notices from Firebase for the top notice banner
  useEffect(() => {
    fetchNoticesFromFirebase()
      .then((data) => {
        if (data && data.length > 0) {
          // Sort to guarantee latest notice first
          const sorted = [...data].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
          });
          setLiveNotices(sorted);
        }
      })
      .catch((err) => console.warn('Could not fetch notices for banner:', err));
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

  // Image Upload Handling with client-side compression & Adjuster
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('ছবি সর্বোচ্চ ৮ মেগাবাইট (8MB) পর্যন্ত আপলোড করা যাবে। (Image size cannot exceed 8MB)');
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
      setErrorMsg('ছবি আপলোড করা বাধ্যতামূলক! অনুগ্রহ করে পাসপোর্ট সাইজ ছবি আপলোড করুন। (Student photo is strictly required!)');
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
    if (!formData.agreedToRules) {
      setErrorMsg('You must agree to the club rules and regulations before submitting.');
      return;
    }

    setIsSubmitting(true);

    let nextMid = '';
    try {
      nextMid = await generateNextMembershipId();
    } catch {
      nextMid = getNextMembershipId(submissions);
    }

    const newRecord: SubmissionRecord = {
      ...formData,
      membershipId: nextMid,
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
    <div className="relative min-h-screen text-slate-100 flex flex-col items-center justify-between">
      {/* Science Canvas Animation Background */}
      <ScienceBackground />

      {/* Top Notice Bar - Smooth Horizontal Scrolling Marquee of ONLY the Latest Notice Title */}
      <div className="w-full bg-slate-950/90 backdrop-blur-md border-b border-emerald-500/25 text-slate-200 z-40 relative py-2 px-3 sm:px-6 flex items-center shadow-xs overflow-hidden">
        {/* Pinned Left Badge: LATEST NOTICE: */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[10px] sm:text-xs font-black shrink-0 z-10 shadow-xs mr-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Bell className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="tracking-wider">LATEST NOTICE:</span>
        </div>

        {/* Marquee Scrolling Ticker: ONLY the title of the latest notice */}
        <div className="overflow-hidden flex-1 relative select-none">
          <div 
            onClick={() => liveNotices.length > 0 && setSelectedNotice(liveNotices[0])}
            className="animate-marquee-infinite cursor-pointer py-0.5 items-center text-xs sm:text-sm font-extrabold text-white hover:text-emerald-300 transition-colors"
            title="Click to read notice"
          >
            <span className="pr-16 inline-flex items-center">
              {liveNotices.length > 0 ? liveNotices[0].title : 'Welcome to NGDC Science Club! HSC 27 & HSC 28 Membership Registration is now ongoing.'}
            </span>
            <span className="pr-16 inline-flex items-center">
              {liveNotices.length > 0 ? liveNotices[0].title : 'Welcome to NGDC Science Club! HSC 27 & HSC 28 Membership Registration is now ongoing.'}
            </span>
            <span className="pr-16 inline-flex items-center">
              {liveNotices.length > 0 ? liveNotices[0].title : 'Welcome to NGDC Science Club! HSC 27 & HSC 28 Membership Registration is now ongoing.'}
            </span>
            <span className="pr-16 inline-flex items-center">
              {liveNotices.length > 0 ? liveNotices[0].title : 'Welcome to NGDC Science Club! HSC 27 & HSC 28 Membership Registration is now ongoing.'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating 3-Dot Menu Button */}
      <div className="fixed top-14 right-4 z-50" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          id="hamburger-menu-btn"
          title="Menu"
          aria-label="Navigation Menu"
          className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/20 shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center justify-center focus:outline-hidden"
        >
          {menuOpen ? <X className="w-5 h-5 text-slate-200" /> : <MoreVertical className="w-5 h-5 text-slate-200" />}
        </button>

        {/* Dropdown Menu - Includes Notice Section & Executive Committee */}
        {menuOpen && (
          <div 
            id="floating-dropdown-menu"
            className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1"
          >
            {/* Home button */}
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                currentView === 'home' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('form')}
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                currentView === 'form' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Registration Form</span>
            </button>

            {/* Check Member Status in Menu */}
            <button
              type="button"
              onClick={() => navigateTo('status')}
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                currentView === 'status' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Check Member Status</span>
            </button>

            {/* Notice Section in 3-Dot Menu */}
            <button
              type="button"
              onClick={() => navigateTo('notices')}
              id="menu-notices-btn"
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                currentView === 'notices' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>Notices</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('committee')}
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                currentView === 'committee' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Executive Committee</span>
            </button>
          </div>
        )}
      </div>

      {/* Selected Notice Modal (When clicking scrolling marquee notice) */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl max-w-lg w-full p-6 text-slate-100 relative">
            <button 
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {selectedNotice.category || 'Official Notice'}
              </span>
              <span className="text-xs font-mono text-slate-400">{selectedNotice.date}</span>
            </div>

            <h3 className="text-lg font-black text-white mb-3">{selectedNotice.title}</h3>

            {selectedNotice.content && (
              <p className="text-xs text-slate-300 mb-4 whitespace-pre-line leading-relaxed">{selectedNotice.content}</p>
            )}

            {selectedNotice.fileUrl && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/30 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Attached Notice Document</span>
                  </p>
                  <a
                    href={selectedNotice.fileUrl}
                    download={selectedNotice.fileName || 'NGDCSC_Notice'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
                {(selectedNotice.fileType === 'image' || selectedNotice.fileUrl.startsWith('data:image')) && (
                  <div className="rounded-xl overflow-hidden border border-white/15 mb-3 max-h-[65vh] bg-black/60 flex items-center justify-center p-1.5">
                    <img src={selectedNotice.fileUrl} alt="Notice document" className="w-full h-auto max-h-[65vh] object-contain rounded-lg" />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
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
        />
      ) : (
        /* Form Container with formal entrance animation */
        <div className="w-full max-w-2xl relative z-10 px-4 sm:px-6 pt-6 formal-page-enter">
          {/* Back to Home Navigation & Check Status */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-white/15 shadow-xs transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Home</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('status')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 shadow-xs transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span>Check Status</span>
            </button>
          </div>
        
        {/* Simple Clean Header: Official Club Logo with No Background */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-3">
            <img 
              src="https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png" 
              alt="NGDC Science Club Logo" 
              className="h-24 sm:h-28 w-auto object-contain hover:scale-105 transition-transform drop-shadow-[0_0_20px_rgba(0,229,153,0.25)]"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            NGDC SCIENCE CLUB
          </h1>
          <p className="text-sm sm:text-base font-bold text-emerald-400 tracking-wide uppercase mt-1">
            Membership Registration
          </p>
        </div>

        {/* SUBMISSION SUCCESS VIEW */}
        {submittedData ? (
          <div className="bg-slate-950/50 backdrop-blur-[2px] rounded-3xl border border-white/20 shadow-2xl p-7 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(0,229,153,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              Membership Submission Received!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-4">
              Thank you, <strong className="text-white">{submittedData.name}</strong>. Your membership form has been submitted to NGDC Science Club.
            </p>

            {/* Serial Membership ID Banner */}
            {submittedData.membershipId && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Your Serial Membership ID
                    </span>
                    <span className="text-xl font-black text-white font-mono tracking-widest">
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
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </button>
              </div>
            )}

            {/* Clean summary of submitted details */}
            <div className="bg-slate-900/60 rounded-2xl border border-white/15 p-5 text-left mb-6 space-y-3.5">
              <div className="flex items-center gap-4 pb-3.5 border-b border-white/15">
                <div className="w-14 h-16 rounded-xl bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                  {submittedData.photo ? (
                    <img src={submittedData.photo} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">{submittedData.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-white/20 text-slate-200">
                      {submittedData.batch}
                    </span>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                      Section {submittedData.section}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Student ID</span>
                  <span className="font-bold text-white font-mono">{submittedData.studentId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Date of Birth</span>
                  <span className="font-medium text-white">{submittedData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Phone</span>
                  <span className="font-bold text-white font-mono">{submittedData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">WhatsApp</span>
                  <span className="font-bold text-emerald-400 font-mono">{submittedData.whatsapp}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Mail</span>
                  <span className="font-medium text-white">{submittedData.email}</span>
                </div>
                {submittedData.interestedSegments.length > 0 && (
                  <div className="col-span-2 pt-2 border-t border-white/15">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Interested Segments
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {submittedData.interestedSegments.map(seg => (
                        <span key={seg} className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/15 text-[11px] font-semibold text-slate-200">
                          {seg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Official WhatsApp Group Join - Clean & Minimal */}
            <div className="my-5 p-4 rounded-2xl bg-[#25D366]/5 border border-[#25D366]/20 text-center">
              <p className="text-xs text-slate-300 font-medium mb-3 leading-relaxed">
                ক্লাবের অফিসিয়াল নোটিশ, ইভেন্ট আপডেট ও ক্লাবের কার্যক্রমের সাথে যুক্ত থাকতে আমাদের অফিসিয়াল হোয়াটসঅ্যাপ গ্রুপে যুক্ত হোন।
              </p>
              <a
                href="https://chat.whatsapp.com/EKt85N1Te5CLY3Rby76Z0A"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold transition-all shadow-md hover:shadow-[0_0_20px_rgba(37,211,102,0.35)] cursor-pointer"
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Check Application Status</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Submit Another Response</span>
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM (Clean translucent glass to reveal vibrant science background) */
          <form 
            onSubmit={handleSubmit}
            className="bg-slate-950/40 hover:bg-slate-950/50 backdrop-blur-[2px] rounded-3xl border border-white/15 shadow-[0_12px_45px_rgba(0,0,0,0.5)] p-6 sm:p-9 space-y-6 transition-all"
            id="ngdc-science-club-form"
          >
            {/* Quick link to check status if already registered */}
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300 text-[11px] sm:text-xs">
                Already submitted an application? Check your status anytime.
              </span>
              <button
                type="button"
                onClick={() => navigateTo('status')}
                className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Search className="w-3 h-3" />
                <span>Check Status</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center gap-2.5 text-red-200 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. PHOTO (STRICTLY REQUIRED WITH ADJUST / CROP OPTION) */}
            <div id="photo-upload-section" className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Passport Size Photo <span className="text-rose-400 font-black text-sm">*</span>
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    ছবি আপলোড বাধ্যতামূলক (Strictly Required)
                  </span>
                </label>
                {formData.photo && (
                  <button
                    type="button"
                    onClick={() => setAdjustingPhoto(formData.photo)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Adjust Photo (ক্রপ / এডজাস্ট)</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-28 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all overflow-hidden bg-slate-900/50 shrink-0 ${
                    dragActive 
                      ? 'border-[#00E599] bg-emerald-500/20 shadow-[0_0_15px_rgba(0,229,153,0.3)]' 
                      : formData.photo 
                        ? 'border-emerald-400 shadow-2xs' 
                        : 'border-white/25 hover:border-emerald-400 hover:bg-slate-900/70'
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
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera className="w-5 h-5 mb-0.5 text-emerald-400" />
                        <span className="text-[10px] font-semibold">Change</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                        className="absolute top-1.5 right-1.5 p-1 bg-slate-900/90 text-slate-300 hover:text-red-400 rounded-full shadow-xs transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 flex flex-col items-center">
                      <Camera className="w-6 h-6 text-emerald-400 mb-1" />
                      <span className="text-[11px] font-bold text-slate-200">Upload</span>
                      <span className="text-[9px] text-slate-400 font-medium">JPG, PNG (Max 8MB)</span>
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

                <div className="text-center sm:text-left text-xs text-slate-300 space-y-1.5">
                  <p className="font-bold text-white flex items-center justify-center sm:justify-start gap-1">
                    <span>Student Formal / Passport Photo</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Click the box or drag and drop an image file (Max 8MB). You can adjust zoom, rotate, and center face after selecting.
                  </p>
                  {formData.photo ? (
                    <div className="flex items-center gap-2 pt-1 flex-wrap justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => setAdjustingPhoto(formData.photo)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 cursor-pointer"
                      >
                        <Scissors className="w-3 h-3 text-emerald-400" />
                        <span>Adjust / Crop (ছবি এডজাস্ট)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[11px] font-medium cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-300 font-semibold">
                      ⚠️ ফরম সাবমিট করার পূর্বে ছবি আপলোড করা আবশ্যক।
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. NAME */}
            <div>
              <label htmlFor="student-name" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Name <span className="text-emerald-400 font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="student-name"
                  required
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/60 hover:bg-slate-900/80 focus:bg-slate-900/95 text-white placeholder:text-slate-500 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* 3. PHONE NUMBER & 4. WHATSAPP NUMBER (WITH SAME AS PHONE NUMBER TICK MARK) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div>
                <label htmlFor="student-phone" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-emerald-400 font-bold">*</span>
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/60 hover:bg-slate-900/80 focus:bg-slate-900/95 text-white placeholder:text-slate-500 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all font-mono font-medium"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="student-whatsapp" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    WhatsApp Number <span className="text-emerald-400 font-bold">*</span>
                  </label>
                  {/* Same as phone number tick mark */}
                  <label 
                    htmlFor="same-phone-tick" 
                    className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-emerald-300 select-none bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/40 hover:bg-emerald-500/25 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id="same-phone-tick"
                      checked={formData.sameAsPhone}
                      onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold">Same as phone number</span>
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
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
                        ? 'bg-slate-900/30 border-white/10 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-900/60 hover:bg-slate-900/80 focus:bg-slate-900/95 border-white/15 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 5. MAIL */}
            <div>
              <label htmlFor="student-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Mail <span className="text-emerald-400 font-bold">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/60 hover:bg-slate-900/80 focus:bg-slate-900/95 text-white placeholder:text-slate-500 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* 6. STUDENT ID */}
            <div>
              <label htmlFor="student-id" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Student ID <span className="text-emerald-400 font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="student-id"
                  required
                  placeholder="Enter college student ID / Roll"
                  value={formData.studentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/60 hover:bg-slate-900/80 focus:bg-slate-900/95 text-white placeholder:text-slate-500 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all font-mono font-medium"
                />
              </div>
            </div>

            {/* 7. SECTION (A, B, C, D) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Section (a,b,c,d) <span className="text-emerald-400 font-bold">*</span>
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
                      className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(0,229,153,0.25)] ring-2 ring-emerald-400/30 font-black'
                          : 'bg-slate-900/50 border-white/15 text-slate-300 hover:bg-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      Section {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8. DATE OF BIRTH */}
            <div>
              <label htmlFor="student-dob" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Date of Birth <span className="text-emerald-400 font-bold">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/60 hover:bg-slate-900/80 focus:bg-slate-900/95 text-white text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* 9. HSC 27, 28 BATCHES */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                HSC Batches <span className="text-emerald-400 font-bold">*</span>
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
                      className={`py-3 px-4 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(0,229,153,0.25)] ring-2 ring-emerald-400/30 font-black'
                          : 'bg-slate-900/50 border-white/15 text-slate-300 hover:bg-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <span className="text-sm font-extrabold">{batch}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10. INTERESTED SEGMENTS CHECKBOXES (MANDATORY) */}
            <div>
              <div className="mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Interested Segments <span className="text-emerald-400 font-bold">*</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Select at least one segment you are interested in (Mandatory):
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="segments-checkbox-group">
                {CLUB_SEGMENTS.map((segment) => {
                  const isChecked = formData.interestedSegments.includes(segment);
                  return (
                    <label
                      key={segment}
                      onClick={() => toggleSegment(segment)}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        isChecked 
                          ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400/40 text-emerald-200 shadow-[0_0_10px_rgba(0,229,153,0.15)] font-semibold' 
                          : 'bg-slate-900/50 border-white/15 text-slate-300 hover:bg-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? 'bg-[#00E599] border-[#00E599] text-slate-950' : 'bg-slate-900 border-slate-600'
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

            {/* 11. RULES & REGULATIONS */}
            <div className="rounded-2xl p-4 sm:p-5 bg-slate-950/60 border border-emerald-500/30 backdrop-blur-xl space-y-3.5 shadow-[0_0_30px_rgba(0,229,153,0.06)]" id="rules-regulations-card">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/30 shadow-[0_0_15px_rgba(0,229,153,0.15)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                    Club Rules &amp; Regulations
                  </h4>
                  <p className="text-[10px] text-emerald-400 font-semibold">
                    Please read carefully before submitting your membership
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed font-medium pl-1">
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-400 shrink-0">1.</span>
                  <p>
                    <strong className="text-white font-bold">Attendance &amp; Cancellation:</strong> Missing two (2) consecutive club sessions, workshops, or weekly meetings without prior notice or valid written approval will result in automatic cancellation of club membership.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-400 shrink-0">2.</span>
                  <p>
                    <strong className="text-white font-bold">Mandatory Olympiad Participation:</strong> All members must actively prepare for and regularly participate in Science Olympiads (Math, Physics, Bio, Chem, Informatics, Astronomy), science fairs, and project exhibitions.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-400 shrink-0">3.</span>
                  <p>
                    <strong className="text-white font-bold">Discipline &amp; Conduct:</strong> Every member must uphold strict academic integrity, mutual respect, ethical standards, and represent New Government Degree College with dignity.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-emerald-400 shrink-0">4.</span>
                  <p>
                    <strong className="text-white font-bold">Active Dedication:</strong> Members must complete assigned scientific tasks, collaborate respectfully in group activities, and adhere to guidelines set by the Executive Committee.
                  </p>
                </div>
              </div>

              {/* Mandatory Agreement Checkbox */}
              <label 
                id="rules-agreement-checkbox"
                onClick={() => setFormData(prev => ({ ...prev, agreedToRules: !prev.agreedToRules }))}
                className={`mt-2 flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  formData.agreedToRules
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-2xs ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/70 border-white/10 text-slate-300 hover:bg-slate-900/90 hover:border-emerald-500/30'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  formData.agreedToRules ? 'bg-[#00E599] border-[#00E599] text-slate-950' : 'bg-slate-900 border-slate-600'
                }`}>
                  {formData.agreedToRules && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-bold leading-snug">
                  I have read, understood, and agree to strictly abide by all the Rules &amp; Regulations of NGDC Science Club. <span className="text-emerald-400 font-bold">*</span>
                </span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                id="submit-form-button"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(0,229,153,0.3)] hover:shadow-[0_0_25px_rgba(0,229,153,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Submit Membership</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      )}
      </main>

      {/* Global Club Footer on EVERY single page */}
      <ClubFooter />
    </div>
  );
}
