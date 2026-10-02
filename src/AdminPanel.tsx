import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Image as ImageIcon,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Settings,
  Lock,
  Sparkles
} from 'lucide-react';
import ImageAdjustModal from './components/ImageAdjustModal';
import { 
  SubmissionRecord, 
  ExecutiveMember, 
  ClubNotice, 
  MemberStatus, 
  SectionType, 
  BatchType,
  MembershipRegistrationSetting, 
  RegistrationStatusMode,
  DEFAULT_SKILL_OPTIONS
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
  extractSerial,
  getNextMembershipId,
  generateNextMembershipId,
  subscribeToMembers,
  subscribeToCommittee,
  subscribeToNotices,
  getRegistrationSetting,
  subscribeRegistrationSetting,
  updateRegistrationSetting,
  DEFAULT_REGISTRATION_SETTING
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

type TabType = 'dashboard' | 'members' | 'committee' | 'notices' | 'settings';

export default function AdminPanel({ onExit }: AdminPanelProps) {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form state
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Active Tab: Default is 'dashboard' with rich graphs
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Data states: initialized instantly from localStorage cache so there is ZERO lag on open/refresh
  const [members, setMembers] = useState<SubmissionRecord[]>(() => {
    try {
      const raw = localStorage.getItem('ngdcsc_firebase_members_cache') || localStorage.getItem('ngdc_sc_submissions_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [committee, setCommittee] = useState<ExecutiveMember[]>(() => {
    try {
      const raw = localStorage.getItem('ngdcsc_firebase_committee_cache');
      return raw ? JSON.parse(raw) : INITIAL_COMMITTEE;
    } catch {
      return INITIAL_COMMITTEE;
    }
  });
  const [notices, setNotices] = useState<ClubNotice[]>(() => {
    try {
      const raw = localStorage.getItem('ngdcsc_firebase_notices_cache');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loadingData, setLoadingData] = useState(false);

  // Photo Adjust Modal State
  const [adjustingPhotoModal, setAdjustingPhotoModal] = useState<{
    src: string;
    onApply: (dataUrl: string) => void;
  } | null>(null);

  // Members Tab Filters & Modals
  const [memberSearch, setMemberSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState<string>('All');
  const [filterSection, setFilterSection] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSkill, setFilterSkill] = useState<string>('All');
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

  // Registration Settings State
  const [regSetting, setRegSetting] = useState<MembershipRegistrationSetting>(DEFAULT_REGISTRATION_SETTING);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [savingRegSetting, setSavingRegSetting] = useState(false);
  const [draftStatus, setDraftStatus] = useState<RegistrationStatusMode>('open');
  const [draftHeadline, setDraftHeadline] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);

  // Sync draft fields whenever regSetting changes
  useEffect(() => {
    if (regSetting) {
      setDraftStatus(regSetting.status);
      setDraftHeadline(regSetting.headline || '');
      setDraftMessage(regSetting.message || '');
    }
  }, [regSetting]);

  const activeSkills = useMemo(() => {
    return (regSetting.skills && regSetting.skills.length > 0)
      ? regSetting.skills
      : DEFAULT_SKILL_OPTIONS;
  }, [regSetting.skills]);

  // Combined list of distinct skills available across club settings and registered members
  const availableSkillsForFilter = useMemo(() => {
    const set = new Set<string>();
    activeSkills.forEach(s => {
      if (s && s.trim()) set.add(s.trim());
    });
    members.forEach(m => {
      (m.skills || []).forEach(s => {
        if (s && s.trim()) set.add(s.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeSkills, members]);

  const handleQuickChangeStatus = async (newStatus: RegistrationStatusMode) => {
    setSavingRegSetting(true);
    const updated: MembershipRegistrationSetting = {
      status: newStatus,
      headline: newStatus === 'coming_soon' 
        ? 'NGDC Science Club Membership Registration Coming Soon' 
        : newStatus === 'closed' 
        ? 'NGDC Science Club Membership Registration is Currently Closed' 
        : 'NGDC Science Club Online Membership Registration',
      message: newStatus === 'coming_soon'
        ? 'The official membership registration for NGDC Science Club (New Government Degree College, Rajshahi) will open soon for HSC 27 and HSC 28 sessions. Eleventh and twelfth grade science students are requested to prepare their college information and photograph. For any inquiries, please contact us via email at ngdcsc.org@gmail.com.'
        : newStatus === 'closed'
        ? 'The membership registration window for NGDC Science Club (New Government Degree College, Rajshahi) is currently closed for this session. Thank you for your interest. For any queries or assistance, please contact us via email at ngdcsc.org@gmail.com.'
        : 'Welcome to NGDC Science Club (New Government Degree College, Rajshahi). Please complete the form below to join our community.',
      skills: activeSkills
    };

    setRegSetting(updated);
    setDraftStatus(newStatus);
    setDraftHeadline(updated.headline || '');
    setDraftMessage(updated.message || '');
    setCopiedToast(`Registration status set to: ${newStatus === 'open' ? 'Open (Active)' : newStatus === 'closed' ? 'Closed Now' : 'Coming Soon'}`);
    setTimeout(() => setCopiedToast(null), 2500);

    try {
      await updateRegistrationSetting(updated);
    } catch (err) {
      console.error('Failed to update registration setting:', err);
      alert('Failed to update registration setting in Firebase.');
    } finally {
      setSavingRegSetting(false);
    }
  };

  const handleSaveCustomSetting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingRegSetting(true);
    const updated: MembershipRegistrationSetting = {
      status: draftStatus,
      headline: draftHeadline.trim() || undefined,
      message: draftMessage.trim() || undefined,
      skills: activeSkills
    };

    setRegSetting(updated);
    setCopiedToast('Registration portal settings updated!');
    setTimeout(() => setCopiedToast(null), 2500);
    setShowSettingModal(false);

    try {
      await updateRegistrationSetting(updated);
    } catch (err) {
      console.error('Failed to update registration setting:', err);
      alert('Failed to update registration setting in Firebase.');
    } finally {
      setSavingRegSetting(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkillInput.trim()) return;
    const trimmed = newSkillInput.trim();
    const current = [...activeSkills];
    if (current.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setCopiedToast('Skill already exists in the list!');
      setTimeout(() => setCopiedToast(null), 2500);
      return;
    }

    const updatedSkills = [...current, trimmed];
    const updatedSetting: MembershipRegistrationSetting = {
      ...regSetting,
      skills: updatedSkills
    };

    setRegSetting(updatedSetting);
    setNewSkillInput('');
    setCopiedToast(`Added skill: "${trimmed}"`);
    setTimeout(() => setCopiedToast(null), 2500);

    try {
      setSavingSkills(true);
      await updateRegistrationSetting(updatedSetting);
    } catch (err) {
      console.error('Failed to save skill:', err);
    } finally {
      setSavingSkills(false);
    }
  };

  const handleDeleteSkill = async (skillToDelete: string) => {
    const updatedSkills = activeSkills.filter(s => s !== skillToDelete);
    const updatedSetting: MembershipRegistrationSetting = {
      ...regSetting,
      skills: updatedSkills
    };

    setRegSetting(updatedSetting);
    setCopiedToast(`Removed skill: "${skillToDelete}"`);
    setTimeout(() => setCopiedToast(null), 2500);

    try {
      setSavingSkills(true);
      await updateRegistrationSetting(updatedSetting);
    } catch (err) {
      console.error('Failed to update skills:', err);
    } finally {
      setSavingSkills(false);
    }
  };

  const handleResetSkills = async () => {
    if (!window.confirm('Reset all skills to the default club skill options?')) return;
    const updatedSetting: MembershipRegistrationSetting = {
      ...regSetting,
      skills: [...DEFAULT_SKILL_OPTIONS]
    };

    setRegSetting(updatedSetting);
    setCopiedToast('Reset skills to default options!');
    setTimeout(() => setCopiedToast(null), 2500);

    try {
      setSavingSkills(true);
      await updateRegistrationSetting(updatedSetting);
    } catch (err) {
      console.error('Failed to reset skills:', err);
    } finally {
      setSavingSkills(false);
    }
  };

  const handleMemberPhotoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Photo size cannot exceed 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (raw) {
        setAdjustingPhotoModal({
          src: raw,
          onApply: (adjusted) => {
            setEditingMember(prev => prev ? { ...prev, photo: adjusted } : null);
          }
        });
      }
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

  // Real-time synchronization when authenticated: immediately reflects updates across all devices
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoadingData(true);
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 3) setLoadingData(false);
    };

    // 1. Members real-time stream
    const unsubMembers = subscribeToMembers((liveMembers) => {
      setMembers(liveMembers);
      checkLoaded();
    });

    // 2. Executive committee real-time stream
    const unsubCommittee = subscribeToCommittee((liveCommittee) => {
      setCommittee(liveCommittee);
      checkLoaded();
    }, INITIAL_COMMITTEE);

    // 3. Notices real-time stream
    const unsubNotices = subscribeToNotices((liveNotices) => {
      setNotices(liveNotices);
      checkLoaded();
    });

    // 4. Registration setting real-time stream
    const unsubSetting = subscribeRegistrationSetting((setting) => {
      setRegSetting(setting);
    });

    return () => {
      unsubMembers();
      unsubCommittee();
      unsubNotices();
      unsubSetting();
    };
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

  // Member Actions - Instant Optimistic UI for silky smooth 60fps responsiveness
  const handleQuickApprove = async (member: SubmissionRecord) => {
    if (!member.id) return;
    try {
      let membershipId = member.membershipId;
      if (!membershipId) {
        membershipId = getNextMembershipId(members);
      }

      // Optimistic instant local state update
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

      // Async write in background
      await updateMemberInFirebase(member.id, {
        ...member,
        status: 'approved',
        membershipId,
        rejectionReason: null as any
      });
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

    // Set back to pending - Optimistic update first
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus, rejectionReason: undefined } : m));
    if (selectedMember && selectedMember.id === memberId) {
      setSelectedMember(prev => prev ? { ...prev, status: newStatus, rejectionReason: undefined } : null);
    }

    try {
      await updateMemberInFirebase(memberId, {
        ...target,
        status: newStatus,
        rejectionReason: null as any
      });
    } catch (err) {
      console.warn('Status change warning:', err);
    }
  };

  const handleConfirmRejection = async (reason: string) => {
    if (!rejectingMember || !rejectingMember.id) return;
    const memberId = rejectingMember.id;
    const target = rejectingMember;
    setRejectingMember(null);

    // Optimistic update
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'rejected', rejectionReason: reason } : m));
    if (selectedMember && selectedMember.id === memberId) {
      setSelectedMember(prev => prev ? { ...prev, status: 'rejected', rejectionReason: reason } : null);
    }

    try {
      await updateMemberInFirebase(memberId, {
        ...target,
        status: 'rejected',
        rejectionReason: reason
      });
    } catch (err: any) {
      console.error('Error rejecting member:', err);
      alert('Error rejecting member: ' + (err?.message || 'Check connection'));
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this member registration?')) return;
    const target = members.find(m => m.id === memberId);
    // Optimistic delete
    setMembers(prev => prev.filter(m => m.id !== memberId));
    if (selectedMember?.id === memberId) setSelectedMember(null);
    try {
      await deleteMemberFromFirebase(memberId, target);
    } catch (err) {
      console.warn('Delete warning:', err);
    }
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.id) return;
    const memberId = editingMember.id;
    const updated = { ...editingMember, id: memberId };
    // Optimistic save
    setMembers(prev => prev.map(m => m.id === memberId ? updated : m));
    setEditingMember(null);
    try {
      await updateMemberInFirebase(memberId, updated);
    } catch (err) {
      console.warn('Update error:', err);
    }
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
      'Skills & Talents',
      'Experience & Achievements',
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
      `"${(m.skills || []).join('; ')}"`,
      `"${(m.experienceAchievements || '').replace(/"/g, '""')}"`,
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

  // Filtered and serially ordered members list (1, 2, 3...)
  const filteredMembers = useMemo(() => {
    return [...members]
      .filter(m => {
        const matchSearch = 
          (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
          (m.studentId || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
          (m.phone || '').includes(memberSearch) ||
          (m.membershipId || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
          (m.email || '').toLowerCase().includes(memberSearch.toLowerCase());

        const matchBatch = filterBatch === 'All' || m.batch === filterBatch;
        const matchSection = filterSection === 'All' || m.section === filterSection;
        const matchStatus = filterStatus === 'All' || m.status === filterStatus;
        const matchSkill = filterSkill === 'All' || (m.skills || []).some(s => s.toLowerCase().trim() === filterSkill.toLowerCase().trim());

        return matchSearch && matchBatch && matchSection && matchStatus && matchSkill;
      })
      .sort((a, b) => {
        const aNum = extractSerial(a.membershipId);
        const bNum = extractSerial(b.membershipId);

        // If both have assigned serial IDs, sort numerically: 1, 2, 3, 4, 5...
        if (aNum > 0 && bNum > 0) {
          return aNum - bNum;
        }
        // Member with assigned serial comes first
        if (aNum > 0) return -1;
        if (bNum > 0) return 1;

        // Otherwise sort by submission date
        const aDate = a.createdAt || a.submittedAt || '';
        const bDate = b.createdAt || b.submittedAt || '';
        return aDate.localeCompare(bDate);
      });
  }, [members, memberSearch, filterBatch, filterSection, filterStatus, filterSkill]);

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
                Google Sign-in is not enabled in your Firebase Console project.
              </p>
              <div className="text-[10px] text-slate-700 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 font-mono">
                <p>1. Go to console.firebase.google.com</p>
                <p>2. Authentication &rarr; Sign-in method</p>
                <p>3. Select Google, toggle Enable, and click Save</p>
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
          {/* Quick Registration Portal Status Toggle & Indicator */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
              regSetting.status === 'open'
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : regSetting.status === 'closed'
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
            }`}
            title="Membership Registration Portal Status & Controls (Click to open Settings)"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              regSetting.status === 'open' ? 'bg-emerald-500 animate-pulse' : regSetting.status === 'closed' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
            }`} />
            <span className="hidden sm:inline text-slate-500 font-medium">Form:</span>
            <span className="font-black">
              {regSetting.status === 'open' ? 'Open' : regSetting.status === 'closed' ? 'Closed' : 'Coming Soon'}
            </span>
            <Settings className="w-3.5 h-3.5 ml-0.5 opacity-60" />
          </button>

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

          {/* 5. Registration & Skills Settings Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings &amp; Controls</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              activeTab === 'settings'
                ? 'bg-emerald-700 text-white'
                : regSetting.status === 'open'
                ? 'bg-emerald-100 text-emerald-800'
                : regSetting.status === 'closed'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {regSetting.status === 'open' ? 'Open' : regSetting.status === 'closed' ? 'Closed' : 'Soon'}
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

                  {/* Skill Filter */}
                  <select
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white max-w-[170px] truncate"
                    title="Filter by Talent / Skill"
                  >
                    <option value="All">All Skills</option>
                    {availableSkillsForFilter.map((skill) => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>

                  {/* Clear Filters if active */}
                  {(filterBatch !== 'All' || filterSection !== 'All' || filterStatus !== 'All' || filterSkill !== 'All' || memberSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterBatch('All');
                        setFilterSection('All');
                        setFilterStatus('All');
                        setFilterSkill('All');
                        setMemberSearch('');
                      }}
                      className="px-2.5 py-2 text-[11px] font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                      title="Reset all filters"
                    >
                      Clear
                    </button>
                  )}

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
                filteredMembers.map((member, index) => {
                  const serialNum = extractSerial(member.membershipId) || (index + 1);
                  return (
                  <div key={member.id || member.submittedAt} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
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
                          <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-emerald-700 text-white font-mono font-black text-[9px] shadow-xs">
                            #{serialNum}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p 
                            className="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-emerald-600"
                            onClick={() => setSelectedMember(member)}
                          >
                            {member.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-mono">
                            {member.membershipId ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 text-[10px] tracking-wide">
                                {member.membershipId}
                              </span>
                            ) : (
                              <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[9px]">
                                Pending ID
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
                  );
                })
              )}
            </div>

            {/* Desktop View: Full Table (Visible on Tablets/Desktop >= md) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3 w-14 text-center">SL</th>
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
                        <td colSpan={8} className="text-center py-12 text-slate-500 font-semibold">
                          No registered members found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member, index) => {
                        const serialNum = extractSerial(member.membershipId) || (index + 1);
                        return (
                        <tr key={member.id || member.submittedAt} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200 font-mono shadow-2xs">
                              #{serialNum}
                            </span>
                          </td>
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
                      );
                    })
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

        {/* ===================== TAB 4: SETTINGS & CONTROLS ===================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Intro Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Registration &amp; Portal Settings
                  </h2>
                  <p className="text-xs text-slate-500">
                    Control public registration availability, customize formal announcements, and manage co-curricular skill options.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs ${
                  regSetting.status === 'open'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : regSetting.status === 'closed'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    regSetting.status === 'open' ? 'bg-emerald-500 animate-pulse' : regSetting.status === 'closed' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                  }`} />
                  <span>Status: {regSetting.status === 'open' ? 'Registration Open' : regSetting.status === 'closed' ? 'Closed Now' : 'Coming Soon'}</span>
                </span>
              </div>
            </div>

            {/* SECTION 1: REGISTRATION AVAILABILITY */}
            <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    1. Membership Registration Availability
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any option to immediately switch the public portal state:
                  </p>
                </div>
              </div>

              {/* 3 Interactive Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Open */}
                <button
                  type="button"
                  disabled={savingRegSetting}
                  onClick={() => handleQuickChangeStatus('open')}
                  className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    regSetting.status === 'open'
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-black text-sm text-slate-900">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>1. Registration Open</span>
                    </span>
                    {regSetting.status === 'open' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                        Active on Site
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The registration form is live on the site. Students can fill in their academic details, select skills, and submit their application.
                  </p>
                </button>

                {/* 2. Closed Now */}
                <button
                  type="button"
                  disabled={savingRegSetting}
                  onClick={() => handleQuickChangeStatus('closed')}
                  className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    regSetting.status === 'closed'
                      ? 'bg-rose-50/80 border-rose-500 shadow-xs ring-2 ring-rose-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-black text-sm text-slate-900">
                      <span className="w-3 h-3 rounded-full bg-rose-500" />
                      <span>2. Closed Now</span>
                    </span>
                    {regSetting.status === 'closed' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                        Active on Site
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The form is hidden and replaced with a formal &quot;Registration Closed&quot; announcement and application status check.
                  </p>
                </button>

                {/* 3. Coming Soon */}
                <button
                  type="button"
                  disabled={savingRegSetting}
                  onClick={() => handleQuickChangeStatus('coming_soon')}
                  className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    regSetting.status === 'coming_soon'
                      ? 'bg-amber-50/80 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-black text-sm text-slate-900">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>3. Coming Soon</span>
                    </span>
                    {regSetting.status === 'coming_soon' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider">
                        Active on Site
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The form is hidden and replaced with a formal announcement that registration for upcoming HSC batches will open shortly.
                  </p>
                </button>
              </div>

              {/* Formal Notice Text Customizer */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                      Customize Formal Notice (Closed / Coming Soon Display)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (regSetting.status === 'closed') {
                        setDraftHeadline('NGDC Science Club Membership Registration is Currently Closed');
                        setDraftMessage('The membership registration window for NGDC Science Club (New Government Degree College, Rajshahi) is currently closed for this session. Thank you for your interest. For any queries or assistance, please contact us via email at ngdcsc.org@gmail.com.');
                      } else if (regSetting.status === 'coming_soon') {
                        setDraftHeadline('NGDC Science Club Membership Registration Coming Soon');
                        setDraftMessage('The official membership registration for NGDC Science Club (New Government Degree College, Rajshahi) will open shortly for HSC 27 and HSC 28 sessions. Eleventh and twelfth grade science students are requested to keep their college information and passport photograph ready. For any queries, please contact us via email at ngdcsc.org@gmail.com.');
                      } else {
                        setDraftHeadline('NGDC Science Club Online Membership Registration');
                        setDraftMessage('Welcome to NGDC Science Club (New Government Degree College, Rajshahi). Please complete the form below to join our community.');
                      }
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                  >
                    Reset to Default English Template
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notice Headline
                    </label>
                    <input
                      type="text"
                      value={draftHeadline}
                      onChange={(e) => setDraftHeadline(e.target.value)}
                      placeholder="e.g. Membership Registration is Currently Closed"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notice Message / Body
                    </label>
                    <textarea
                      rows={3}
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      placeholder="Formal announcement message displayed to students..."
                      className="w-full p-3.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                  regSetting.status === 'closed'
                    ? 'bg-slate-950 text-slate-200 border-rose-500/40'
                    : regSetting.status === 'coming_soon'
                    ? 'bg-slate-950 text-slate-200 border-amber-500/40'
                    : 'bg-slate-900 text-slate-200 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className={regSetting.status === 'closed' ? 'text-rose-400' : regSetting.status === 'coming_soon' ? 'text-amber-400' : 'text-emerald-400'}>
                      Public Site Live Preview
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      regSetting.status === 'closed'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : regSetting.status === 'coming_soon'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {regSetting.status === 'open' ? 'Active Form' : regSetting.status === 'closed' ? 'Red Theme (Closed)' : 'Amber Theme (Coming Soon)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">NGDC Science Club</span>
                    <p className="text-sm font-black text-white">{draftHeadline || 'Notice Headline'}</p>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{draftMessage || 'Notice announcement body text...'}</p>
                  {regSetting.status !== 'open' && (
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Contact Channel: Official Email</span>
                      <span className="font-bold text-slate-200">ngdcsc.org@gmail.com</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Changes apply immediately to the public site when saved.
                  </span>
                  <button
                    type="button"
                    disabled={savingRegSetting}
                    onClick={() => handleSaveCustomSetting()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Notice Text</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2: SKILLS & TECHNICAL FIELDS MANAGER */}
            <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    2. Co-Curricular Skills &amp; Technical Fields Manager
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage the skill checkboxes displayed on the public registration form. Students can select their talents, and you can add or remove any skill anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetSkills}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer shrink-0"
                >
                  Reset to Default Club Skills
                </button>
              </div>

              {/* Add New Skill Input */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Add New Skill Option to Registration Form
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="e.g. Video Editing, Drone Piloting, 3D Design, Python, etc."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    disabled={!newSkillInput.trim() || savingSkills}
                    onClick={handleAddSkill}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add Skill</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Once added, this skill immediately appears as a selectable checkbox on the public membership registration page.
                </p>
              </div>

              {/* Active Skills List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Current Active Skill Checkboxes ({activeSkills.length})</span>
                  <span className="text-[11px] text-slate-400">Click the trash icon to delete any skill</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {activeSkills.map((skill, index) => (
                    <div
                      key={skill}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {skill}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(skill)}
                        title={`Delete ${skill}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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

              {/* Skills & Talents */}
              {selectedMember.skills && selectedMember.skills.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Skills &amp; Co-Curricular Talents ({selectedMember.skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMember.skills.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience or Achievements */}
              {selectedMember.experienceAchievements && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Experience or Achievements
                  </span>
                  <p className="text-xs text-slate-800 bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedMember.experienceAchievements}
                  </p>
                </div>
              )}

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
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingMember.photo) {
                              setAdjustingPhotoModal({
                                src: editingMember.photo,
                                onApply: (adjusted) => setEditingMember(prev => prev ? { ...prev, photo: adjusted } : null)
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                          title="Adjust or crop member photo"
                        >
                          <Scissors className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Adjust Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMember({ ...editingMember, photo: null })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </>
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

              {/* Skills & Technical Talents */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Skills &amp; Technical Talents ({(editingMember.skills || []).length})
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto">
                  {activeSkills.map((skill) => {
                    const isChecked = (editingMember.skills || []).includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          const current = editingMember.skills || [];
                          const updated = current.includes(skill)
                            ? current.filter(s => s !== skill)
                            : [...current, skill];
                          setEditingMember({ ...editingMember, skills: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? `✓ ${skill}` : `+ ${skill}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Experience or Achievements</label>
                <textarea
                  rows={3}
                  value={editingMember.experienceAchievements || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, experienceAchievements: e.target.value })}
                  placeholder="Member experience, achievements, or write 'None'..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white text-xs leading-relaxed resize-y"
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
          onOpenAdjustPhoto={(src, cb) => setAdjustingPhotoModal({ src, onApply: cb })}
          availableSkills={activeSkills}
        />
      )}

      {/* ===================== MODAL: ADD / EDIT EXECUTIVE ===================== */}
      {(showAddExecutiveModal || editingExecutive) && (
        <ExecutiveModal
          initialData={editingExecutive}
          onClose={() => { setShowAddExecutiveModal(false); setEditingExecutive(null); }}
          onSave={handleSaveExecutive}
          onOpenAdjustPhoto={(src, cb) => setAdjustingPhotoModal({ src, onApply: cb })}
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

      {/* ===================== MODAL: IMAGE ADJUST / CROP (ADMIN) ===================== */}
      {adjustingPhotoModal && (
        <ImageAdjustModal
          imageSrc={adjustingPhotoModal.src}
          onApply={(adjusted) => {
            adjustingPhotoModal.onApply(adjusted);
            setAdjustingPhotoModal(null);
          }}
          onClose={() => setAdjustingPhotoModal(null)}
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
  onAdd,
  onOpenAdjustPhoto,
  availableSkills = []
}: { 
  suggestedId?: string;
  onClose: () => void; 
  onAdd: (e: React.FormEvent, record: SubmissionRecord) => void;
  onOpenAdjustPhoto?: (src: string, callback: (adjusted: string) => void) => void;
  availableSkills?: string[];
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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experienceAchievements, setExperienceAchievements] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (raw) {
        if (onOpenAdjustPhoto) {
          onOpenAdjustPhoto(raw, (adjusted) => setPhoto(adjusted));
        } else {
          setPhoto(raw);
        }
      }
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

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
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
      skills: selectedSkills,
      experienceAchievements: experienceAchievements.trim(),
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
            💡 <strong>Fast Admin Entry:</strong> All fields are optional. Enter any available details (Name, Roll, or Phone).
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
                {photo && onOpenAdjustPhoto && (
                  <button
                    type="button"
                    onClick={() => onOpenAdjustPhoto(photo, (adjusted) => setPhoto(adjusted))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Adjust Photo</span>
                  </button>
                )}
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

          {/* Skills & Technical Talents */}
          {availableSkills.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="font-bold text-slate-900 text-xs block">
                Skills &amp; Technical Talents ({selectedSkills.length}) (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {availableSkills.map((skill) => {
                  const isChecked = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Experience or Achievements */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Experience or Achievements
            </label>
            <textarea
              rows={2}
              value={experienceAchievements}
              onChange={(e) => setExperienceAchievements(e.target.value)}
              placeholder="Member experience, achievements, or write 'None'..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white text-xs leading-relaxed resize-y"
            />
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
  onSave,
  onOpenAdjustPhoto
}: {
  initialData: ExecutiveMember | null;
  onClose: () => void;
  onSave: (exec: ExecutiveMember) => void;
  onOpenAdjustPhoto?: (src: string, callback: (adjusted: string) => void) => void;
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
      const raw = e.target?.result as string;
      if (raw) {
        if (onOpenAdjustPhoto) {
          onOpenAdjustPhoto(raw, (adjusted) => setImage(adjusted));
        } else {
          setImage(raw);
        }
      }
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
            <div className="flex flex-wrap items-center gap-2">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{image ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {image && onOpenAdjustPhoto && (
                <button
                  type="button"
                  onClick={() => onOpenAdjustPhoto(image, (adjusted) => setImage(adjusted))}
                  className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Scissors className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Adjust Photo</span>
                </button>
              )}
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
