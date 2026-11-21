import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User as FirebaseUser } from 'firebase/auth';
import {
  ArrowLeft,
  User,
  Phone,
  MessageSquare,
  Mail,
  Hash,
  Calendar,
  Camera,
  Scissors,
  X,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  Lock,
  LogOut,
  Save,
  AlertCircle,
  Copy,
  Download,
  UserPlus,
  FileText,
  Edit3,
  KeyRound,
  Eye,
  EyeOff,
  ClipboardCheck,
  QrCode,
  Inbox,
  Ban
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  SubmissionRecord,
  SectionType,
  BatchType,
  MembershipRegistrationSetting,
  DEFAULT_SKILL_OPTIONS,
  AttendanceRecord,
  AttendanceSession,
  PRESIDENT_DISPLAY_NAME,
  PRESIDENT_ROLE_LABEL,
  getEffectiveMemberGroup,
  GROUP_BADGE_STYLES
} from './types';
import {
  getCachedMemberProfileForUser,
  fetchMemberProfileForUser,
  updateOwnMemberProfile,
  logoutMemberAccount,
  changeMemberPassword,
  formatAuthError,
  subscribeToMyAttendance,
  subscribeToAttendanceSessions,
  getCachedMyAttendance,
  getCachedAttendanceSessions,
  getTodayLocalDateStr,
  isPresidentEmail,
  subscribeToMembers,
  subscribeToMemberById,
  subscribeToPresidentInboxThreads,
  subscribeToMemberInboxThread
} from './services/firebase';
import ImageAdjustModal from './components/ImageAdjustModal';
import DotLoader from './components/DotLoader';
import MemberQrCode from './components/MemberQrCode';
import InboxPanel from './components/InboxPanel';
import NotificationToggleControl from './components/NotificationToggleControl';

const CLUB_SEGMENTS = [
  'Science Olympiad (Math, Physics, Bio, Chem)',
  'Science Project & Innovation',
  'Science Quizzing',
  'Robotics & Programming',
  'Astronomy & Space Science',
  'Scientific Wall Magazine & Publication'
];

type DashboardPage = 'slip' | 'attendance' | 'inbox' | 'edit' | 'password';

interface MemberDashboardProps {
  user: FirebaseUser;
  registrationSetting: MembershipRegistrationSetting;
  onBackToHome: () => void;
  onGoToRegistration: () => void;
  onSignedOut: () => void;
  requestedPage?: { page: DashboardPage; nonce: number } | null;
  onActivePageChange?: (page: DashboardPage) => void;
}

export default function MemberDashboard({
  user,
  registrationSetting,
  onBackToHome,
  onGoToRegistration,
  onSignedOut,
  requestedPage,
  onActivePageChange
}: MemberDashboardProps) {
  const initialCachedRef = useRef<SubmissionRecord | null | undefined>(undefined);
  if (initialCachedRef.current === undefined) {
    initialCachedRef.current = getCachedMemberProfileForUser(user.uid, user.email);
  }
  const initialCached = initialCachedRef.current;

  const isPresident = isPresidentEmail(user.email);
  const isEditAllowed = registrationSetting.allowMemberEdit !== false;

  const [loading, setLoading] = useState(!initialCached && !isPresident);
  const [member, setMember] = useState<SubmissionRecord | null>(initialCached);
  const [liveVerified, setLiveVerified] = useState(isPresident);
  const isAccountRestricted = Boolean(member?.isRestricted) && !isPresident;
  const [restrictedPopupDismissed, setRestrictedPopupDismissed] = useState(false);

  const [activePage, setActivePage] = useState<DashboardPage>(
    requestedPage?.page || (isPresident && !initialCached ? 'inbox' : 'slip')
  );
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [presidentMembersDirectory, setPresidentMembersDirectory] = useState<SubmissionRecord[]>([]);
  const isFormDirtyRef = useRef(false);

  useEffect(() => {
    if (isAccountRestricted) {
      setRestrictedPopupDismissed(false);
    }
  }, [isAccountRestricted]);

  useEffect(() => {
    if (requestedPage?.page) {
      if (isAccountRestricted && requestedPage.page !== 'inbox') {
        setActivePage('slip');
      } else {
        setActivePage(requestedPage.page);
      }
    }
  }, [requestedPage?.nonce, requestedPage?.page, isAccountRestricted]);

  useEffect(() => {
    if (isAccountRestricted && activePage !== 'inbox' && activePage !== 'slip') {
      setActivePage('slip');
    }
  }, [isAccountRestricted, activePage]);

  useEffect(() => {
    onActivePageChange?.(activePage);
  }, [activePage, onActivePageChange]);

  // Editable form state (Roll and Account Email remain locked)
  const [photo, setPhoto] = useState<string | null>(initialCached?.photo || null);
  const [name, setName] = useState(initialCached?.name || '');
  const [phone, setPhone] = useState(initialCached?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialCached?.whatsapp || initialCached?.phone || '');
  const [sameAsPhone, setSameAsPhone] = useState(
    initialCached ? (initialCached.sameAsPhone ?? (initialCached.whatsapp === initialCached.phone)) : true
  );
  const [dob, setDob] = useState(initialCached?.dob || '');
  const [section, setSection] = useState<SectionType>((initialCached?.section as SectionType) || 'A');
  const [batch, setBatch] = useState<BatchType>((initialCached?.batch as BatchType) || 'HSC 27');
  const [interestedSegments, setInterestedSegments] = useState<string[]>(
    Array.isArray(initialCached?.interestedSegments) ? initialCached.interestedSegments : []
  );
  const [skills, setSkills] = useState<string[]>(
    Array.isArray(initialCached?.skills) ? initialCached.skills : []
  );
  const [experienceAchievements, setExperienceAchievements] = useState(
    initialCached?.experienceAchievements || ''
  );

  const [adjustingPhoto, setAdjustingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const [downloadSlipSuccess, setDownloadSlipSuccess] = useState(false);
  const hiddenSlipRef = useRef<HTMLDivElement>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Individual Member Attendance state (strictly isolated to this logged-in member)
  const [myAttendanceRecords, setMyAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    getCachedMyAttendance(user.uid)
  );
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>(() =>
    getCachedAttendanceSessions()
  );

  const populateForm = (rec: SubmissionRecord) => {
    setPhoto(rec.photo || null);
    setName(rec.name || '');
    setPhone(rec.phone || '');
    setWhatsapp(rec.whatsapp || rec.phone || '');
    setSameAsPhone(rec.sameAsPhone ?? (rec.whatsapp === rec.phone));
    setDob(rec.dob || '');
    setSection((rec.section as SectionType) || 'A');
    setBatch((rec.batch as BatchType) || 'HSC 27');
    setInterestedSegments(Array.isArray(rec.interestedSegments) ? rec.interestedSegments : []);
    setSkills(Array.isArray(rec.skills) ? rec.skills : []);
    setExperienceAchievements(rec.experienceAchievements || '');
  };

  useEffect(() => {
    let active = true;
    const cached = getCachedMemberProfileForUser(user.uid, user.email);
    if (cached) {
      setMember(cached);
      if (!isFormDirtyRef.current) {
        populateForm(cached);
      }
      setLoading(false);
    } else {
      setLoading(true);
    }

    const refreshProfile = () => {
      fetchMemberProfileForUser(user.uid, user.email)
        .then((rec) => {
          if (!active) return;
          setMember(rec);
          setLiveVerified(true);
          if (rec && !isFormDirtyRef.current) {
            populateForm(rec);
          }
        })
        .catch(() => {
          if (active) setLiveVerified(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    refreshProfile();

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        refreshProfile();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [user.uid, user.email]);

  // Real-time listener for this member document so admin restriction/status updates take effect immediately
  useEffect(() => {
    if (!member?.id) return;
    const unsub = subscribeToMemberById(member.id, (liveRecord) => {
      if (!liveRecord) return;
      setMember(liveRecord);
      if (!isFormDirtyRef.current) {
        populateForm(liveRecord);
      }
    });
    return () => unsub();
  }, [member?.id]);

  // Real-time subscription to ONLY this member's attendance & official session dates
  useEffect(() => {
    const targetEmail = member?.email || user.email;
    const unsubMyAttendance = subscribeToMyAttendance(user.uid, targetEmail, (records) => {
      setMyAttendanceRecords(records);
    });
    const unsubSessions = subscribeToAttendanceSessions((sessions) => {
      setAttendanceSessions(sessions);
    });
    return () => {
      unsubMyAttendance();
      unsubSessions();
    };
  }, [user.uid, user.email, member?.email]);

  // Real-time Inbox unread badge & President's member directory
  useEffect(() => {
    if (isPresident) {
      const unsubMembers = subscribeToMembers((list) => {
        setPresidentMembersDirectory(list);
      });
      const unsubThreads = subscribeToPresidentInboxThreads((list) => {
        const unread = list.reduce((sum, t) => sum + (t.unreadByPresident || 0), 0);
        setInboxUnreadCount(unread);
      });
      return () => {
        unsubMembers();
        unsubThreads();
      };
    }

    const unsubMyThread = subscribeToMemberInboxThread(
      user.uid,
      member?.email || user.email,
      (thread) => {
        setInboxUnreadCount(thread?.unreadByMember || 0);
      }
    );
    return () => unsubMyThread();
  }, [isPresident, user.uid, user.email, member?.email]);

  const todayDateStr = getTodayLocalDateStr();

  const myAttendanceRows = useMemo(() => {
    const byDate = new Map<string, AttendanceRecord>();
    myAttendanceRecords.forEach((rec) => {
      byDate.set(rec.date, rec);
    });

    const allDates = new Set<string>();
    myAttendanceRecords.forEach((r) => allDates.add(r.date));
    attendanceSessions.forEach((s) => allDates.add(s.date));

    const sessionMap = new Map<string, AttendanceSession>();
    attendanceSessions.forEach((s) => sessionMap.set(s.date, s));

    const rows = Array.from(allDates).map((date) => {
      const rec = byDate.get(date);
      const sess = sessionMap.get(date);
      if (rec) {
        return {
          date,
          eventTitle: rec.eventTitle || sess?.eventTitle || 'Club Session',
          status: rec.status,
          timeLabel: rec.status === 'present' ? rec.scannedTimeLabel : '—',
          method: rec.method,
          note: rec.note || ''
        };
      }
      return {
        date,
        eventTitle: sess?.eventTitle || 'Club Session',
        status: 'absent' as const,
        timeLabel: 'Not Scanned',
        method: 'manual' as const,
        note: ''
      };
    });

    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [myAttendanceRecords, attendanceSessions]);

  const myPresentCount = useMemo(
    () => myAttendanceRows.filter((r) => r.status === 'present').length,
    [myAttendanceRows]
  );
  const myAbsentCount = useMemo(
    () => myAttendanceRows.filter((r) => r.status === 'absent').length,
    [myAttendanceRows]
  );
  const myAttendanceRate =
    myAttendanceRows.length > 0
      ? Math.round((myPresentCount / myAttendanceRows.length) * 100)
      : 0;
  const myTodayAttendance = useMemo(
    () => myAttendanceRecords.find((r) => r.date === todayDateStr) || null,
    [myAttendanceRecords, todayDateStr]
  );

  const switchPage = (page: DashboardPage) => {
    if (isAccountRestricted && page !== 'inbox' && page !== 'slip') {
      return;
    }
    setActivePage(page);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setPasswordError(null);
    setPasswordSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSameAsPhoneToggle = (checked: boolean) => {
    if (!isEditAllowed) return;
    isFormDirtyRef.current = true;
    setSameAsPhone(checked);
    if (checked) {
      setWhatsapp(phone);
    }
  };

  const toggleSegment = (seg: string) => {
    if (!isEditAllowed) return;
    isFormDirtyRef.current = true;
    setInterestedSegments((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  };

  const toggleSkill = (sk: string) => {
    if (!isEditAllowed) return;
    isFormDirtyRef.current = true;
    setSkills((prev) =>
      prev.includes(sk) ? prev.filter((s) => s !== sk) : [...prev, sk]
    );
  };

  const handleFile = (file: File) => {
    if (!isEditAllowed) return;
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
      const raw = e.target?.result as string;
      if (raw) setAdjustingPhoto(raw);
    };
    reader.readAsDataURL(file);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.id) return;

    setErrorMsg(null);
    setSaveSuccessMsg(null);

    if (isAccountRestricted) {
      setErrorMsg('Your account is currently restricted. Only Inbox access is available.');
      return;
    }

    if (!isEditAllowed) {
      setErrorMsg('Profile editing is currently disabled by the club administrator.');
      return;
    }

    if (!photo) {
      setErrorMsg('Passport photo is required.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    const cleanWhatsapp = (sameAsPhone ? cleanPhone : whatsapp).trim();
    if (!cleanWhatsapp) {
      setErrorMsg('Please enter your WhatsApp number.');
      return;
    }
    if (!dob) {
      setErrorMsg('Please enter your date of birth.');
      return;
    }
    if (interestedSegments.length === 0) {
      setErrorMsg('Please select at least one interested science wing.');
      return;
    }
    if (skills.length === 0) {
      setErrorMsg('Please select at least one skill.');
      return;
    }
    if (!experienceAchievements.trim()) {
      setErrorMsg('Please enter your experience or achievements (or write "None").');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateOwnMemberProfile(
        member.id,
        user.uid,
        {
          photo,
          name: name.trim(),
          phone: cleanPhone,
          whatsapp: cleanWhatsapp,
          sameAsPhone,
          dob,
          section,
          batch,
          interestedSegments,
          skills,
          experienceAchievements: experienceAchievements.trim()
        },
        member
      );
      isFormDirtyRef.current = false;
      setMember(updated);
      setSaveSuccessMsg('Your profile information has been updated successfully.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      if (err?.code === 'account-restricted') {
        setErrorMsg('Your account is currently restricted. Only Inbox access is available.');
      } else if (err?.code === 'edit-locked-by-admin') {
        setErrorMsg('Profile editing is currently disabled by the club administrator.');
      } else if (err?.code === 'permission-denied') {
        setErrorMsg('Profile editing is currently locked or unavailable. Please contact the club administrator.');
      } else {
        setErrorMsg('Failed to save your changes. Please try again.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await logoutMemberAccount();
    onSignedOut();
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New Password and Confirm New Password do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeMemberPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess(
        'Password updated successfully! Use your new password next time you sign in — your previous password is no longer valid.'
      );
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect. Please check and try again.');
      } else {
        setPasswordError(formatAuthError(err));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDirectDownloadSlip = async () => {
    if (!member || isAccountRestricted || !liveVerified || downloadingSlip) return;
    try {
      setDownloadingSlip(true);
      setDownloadSlipSuccess(false);

      if (!hiddenSlipRef.current) {
        throw new Error('Slip template not ready');
      }

      const imgData = await toPng(hiddenSlipRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: ''
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = imgProps.width / imgProps.height;
      const pageRatio = pdfPageWidth / pdfPageHeight;

      let renderWidth = pdfPageWidth;
      let renderHeight = pdfPageHeight;
      let xOffset = 0;
      let yOffset = 0;

      if (imgRatio > pageRatio) {
        renderHeight = pdfPageWidth / imgRatio;
        yOffset = (pdfPageHeight - renderHeight) / 2;
      } else {
        renderWidth = pdfPageHeight * imgRatio;
        xOffset = (pdfPageWidth - renderWidth) / 2;
      }

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');

      const safeName = (member.name || 'Member').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeId = (member.membershipId || 'NGDCSC').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`NGDCSC_Slip_${safeId}_${safeName}.pdf`);

      setDownloadSlipSuccess(true);
      setTimeout(() => setDownloadSlipSuccess(false), 3500);
    } catch (err) {
      console.error('Error generating PDF slip:', err);
    } finally {
      setDownloadingSlip(false);
    }
  };

  const activeSkillList =
    registrationSetting.skills && registrationSetting.skills.length > 0
      ? registrationSetting.skills
      : DEFAULT_SKILL_OPTIONS;

  const displayedSkills = Array.from(new Set([...activeSkillList, ...skills]));

  if (activePage === 'inbox' && (!loading || isPresident || Boolean(member))) {
    return (
      <InboxPanel
        fullScreen
        onBack={() => (member ? switchPage('slip') : onBackToHome())}
        backLabel={isAccountRestricted ? 'Back' : member ? 'Back to Dashboard' : 'Back to Home'}
        currentUserEmail={user.email || member?.email || ''}
        currentUserUid={user.uid}
        currentMember={member}
        allMembers={isPresident ? presidentMembersDirectory : []}
        onUnreadCountChange={setInboxUnreadCount}
      />
    );
  }

  return (
    <div
      className="w-full max-w-3xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-12 formal-page-enter transition-all"
    >
      {/* Photo Adjust Modal */}
      {adjustingPhoto && (
        <ImageAdjustModal
          imageSrc={adjustingPhoto}
          onApply={(adjusted) => {
            setPhoto(adjusted);
            setAdjustingPhoto(null);
            setErrorMsg(null);
          }}
          onClose={() => setAdjustingPhoto(null)}
        />
      )}

      {/* Top Navigation & Sign Out Bar */}
      <div className="mb-5 flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200/90 shadow-xs transition-all cursor-pointer group backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <NotificationToggleControl />
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/85 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold border border-slate-200/90 hover:border-rose-200 shadow-xs transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-sm">
          <DotLoader size="lg" color="emerald" className="mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-800">Loading My Dashboard...</p>
          <p className="text-xs text-slate-500 mt-1">Fetching your membership profile</p>
        </div>
      ) : !member && !isPresident ? (
        /* No Member Profile Found for Account */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
            <User className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-slate-900">No Membership Profile Linked</h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Signed in as <strong className="text-slate-900">{user.email}</strong>, but no club membership record is linked to this account yet.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onGoToRegistration}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Go to Registration</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Segmented Page Switcher: Clean Separate Pages */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:px-6 shadow-xs">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isPresident ? PRESIDENT_DISPLAY_NAME : 'My Dashboard'}
              </h1>
              <p className="text-xs text-slate-500">
                {isPresident ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    {PRESIDENT_ROLE_LABEL}
                  </span>
                ) : isAccountRestricted ? (
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <span>{member?.name}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase">
                      <Ban className="w-2.5 h-2.5" />
                      <span>Restricted</span>
                    </span>
                  </span>
                ) : activePage === 'inbox' ? (
                  <span>{member?.name}</span>
                ) : (
                  <>
                    {member?.name} • Roll <span className="font-mono font-semibold text-slate-700">{member?.studentId}</span>
                  </>
                )}
              </p>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto">
              {member && !isAccountRestricted && (
                <>
                  <button
                    type="button"
                    onClick={() => switchPage('slip')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activePage === 'slip'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Confirmation Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchPage('attendance')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activePage === 'attendance'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Attendance</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => switchPage('inbox')}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePage === 'inbox'
                    ? 'bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 text-red-600 border-2 border-red-500 shadow-sm shadow-red-500/15'
                    : 'bg-gradient-to-r from-rose-500/15 via-red-500/15 to-amber-500/15 hover:from-rose-500/25 hover:via-red-500/25 hover:to-amber-500/25 text-red-600 border border-red-300/80'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-red-600" />
                <span className="text-red-600 font-black">Inbox</span>
                {inboxUnreadCount > 0 && (
                  <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none shadow-2xs">
                    {inboxUnreadCount}
                  </span>
                )}
              </button>

              {member && !isAccountRestricted && (
                <>
                  <button
                    type="button"
                    onClick={() => switchPage('edit')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activePage === 'edit'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isEditAllowed ? (
                      <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchPage('password')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activePage === 'password'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Change Password</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Inbox opens in dedicated full-screen mode above */}

          {/* RESTRICTED ACCOUNT VIEW: Everything hidden except Inbox */}
          {member && isAccountRestricted && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 sm:p-10 text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <Ban className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-black uppercase tracking-wide">
                  <Lock className="w-3 h-3" />
                  <span>Account Restricted • Inbox Only</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
                  Your account has been restricted
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Confirmation/Payment Slip, Attendance, Profile Editing, and Password settings are completely disabled. Only your <strong>Inbox</strong> remains open so you can contact the President.
                </p>

                <div className="mt-3 p-3.5 rounded-xl bg-red-50/80 border border-red-200 text-xs text-red-900 font-semibold text-left">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-red-700 mb-0.5">
                    Reason:
                  </span>
                  <p className="leading-relaxed">
                    {member.restrictedReason ||
                      'Restricted by the club administrator. Please contact the President via Inbox.'}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => switchPage('inbox')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs sm:text-sm font-black shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  <Inbox className="w-4 h-4" />
                  <span>Open Inbox</span>
                  {inboxUnreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white text-red-600 text-[10px] font-black leading-none">
                      {inboxUnreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PAGE 1: CONFIRMATION SLIP PAGE */}
          {member && !isAccountRestricted && activePage === 'slip' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
              {member.status === 'approved' ? (
                <>
                  {/* Approved Header & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Officially Confirmed</span>
                      </span>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight pt-1">
                        Membership Confirmation Slip
                      </h2>
                      <p className="text-xs text-slate-500">
                        Your membership is confirmed. Download your official white A4 PDF slip below.
                      </p>
                    </div>

                    {liveVerified ? (
                      <button
                        type="button"
                        onClick={handleDirectDownloadSlip}
                        disabled={downloadingSlip}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        {downloadingSlip ? (
                          <>
                            <DotLoader size="sm" color="white" />
                            <span>Downloading PDF...</span>
                          </>
                        ) : downloadSlipSuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Slip Downloaded!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download A4 PDF</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs shrink-0">
                        <DotLoader size="sm" color="emerald" />
                        <span>Verifying status...</span>
                      </span>
                    )}
                  </div>

                  {/* Clean Formal Confirmation Slip Preview Card */}
                  <div className="border border-slate-200 rounded-2xl bg-white p-5 sm:p-7 shadow-xs space-y-6">
                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <img
                          src="/assets/college-logo.png"
                          alt="College Logo"
                          className="w-11 h-11 object-contain"
                        />
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                            NGDC Science Club
                          </h3>
                          <p className="text-[11px] font-semibold text-emerald-800">
                            New Govt. Degree College, Rajshahi
                          </p>
                        </div>
                      </div>
                      <img
                        src="/assets/club-logo.png"
                        alt="Club Logo"
                        className="w-11 h-11 object-contain"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      <div className="w-28 h-36 rounded-xl border border-slate-200 p-1 bg-white shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <User className="w-10 h-10 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-2.5 min-w-0">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Member Name
                              </span>
                              <p className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                                {member.name}
                              </p>
                            </div>

                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-xs sm:text-sm font-black">
                              <span>Membership ID:</span>
                              <span>{member.membershipId || 'NGDCSC-APPROVED'}</span>
                              {member.membershipId && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(member.membershipId!)}
                                  className="p-1 rounded hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                                  title="Copy Membership ID"
                                >
                                  {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-center sm:justify-end shrink-0">
                            <MemberQrCode
                              membershipId={member.membershipId || 'NGDCSC-APPROVED'}
                              size={84}
                              compact
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-2 text-left text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              College Roll
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-900">
                                {member.studentId}
                              </span>
                              {getEffectiveMemberGroup(member) && (
                                <span
                                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                    GROUP_BADGE_STYLES[getEffectiveMemberGroup(member)!]
                                  }`}
                                >
                                  {getEffectiveMemberGroup(member)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Batch &amp; Section
                            </span>
                            <span className="font-bold text-slate-900">
                              {member.batch} • Sec {member.section}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Mobile
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {member.phone}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Email
                            </span>
                            <span className="font-medium text-slate-900 truncate block">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : member.status === 'rejected' ? (
                /* Declined Status View */
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                      Application Declined
                    </span>
                    <h2 className="text-xl font-black text-slate-900 pt-1">
                      Confirmation Slip Unavailable
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Your membership application has not been approved yet, so the confirmation slip cannot be generated.
                    </p>
                    {member.rejectionReason && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 mt-2">
                        Reason: {member.rejectionReason}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => switchPage('edit')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit My Profile</span>
                  </button>
                </div>
              ) : (
                /* Pending Review View */
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                      Status: Pending Review
                    </span>
                    <h2 className="text-xl font-black text-slate-900 pt-1">
                      Confirmation Slip Will Appear Once Confirmed
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Your application is currently under review by the Executive Committee. As soon as your membership is confirmed, your official Confirmation Slip and A4 PDF download will be ready here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchPage('edit')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Update Profile Information</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PAGE 2: MY ATTENDANCE PAGE (STRICTLY PERSONAL) */}
          {member && !isAccountRestricted && activePage === 'attendance' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 text-left animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    My Attendance Record
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personal event &amp; session check-in history for{' '}
                    <span className="font-mono font-semibold text-slate-700">
                      {member.membershipId || member.studentId}
                    </span>
                    . Only you can view your individual attendance.
                  </p>
                </div>

                {member.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => switchPage('slip')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer transition-colors self-start sm:self-center shrink-0"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Show My Check-In QR</span>
                  </button>
                )}
              </div>

              {/* Today's Live Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  myTodayAttendance?.status === 'present'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {myTodayAttendance?.status === 'present' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">
                      {myTodayAttendance?.status === 'present'
                        ? `Checked In Today (${todayDateStr})`
                        : `Not Checked In Today (${todayDateStr})`}
                    </p>
                    <p className="text-xs opacity-80">
                      {myTodayAttendance?.status === 'present'
                        ? `${myTodayAttendance.eventTitle} • Scanned at ${myTodayAttendance.scannedTimeLabel}`
                        : 'Present your Confirmation Slip QR code to a club admin at the event venue to mark your attendance.'}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase self-start sm:self-center shrink-0 ${
                    myTodayAttendance?.status === 'present'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {myTodayAttendance?.status === 'present' ? 'Present' : 'Not Marked'}
                </span>
              </div>

              {/* Personal Summary Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-bold uppercase text-emerald-700 block">
                    Present
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">{myPresentCount}</p>
                  <span className="text-[11px] text-slate-500">Sessions attended</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-bold uppercase text-rose-600 block">
                    Absent
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">{myAbsentCount}</p>
                  <span className="text-[11px] text-slate-500">Missed / Not scanned</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Attendance
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">{myAttendanceRate}%</p>
                  <span className="text-[11px] text-slate-500">
                    Of {myAttendanceRows.length} session{myAttendanceRows.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Personal History List */}
              {myAttendanceRows.length === 0 ? (
                <div className="py-10 text-center border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No attendance sessions recorded yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Whenever an admin scans your Confirmation Slip QR code at a club event or meeting, your date and check-in time will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {myAttendanceRows.map((row) => {
                    const isPresent = row.status === 'present';
                    return (
                      <div
                        key={row.date}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {row.date}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {row.eventTitle}
                            </span>
                          </div>
                          {row.note && (
                            <p className="text-[11px] text-slate-500">Note: {row.note}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono text-slate-600">
                            {isPresent ? row.timeLabel : 'Not Scanned'}
                          </span>
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Present</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>Absent</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PAGE 3: EDIT PROFILE PAGE */}
          {member && !isAccountRestricted && activePage === 'edit' && (
            <form
              onSubmit={handleSaveChanges}
              onChange={() => {
                if (isEditAllowed) {
                  isFormDirtyRef.current = true;
                }
              }}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 text-left animate-in fade-in duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Edit Profile
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEditAllowed
                      ? 'Update your profile details below. College Roll and Account Email are locked.'
                      : 'Profile editing is currently locked by the club administrator.'}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold self-start sm:self-center shrink-0 ${
                  isEditAllowed
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  <Lock className={`w-3 h-3 ${isEditAllowed ? 'text-slate-500' : 'text-rose-600'}`} />
                  <span>{isEditAllowed ? 'Roll & Email Locked' : 'Editing Locked by Admin'}</span>
                </span>
              </div>

              {!isEditAllowed && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-900">Profile Editing Temporarily Disabled</p>
                    <p className="text-rose-700 font-normal mt-0.5 leading-relaxed">
                      The club administrator has turned off member profile editing. You can view your details below, but changes cannot be saved until editing is re-enabled.
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <fieldset disabled={!isEditAllowed} className={`space-y-6 ${!isEditAllowed ? 'opacity-70 select-none' : ''}`}>
              {/* Photo & Identity */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Passport Size Photo *
                  </label>
                  {photo && isEditAllowed && (
                    <button
                      type="button"
                      onClick={() => setAdjustingPhoto(photo)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Adjust / Crop Photo</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div
                    onClick={() => isEditAllowed && fileInputRef.current?.click()}
                    className={`relative w-24 h-28 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center overflow-hidden bg-slate-50 shrink-0 ${
                      isEditAllowed ? 'hover:border-emerald-500 cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    {photo ? (
                      <div className="relative w-full h-full group">
                        <img src={photo} alt="Student" className="w-full h-full object-cover" />
                        {isEditAllowed && (
                          <>
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                              <Camera className="w-4 h-4 mb-0.5" />
                              <span className="text-[10px] font-semibold">Change</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhoto(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="absolute top-1 right-1 p-1 bg-white/95 text-slate-600 hover:text-rose-600 rounded-full shadow-xs"
                              title="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 flex flex-col items-center">
                        <Camera className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700">Upload Photo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      disabled={!isEditAllowed}
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="text-center sm:text-left text-xs text-slate-600 space-y-1.5 flex-1">
                    <p className="font-semibold text-slate-900">Passport Photograph</p>
                    <p className="text-[11px] text-slate-500">
                      JPG or PNG up to 8MB.
                    </p>
                    {isEditAllowed && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        Choose New Image
                      </button>
                    )}
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* EDITABLE PHONE */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          isFormDirtyRef.current = true;
                          setPhone(nextVal);
                          if (sameAsPhone) {
                            setWhatsapp(nextVal);
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        WhatsApp Number *
                      </label>
                      <label
                        className={`inline-flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-0.5 rounded-full border text-[10px] ${
                          sameAsPhone
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sameAsPhone}
                          onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                          className="w-3 h-3 text-emerald-600 rounded"
                        />
                        <span>Same as Phone</span>
                      </label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        type="tel"
                        required
                        readOnly={sameAsPhone}
                        value={sameAsPhone ? phone : whatsapp}
                        onChange={(e) => {
                          isFormDirtyRef.current = true;
                          setWhatsapp(e.target.value);
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-mono font-medium ${
                          sameAsPhone
                            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* LOCKED EMAIL */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Locked</span>
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={member.email}
                      readOnly
                      disabled
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-bold cursor-not-allowed select-none"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Email address cannot be edited after registration.
                  </p>
                </div>
              </div>

              {/* Academic Details */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Academic Record
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* LOCKED ROLL */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Student ID / College Roll
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Locked</span>
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Hash className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={member.studentId}
                        readOnly
                        disabled
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-mono font-bold cursor-not-allowed select-none"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
                      <p className="text-[10.5px] text-slate-500">
                        College Roll cannot be edited after registration.
                      </p>
                      {getEffectiveMemberGroup(member) && (
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            GROUP_BADGE_STYLES[getEffectiveMemberGroup(member)!]
                          }`}
                        >
                          Group: {getEffectiveMemberGroup(member)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DOB */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Date of Birth *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    College Section *
                  </label>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    {(['A', 'B', 'C', 'D'] as SectionType[]).map((sec) => {
                      const isSelected = section === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSection(sec)}
                          className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-black'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Section {sec}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Batch */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    HSC Batch Session *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['HSC 27', 'HSC 28'] as BatchType[]).map((b) => {
                      const isSelected = batch === b;
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBatch(b)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-300'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-extrabold block text-slate-900">{b}</span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Wings, Skills, Experience */}
              <div className="pt-6 border-t border-slate-100 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Interested Science Wings *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CLUB_SEGMENTS.map((seg) => {
                      const isChecked = interestedSegments.includes(seg);
                      return (
                        <label
                          key={seg}
                          onClick={() => toggleSegment(seg)}
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold leading-snug">{seg}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Skills &amp; Technical Talents *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {displayedSkills.map((sk) => {
                      const isChecked = skills.includes(sk);
                      return (
                        <label
                          key={sk}
                          onClick={() => toggleSkill(sk)}
                          className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold leading-snug">{sk}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Experience or Achievements *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={experienceAchievements}
                    onChange={(e) => setExperienceAchievements(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium leading-relaxed resize-y"
                  />
                </div>
              </div>

              </fieldset>

              <button
                type="submit"
                disabled={saving || !isEditAllowed}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  !isEditAllowed
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-black text-white shadow-sm cursor-pointer disabled:opacity-50'
                }`}
              >
                {!isEditAllowed ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Editing Disabled by Admin</span>
                  </>
                ) : saving ? (
                  <>
                    <DotLoader size="sm" color="white" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>Save Updated Information</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* PAGE 3: CHANGE PASSWORD PAGE */}
          {member && !isAccountRestricted && activePage === 'password' && (
            <form
              onSubmit={handlePasswordChangeSubmit}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5 text-left animate-in fade-in duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Change Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your login password. Once changed, your previous password will no longer work.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold self-start sm:self-center shrink-0">
                  <KeyRound className="w-3 h-3 text-emerald-600" />
                  <span>Account Security</span>
                </span>
              </div>

              {passwordError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="dashboard-current-password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Current Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="dashboard-current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="dashboard-new-password"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      New Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="dashboard-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="dashboard-confirm-new-password"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="dashboard-confirm-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {changingPassword ? (
                  <>
                    <DotLoader size="sm" color="white" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Hidden Offscreen A4 Slip Template for Approved Members */}
      {member && !isAccountRestricted && member.status === 'approved' && (
        <div
          style={{
            position: 'absolute',
            left: '-99999px',
            top: 0,
            opacity: 0,
            pointerEvents: 'none'
          }}
          aria-hidden="true"
        >
          <div
            ref={hiddenSlipRef}
            className="w-[794px] min-h-[1123px] bg-white text-slate-900 rounded-none relative box-border p-12 flex flex-col justify-between"
            style={{
              width: '794px',
              minHeight: '1123px',
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            <div className="absolute inset-5 border border-slate-300 pointer-events-none" />
            <div className="relative z-10 flex-1 flex flex-col justify-between space-y-6">
              <div>
                <div className="grid grid-cols-[95px_1fr_95px] items-center gap-3">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 flex items-center justify-center">
                      <img
                        src="/assets/college-logo.png"
                        alt="New Govt. Degree College Logo"
                        className="max-h-full max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                  <div className="text-center space-y-1.5 px-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight font-serif">
                      NGDC Science Club
                    </h1>
                    <p className="text-base font-bold text-emerald-800 tracking-wide uppercase">
                      New Govt. Degree College, Rajshahi
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 flex items-center justify-center">
                      <img
                        src="/assets/club-logo.png"
                        alt="NGDC Science Club Logo"
                        className="max-h-full max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 py-2.5 border-t border-b border-slate-300 text-center bg-slate-50">
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                    Membership Confirmation Slip
                  </h2>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 px-1">
                  <div>
                    <span>Date: </span>
                    <strong className="text-slate-900">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Status: Approved</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="border border-slate-200 rounded-xl p-7 bg-white shadow-2xs space-y-6">
                  <div className="flex items-start gap-6 pb-6 border-b border-slate-100">
                    <div className="w-32 h-40 rounded-lg border-2 border-slate-300 p-1 bg-white shrink-0 overflow-hidden shadow-2xs flex items-center justify-center">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-full h-full object-cover rounded-xs"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                          <User className="w-12 h-12 mb-1" />
                          <span className="text-[11px] font-medium">Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2.5 pt-1 min-w-0">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Member Name
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">
                          {member.name}
                        </h3>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-sm font-black">
                        <span>Membership ID:</span>
                        <span className="tracking-wider text-emerald-800">{member.membershipId || 'NGDCSC-APPROVED'}</span>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {member.studentId && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            Roll: <strong className="font-mono">{member.studentId}</strong>
                          </span>
                        )}
                        {member.batch && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            {member.batch}
                          </span>
                        )}
                        {member.section && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            Section {member.section}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-center">
                      <MemberQrCode
                        membershipId={member.membershipId || 'NGDCSC-APPROVED'}
                        size={96}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Student Roll / College ID
                      </span>
                      <p className="font-bold text-slate-900 text-sm font-mono">
                        {member.studentId || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Batch &amp; Section
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {member.batch || 'HSC 27'} {member.section ? `• Section ${member.section}` : ''}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Mobile Phone
                      </span>
                      <p className="font-bold text-slate-900 text-sm font-mono">
                        {member.phone || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Email Address
                      </span>
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {member.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <p className="text-sm leading-relaxed text-slate-700">
                  This is to certify that <strong>{member.name}</strong> is an officially registered and approved member of the <strong>New Govt. Degree College Science Club (NGDCSC)</strong>, Rajshahi.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>New Govt. Degree College Science Club (NGDCSC)</span>
                <span>Rajshahi, Bangladesh</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Automatic Popup Modal when Account is Restricted */}
      {typeof document !== 'undefined' &&
        member &&
        isAccountRestricted &&
        !restrictedPopupDismissed &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-3xl border border-red-200 shadow-2xl overflow-hidden text-slate-900">
              <div className="p-4 sm:p-5 bg-red-50 border-b border-red-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-red-800">
                  <Ban className="w-5 h-5 text-red-600 shrink-0" />
                  <h2 className="text-sm sm:text-base font-black">Account Restricted</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRestrictedPopupDismissed(true)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-red-100/70 transition-colors cursor-pointer"
                  aria-label="Close popup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Lock className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900">
                    Your account has been restricted
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Confirmation/Payment Slip, Attendance, Edit Profile, and Change Password are disabled. Only <strong>Inbox</strong> is open.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-50/90 border border-red-200 text-left">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-red-700 mb-1">
                    Reason:
                  </span>
                  <p className="text-xs font-semibold text-red-950 leading-relaxed">
                    {member.restrictedReason ||
                      'Restricted by the club administrator. Please open Inbox to contact the President.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRestrictedPopupDismissed(true);
                      switchPage('inbox');
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-black shadow-md shadow-red-600/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <Inbox className="w-4 h-4" />
                    <span>Open Inbox</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestrictedPopupDismissed(true)}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
