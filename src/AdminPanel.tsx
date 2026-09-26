import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Users, 
  User as UserIcon,
  Award, 
  Bell, 
  LogOut, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Download, 
  Upload, 
  Eye, 
  Clock, 
  ArrowLeft, 
  FileText, 
  Camera, 
  Phone, 
  Mail, 
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  X,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Layers,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import { 
  SubmissionRecord, 
  ExecutiveMember, 
  ClubNotice, 
  MemberStatus, 
  SectionType, 
  BatchType 
} from './types';
import AdminDashboardView from './AdminDashboardView';
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
  deleteNoticeFromFirebase,
  syncAllMembersToStatusDocs,
  getNextMembershipId,
  generateNextMembershipId
} from './services/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { INITIAL_COMMITTEE } from './ExecutiveCommitteePage';

const CLUB_LOGO_URL = 'https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png';

const STANDARD_SEGMENTS = [
  'Science Olympiad (Math, Physics, Bio, Chem)',
  'Science Project & Innovation',
  'Science Quizzing',
  'Robotics & Programming',
  'Astronomy & Space Science',
  'Scientific Wall Magazine & Publication'
];

interface AdminPanelProps {
  onExit: () => void;
}

type TabType = 'dashboard' | 'members' | 'committee' | 'notices';

export default function AdminPanel({ onExit }: AdminPanelProps) {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form state
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Active Tab: Default is 'dashboard' with rich graphs
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

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
  const [rejectingMember, setRejectingMember] = useState<SubmissionRecord | null>(null);

  // Committee Modals
  const [editingExecutive, setEditingExecutive] = useState<ExecutiveMember | null>(null);
  const [showAddExecutiveModal, setShowAddExecutiveModal] = useState(false);

  // Notices Modals
  const [editingNotice, setEditingNotice] = useState<ClubNotice | null>(null);
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);

  // File input refs
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);

  // Toast notification
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
      setCopiedToast('No phone numbers available');
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
      setCopiedToast('No WhatsApp numbers available');
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
      setCopiedToast('No emails available');
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

  // Check auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userEmail = (user.email || '').toLowerCase().trim();
        setCurrentUser(user);
        const authorized = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase().trim() === userEmail);
        if (authorized) {
          setLoginError(null);
        } else {
          setLoginError(`Access Denied: Your account (${user.email}) is not authorized to access this administration panel.`);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const isAuthorized = !!currentUser && SUPER_ADMIN_EMAILS.some(e => e.toLowerCase().trim() === (currentUser.email || '').toLowerCase().trim());
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
      // Sync member status docs in background for public phone search
      syncAllMembersToStatusDocs(membersData).catch(() => {});
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Auth Handlers
  const handleGoogleLogin = async () => {
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userEmail = (res.user?.email || '').toLowerCase().trim();
      const authorized = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase().trim() === userEmail);
      if (!authorized) {
        setLoginError(`Access Denied: Your account (${res.user?.email}) is not authorized to access this administration panel.`);
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

  // Member Actions
  const handleQuickApprove = async (member: SubmissionRecord) => {
    if (!member.id) return;
    try {
      let membershipId = member.membershipId;
      if (!membershipId) {
        try {
          membershipId = await generateNextMembershipId();
        } catch {
          membershipId = getNextMembershipId(members);
        }
      }
      await updateMemberInFirebase(member.id, {
        ...member,
        status: 'approved',
        membershipId,
        rejectionReason: null as any
      });
      setMembers(prev => prev.map(m => m.id === member.id ? {
        ...m,
        status: 'approved',
        membershipId,
        rejectionReason: undefined
      } : m));
      if (selectedMember && selectedMember.id === member.id) {
        setSelectedMember(prev => prev ? {
          ...prev,
          status: 'approved',
          membershipId,
          rejectionReason: undefined
        } : null);
      }
    } catch (err: any) {
      console.error('Error approving member:', err);
      alert('Error approving member: ' + (err?.message || 'Check connection'));
    }
  };

  const handleQuickReject = (member: SubmissionRecord) => {
    setRejectingMember(member);
  };

  const handleStatusChange = async (memberId: string, newStatus: MemberStatus) => {
    const target = members.find(m => m.id === memberId);
    if (!target) return;

    if (newStatus === 'rejected') {
      setRejectingMember(target);
      return;
    }

    if (newStatus === 'approved') {
      await handleQuickApprove(target);
      return;
    }

    // Set back to pending
    await updateMemberInFirebase(memberId, {
      ...target,
      status: newStatus,
      rejectionReason: null as any
    });
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus, rejectionReason: undefined } : m));
    if (selectedMember && selectedMember.id === memberId) {
      setSelectedMember(prev => prev ? { ...prev, status: newStatus, rejectionReason: undefined } : null);
    }
  };

  const handleConfirmRejection = async (reason: string) => {
    if (!rejectingMember || !rejectingMember.id) return;
    const memberId = rejectingMember.id;
    try {
      await updateMemberInFirebase(memberId, {
        ...rejectingMember,
        status: 'rejected',
        rejectionReason: reason
      });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'rejected', rejectionReason: reason } : m));
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(prev => prev ? { ...prev, status: 'rejected', rejectionReason: reason } : null);
      }
      setRejectingMember(null);
    } catch (err: any) {
      console.error('Error rejecting member:', err);
      alert('Error rejecting member: ' + (err?.message || 'Check connection'));
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
    const cached = JSON.parse(localStorage.getItem('ngdc_sc_firebase_members_v1') || '[]');
    const saved = cached.find((m: SubmissionRecord) => m.id === id) || { ...newRecord, id };
    setMembers(prev => [saved, ...prev.filter(m => m.id !== id)]);
    setShowAddMemberModal(false);
  };

  const exportMembersCSV = () => {
    if (members.length === 0) {
      alert('No members data to export');
      return;
    }
    const headers = [
      'Membership ID',
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
      'Status',
      'Rejection Reason'
    ];

    const rows = members.map(m => [
      `"${m.membershipId || ''}"`,
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
      `"${m.status || 'pending'}"`,
      `"${m.rejectionReason || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ngdc_science_club_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Committee Actions
  const handleSaveExecutive = async (exec: ExecutiveMember) => {
    await saveCommitteeMemberToFirebase(exec);
    setCommittee(prev => {
      const exists = prev.some(m => m.id === exec.id);
      return exists ? prev.map(m => m.id === exec.id ? exec : m) : [...prev, exec];
    });
    setEditingExecutive(null);
    setShowAddExecutiveModal(false);
  };

  const handleDeleteExecutive = async (execId: string | undefined) => {
    if (!execId) return;
    if (!window.confirm('Delete this executive member?')) return;
    await deleteCommitteeMemberFromFirebase(execId);
    setCommittee(prev => prev.filter(m => m.id !== execId));
  };

  const handleResetCommittee = async () => {
    if (!window.confirm('Reset committee to official default list?')) return;
    await seedDefaultCommittee(INITIAL_COMMITTEE);
    setCommittee(INITIAL_COMMITTEE);
  };

  // Notice Actions
  const handleSaveNotice = async (notice: ClubNotice) => {
    try {
      await saveNoticeToFirebase(notice);
      setNotices(prev => {
        const exists = prev.some(n => n.id === notice.id);
        return exists ? prev.map(n => n.id === notice.id ? notice : n) : [notice, ...prev];
      });
      setEditingNotice(null);
      setShowAddNoticeModal(false);
    } catch (err: any) {
      console.error('Error saving notice:', err);
      alert('Failed to save notice: ' + (err?.message || 'Check attachment size and try again.'));
    }
  };

  const handleDeleteNotice = async (noticeId: string | undefined) => {
    if (!noticeId) return;
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    await deleteNoticeFromFirebase(noticeId);
    setNotices(prev => prev.filter(n => n.id !== noticeId));
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchSearch = 
      (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.studentId || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.phone || '').includes(memberSearch) ||
      (m.email || '').toLowerCase().includes(memberSearch.toLowerCase());

    const matchBatch = filterBatch === 'All' || m.batch === filterBatch;
    const matchSection = filterSection === 'All' || m.section === filterSection;
    const matchStatus = filterStatus === 'All' || m.status === filterStatus;

    return matchSearch && matchBatch && matchSection && matchStatus;
  });

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-600">Verifying Club Admin Permissions...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Login Screen (Clean Light Theme)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm text-center p-7 bg-white border border-slate-200 rounded-3xl shadow-xl formal-page-enter">
          <div className="flex justify-center mb-4">
            <img 
              src={CLUB_LOGO_URL} 
              alt="NGDC Science Club Logo" 
              className="h-20 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:scale-105 transition-transform" 
              referrerPolicy="no-referrer"
            />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-0.5">
            NGDC SCIENCE CLUB
          </h1>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-6">
            Official Administrative Portal
          </p>

          {loginError === 'operation-not-allowed' ? (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Google Sign-in Not Enabled</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-snug">
                Firebase Console-এ Google Sign-in এনাবল করা হয়নি।
              </p>
              <div className="text-[10px] text-slate-700 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 font-mono">
                <p>1. console.firebase.google.com-এ যান</p>
                <p>2. Authentication → Sign-in method</p>
                <p>3. Google সিলেক্ট করে Enable করুন ও Save দিন</p>
              </div>
            </div>
          ) : loginError ? (
            <p className="text-xs text-rose-600 font-medium mb-4">
              {loginError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loginSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loginSubmitting ? 'Signing in...' : 'Sign in with Authorized Account'}</span>
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Back to Public Site
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==================== AUTHENTICATED ADMIN PANEL (LIGHT THEME) ====================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-3 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src={CLUB_LOGO_URL} 
            alt="Logo" 
            className="h-8 w-auto object-contain shrink-0" 
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 truncate">
                NGDC SCIENCE CLUB
              </h1>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">{currentUser?.email || 'Authorized Administrator'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">View Public Site</span>
            <span className="sm:hidden text-[11px]">Site</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Floating Copied Toast */}
      {copiedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow-lg backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Main Navigation Tabs - Fully Responsive Horizontal Scroll */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 shadow-xs sticky top-[57px] z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          {/* 1. Dashboard Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* 2. Members Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'members'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Members</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'members' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-700'
            }`}>
              {members.length}
            </span>
          </button>

          {/* 3. Executive Committee Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('committee')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'committee'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Executive Panel</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'committee' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-700'
            }`}>
              {committee.length}
            </span>
          </button>

          {/* 4. Notices Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('notices')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'notices'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Notices</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'notices' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-700'
            }`}>
              {notices.length}
            </span>
          </button>

          {/* Refresh Button */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAllData}
              disabled={loadingData}
              title="Refresh Data"
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6">
        
        {/* ===================== TAB 0: DASHBOARD ===================== */}
        {activeTab === 'dashboard' && (
          <AdminDashboardView
            members={members}
            onSelectMember={(m) => setSelectedMember(m)}
            onGoToMembersTab={() => setActiveTab('members')}
          />
        )}

        {/* ===================== TAB 1: MEMBERS ===================== */}
        {activeTab === 'members' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            
            {/* Filter & Action Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name, roll, phone, email..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Batch Filter */}
                  <select
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white"
                  >
                    <option value="All">All Batches</option>
                    <option value="HSC 27">HSC 27</option>
                    <option value="HSC 28">HSC 28</option>
                  </select>

                  {/* Section Filter */}
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white"
                  >
                    <option value="All">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                    <option value="E">Section E</option>
                    <option value="F">Section F</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white"
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export</span>
                  </button>

                  {/* Add Member Manually */}
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              {/* Bulk Copy Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 mr-1">
                  <Copy className="w-3 h-3 text-emerald-600" />
                  <span>Bulk Copy:</span>
                </span>
                <button
                  type="button"
                  onClick={copyAllPhones}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>Phones ({filteredMembers.filter(m => m.phone).length})</span>
                </button>

                <button
                  type="button"
                  onClick={copyAllWhatsApp}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3 text-[#25D366]" />
                  <span>WhatsApp ({filteredMembers.filter(m => m.whatsapp || m.phone).length})</span>
                </button>

                <button
                  type="button"
                  onClick={copyAllEmails}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span>Emails ({filteredMembers.filter(m => m.email).length})</span>
                </button>
              </div>
            </div>

            {/* Mobile View: Responsive Card List (Visible on Phone Screens < md) */}
            <div className="md:hidden space-y-3">
              {filteredMembers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 font-medium text-xs">
                  No registered members found matching filter criteria.
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div key={member.id || member.submittedAt} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                            onClick={() => setSelectedMember(member)}
                          />
                        ) : (
                          <div 
                            onClick={() => setSelectedMember(member)}
                            className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0"
                          >
                            {member.name ? member.name.charAt(0) : '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p 
                            className="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-emerald-600"
                            onClick={() => setSelectedMember(member)}
                          >
                            {member.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-mono">
                            {member.membershipId && (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 text-[10px] tracking-wide">
                                {member.membershipId}
                              </span>
                            )}
                            <span>Roll: {member.studentId || 'N/A'} • {member.batch} (Sec {member.section})</span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                        member.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : member.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {member.status || 'pending'}
                      </span>
                    </div>

                    {/* Contacts & Quick Copy */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-mono text-[11px] truncate">{member.phone || 'No phone'}</span>
                        {member.phone && (
                          <button 
                            type="button" 
                            onClick={() => copyToClipboard(member.phone, 'Phone')} 
                            className="text-slate-400 hover:text-emerald-600 p-1"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-mono text-[11px] truncate">WA: {member.whatsapp || member.phone || 'N/A'}</span>
                        {(member.whatsapp || member.phone) && (
                          <button 
                            type="button" 
                            onClick={() => copyToClipboard(member.whatsapp || member.phone, 'WhatsApp')} 
                            className="text-slate-400 hover:text-emerald-600 p-1"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {member.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleQuickApprove(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                        {member.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleQuickReject(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                        {member.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <Check className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMember(member)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id!)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {member.status === 'rejected' && (
                      <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                            Rejection Reason:
                          </span>
                          <button
                            type="button"
                            onClick={() => setRejectingMember(member)}
                            className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="text-[11px] text-rose-950 font-medium line-clamp-2">
                          {member.rejectionReason || 'No reason provided'}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Full Table (Visible on Tablets/Desktop >= md) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Photo &amp; Name</th>
                      <th className="py-3 px-4">Roll / ID</th>
                      <th className="py-3 px-4">Batch &amp; Sec</th>
                      <th className="py-3 px-4">Phone &amp; WhatsApp</th>
                      <th className="py-3 px-4">Submission Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 font-semibold">
                          No registered members found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id || member.submittedAt} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {member.photo ? (
                                <img
                                  src={member.photo}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:border-emerald-500 transition-colors"
                                  onClick={() => setSelectedMember(member)}
                                />
                              ) : (
                                <div 
                                  onClick={() => setSelectedMember(member)}
                                  className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0 cursor-pointer hover:border-emerald-500"
                                >
                                  {member.name ? member.name.charAt(0) : '?'}
                                </div>
                              )}
                              <div>
                                <p 
                                  className="font-bold text-slate-900 hover:text-emerald-600 cursor-pointer transition-colors"
                                  onClick={() => setSelectedMember(member)}
                                >
                                  {member.name}
                                </p>
                                {member.membershipId && (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-bold text-[10px] tracking-wide my-0.5">
                                    {member.membershipId}
                                  </span>
                                )}
                                {member.email ? (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                    <span className="truncate max-w-[150px]">{member.email}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(member.email, 'Email')}
                                      title="Copy email"
                                      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400">No email</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {member.studentId || '—'}
                          </td>

                          <td className="py-3 px-4 font-bold">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-slate-900">{member.batch}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-600">
                                Sec {member.section}
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-slate-800 font-bold">
                              <a href={`tel:${member.phone}`} className="hover:text-emerald-600 transition-colors">{member.phone}</a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(member.phone, 'Phone')}
                                title="Copy Phone Number"
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            {member.whatsapp && (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono mt-0.5">
                                <span>WA: {member.whatsapp}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(member.whatsapp, 'WhatsApp')}
                                  title="Copy WhatsApp Number"
                                  className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {member.submittedAt || '—'}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              member.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : member.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {member.status || 'pending'}
                            </span>
                            {member.status === 'rejected' && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-700">
                                <span className="truncate max-w-[120px]" title={member.rejectionReason || 'No reason provided'}>
                                  {member.rejectionReason || 'No reason'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setRejectingMember(member)}
                                  className="underline font-bold text-rose-800 hover:text-rose-950 cursor-pointer"
                                  title="Edit rejection reason"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {member.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickApprove(member)}
                                  title="Approve Member"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}

                              {member.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickReject(member)}
                                  title="Reject Member"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedMember(member)}
                                title="View details"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                title="Edit member &amp; photo"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id!)}
                                title="Delete record"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Executive Committee Management</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update executive photos, designations, names, and order. Changes immediately reflect on the public website.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetCommittee}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Default</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddExecutiveModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
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
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                    <img
                      src={exec.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                      alt={exec.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingExecutive(exec)}
                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-sm transition-colors cursor-pointer"
                        title="Change Photo &amp; Edit"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    </div>

                    <div className="absolute bottom-2 left-3 right-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wide shadow-xs">
                        {exec.role}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {exec.name}
                      </h3>
                      {exec.batch && (
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{exec.batch}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">#{exec.order || idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingExecutive(exec)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExecutive(exec.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span>Notices &amp; Circular Management</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish club announcements, PDF circulars, and event updates to the live notice board.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddNoticeModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Notice</span>
              </button>
            </div>

            <div className="space-y-3">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {notice.isPinned && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          Pinned
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">
                        {notice.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingNotice(notice)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 mb-1">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {notice.content}
                  </p>

                  {notice.fileUrl && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 w-fit">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Attached: {notice.fileName || 'Notice Attachment'}</span>
                      <a 
                        href={notice.fileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="underline ml-1 font-bold text-emerald-800 hover:text-emerald-950"
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

      {/* ===================== MODAL: MEMBER DETAILS ===================== */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-900">Member Registration Details</h3>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center gap-4">
                {selectedMember.photo ? (
                  <img
                    src={selectedMember.photo}
                    alt={selectedMember.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">
                    {selectedMember.name ? selectedMember.name.charAt(0) : '?'}
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-black text-slate-900">{selectedMember.name}</h4>
                  <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">Roll: {selectedMember.studentId || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{selectedMember.batch} • Section {selectedMember.section}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {selectedMember.membershipId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
                        ID: {selectedMember.membershipId}
                      </span>
                    )}
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedMember.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : selectedMember.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      Status: {selectedMember.status || 'pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-2 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Phone</span>
                    <a href={`tel:${selectedMember.phone}`} className="font-bold text-slate-900 hover:text-emerald-700">{selectedMember.phone || 'N/A'}</a>
                  </div>
                  {selectedMember.phone && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedMember.phone, 'Phone')}
                      className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-emerald-700 border border-slate-200 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">WhatsApp</span>
                    <span className="font-bold text-emerald-700">{selectedMember.whatsapp || selectedMember.phone || 'N/A'}</span>
                  </div>
                  {(selectedMember.whatsapp || selectedMember.phone) && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedMember.whatsapp || selectedMember.phone, 'WhatsApp')}
                      className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-[#25D366] border border-slate-200 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Email</span>
                    <span className="font-semibold text-slate-800">{selectedMember.email || 'None'}</span>
                  </div>
                  {selectedMember.email && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedMember.email, 'Email')}
                      className="p-1.5 rounded-lg bg-white text-slate-500 hover:text-blue-600 border border-slate-200 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Date of Birth</span>
                  <span className="font-semibold text-slate-700">{selectedMember.dob || '—'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Submitted At</span>
                  <span className="font-semibold text-slate-700">{selectedMember.submittedAt || '—'}</span>
                </div>
              </div>

              {/* Segments */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Interested Segments ({selectedMember.interestedSegments?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMember.interestedSegments?.map((seg, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                      {seg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rejection Reason if Rejected */}
              {selectedMember.status === 'rejected' && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                        Rejection Reason:
                      </span>
                      <button
                        type="button"
                        onClick={() => setRejectingMember(selectedMember)}
                        className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                      >
                        Edit Reason
                      </button>
                    </div>
                    <p className="text-xs text-rose-950 font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedMember.rejectionReason || 'No reason provided'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedMember.id!, 'approved')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedMember.id!, 'rejected')}
                  className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition-colors"
                >
                  Reject
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT MEMBER ===================== */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-black text-slate-900">Edit Member Information</h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Photo */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  {editingMember.photo ? (
                    <img
                      src={editingMember.photo}
                      alt={editingMember.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 font-bold">
                      <Camera className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-[10px]">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <p className="text-xs font-bold text-slate-900">Member Profile Photo</p>
                  <p className="text-[11px] text-slate-500">Upload or remove photo (auto-compressed).</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={memberPhotoInputRef}
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleMemberPhotoUpload(e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => memberPhotoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editingMember.photo ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                    {editingMember.photo && (
                      <button
                        type="button"
                        onClick={() => setEditingMember({ ...editingMember, photo: null })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Membership ID (Editable by Admin) */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <label className="font-bold text-emerald-950 block mb-1 text-xs uppercase tracking-wider">
                  Membership ID (e.g. NGDCSC-001)
                </label>
                <input
                  type="text"
                  value={editingMember.membershipId || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, membershipId: e.target.value.toUpperCase() })}
                  placeholder="NGDCSC-001"
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-slate-900 focus:outline-none focus:border-emerald-600 font-mono font-black text-sm tracking-wider uppercase"
                />
                <span className="text-[10px] text-emerald-700 mt-1 block">
                  Students can search and check their application status using this Membership ID.
                </span>
              </div>

              {/* Basic Fields */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Roll / Student ID</label>
                  <input
                    type="text"
                    value={editingMember.studentId}
                    onChange={(e) => setEditingMember({ ...editingMember, studentId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batch</label>
                  <select
                    value={editingMember.batch}
                    onChange={(e) => setEditingMember({ ...editingMember, batch: e.target.value as BatchType })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="HSC 27">HSC 27</option>
                    <option value="HSC 28">HSC 28</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Section</label>
                  <select
                    value={editingMember.section}
                    onChange={(e) => setEditingMember({ ...editingMember, section: e.target.value as SectionType })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                    <option value="E">Section E</option>
                    <option value="F">Section F</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editingMember.status || 'pending'}
                    onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as MemberStatus })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingMember.phone}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editingMember.whatsapp}
                    onChange={(e) => setEditingMember({ ...editingMember, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: FAST MANUAL ADD MEMBER (FLEXIBLE & ALL FIELDS OPTIONAL) ===================== */}
      {showAddMemberModal && (
        <AddMemberManualModal
          suggestedId={getNextMembershipId(members)}
          onClose={() => setShowAddMemberModal(false)}
          onAdd={handleAddMemberSubmit}
        />
      )}

      {/* ===================== MODAL: ADD / EDIT EXECUTIVE ===================== */}
      {(showAddExecutiveModal || editingExecutive) && (
        <ExecutiveModal
          initialData={editingExecutive}
          onClose={() => { setShowAddExecutiveModal(false); setEditingExecutive(null); }}
          onSave={handleSaveExecutive}
        />
      )}

      {/* ===================== MODAL: ADD / EDIT NOTICE ===================== */}
      {(showAddNoticeModal || editingNotice) && (
        <NoticeModal
          initialNotice={editingNotice}
          onClose={() => { setShowAddNoticeModal(false); setEditingNotice(null); }}
          onSave={handleSaveNotice}
        />
      )}

      {/* ===================== MODAL: REJECT MEMBER REASON ===================== */}
      {rejectingMember && (
        <RejectModal
          member={rejectingMember}
          onClose={() => setRejectingMember(null)}
          onConfirm={handleConfirmRejection}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// FLEXIBLE MANUAL ADD MODAL (All fields are optional for Admin)
// -------------------------------------------------------------
function AddMemberManualModal({ 
  suggestedId,
  onClose, 
  onAdd 
}: { 
  suggestedId?: string;
  onClose: () => void; 
  onAdd: (e: React.FormEvent, record: SubmissionRecord) => void 
}) {
  const [membershipId, setMembershipId] = useState(suggestedId || '');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(e, {
      membershipId: (membershipId.trim() || suggestedId || '').toUpperCase(),
      name: name.trim() || 'Club Member',
      studentId: studentId.trim() || 'N/A',
      phone: phone.trim() || 'N/A',
      whatsapp: whatsapp.trim() || phone.trim() || 'N/A',
      email: email.trim(),
      batch,
      section,
      dob: dob || '',
      photo,
      sameAsPhone: true,
      interestedSegments: selectedSegments.length > 0 ? selectedSegments : ['General Member'],
      agreedToRules: true,
      status: 'approved',
      submittedAt: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-slate-900 font-sans">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-black text-slate-900">Manual Member Registration</h3>
            <p className="text-[11px] text-emerald-700 font-bold">Admin Mode: All fields are completely optional</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Membership ID */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <label className="font-bold text-emerald-950 block mb-1 text-xs uppercase tracking-wider">
              Membership ID (Auto-serial)
            </label>
            <input
              type="text"
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value.toUpperCase())}
              placeholder="e.g. NGDCSC-001"
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-slate-900 focus:outline-none focus:border-emerald-600 font-mono font-black text-sm tracking-wider uppercase"
            />
            <span className="text-[10px] text-emerald-700 mt-1 block">
              Serially assigned. You can customize or edit this ID if needed.
            </span>
          </div>

          {/* Quick Notice for Admin */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
            💡 <strong>Fast Admin Entry:</strong> আপনি চাইলে যে কোনো ফিল্ড ফাঁকা রাখতে পারেন (Name, Phone বা Roll যেটুকু তথ্য আছে সেটুকুই দিতে পারবেন)।
          </div>

          {/* Photo Upload */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              {photo ? (
                <img src={photo} alt="Preview" className="w-18 h-18 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs" />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 font-bold">
                  <Camera className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px]">Optional</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <p className="text-xs font-bold text-slate-900">Member Photo (Optional)</p>
              <p className="text-[11px] text-slate-500">Attach student photo if available.</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input type="file" ref={fileRef} accept="image/*" onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photo ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Name (Optional)</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Abdullah Al Mamun" 
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 font-bold" 
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Roll / Student ID (Optional)</label>
              <input 
                type="text" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)} 
                placeholder="e.g. 2701" 
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono font-bold" 
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Batch</label>
              <select 
                value={batch} 
                onChange={(e) => setBatch(e.target.value as any)} 
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold"
              >
                <option value="HSC 27">HSC 27</option>
                <option value="HSC 28">HSC 28</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Section</label>
              <select 
                value={section} 
                onChange={(e) => setSection(e.target.value as any)} 
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                <option value="E">Section E</option>
                <option value="F">Section F</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number (Optional)</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="017xxxxxxxx" 
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-mono font-bold" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">WhatsApp (Optional)</label>
              <input 
                type="text" 
                value={whatsapp} 
                placeholder="Leave blank for same" 
                onChange={(e) => setWhatsapp(e.target.value)} 
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-mono" 
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email (Optional)</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="student@gmail.com" 
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white" 
              />
            </div>
          </div>

          {/* Segments */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <label className="font-bold text-slate-900 text-xs block">
              Interested Segments ({selectedSegments.length})
            </label>

            <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-xl bg-white border border-slate-200">
              {selectedSegments.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No segments picked (defaults to General Member).</span>
              ) : (
                selectedSegments.map((seg, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                  >
                    <span>{seg}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSegments(prev => prev.filter((_, i) => i !== idx))}
                      className="hover:text-rose-600 ml-0.5 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Custom input */}
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
                placeholder="Type custom segment and press Add..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleAddManualSegment}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
              >
                + Add
              </button>
            </div>

            {/* Quick Toggle Standard */}
            <div className="flex flex-wrap gap-1 pt-1">
              {STANDARD_SEGMENTS.map(std => {
                const isSelected = selectedSegments.includes(std);
                return (
                  <button
                    key={std}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSegments(prev => prev.filter(s => s !== std));
                      } else {
                        setSelectedSegments(prev => [...prev, std]);
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {std.split('(')[0].trim()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors cursor-pointer">
              Save Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// EXECUTIVE MODAL (Light Theme)
// -------------------------------------------------------------
function ExecutiveModal({
  initialData,
  onClose,
  onSave
}: {
  initialData: ExecutiveMember | null;
  onClose: () => void;
  onSave: (exec: ExecutiveMember) => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [role, setRole] = useState(initialData?.role || '');
  const [batch, setBatch] = useState(initialData?.batch || 'HSC 26');
  const [image, setImage] = useState(initialData?.image || '');
  const [order, setOrder] = useState<number>(initialData?.order || 1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || `exec_${Date.now()}`,
      name,
      role,
      batch,
      image,
      order: Number(order)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-900 font-sans">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-black text-slate-900">
            {initialData ? 'Edit Executive Member' : 'Add Executive Member'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden border border-slate-300 shrink-0">
              {image ? (
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Camera className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Upload Photo
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold" />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Designation / Role</label>
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. President, General Secretary" required className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Batch / Class</label>
              <input type="text" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. HSC 26" className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Display Order</label>
              <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} min={1} className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-mono font-bold" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors cursor-pointer">
              Save Executive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// REJECT REASON MODAL (Allows manual custom reason input)
// -------------------------------------------------------------
function RejectModal({
  member,
  onClose,
  onConfirm
}: {
  member: SubmissionRecord;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(member.rejectionReason || '');
  const [submitting, setSubmitting] = useState(false);

  const quickReasons = [
    'Invalid or unclear photo',
    'Student ID does not match official college records',
    'Incorrect HSC Batch or Section',
    'Duplicate registration submission',
    'Contact information unreachable'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setSubmitting(true);
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden text-slate-900 font-sans">
        <div className="p-4 sm:p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2 text-rose-800">
            <XCircle className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-black">Reject Member Application</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-12 rounded-lg bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-900 text-sm truncate">{member.name}</h4>
              <p className="text-[11px] text-slate-500 font-mono">
                {member.batch} • Section {member.section} • ID: {member.studentId || 'N/A'}
              </p>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Reason for Rejection (Visible to Member during status check):
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Student ID does not match official college records. Please submit with your correct 10-digit ID."
              required
              className="w-full p-3 rounded-xl bg-slate-50 border border-rose-300 focus:border-rose-500 focus:bg-white text-xs leading-relaxed font-sans"
            />
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Suggestions (Click to add):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(prev => prev ? `${prev}. ${qr}` : qr)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 border border-slate-200 text-[10px] font-semibold transition-all cursor-pointer text-left"
                >
                  + {qr}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{submitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NOTICE MODAL (Light Theme with Robust File Upload & Compression)
// -------------------------------------------------------------
function NoticeModal({
  initialNotice,
  onClose,
  onSave
}: {
  initialNotice: ClubNotice | null;
  onClose: () => void;
  onSave: (notice: ClubNotice) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initialNotice?.title || '');
  const [category, setCategory] = useState<'General' | 'Olympiad' | 'Workshop' | 'Notice' | 'Urgent' | 'Event'>(
    (initialNotice?.category as any) || 'Notice'
  );
  const [content, setContent] = useState(initialNotice?.content || '');
  const [date, setDate] = useState(initialNotice?.date || new Date().toISOString().split('T')[0]);
  const [fileUrl, setFileUrl] = useState<string | null>(initialNotice?.fileUrl || null);
  const [fileName, setFileName] = useState<string | null>(initialNotice?.fileName || null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'doc' | null>(initialNotice?.fileType || null);
  const [isPinned, setIsPinned] = useState(initialNotice?.isPinned || false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setFileError(null);
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isImage) {
      setUploadingFile(true);
      setFileName(file.name);
      setFileType('image');
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          const MAX_DIM = 1200;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) { h = Math.round((h * MAX_DIM) / w); w = MAX_DIM; }
            else { w = Math.round((w * MAX_DIM) / h); h = MAX_DIM; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setFileUrl(compressed);
          } else {
            setFileUrl(rawData);
          }
          setUploadingFile(false);
        };
        img.onerror = () => {
          setFileUrl(rawData);
          setUploadingFile(false);
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or other document
      if (file.size > 800 * 1024) {
        setFileError('File size exceeds 800KB. For reliable storage in Firestore, please upload a document under 800KB.');
        return;
      }
      setUploadingFile(true);
      setFileName(file.name);
      setFileType(isPdf ? 'pdf' : 'doc');
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileUrl(e.target?.result as string);
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setFileUrl(null);
    setFileName(null);
    setFileType(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        id: initialNotice?.id || `notice_${Date.now()}`,
        title: title.trim(),
        category,
        content: content.trim(),
        date,
        fileUrl: fileUrl ? fileUrl : null,
        fileName: fileUrl && fileName ? fileName : null,
        fileType: fileUrl && fileType ? fileType : null,
        isPinned: Boolean(isPinned)
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-900 font-sans">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-black text-slate-900">
            {initialNotice ? 'Edit Notice' : 'Publish Notice'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Notice Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              placeholder="e.g. Science Fair Registration Open"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-bold cursor-pointer"
              >
                <option value="Notice">Notice</option>
                <option value="General">General</option>
                <option value="Urgent">Urgent</option>
                <option value="Olympiad">Olympiad</option>
                <option value="Workshop">Workshop</option>
                <option value="Event">Event</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Date *</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white font-mono" 
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Notice Description / Message</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detailed description of the announcement..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white text-xs leading-relaxed"
            />
          </div>

          {/* Attachment Box with Preview & Validation */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Notice Attachment (Image or PDF)</span>
              </label>
              {fileUrl && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-rose-600 hover:text-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*,application/pdf" 
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
              className="hidden" 
            />

            {uploadingFile ? (
              <div className="p-4 rounded-xl bg-slate-100 flex items-center justify-center gap-2 text-slate-600 font-semibold">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Processing &amp; optimizing file...</span>
              </div>
            ) : fileUrl ? (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
                {fileType === 'image' ? (
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    <img src={fileUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-xs truncate">
                    {fileName || (fileType === 'image' ? 'Attached Image' : 'Attached Document')}
                  </p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase border border-emerald-200">
                    {fileType === 'image' ? 'Image Attached' : 'PDF Document Attached'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-700 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Choose Image or PDF Document</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Supported: JPG, PNG, WebP (auto-compressed) &amp; PDF (up to 800KB)
                </p>
              </div>
            )}

            {fileError && (
              <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isPinned" className="font-bold text-slate-700 cursor-pointer">
              Pin notice to top
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting || uploadingFile}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialNotice ? 'Update Notice' : 'Publish Notice'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
