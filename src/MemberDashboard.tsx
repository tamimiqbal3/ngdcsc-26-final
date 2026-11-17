import React, { useState, useEffect, useRef } from 'react';
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
  EyeOff
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  SubmissionRecord,
  SectionType,
  BatchType,
  MembershipRegistrationSetting,
  DEFAULT_SKILL_OPTIONS
} from './types';
import {
  getCachedMemberProfileForUser,
  fetchMemberProfileForUser,
  updateOwnMemberProfile,
  logoutMemberAccount,
  changeMemberPassword,
  formatAuthError
} from './services/firebase';
import ImageAdjustModal from './components/ImageAdjustModal';
import DotLoader from './components/DotLoader';

const CLUB_SEGMENTS = [
  'Science Olympiad (Math, Physics, Bio, Chem)',
  'Science Project & Innovation',
  'Science Quizzing',
  'Robotics & Programming',
  'Astronomy & Space Science',
  'Scientific Wall Magazine & Publication'
];

type DashboardPage = 'slip' | 'edit' | 'password';

interface MemberDashboardProps {
  user: FirebaseUser;
  registrationSetting: MembershipRegistrationSetting;
  onBackToHome: () => void;
  onGoToRegistration: () => void;
  onSignedOut: () => void;
}

export default function MemberDashboard({
  user,
  registrationSetting,
  onBackToHome,
  onGoToRegistration,
  onSignedOut
}: MemberDashboardProps) {
  const initialCachedRef = useRef<SubmissionRecord | null | undefined>(undefined);
  if (initialCachedRef.current === undefined) {
    initialCachedRef.current = getCachedMemberProfileForUser(user.uid, user.email);
  }
  const initialCached = initialCachedRef.current;

  const [loading, setLoading] = useState(!initialCached);
  const [member, setMember] = useState<SubmissionRecord | null>(initialCached);
  const [activePage, setActivePage] = useState<DashboardPage>('slip');
  const isFormDirtyRef = useRef(false);

  // Editable form state (Roll, Phone, and Email are strictly locked)
  const [photo, setPhoto] = useState<string | null>(initialCached?.photo || null);
  const [name, setName] = useState(initialCached?.name || '');
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

  const populateForm = (rec: SubmissionRecord) => {
    setPhoto(rec.photo || null);
    setName(rec.name || '');
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

    fetchMemberProfileForUser(user.uid, user.email)
      .then((rec) => {
        if (!active) return;
        setMember(rec);
        if (rec && !isFormDirtyRef.current) {
          populateForm(rec);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.uid, user.email]);

  const switchPage = (page: DashboardPage) => {
    setActivePage(page);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setPasswordError(null);
    setPasswordSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSameAsPhoneToggle = (checked: boolean) => {
    isFormDirtyRef.current = true;
    setSameAsPhone(checked);
    if (checked && member?.phone) {
      setWhatsapp(member.phone);
    }
  };

  const toggleSegment = (seg: string) => {
    isFormDirtyRef.current = true;
    setInterestedSegments((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  };

  const toggleSkill = (sk: string) => {
    isFormDirtyRef.current = true;
    setSkills((prev) =>
      prev.includes(sk) ? prev.filter((s) => s !== sk) : [...prev, sk]
    );
  };

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

    if (!photo) {
      setErrorMsg('Passport photo is required.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!whatsapp.trim()) {
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
          whatsapp: (sameAsPhone ? member.phone : whatsapp).trim(),
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
      setMember(updated);
      setSaveSuccessMsg('Your profile information has been updated successfully.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      if (err?.code === 'permission-denied') {
        setErrorMsg('Unable to save changes due to server permissions. Please contact the club administrator.');
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
    if (!member || downloadingSlip) return;
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

  return (
    <div className="w-full max-w-3xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-12 formal-page-enter">
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

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/85 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold border border-slate-200/90 hover:border-rose-200 shadow-xs transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white/85 backdrop-blur-2xl rounded-3xl border border-slate-200/90 p-12 text-center shadow-lg">
          <DotLoader size="lg" color="emerald" className="mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-800">Loading My Dashboard...</p>
          <p className="text-xs text-slate-500 mt-1">Fetching your membership profile</p>
        </div>
      ) : !member ? (
        /* No Member Profile Found for Account */
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/90 p-8 sm:p-10 text-center shadow-xl space-y-4">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-4 sm:px-6 shadow-sm">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                My Dashboard
              </h1>
              <p className="text-xs text-slate-500">
                {member.name} • Roll <span className="font-mono font-semibold text-slate-700">{member.studentId}</span>
              </p>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => switchPage('slip')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                onClick={() => switchPage('edit')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePage === 'edit'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => switchPage('password')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePage === 'password'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* PAGE 1: CONFIRMATION SLIP PAGE */}
          {activePage === 'slip' && (
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
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

                        <div className="grid grid-cols-2 gap-2.5 pt-2 text-left text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              College Roll
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {member.studentId}
                            </span>
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

          {/* PAGE 2: EDIT PROFILE PAGE */}
          {activePage === 'edit' && (
            <form
              onSubmit={handleSaveChanges}
              onChange={() => {
                isFormDirtyRef.current = true;
              }}
              className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6 text-left animate-in fade-in duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Edit Profile
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your profile details below. College Roll, Phone Number, and Email Address are locked.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold self-start sm:self-center shrink-0">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Roll, Phone &amp; Email Locked</span>
                </span>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Photo & Identity */}
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Passport Size Photo *
                  </label>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setAdjustingPhoto(photo)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Adjust / Crop Photo</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/90">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-24 h-28 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden bg-slate-50 shrink-0"
                  >
                    {photo ? (
                      <div className="relative w-full h-full group">
                        <img src={photo} alt="Student" className="w-full h-full object-cover" />
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
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="text-center sm:text-left text-xs text-slate-600 space-y-2 flex-1">
                    <p className="font-bold text-slate-900">Update Passport Photograph</p>
                    <p className="text-[11px] text-slate-500">
                      Click the photo box to upload a new image, or adjust crop &amp; alignment.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Choose New Image
                    </button>
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
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* LOCKED PHONE */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Phone Number
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Locked</span>
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={member.phone}
                        readOnly
                        disabled
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-mono font-bold cursor-not-allowed select-none"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      Phone number cannot be edited after registration.
                    </p>
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
                        value={sameAsPhone ? member.phone : whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
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
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
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
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      College Roll cannot be edited after registration.
                    </p>
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
                            <span className="text-[11px] text-slate-500 font-medium">
                              {b === 'HSC 27' ? 'Class 12 • Senior Science' : 'Class 11 • Junior Science'}
                            </span>
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
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-5">
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

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
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
          {activePage === 'password' && (
            <form
              onSubmit={handlePasswordChangeSubmit}
              className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-5 text-left animate-in fade-in duration-200"
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

              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
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
      {member && member.status === 'approved' && (
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

                    <div className="flex-1 space-y-2.5 pt-1">
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
    </div>
  );
}
