import React, { useState, useRef } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { MembershipFormData, SubmissionRecord, SectionType, BatchType } from './types';
import ScienceBackground from './ScienceBackground';
import ExecutiveCommitteePage from './ExecutiveCommitteePage';
import { getAccessToken } from './services/firebaseAuth';
import { submitToTargetSheet, TARGET_SPREADSHEET_ID, TARGET_SPREADSHEET_URL } from './services/googleSheets';

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

export default function App() {
  const [formData, setFormData] = useState<MembershipFormData>(INITIAL_FORM);
  const [submittedData, setSubmittedData] = useState<SubmissionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentView, setCurrentView] = useState<'form' | 'committee'>('form');
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Close 3-dot menu on outside click
  React.useEffect(() => {
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

  // Image Upload Handling
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size should be under 5MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({ ...prev, photo: result }));
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

  const handleSubmit = (e: React.FormEvent) => {
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
      submittedAt: new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Dhaka'
      })
    };

    // Save locally
    const updated = [newRecord, ...submissions];
    setSubmissions(updated);
    try {
      localStorage.setItem('ngdc_sc_submissions_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Direct background sync to user's Google Sheet (1JosD8r405qliGPxw9q46MTv76Fvm9Kz9XTGraoE1TT8)
    const token = getAccessToken();
    submitToTargetSheet(newRecord, token).catch(() => {});

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

  return (
    <div className="relative min-h-screen text-slate-900 pb-12 flex flex-col items-center">
      {/* Science Canvas Animation Background */}
      <ScienceBackground />

      {/* Floating 3-Line Menu Button (No full navbar bar) */}
      <div className="fixed top-4 right-4 z-50" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          id="hamburger-menu-btn"
          title="Menu"
          aria-label="Navigation Menu"
          className="w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-[#DBD5CA] shadow-md hover:shadow-lg backdrop-blur-xl transition-all cursor-pointer flex items-center justify-center focus:outline-hidden"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Dropdown with ONLY the 2 requested options */}
        {menuOpen && (
          <div 
            id="floating-dropdown-menu"
            className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-2xl rounded-2xl border border-[#EAE4D9] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1"
          >
            <button
              type="button"
              onClick={() => {
                setCurrentView('form');
                setMenuOpen(false);
              }}
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentView === 'form' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              Registration
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView('committee');
                setMenuOpen(false);
              }}
              className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                currentView === 'committee' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              Executive Committee
            </button>
          </div>
        )}
      </div>

      {/* Conditional Page Views */}
      {currentView === 'committee' ? (
        <ExecutiveCommitteePage 
          onBackToRegistration={() => setCurrentView('form')} 
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
              className="h-24 sm:h-28 w-auto object-contain hover:scale-105 transition-transform drop-shadow-xs"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            NGDC SCIENCE CLUB
          </h1>
          <p className="text-sm sm:text-base font-bold text-emerald-600 tracking-wide uppercase mt-1">
            Membership Registration
          </p>

          {/* Official Social Buttons */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <a 
              href="https://facebook.com/ngdcsc" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E2DDD3] text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(37,99,235,0.18)] transition-all"
              title="Official Facebook"
            >
              <Facebook className="w-3.5 h-3.5 text-blue-600" />
              <span>Facebook</span>
            </a>

            <a 
              href="https://instagram.com/ngdcsc_" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E2DDD3] text-slate-700 hover:text-pink-600 hover:border-pink-300 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(236,72,153,0.18)] transition-all"
              title="Official Instagram"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              <span>Instagram</span>
            </a>
          </div>
        </div>

        {/* SUBMISSION SUCCESS VIEW */}
        {submittedData ? (
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/90 shadow-[0_8px_32px_rgba(37,99,235,0.08)] p-7 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(0,229,153,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Membership Submission Received!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
              Thank you, <strong className="text-slate-800">{submittedData.name}</strong>. Your membership form has been submitted to NGDC Science Club.
            </p>

            {/* Clean summary of submitted details */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[#EAE5DC] p-5 text-left mb-6 space-y-3.5">
              <div className="flex items-center gap-4 pb-3.5 border-b border-[#EAE5DC]">
                <div className="w-14 h-16 rounded-xl bg-white border border-[#E0DBD0] overflow-hidden flex items-center justify-center shrink-0">
                  {submittedData.photo ? (
                    <img src={submittedData.photo} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{submittedData.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#E0DBD0] text-slate-800">
                      {submittedData.batch}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Section {submittedData.section}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Student ID</span>
                  <span className="font-bold text-slate-800 font-mono">{submittedData.studentId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Date of Birth</span>
                  <span className="font-medium text-slate-800">{submittedData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Phone</span>
                  <span className="font-bold text-slate-800 font-mono">{submittedData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">WhatsApp</span>
                  <span className="font-bold text-emerald-700 font-mono">{submittedData.whatsapp}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Mail</span>
                  <span className="font-medium text-slate-800">{submittedData.email}</span>
                </div>
                {submittedData.interestedSegments.length > 0 && (
                  <div className="col-span-2 pt-2 border-t border-[#EAE5DC]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Interested Segments
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {submittedData.interestedSegments.map(seg => (
                        <span key={seg} className="px-2 py-0.5 rounded-md bg-white border border-[#E0DBD0] text-[11px] font-semibold text-slate-700">
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
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#00E599]" />
                <span>Submit Another Response</span>
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM (Glassmorphic translucent to reveal science background) */
          <form 
            onSubmit={handleSubmit}
            className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/90 shadow-[0_8px_32px_rgba(37,99,235,0.08)] p-6 sm:p-9 space-y-6"
            id="ngdc-science-club-form"
          >
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. PHOTO */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Photo <span className="text-emerald-500 font-bold">*</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-28 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all overflow-hidden bg-white/50 backdrop-blur-xs shrink-0 ${
                    dragActive 
                      ? 'border-[#00E599] bg-emerald-50/70 shadow-[0_0_15px_rgba(0,229,153,0.3)]' 
                      : formData.photo 
                        ? 'border-emerald-400 shadow-2xs' 
                        : 'border-[#DBD5CA] hover:border-emerald-400 hover:bg-white/80'
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
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera className="w-5 h-5 mb-0.5 text-emerald-300" />
                        <span className="text-[10px] font-semibold">Change</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                        className="absolute top-1.5 right-1.5 p-1 bg-white/90 text-slate-700 hover:text-red-600 rounded-full shadow-xs transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 flex flex-col items-center">
                      <Camera className="w-6 h-6 text-emerald-500 mb-1" />
                      <span className="text-[11px] font-bold text-slate-700">Upload</span>
                      <span className="text-[9px] text-slate-400">JPG, PNG</span>
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

                <div className="text-center sm:text-left text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Student Formal / Passport Photo</p>
                  <p className="text-[11px] text-slate-400">Click the box or drag and drop an image file.</p>
                </div>
              </div>
            </div>

            {/* 2. NAME */}
            <div>
              <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Name <span className="text-emerald-500 font-bold">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D2C5]/90 bg-white/65 backdrop-blur-xs text-slate-900 text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* 3. PHONE NUMBER & 4. WHATSAPP NUMBER (WITH SAME AS PHONE NUMBER TICK MARK) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div>
                <label htmlFor="student-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-emerald-500 font-bold">*</span>
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D2C5]/90 bg-white/65 backdrop-blur-xs text-slate-900 text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="student-whatsapp" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    WhatsApp Number <span className="text-emerald-500 font-bold">*</span>
                  </label>
                  {/* Same as phone number tick mark */}
                  <label 
                    htmlFor="same-phone-tick" 
                    className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-emerald-800 select-none bg-emerald-50/80 backdrop-blur-xs px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id="same-phone-tick"
                      checked={formData.sameAsPhone}
                      onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold">Same as phone number</span>
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
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-slate-900 text-sm outline-none transition-all font-mono ${
                      formData.sameAsPhone
                        ? 'bg-slate-100/60 backdrop-blur-xs border-[#D8D2C5]/80 text-slate-700 cursor-not-allowed'
                        : 'bg-white/65 backdrop-blur-xs border-[#D8D2C5]/90 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 5. MAIL */}
            <div>
              <label htmlFor="student-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mail <span className="text-emerald-500 font-bold">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D2C5]/90 bg-white/65 backdrop-blur-xs text-slate-900 text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* 6. STUDENT ID */}
            <div>
              <label htmlFor="student-id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Student ID <span className="text-emerald-500 font-bold">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D2C5]/90 bg-white/65 backdrop-blur-xs text-slate-900 text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* 7. SECTION (A, B, C, D) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Section (a,b,c,d) <span className="text-emerald-500 font-bold">*</span>
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
                          ? 'bg-white border-emerald-400 text-slate-900 shadow-[0_0_12px_rgba(0,229,153,0.25)] ring-2 ring-emerald-400/30'
                          : 'bg-white/60 backdrop-blur-xs border-[#DCD6CA] text-slate-600 hover:bg-white hover:border-emerald-300'
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
              <label htmlFor="student-dob" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date of Birth <span className="text-emerald-500 font-bold">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D2C5]/90 bg-white/65 backdrop-blur-xs text-slate-900 text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* 9. HSC 27, 28 BATCHES */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                HSC Batches <span className="text-emerald-500 font-bold">*</span>
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
                          ? 'bg-white border-emerald-400 text-slate-900 shadow-[0_0_12px_rgba(0,229,153,0.25)] ring-2 ring-emerald-400/30'
                          : 'bg-white/60 backdrop-blur-xs border-[#DCD6CA] text-slate-600 hover:bg-white hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-sm font-extrabold text-slate-900">{batch}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10. INTERESTED SEGMENTS CHECKBOXES (MANDATORY) */}
            <div>
              <div className="mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Interested Segments <span className="text-emerald-500 font-bold">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
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
                          ? 'bg-emerald-50/75 border-emerald-400 ring-1 ring-emerald-400/40 text-slate-900 shadow-2xs' 
                          : 'bg-white/60 backdrop-blur-xs border-[#DCD6CA] text-slate-600 hover:bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? 'bg-[#00E599] border-[#00E599] text-slate-950' : 'bg-white border-slate-300'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold leading-snug">
                        {segment}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 11. RULES & REGULATIONS */}
            <div className="rounded-2xl p-4 sm:p-5 bg-amber-50/70 border border-amber-200/90 backdrop-blur-xs space-y-3.5" id="rules-regulations-card">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Club Rules &amp; Regulations
                  </h4>
                  <p className="text-[10px] text-amber-800 font-semibold">
                    Please read carefully before submitting your membership
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed font-medium pl-1">
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-800 shrink-0">1.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Attendance &amp; Cancellation:</strong> Missing two (2) consecutive club sessions, workshops, or weekly meetings without prior notice or valid written approval will result in automatic cancellation of club membership.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-800 shrink-0">2.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Mandatory Olympiad Participation:</strong> All members must actively prepare for and regularly participate in Science Olympiads (Math, Physics, Bio, Chem, Informatics, Astronomy), science fairs, and project exhibitions.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-800 shrink-0">3.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Discipline &amp; Conduct:</strong> Every member must uphold strict academic integrity, mutual respect, ethical standards, and represent New Government Degree College with dignity.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-black text-amber-800 shrink-0">4.</span>
                  <p>
                    <strong className="text-slate-900 font-bold">Active Dedication:</strong> Members must complete assigned scientific tasks, collaborate respectfully in group activities, and adhere to guidelines set by the Executive Committee.
                  </p>
                </div>
              </div>

              {/* Mandatory Agreement Checkbox */}
              <label 
                id="rules-agreement-checkbox"
                onClick={() => setFormData(prev => ({ ...prev, agreedToRules: !prev.agreedToRules }))}
                className={`mt-2 flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  formData.agreedToRules
                    ? 'bg-emerald-50 border-emerald-400 text-slate-900 shadow-2xs ring-1 ring-emerald-400/40'
                    : 'bg-white/85 border-amber-300 text-slate-700 hover:bg-white'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  formData.agreedToRules ? 'bg-[#00E599] border-[#00E599] text-slate-950' : 'bg-white border-slate-300'
                }`}>
                  {formData.agreedToRules && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-bold leading-snug">
                  I have read, understood, and agree to strictly abide by all the Rules &amp; Regulations of NGDC Science Club. <span className="text-emerald-600 font-bold">*</span>
                </span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                id="submit-form-button"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_0_20px_rgba(0,229,153,0.35)] hover:border-emerald-400 border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-[#00E599] rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#00E599]" />
                    <span>Submit Membership</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Clean, well-structured footer */}
        <footer className="mt-8 pt-6 border-t border-[#EAE4D9] text-center space-y-3">
          <p className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            NGDC SCIENCE CLUB &bull; OFFICIAL CONNECT
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <a 
              href="https://facebook.com/ngdcsc" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/75 backdrop-blur-xs border border-[#E0DBD0] text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(37,99,235,0.15)] transition-all"
            >
              <Facebook className="w-3.5 h-3.5 text-blue-600" />
              <span>facebook.com/ngdcsc</span>
            </a>

            <a 
              href="https://instagram.com/ngdcsc_" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/75 backdrop-blur-xs border border-[#E0DBD0] text-slate-700 hover:text-pink-600 hover:border-pink-300 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(236,72,153,0.15)] transition-all"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              <span>instagram.com/ngdcsc_</span>
            </a>

            <a 
              href="mailto:ngdcsc.org@gmail.com" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/75 backdrop-blur-xs border border-[#E0DBD0] text-slate-700 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold shadow-2xs hover:shadow-[0_0_12px_rgba(0,229,153,0.2)] transition-all"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>ngdcsc.org@gmail.com</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} NGDC Science Club. All rights reserved.
          </p>
        </footer>

      </div>
      )}
    </div>
  );
}
