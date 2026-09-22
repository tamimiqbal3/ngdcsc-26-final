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
  Download
} from 'lucide-react';
import { MembershipFormData, SubmissionRecord, SectionType, BatchType, ClubNotice } from './types';
import ScienceBackground from './ScienceBackground';
import ExecutiveCommitteePage from './ExecutiveCommitteePage';
import NoticesPage from './NoticesPage';
import AdminPanel from './AdminPanel';
import { saveMemberToFirebase, fetchNoticesFromFirebase } from './services/firebase';

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

type ViewType = 'form' | 'committee' | 'notices' | 'admin';

export default function App() {
  const [formData, setFormData] = useState<MembershipFormData>(INITIAL_FORM);
  const [submittedData, setSubmittedData] = useState<SubmissionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // URL detection for Vercel /admin, /notices, /committee direct links
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/admin') || hash.includes('admin')) return 'admin';
      if (path.includes('/notices') || hash.includes('notices')) return 'notices';
      if (path.includes('/committee') || hash.includes('committee')) return 'committee';
    }
    return 'form';
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [liveNotices, setLiveNotices] = useState<ClubNotice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<ClubNotice | null>(null);

  // Fetch notices from Firebase for the top infinite scrolling marquee
  useEffect(() => {
    fetchNoticesFromFirebase()
      .then((data) => {
        if (data && data.length > 0) {
          setLiveNotices(data);
        }
      })
      .catch((err) => console.warn('Could not fetch notices for marquee:', err));
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
      const targetPath = view === 'form' ? '/' : `/${view}`;
      window.history.pushState(null, '', targetPath);
    } catch {
      // ignore
    }
  };

  // Listen to popstate for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/admin') || hash.includes('admin')) {
        setCurrentView('admin');
      } else if (path.includes('/notices') || hash.includes('notices')) {
        setCurrentView('notices');
      } else if (path.includes('/committee') || hash.includes('committee')) {
        setCurrentView('committee');
      } else {
        setCurrentView('form');
      }
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

  // Image Upload Handling with client-side compression
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg('Image size should be under 12MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawData = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData(prev => ({ ...prev, photo: compressedDataUrl }));
        } else {
          setFormData(prev => ({ ...prev, photo: rawData }));
        }
      };
      img.onerror = () => {
        setFormData(prev => ({ ...prev, photo: rawData }));
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
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

    const newRecord: SubmissionRecord = {
      ...formData,
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
    <div className="relative min-h-screen text-slate-100 pb-12 flex flex-col items-center">
      {/* Science Canvas Animation Background */}
      <ScienceBackground />

      {/* Top Infinite Scrolling Notice Marquee (Dark Glass Science Style) */}
      <div className="w-full bg-slate-950/75 backdrop-blur-xs border-b border-emerald-500/25 text-slate-200 z-40 relative py-2 overflow-hidden flex items-center shadow-xs">
        {/* Left fixed badge */}
        <div className="flex items-center gap-2 pl-3 sm:pl-5 pr-3.5 shrink-0 z-10 bg-slate-950/95 py-0.5 border-r border-emerald-500/30">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Bell className="w-3 h-3 text-emerald-400" />
            <span>NOTICE:</span>
          </span>
        </div>

        {/* Continuous right-to-left scrolling track */}
        <div className="overflow-hidden relative flex-1 flex items-center">
          <div className="animate-marquee-infinite flex items-center text-xs font-bold text-slate-200">
            {/* Set 1 */}
            <div className="flex items-center gap-10 shrink-0 pr-10">
              {liveNotices.length > 0 ? (
                liveNotices.map((n) => (
                  <button
                    key={`n1-${n.id}`}
                    type="button"
                    onClick={() => setSelectedNotice(n)}
                    className="inline-flex items-center gap-2 hover:text-emerald-300 transition-colors cursor-pointer group text-left"
                  >
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {n.category || 'NOTICE'}
                    </span>
                    <span className="font-extrabold text-white group-hover:text-emerald-300 underline-offset-4 group-hover:underline">
                      {n.title}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">({n.date})</span>
                    {n.fileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                        📎 PDF / File
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/40">
                        📝 Notice Text
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <span className="font-bold text-slate-200">
                  📢 Welcome to NGDC Science Club! HSC 27 &amp; HSC 28 Membership Registration is now ongoing • Science Fair, Project &amp; Olympiad notices will be published here.
                </span>
              )}
            </div>

            {/* Set 2 (Exact clone for uninterrupted infinite loop) */}
            <div className="flex items-center gap-10 shrink-0 pr-10">
              {liveNotices.length > 0 ? (
                liveNotices.map((n) => (
                  <button
                    key={`n2-${n.id}`}
                    type="button"
                    onClick={() => setSelectedNotice(n)}
                    className="inline-flex items-center gap-2 hover:text-emerald-300 transition-colors cursor-pointer group text-left"
                  >
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {n.category || 'NOTICE'}
                    </span>
                    <span className="font-extrabold text-white group-hover:text-emerald-300 underline-offset-4 group-hover:underline">
                      {n.title}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">({n.date})</span>
                    {n.fileUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                        📎 PDF / File
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/40">
                        📝 Notice Text
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <span className="font-bold text-slate-200">
                  📢 Welcome to NGDC Science Club! HSC 27 &amp; HSC 28 Membership Registration is now ongoing • Science Fair, Project &amp; Olympiad notices will be published here.
                </span>
              )}
            </div>
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
                <p className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Attached Notice Document</span>
                </p>
                {(selectedNotice.fileType === 'image' || selectedNotice.fileUrl.startsWith('data:image')) && (
                  <div className="rounded-xl overflow-hidden border border-white/15 mb-3 max-h-72 bg-black/40 flex items-center justify-center">
                    <img src={selectedNotice.fileUrl} alt="Notice document" className="w-full h-full object-contain" />
                  </div>
                )}
                <a
                  href={selectedNotice.fileUrl}
                  download={selectedNotice.fileName || 'NGDCSC_Notice'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Attached File ({selectedNotice.fileName || 'File'})</span>
                </a>
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

      {/* Conditional Page Views */}
      {currentView === 'committee' ? (
        <ExecutiveCommitteePage 
          onBackToRegistration={() => navigateTo('form')} 
        />
      ) : currentView === 'notices' ? (
        <NoticesPage
          onBack={() => navigateTo('form')}
          onOpenAdmin={() => navigateTo('admin')}
        />
      ) : (
        /* Form Container */
        <div className="w-full max-w-2xl relative z-10 px-4 sm:px-6 pt-6">
        
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

          {/* Official Social & Community Buttons with Official WhatsApp Logo & "NGDC SC" */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {/* WhatsApp Community with official logo & label NGDC SC */}
            <a 
              href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xs border border-[#25D366]/50 text-white text-xs font-bold shadow-2xs hover:shadow-[0_0_15px_rgba(37,211,102,0.3)] transition-all cursor-pointer"
              title="Official WhatsApp Community"
            >
              <svg className="w-4 h-4 fill-[#25D366] shrink-0" viewBox="0 0 24 24">
                <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
              </svg>
              <span>NGDC SC</span>
            </a>

            <a 
              href="https://facebook.com/ngdcsc" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xs border border-blue-500/40 text-slate-300 hover:text-blue-400 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(37,99,235,0.25)] transition-all"
              title="Official Facebook"
            >
              <Facebook className="w-3.5 h-3.5 text-blue-400" />
              <span>Facebook</span>
            </a>

            <a 
              href="https://instagram.com/ngdcsc_" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xs border border-pink-500/40 text-slate-300 hover:text-pink-400 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(236,72,153,0.25)] transition-all"
              title="Official Instagram"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>Instagram</span>
            </a>
          </div>

          {/* Quick Sub-Navigation Pills: Notice Board & Executive Committee */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => navigateTo('notices')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xs border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-emerald-400"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Notice Board</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('committee')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xs border border-white/20 text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-white/40"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Executive Committee</span>
            </button>
          </div>
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
            <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-6">
              Thank you, <strong className="text-white">{submittedData.name}</strong>. Your membership form has been submitted to NGDC Science Club.
            </p>

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

            <div className="pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
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
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center gap-2.5 text-red-200 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. PHOTO */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Photo <span className="text-emerald-400 font-bold">*</span>
              </label>

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
                      <span className="text-[9px] text-slate-400 font-medium">JPG, PNG</span>
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

                <div className="text-center sm:text-left text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">Student Formal / Passport Photo</p>
                  <p className="text-[11px] text-slate-400">Click the box or drag and drop an image file.</p>
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
            <div className="rounded-2xl p-4 sm:p-5 bg-amber-950/20 border border-amber-500/30 space-y-3.5" id="rules-regulations-card">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/30">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                    Club Rules &amp; Regulations
                  </h4>
                  <p className="text-[10px] text-amber-400 font-semibold">
                    Please read carefully before submitting your membership
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed font-medium pl-1">
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-400 shrink-0">1.</span>
                  <p>
                    <strong className="text-white font-bold">Attendance &amp; Cancellation:</strong> Missing two (2) consecutive club sessions, workshops, or weekly meetings without prior notice or valid written approval will result in automatic cancellation of club membership.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-400 shrink-0">2.</span>
                  <p>
                    <strong className="text-white font-bold">Mandatory Olympiad Participation:</strong> All members must actively prepare for and regularly participate in Science Olympiads (Math, Physics, Bio, Chem, Informatics, Astronomy), science fairs, and project exhibitions.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-400 shrink-0">3.</span>
                  <p>
                    <strong className="text-white font-bold">Discipline &amp; Conduct:</strong> Every member must uphold strict academic integrity, mutual respect, ethical standards, and represent New Government Degree College with dignity.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-400 shrink-0">4.</span>
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
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-2xs ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/50 border-amber-500/30 text-slate-300 hover:bg-slate-900/80'
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

        {/* Clean, well-structured footer */}
        <footer className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
          <p className="text-xs font-bold text-slate-400 tracking-wide uppercase">
            NGDC SCIENCE CLUB &bull; OFFICIAL CONNECT
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* WhatsApp Community with official logo & label NGDC SC */}
            <a 
              href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 backdrop-blur-xs border border-[#25D366]/40 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-bold shadow-2xs hover:shadow-[0_0_12px_rgba(37,211,102,0.25)] transition-all cursor-pointer"
              title="Official WhatsApp Community"
            >
              <svg className="w-3.5 h-3.5 fill-[#25D366] shrink-0" viewBox="0 0 24 24">
                <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
              </svg>
              <span>NGDC SC</span>
            </a>

            <a 
              href="https://facebook.com/ngdcsc" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/60 backdrop-blur-xs border border-blue-500/30 text-slate-300 hover:text-blue-400 hover:border-blue-400 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(37,99,235,0.2)] transition-all"
            >
              <Facebook className="w-3.5 h-3.5 text-blue-400" />
              <span>facebook.com/ngdcsc</span>
            </a>

            <a 
              href="https://instagram.com/ngdcsc_" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/60 backdrop-blur-xs border border-pink-500/30 text-slate-300 hover:text-pink-400 hover:border-pink-400 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(236,72,153,0.2)] transition-all"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>instagram.com/ngdcsc_</span>
            </a>

            <a 
              href="mailto:ngdcsc.org@gmail.com" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/60 backdrop-blur-xs border border-emerald-500/30 text-slate-300 hover:text-emerald-300 hover:border-emerald-400 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(0,229,153,0.2)] transition-all"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>ngdcsc.org@gmail.com</span>
            </a>
          </div>

          <div className="pt-2 flex items-center justify-center text-[11px] text-slate-500">
            <span>&copy; {new Date().getFullYear()} NGDC Science Club. All rights reserved.</span>
          </div>
        </footer>

      </div>
      )}
    </div>
  );
}
