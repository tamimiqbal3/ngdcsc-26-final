import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Award, 
  Bell, 
  LogOut, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Camera, 
  Phone, 
  Mail, 
  AlertCircle,
  Save,
  RefreshCw,
  Pin,
  Copy,
  Check,
  MessageSquare,
  X
} from 'lucide-react';
import { 
  SubmissionRecord, 
  ExecutiveMember, 
  ClubNotice, 
  MemberStatus, 
  SectionType, 
  BatchType 
} from './types';

const CLUB_LOGO_URL = 'https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png';

const STANDARD_SEGMENTS = [
  'Science Olympiad (Math, Physics, Bio, Chem)',
  'Science Project & Innovation',
  'Science Quizzing',
  'Robotics & Programming',
  'Astronomy & Space Science',
  'Scientific Wall Magazine & Publication'
];
import { 
  auth, 
  googleProvider,
  SUPER_ADMIN_EMAILS,
  fetchMembersFromFirebase, 
  saveMemberToFirebase,
  updateMemberInFirebase, 
  deleteMemberFromFirebase,
  fetchCommitteeFromFirebase,
  saveCommitteeMemberToFirebase,
  deleteCommitteeMemberFromFirebase,
  seedDefaultCommittee,
  fetchNoticesFromFirebase,
  saveNoticeToFirebase,
  deleteNoticeFromFirebase
} from './services/firebase';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { INITIAL_COMMITTEE } from './ExecutiveCommitteePage';

interface AdminPanelProps {
  onExit: () => void;
}

type TabType = 'members' | 'committee' | 'notices' | 'settings';

export default function AdminPanel({ onExit }: AdminPanelProps) {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form state
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('members');

  // Data states
  const [members, setMembers] = useState<SubmissionRecord[]>([]);
  const [committee, setCommittee] = useState<ExecutiveMember[]>([]);
  const [notices, setNotices] = useState<ClubNotice[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Members Tab Filters & Modals
  const [memberSearch, setMemberSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState<string>('All');
  const [filterSection, setFilterSection] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedMember, setSelectedMember] = useState<SubmissionRecord | null>(null);
  const [editingMember, setEditingMember] = useState<SubmissionRecord | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Committee Modals
  const [editingExecutive, setEditingExecutive] = useState<ExecutiveMember | null>(null);
  const [showAddExecutiveModal, setShowAddExecutiveModal] = useState(false);

  // Notices Modals
  const [editingNotice, setEditingNotice] = useState<ClubNotice | null>(null);
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);

  // File input refs
  const execPhotoInputRef = useRef<HTMLInputElement>(null);
  const noticeFileInputRef = useRef<HTMLInputElement>(null);
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);

  // Custom segment state for manual input & Toast notification
  const [customSegmentText, setCustomSegmentText] = useState('');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedToast(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const copyAllPhones = () => {
    const phones = filteredMembers.map(m => m.phone).filter(Boolean);
    if (phones.length === 0) {
      setCopiedToast('No phone numbers available to copy');
      setTimeout(() => setCopiedToast(null), 2500);
      return;
    }
    navigator.clipboard.writeText(phones.join(', '));
    setCopiedToast(`Copied ${phones.length} phone numbers!`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const copyAllWhatsApp = () => {
    const wps = filteredMembers.map(m => m.whatsapp || m.phone).filter(Boolean);
    if (wps.length === 0) {
      setCopiedToast('No WhatsApp numbers available to copy');
      setTimeout(() => setCopiedToast(null), 2500);
      return;
    }
    navigator.clipboard.writeText(wps.join(', '));
    setCopiedToast(`Copied ${wps.length} WhatsApp numbers!`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const copyAllEmails = () => {
    const emails = filteredMembers.map(m => m.email).filter(Boolean);
    if (emails.length === 0) {
      setCopiedToast('No emails available to copy');
      setTimeout(() => setCopiedToast(null), 2500);
      return;
    }
    navigator.clipboard.writeText(emails.join(', '));
    setCopiedToast(`Copied ${emails.length} emails!`);
    setTimeout(() => setCopiedToast(null), 2500);
  };

  const handleMemberPhotoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 6 * 1024 * 1024) {
      alert('Photo size cannot exceed 6MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 600;
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round((h * MAX_DIM) / w); w = MAX_DIM; }
          else { w = Math.round((w * MAX_DIM) / h); h = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setEditingMember(prev => prev ? { ...prev, photo: compressed } : null);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomSegment = () => {
    if (!customSegmentText.trim() || !editingMember) return;
    const trimmed = customSegmentText.trim();
    const current = editingMember.interestedSegments || [];
    if (!current.includes(trimmed)) {
      setEditingMember({ ...editingMember, interestedSegments: [...current, trimmed] });
    }
    setCustomSegmentText('');
  };

  // Check auth state - strictly enforce ngdcsc.org@gmail.com
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userEmail = (user.email || '').toLowerCase().trim();
        setCurrentUser(user);
        if (userEmail === 'ngdcsc.org@gmail.com') {
          setLoginError(null);
        } else {
          setLoginError(`Access Denied (${user.email}): Only the official club administration address (ngdcsc.org@gmail.com) is authorized.`);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Access is permitted ONLY if the authenticated email is strictly 'ngdcsc.org@gmail.com'
  const isAuthorized = !!currentUser && (currentUser.email || '').toLowerCase().trim() === 'ngdcsc.org@gmail.com';
  const isAuthenticated = isAuthorized;

  // Load all data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [membersData, committeeData, noticesData] = await Promise.all([
        fetchMembersFromFirebase(),
        fetchCommitteeFromFirebase(INITIAL_COMMITTEE),
        fetchNoticesFromFirebase()
      ]);
      setMembers(membersData);
      setCommittee(committeeData);
      setNotices(noticesData);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // ------------------ AUTH HANDLERS ------------------
  const handleGoogleLogin = async () => {
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userEmail = (res.user?.email || '').toLowerCase().trim();
      if (userEmail !== 'ngdcsc.org@gmail.com') {
        setLoginError(`Access Denied (${res.user?.email}): Only authorized club administration (ngdcsc.org@gmail.com) can access this panel.`);
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err?.code === 'auth/operation-not-allowed' || (err?.message && err.message.includes('operation-not-allowed'))) {
        setLoginError('operation-not-allowed');
      } else {
        setLoginError(err?.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setLoginError(null);
  };

  // ------------------ MEMBERS ACTIONS ------------------
  const handleStatusChange = async (memberId: string, newStatus: MemberStatus) => {
    await updateMemberInFirebase(memberId, { status: newStatus });
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
    if (selectedMember && selectedMember.id === memberId) {
      setSelectedMember(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this member registration?')) return;
    await deleteMemberFromFirebase(memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    if (selectedMember?.id === memberId) setSelectedMember(null);
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.id) return;
    await updateMemberInFirebase(editingMember.id, editingMember);
    setMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m));
    setEditingMember(null);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent, newRecord: SubmissionRecord) => {
    e.preventDefault();
    const id = await saveMemberToFirebase(newRecord);
    setMembers(prev => [{ ...newRecord, id }, ...prev]);
    setShowAddMemberModal(false);
  };

  const exportMembersCSV = () => {
    if (members.length === 0) {
      alert('No members data to export');
      return;
    }
    const headers = [
      'Submission Date',
      'Name',
      'Student ID / Roll',
      'Phone',
      'WhatsApp',
      'Email',
      'Batch',
      'Section',
      'Date of Birth',
      'Interested Segments',
      'Status'
    ];

    const rows = members.map(m => [
      `"${m.submittedAt || ''}"`,
      `"${m.name || ''}"`,
      `"${m.studentId || ''}"`,
      `"${m.phone || ''}"`,
      `"${m.whatsapp || ''}"`,
      `"${m.email || ''}"`,
      `"${m.batch || ''}"`,
      `"${m.section || ''}"`,
      `"${m.dob || ''}"`,
      `"${(m.interestedSegments || []).join('; ')}"`,
      `"${m.status || 'pending'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NGDC_Science_Club_Members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ------------------ EXECUTIVE ACTIONS ------------------
  const handleSaveExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExecutive) return;
    await saveCommitteeMemberToFirebase(editingExecutive);
    setCommittee(prev => prev.map(m => m.id === editingExecutive.id ? editingExecutive : m));
    setEditingExecutive(null);
  };

  const handleAddExecutive = async (e: React.FormEvent, newExec: ExecutiveMember) => {
    e.preventDefault();
    const execWithId = {
      ...newExec,
      id: newExec.id || `exec_${Date.now()}`,
      order: committee.length + 1
    };
    await saveCommitteeMemberToFirebase(execWithId);
    setCommittee(prev => [...prev, execWithId]);
    setShowAddExecutiveModal(false);
  };

  const handleDeleteExecutive = async (id: string) => {
    if (!window.confirm('Delete this executive member?')) return;
    await deleteCommitteeMemberFromFirebase(id);
    setCommittee(prev => prev.filter(m => m.id !== id));
  };

  const handleResetCommittee = async () => {
    if (!window.confirm('Reset executive committee to the default 14 members list?')) return;
    await seedDefaultCommittee(INITIAL_COMMITTEE);
    setCommittee(INITIAL_COMMITTEE);
  };

  const handleExecPhotoUpload = (file: File, targetExec: ExecutiveMember, isEditing: boolean) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 6 * 1024 * 1024) {
      alert('Photo size cannot exceed 6MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 600;
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round((h * MAX_DIM) / w); w = MAX_DIM; }
          else { w = Math.round((w * MAX_DIM) / h); h = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          if (isEditing) {
            setEditingExecutive(prev => prev ? { ...prev, image: compressed } : null);
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ------------------ NOTICES ACTIONS ------------------
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;
    await saveNoticeToFirebase(editingNotice);
    setNotices(prev => prev.map(n => n.id === editingNotice.id ? editingNotice : n));
    setEditingNotice(null);
  };

  const handleAddNotice = async (e: React.FormEvent, newNotice: ClubNotice) => {
    e.preventDefault();
    const noticeWithId = {
      ...newNotice,
      id: newNotice.id || `notice_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await saveNoticeToFirebase(noticeWithId);
    setNotices(prev => [noticeWithId, ...prev]);
    setShowAddNoticeModal(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm('Delete this notice?')) return;
    await deleteNoticeFromFirebase(id);
    setNotices(prev => prev.filter(n => n.id !== id));
  };

  // ------------------ LOGIN & UNAUTHORIZED SCREENS ------------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthorized Access Screen (Logged in with a different email)
  if (currentUser && !isAuthorized) {
    return (
      <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center p-7 bg-slate-950/80 border border-rose-500/30 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="flex justify-center mb-3">
            <img 
              src={CLUB_LOGO_URL} 
              alt="NGDC Science Club Logo" 
              className="h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(0,229,153,0.3)]" 
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white mb-1">
            Access Restricted
          </h1>
          <p className="text-xs text-rose-400 font-bold mb-2">
            Unauthorized Google Account
          </p>
          <p className="text-[11px] text-slate-400 font-mono break-all mb-5 bg-slate-900/80 p-2 rounded-xl border border-white/5">
            {currentUser.email}
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in with Authorized Account</span>
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="mt-4 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Back to Site
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Login Screen: Club Logo on top, Admin title, and Google button
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center p-7 bg-slate-950/80 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl formal-page-enter">
          <div className="flex justify-center mb-4">
            <img 
              src={CLUB_LOGO_URL} 
              alt="NGDC Science Club Logo" 
              className="h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,229,153,0.35)] hover:scale-105 transition-transform" 
              referrerPolicy="no-referrer"
            />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white mb-0.5">
            NGDC SCIENCE CLUB
          </h1>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-6">
            Official Administrative Portal
          </p>

          {/* Operation not allowed in Firebase guidance */}
          {loginError === 'operation-not-allowed' ? (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Google Sign-in Not Enabled</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-snug">
                Firebase Console-এ Google Sign-in এনাবল করা হয়নি।
              </p>
              <div className="text-[10px] text-slate-300 space-y-1 bg-slate-900/90 p-2.5 rounded-lg border border-white/5 font-mono">
                <p>1. console.firebase.google.com-এ যান</p>
                <p>2. Authentication → Sign-in method</p>
                <p>3. Google সিলেক্ট করে Enable করুন ও Save দিন</p>
              </div>
            </div>
          ) : loginError ? (
            <p className="text-xs text-rose-400 font-medium mb-4">
              {loginError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loginSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loginSubmitting ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="mt-4 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Back to Site
            </button>
          )}
        </div>
      </div>
    );
  }

  // ------------------ AUTHENTICATED DASHBOARD ------------------

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchSearch = 
      (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.studentId || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.phone || '').includes(memberSearch) ||
      (m.email || '').toLowerCase().includes(memberSearch.toLowerCase());
    const matchBatch = filterBatch === 'All' || m.batch === filterBatch;
    const matchSec = filterSection === 'All' || m.section === filterSection;
    const matchStatus = filterStatus === 'All' || (m.status || 'pending') === filterStatus;
    return matchSearch && matchBatch && matchSec && matchStatus;
  });

  const pendingCount = members.filter(m => !m.status || m.status === 'pending').length;
  const approvedCount = members.filter(m => m.status === 'approved').length;
  const hsc27Count = members.filter(m => m.batch === 'HSC 27').length;
  const hsc28Count = members.filter(m => m.batch === 'HSC 28').length;

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col formal-page-enter">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl text-white border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img 
            src={CLUB_LOGO_URL} 
            alt="NGDC SC Logo" 
            className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(0,229,153,0.35)] shrink-0" 
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                NGDC SCIENCE CLUB
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase border border-emerald-400/30">
                Admin Panel
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Cloud Sync &bull; ngdcsc.org@gmail.com</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">View Public Site</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Floating Copied Toast */}
      {copiedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-black text-xs shadow-[0_10px_30px_rgba(0,229,153,0.4)] backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 border border-emerald-300">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="bg-slate-950/60 backdrop-blur-md border-b border-white/10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3 overflow-x-auto py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(0,229,153,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Members &amp; Registrations</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'members' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
            }`}>
              {members.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('committee')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'committee'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(0,229,153,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Executive Committee</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'committee' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
            }`}>
              {committee.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notices')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'notices'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(0,229,153,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Notices &amp; Files</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'notices' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
            }`}>
              {notices.length}
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={loadAllData}
              disabled={loadingData}
              title="Refresh Data"
              className="p-2 rounded-xl border border-white/10 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* ===================== TAB 1: MEMBERS ===================== */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Registered</p>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1">{members.length}</p>
                <p className="text-[10px] text-emerald-400 font-bold mt-1">Live in Firestore</p>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-amber-500/30 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pending Review</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">{pendingCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Awaiting approval</p>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-teal-500/30 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Approved</p>
                <p className="text-2xl sm:text-3xl font-black text-teal-400 mt-1">{approvedCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Active members</p>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-blue-500/30 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Batch HSC 27 / 28</p>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {hsc27Count} <span className="text-sm font-semibold text-slate-400">/ {hsc28Count}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Batch split</p>
              </div>
            </div>

            {/* Filter & Action Bar with Bulk Copy Controls */}
            <div className="bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg space-y-3.5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search student by name, roll, phone, email..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-950 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Batch Filter */}
                  <select
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-950 border border-white/15 text-slate-200"
                  >
                    <option value="All">All Batches</option>
                    <option value="HSC 27">HSC 27</option>
                    <option value="HSC 28">HSC 28</option>
                  </select>

                  {/* Section Filter */}
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-950 border border-white/15 text-slate-200"
                  >
                    <option value="All">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-950 border border-white/15 text-slate-200"
                  >
                    <option value="All">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Export CSV */}
                  <button
                    type="button"
                    onClick={exportMembersCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export CSV</span>
                  </button>

                  {/* Add Member Manually */}
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              {/* Bulk Copy Bar for Phone, WhatsApp & Email */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                <span className="text-[11px] font-extrabold text-slate-400 flex items-center gap-1.5 mr-1">
                  <Copy className="w-3 h-3 text-emerald-400" />
                  <span>Bulk Copy:</span>
                </span>
                <button
                  type="button"
                  onClick={copyAllPhones}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-emerald-300 text-xs font-bold border border-white/10 transition-all cursor-pointer"
                  title="Copy all visible phone numbers"
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>Copy All Phones ({filteredMembers.filter(m => m.phone).length})</span>
                </button>

                <button
                  type="button"
                  onClick={copyAllWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-[#25D366] text-xs font-bold border border-white/10 transition-all cursor-pointer"
                  title="Copy all visible WhatsApp numbers"
                >
                  <MessageSquare className="w-3 h-3 text-[#25D366]" />
                  <span>Copy All WhatsApp ({filteredMembers.filter(m => m.whatsapp || m.phone).length})</span>
                </button>

                <button
                  type="button"
                  onClick={copyAllEmails}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-blue-300 text-xs font-bold border border-white/10 transition-all cursor-pointer"
                  title="Copy all visible email addresses"
                >
                  <Mail className="w-3 h-3 text-blue-400" />
                  <span>Copy All Emails ({filteredMembers.filter(m => m.email).length})</span>
                </button>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Photo &amp; Name</th>
                      <th className="py-3 px-4">Roll / ID</th>
                      <th className="py-3 px-4">Batch &amp; Sec</th>
                      <th className="py-3 px-4">Phone &amp; WhatsApp</th>
                      <th className="py-3 px-4">Submission Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">
                          No registered members found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id || member.submittedAt} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {member.photo ? (
                                <img
                                  src={member.photo}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-white/15 shadow-sm shrink-0 cursor-pointer hover:border-emerald-400 transition-colors"
                                  onClick={() => setSelectedMember(member)}
                                />
                              ) : (
                                <div 
                                  onClick={() => setSelectedMember(member)}
                                  className="w-10 h-10 rounded-xl bg-slate-800 border border-white/15 flex items-center justify-center text-slate-300 font-bold shrink-0 cursor-pointer hover:border-emerald-400"
                                >
                                  {member.name ? member.name.charAt(0) : '?'}
                                </div>
                              )}
                              <div>
                                <p 
                                  className="font-extrabold text-white hover:text-emerald-400 cursor-pointer transition-colors"
                                  onClick={() => setSelectedMember(member)}
                                >
                                  {member.name}
                                </p>
                                {member.email ? (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                    <span className="truncate max-w-[150px]">{member.email}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(member.email, 'Email')}
                                      title="Copy email"
                                      className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500">No email</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {member.studentId || '—'}
                          </td>

                          <td className="py-3 px-4 font-bold">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-white">{member.batch}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-[10px] text-slate-300">
                                Sec {member.section}
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-slate-200 font-bold">
                              <a href={`tel:${member.phone}`} className="hover:text-emerald-400 transition-colors">{member.phone}</a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(member.phone, 'Phone')}
                                title="Copy Phone Number"
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            {member.whatsapp && (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono mt-0.5">
                                <span>WA: {member.whatsapp}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(member.whatsapp, 'WhatsApp')}
                                  title="Copy WhatsApp Number"
                                  className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {member.submittedAt || '—'}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              member.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : member.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {member.status || 'pending'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedMember(member)}
                                title="View details"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                title="Edit member &amp; photo"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id!)}
                                title="Delete record"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: EXECUTIVE COMMITTEE ===================== */}
        {activeTab === 'committee' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Executive Committee Management</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update executive photos, designations, names, and order. Changes immediately reflect on the public website.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetCommittee}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Default</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddExecutiveModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Executive</span>
                </button>
              </div>
            </div>

            {/* Committee Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {committee.map((exec, idx) => (
                <div
                  key={exec.id || idx}
                  className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-lg group hover:border-emerald-500/40 hover:shadow-[0_8px_25px_rgba(0,229,153,0.1)] transition-all flex flex-col"
                >
                  {/* Executive Photo Container */}
                  <div className="relative aspect-4/3 bg-slate-950 overflow-hidden">
                    <img
                      src={exec.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                      alt={exec.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingExecutive(exec)}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-colors cursor-pointer"
                        title="Change Photo & Edit"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </div>

                    <div className="absolute bottom-2 left-3 right-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wide shadow-md">
                        {exec.role}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {exec.name}
                      </h3>
                      {exec.batch && (
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{exec.batch}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">#{exec.order || idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingExecutive(exec)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExecutive(exec.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: NOTICES ===================== */}
        {activeTab === 'notices' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  <span>Notices &amp; Announcements</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publish announcements, circulars, and upload files (PDF/Images) directly to the public website notice board.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddNoticeModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish New Notice</span>
              </button>
            </div>

            {/* Notices List */}
            <div className="space-y-3">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-5 shadow-lg hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {notice.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold">
                          <Pin className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>PINNED</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-white/10">
                        {notice.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {notice.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingNotice(notice)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-white mb-1.5">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {notice.content}
                  </p>

                  {/* Attachment if any */}
                  {notice.fileUrl && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 w-fit">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Attached: {notice.fileName || 'Notice Attachment'}</span>
                      <a 
                        href={notice.fileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="underline ml-1 font-bold text-emerald-300 hover:text-white"
                      >
                        View File
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ===================== MODAL: MEMBER FULL DETAILS ===================== */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-slate-950/95 rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <h3 className="text-base font-black text-white">Member Registration Details</h3>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-4">
                {selectedMember.photo ? (
                  <img
                    src={selectedMember.photo}
                    alt={selectedMember.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-white/15 flex items-center justify-center text-slate-400 font-bold text-xl shrink-0">
                    {selectedMember.name ? selectedMember.name.charAt(0) : '?'}
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-black text-white">{selectedMember.name}</h4>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">Roll: {selectedMember.studentId}</p>
                  <p className="text-xs text-slate-400">{selectedMember.batch} &bull; Section {selectedMember.section}</p>
                  <div className="mt-1.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedMember.status === 'approved' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      Status: {selectedMember.status || 'pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-2 border-t border-white/10">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Phone</span>
                    <a href={`tel:${selectedMember.phone}`} className="font-bold text-white hover:text-emerald-400">{selectedMember.phone}</a>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedMember.phone, 'Phone')}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Copy Phone"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">WhatsApp</span>
                    <a href={`https://wa.me/${selectedMember.whatsapp?.replace(/\D/g, '') || selectedMember.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="font-bold text-emerald-400 hover:underline">
                      {selectedMember.whatsapp || selectedMember.phone}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedMember.whatsapp || selectedMember.phone, 'WhatsApp')}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-[#25D366] transition-colors cursor-pointer"
                    title="Copy WhatsApp"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Email</span>
                    <span className="font-semibold text-slate-200">{selectedMember.email || 'None'}</span>
                  </div>
                  {selectedMember.email && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedMember.email, 'Email')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-blue-400 transition-colors cursor-pointer"
                      title="Copy Email"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Date of Birth</span>
                  <span className="font-semibold text-slate-300">{selectedMember.dob || '—'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Submitted At</span>
                  <span className="font-semibold text-slate-300">{selectedMember.submittedAt}</span>
                </div>
              </div>

              {/* Interested Segments */}
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide block mb-1.5">
                  Interested Segments
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedMember.interestedSegments || []).map((seg, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      {seg}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Status change action buttons in modal */}
            <div className="p-4 border-t border-white/10 bg-slate-900/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedMember.id!, 'approved')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                >
                  Approve Member
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedMember.id!, 'rejected')}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-colors cursor-pointer"
                >
                  Reject
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT MEMBER ===================== */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-slate-950/95 rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-base font-black text-white">Edit Member Information</h3>
                <p className="text-[11px] text-slate-400">Update photo, details, and club segments</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Member Photo Management */}
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  {editingMember.photo ? (
                    <img
                      src={editingMember.photo}
                      alt={editingMember.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-slate-400 font-bold">
                      <Camera className="w-6 h-6 text-slate-500 mb-1" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <p className="text-xs font-bold text-white">Member Profile Photo</p>
                  <p className="text-[11px] text-slate-400">
                    Upload, change, or remove the member photo. Automatically resized and compressed.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={memberPhotoInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleMemberPhotoUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => memberPhotoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editingMember.photo ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>

                    {editingMember.photo && (
                      <button
                        type="button"
                        onClick={() => setEditingMember({ ...editingMember, photo: null })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs border border-rose-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-400 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Roll / Student ID</label>
                  <input
                    type="text"
                    value={editingMember.studentId}
                    onChange={(e) => setEditingMember({ ...editingMember, studentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-emerald-400 focus:outline-none focus:border-emerald-400 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Batch</label>
                  <select
                    value={editingMember.batch}
                    onChange={(e) => setEditingMember({ ...editingMember, batch: e.target.value as BatchType })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-bold"
                  >
                    <option value="HSC 27">HSC 27</option>
                    <option value="HSC 28">HSC 28</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Section</label>
                  <select
                    value={editingMember.section}
                    onChange={(e) => setEditingMember({ ...editingMember, section: e.target.value as SectionType })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-bold"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Status</label>
                  <select
                    value={editingMember.status || 'pending'}
                    onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as MemberStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-bold"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Contact Information with Quick Copy Buttons */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">Phone Number</label>
                    {editingMember.phone && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editingMember.phone, 'Phone')}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editingMember.phone}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">WhatsApp Number</label>
                    {editingMember.whatsapp && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editingMember.whatsapp, 'WhatsApp')}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editingMember.whatsapp}
                    onChange={(e) => setEditingMember({ ...editingMember, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">Email Address</label>
                    {editingMember.email && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editingMember.email, 'Email')}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="email"
                    value={editingMember.email}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Segments Editing & Manual Add */}
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white text-xs block">
                    Interested Segments ({editingMember.interestedSegments?.length || 0})
                  </label>
                </div>

                {/* Active Segments with Remove (X) button */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-950/60 border border-white/5">
                  {(editingMember.interestedSegments || []).length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">No segments selected. Add below.</span>
                  ) : (
                    (editingMember.interestedSegments || []).map((seg, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-[11px] font-semibold"
                      >
                        <span>{seg}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingMember.interestedSegments || []).filter((_, i) => i !== idx);
                            setEditingMember({ ...editingMember, interestedSegments: updated });
                          }}
                          className="hover:text-rose-400 ml-0.5 cursor-pointer font-bold"
                          title="Remove segment"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Manual Add Custom Segment */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-1">Manually Type &amp; Add Segment:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSegmentText}
                      onChange={(e) => setCustomSegmentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSegment();
                        }
                      }}
                      placeholder="e.g. Astrophysics / AI Workshop / Debate..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSegment}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 text-xs transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Quick Toggle Standard Segments */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-1">Quick Add Standard Segments:</p>
                  <div className="flex flex-wrap gap-1">
                    {STANDARD_SEGMENTS.map((seg, i) => {
                      const isAdded = (editingMember.interestedSegments || []).includes(seg);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const current = editingMember.interestedSegments || [];
                            if (isAdded) {
                              setEditingMember({
                                ...editingMember,
                                interestedSegments: current.filter(s => s !== seg)
                              });
                            } else {
                              setEditingMember({
                                ...editingMember,
                                interestedSegments: [...current, seg]
                              });
                            }
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-500/30 border-emerald-500 text-emerald-200'
                              : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {isAdded ? `✓ ${seg}` : `+ ${seg}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT EXECUTIVE (PHOTO + DESIGNATION) ===================== */}
      {editingExecutive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-md w-full bg-slate-950/95 rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col text-slate-100">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <h3 className="text-base font-black text-white">Edit Executive Profile</h3>
              <button
                type="button"
                onClick={() => setEditingExecutive(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExecutive} className="p-5 space-y-4 text-xs">
              {/* Photo Preview & Upload */}
              <div className="flex flex-col items-center gap-2.5">
                <img
                  src={editingExecutive.image}
                  alt={editingExecutive.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-lg"
                />
                <input
                  type="file"
                  ref={execPhotoInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleExecPhotoUpload(e.target.files[0], editingExecutive, true);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => execPhotoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Change Photo</span>
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Executive Name</label>
                <input
                  type="text"
                  value={editingExecutive.name}
                  onChange={(e) => setEditingExecutive({ ...editingExecutive, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-400 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Role / Designation</label>
                <input
                  type="text"
                  value={editingExecutive.role}
                  onChange={(e) => setEditingExecutive({ ...editingExecutive, role: e.target.value })}
                  placeholder="e.g. President, Vice President, General Secretary"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-400 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Direct Image URL (Optional)</label>
                <input
                  type="url"
                  value={editingExecutive.image}
                  onChange={(e) => setEditingExecutive({ ...editingExecutive, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExecutive(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer"
                >
                  Save Executive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ADD EXECUTIVE ===================== */}
      {showAddExecutiveModal && (
        <AddExecutiveModal
          onClose={() => setShowAddExecutiveModal(false)}
          onAdd={handleAddExecutive}
        />
      )}

      {/* ===================== MODAL: CREATE / EDIT NOTICE ===================== */}
      {showAddNoticeModal && (
        <NoticeEditorModal
          onClose={() => setShowAddNoticeModal(false)}
          onSave={handleAddNotice}
        />
      )}

      {editingNotice && (
        <NoticeEditorModal
          initialNotice={editingNotice}
          onClose={() => setEditingNotice(null)}
          onSave={handleSaveNotice}
        />
      )}

      {/* ===================== MODAL: ADD MEMBER MANUALLY ===================== */}
      {showAddMemberModal && (
        <AddMemberManualModal
          onClose={() => setShowAddMemberModal(false)}
          onAdd={handleAddMemberSubmit}
        />
      )}
    </div>
  );
}

// ------------------ SUB-MODALS ------------------

function AddExecutiveModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: React.FormEvent, item: ExecutiveMember) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 6 * 1024 * 1024) {
      alert('Photo size cannot exceed 6MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-md w-full bg-slate-950/95 rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col text-slate-100">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <h3 className="text-base font-black text-white">Add New Executive Member</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => onAdd(e, { id: `exec_${Date.now()}`, name, role, image })} className="p-5 space-y-4 text-xs">
          <div className="flex flex-col items-center gap-2.5">
            <img src={image} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md" />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 transition-colors cursor-pointer"
            >
              Upload Photo
            </button>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Executive Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Md. Rafiqul Islam"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-400 font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Role / Designation</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Assistant General Secretary"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-400 font-semibold"
              required
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer">
              Add Executive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NoticeEditorModal({ 
  initialNotice, 
  onClose, 
  onSave 
}: { 
  initialNotice?: ClubNotice; 
  onClose: () => void; 
  onSave: (e: React.FormEvent, notice: ClubNotice) => void 
}) {
  const [title, setTitle] = useState(initialNotice?.title || '');
  const [date, setDate] = useState(initialNotice?.date || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<any>(initialNotice?.category || 'Notice');
  const [noticeType, setNoticeType] = useState<'file' | 'text'>(
    initialNotice?.fileUrl ? 'file' : initialNotice?.content ? 'text' : 'file'
  );
  const [content, setContent] = useState(initialNotice?.content || '');
  const [isPinned, setIsPinned] = useState(initialNotice?.isPinned || false);
  const [fileUrl, setFileUrl] = useState<string | null>(initialNotice?.fileUrl || null);
  const [fileName, setFileName] = useState<string | null>(initialNotice?.fileName || null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setValidationError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileUrl(e.target?.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('নোটিশের শিরোনাম (Heading) প্রদান করুন।');
      return;
    }

    if (noticeType === 'file') {
      if (!fileUrl) {
        setValidationError('দয়া করে নোটিশের ফাইল (PDF বা ছবি) আপলোড করুন। অথবা টেক্সট নোটিশ অপশন নির্বাচন করুন।');
        return;
      }
    } else {
      if (!content.trim()) {
        setValidationError('দয়া করে নোটিশের টেক্সট বা বিবরণ লিখুন। অথবা ফাইল আপলোড অপশন নির্বাচন করুন।');
        return;
      }
    }

    onSave(e, {
      id: initialNotice?.id || `notice_${Date.now()}`,
      title: title.trim(),
      date,
      category,
      content: noticeType === 'text' ? content.trim() : (content.trim() || ''),
      isPinned,
      fileUrl: noticeType === 'file' ? (fileUrl || undefined) : undefined,
      fileName: noticeType === 'file' ? (fileName || undefined) : undefined,
      fileType: noticeType === 'file' ? (fileUrl?.startsWith('data:image') ? 'image' : 'pdf') : undefined,
      publishedBy: 'Executive Committee'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-lg w-full bg-slate-950/95 rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <h3 className="text-base font-black text-white">
            {initialNotice ? 'Edit Notice' : 'Publish Notice'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-300 block mb-1">
              Notice Heading / Title <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setValidationError(null); }}
              placeholder="e.g. Science Fair 2026 / Club Meeting Announcement"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-bold text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-bold"
              >
                <option value="Notice">Notice</option>
                <option value="Olympiad">Olympiad</option>
                <option value="Workshop">Workshop</option>
                <option value="General">General</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          {/* Explicit Choice: File Upload OR Text Notice */}
          <div className="bg-slate-900/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <div>
              <label className="font-bold text-white block text-xs mb-1">
                নোটিশের ধরন (Choose File OR Text):
              </label>
              <p className="text-[11px] text-slate-400 mb-2.5">
                হয় ফাইল আপলোড করুন, অথবা টেক্সট লিখুন — যেকোনো একটি যোগ করলেই হবে।
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setNoticeType('file'); setValidationError(null); }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    noticeType === 'file'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>ফাইল আপলোড (File)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setNoticeType('text'); setValidationError(null); }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    noticeType === 'text'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>টেক্সট নোটিশ (Text)</span>
                </button>
              </div>
            </div>

            {/* If FILE mode is selected */}
            {noticeType === 'file' && (
              <div className="p-4 rounded-xl border-2 border-dashed border-emerald-500/40 bg-slate-950/60 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs inline-flex items-center gap-2 cursor-pointer border border-emerald-500/40 shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>{fileName ? 'Change File' : 'Upload File (PDF / Image)'}</span>
                </button>

                {fileName ? (
                  <div className="mt-3 p-2 bg-emerald-500/15 rounded-lg text-xs font-bold text-emerald-300 flex items-center justify-between border border-emerald-500/30">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[220px]">{fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFileUrl(null); setFileName(null); }}
                      className="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 cursor-pointer"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-2">
                    PDF সার্কুলার ফাইল বা নোটিশের ছবি আপলোড করুন।
                  </p>
                )}
              </div>
            )}

            {/* If TEXT mode is selected */}
            {noticeType === 'text' && (
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  নোটিশের বিবরণ / টেক্সট (Notice Content) <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setValidationError(null); }}
                  placeholder="নোটিশের বিস্তারিত বার্তা বা নির্দেশনা এখানে লিখুন..."
                  className="w-full p-3 rounded-xl border border-white/10 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 text-xs leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Pinned checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-white/20 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isPinned" className="font-bold text-slate-300 cursor-pointer">
              Pin notice to top
            </label>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer">
              {initialNotice ? 'Update Notice' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberManualModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: React.FormEvent, record: SubmissionRecord) => void }) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [batch, setBatch] = useState<BatchType>('HSC 27');
  const [section, setSection] = useState<SectionType>('A');
  const [dob, setDob] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([
    'Science Olympiad (Math, Physics, Bio, Chem)'
  ]);
  const [customSegmentInput, setCustomSegmentInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 6 * 1024 * 1024) {
      alert('Photo size cannot exceed 6MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 600;
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round((h * MAX_DIM) / w); w = MAX_DIM; }
          else { w = Math.round((w * MAX_DIM) / h); h = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPhoto(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddManualSegment = () => {
    if (!customSegmentInput.trim()) return;
    const trimmed = customSegmentInput.trim();
    if (!selectedSegments.includes(trimmed)) {
      setSelectedSegments(prev => [...prev, trimmed]);
    }
    setCustomSegmentInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-lg w-full bg-slate-950/95 rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div>
            <h3 className="text-base font-black text-white">Manually Add Club Member</h3>
            <p className="text-[11px] text-slate-400">Add member photo, info, and club segments</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form 
          onSubmit={(e) => onAdd(e, {
            name,
            studentId,
            phone,
            whatsapp: whatsapp || phone,
            email,
            batch,
            section,
            dob,
            photo,
            sameAsPhone: true,
            interestedSegments: selectedSegments.length > 0 ? selectedSegments : ['General Science'],
            agreedToRules: true,
            status: 'approved',
            submittedAt: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
          })} 
          className="p-5 overflow-y-auto space-y-4 text-xs"
        >
          {/* Photo Upload */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              {photo ? (
                <img src={photo} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-slate-400 font-bold">
                  <Camera className="w-6 h-6 text-slate-500 mb-1" />
                  <span className="text-[10px]">No Photo</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <p className="text-xs font-bold text-white">Member Photo</p>
              <p className="text-[11px] text-slate-400">Attach student photo (optional, auto-compressed).</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input type="file" ref={fileRef} accept="image/*" onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photo ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-400 font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Roll / Student ID</label>
              <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-emerald-400 focus:outline-none focus:border-emerald-400 font-mono font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Batch</label>
              <select value={batch} onChange={(e) => setBatch(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-bold">
                <option value="HSC 27">HSC 27</option>
                <option value="HSC 28">HSC 28</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value as any)} className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-bold">
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Phone Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none font-mono font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-300 block mb-1">WhatsApp (Optional)</label>
              <input type="text" value={whatsapp} placeholder="Same as phone if blank" onChange={(e) => setWhatsapp(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none font-mono" />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Email (Optional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none" />
            </div>
          </div>

          {/* Segments Selection & Manual Add */}
          <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2.5">
            <label className="font-bold text-white text-xs block">
              Interested Segments ({selectedSegments.length})
            </label>

            {/* Active Segments with Remove (X) button */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-950/60 border border-white/5">
              {selectedSegments.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">No segments selected. Add below.</span>
              ) : (
                selectedSegments.map((seg, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-[11px] font-semibold"
                  >
                    <span>{seg}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSegments(prev => prev.filter((_, i) => i !== idx))}
                      className="hover:text-rose-400 ml-0.5 cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Manual Add Custom Segment */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-1">Manually Type &amp; Add Segment:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSegmentInput}
                  onChange={(e) => setCustomSegmentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualSegment();
                    }
                  }}
                  placeholder="e.g. Science Quizzing / Coding..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleAddManualSegment}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 text-xs transition-colors cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Quick Toggle Standard Segments */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-1">Quick Add Standard Segments:</p>
              <div className="flex flex-wrap gap-1">
                {STANDARD_SEGMENTS.map((seg, i) => {
                  const isAdded = selectedSegments.includes(seg);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (isAdded) {
                          setSelectedSegments(prev => prev.filter(s => s !== seg));
                        } else {
                          setSelectedSegments(prev => [...prev, seg]);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-500/30 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {isAdded ? `✓ ${seg}` : `+ ${seg}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black shadow-[0_0_15px_rgba(0,229,153,0.3)] transition-all cursor-pointer">
              Save Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
