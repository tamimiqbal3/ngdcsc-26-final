export type SectionType = 'A' | 'B' | 'C' | 'D';
export type BatchType = 'HSC 27' | 'HSC 28';
export type AcademicGroup = 'Science' | 'Arts' | 'Commerce';
export type MemberStatus = 'pending' | 'approved' | 'rejected';
export type EmailType = 'confirmation' | 'decline' | 'custom';

export interface EmailLogRecord {
  id: string;
  memberId?: string;
  membershipId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  senderEmail: string;
  emailType: EmailType;
  subject: string;
  body: string;
  sentAt: string;
  sentBy: string;
  status: 'sent' | 'pending';
}

export interface MembershipFormData {
  photo: string | null;
  name: string;
  phone: string;
  whatsapp: string;
  sameAsPhone: boolean;
  email: string;
  studentId: string;
  academicGroup?: AcademicGroup | '';
  section: SectionType;
  dob: string;
  batch: BatchType;
  interestedSegments: string[];
  skills?: string[];
  experienceAchievements?: string;
  agreedToRules: boolean;
}

export interface SubmissionRecord extends MembershipFormData {
  id?: string;
  uid?: string;
  membershipId?: string;
  submittedAt: string;
  status?: MemberStatus;
  rejectionReason?: string;
  createdAt?: string;
  lastEmailSent?: {
    type: EmailType;
    sentAt: string;
    subject: string;
    sentBy?: string;
  };
}

export interface PublicMemberStatus {
  id?: string;
  uid?: string;
  membershipId?: string;
  name: string;
  photo: string | null;
  status: MemberStatus;
  rejectionReason?: string;
  batch?: BatchType | string;
  section?: SectionType | string;
  submittedAt?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  studentId?: string;
  academicGroup?: AcademicGroup | '';
  dob?: string;
  interestedSegments?: string[];
  skills?: string[];
  experienceAchievements?: string;
}

export interface ExecutiveMember {
  id: string;
  role: string;
  name: string;
  image: string;
  order?: number;
  phone?: string;
  email?: string;
  batch?: string;
}

export interface ClubNotice {
  id: string;
  title: string;
  date: string;
  category: 'General' | 'Olympiad' | 'Workshop' | 'Notice' | 'Urgent' | 'Event';
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: 'image' | 'pdf' | 'doc' | null;
  isPinned?: boolean;
  publishedBy?: string;
  createdAt?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'super_admin' | 'moderator';
}

export type RegistrationStatusMode = 'open' | 'closed' | 'coming_soon';

export interface MembershipRegistrationSetting {
  status: RegistrationStatusMode;
  headline?: string;
  message?: string;
  skills?: string[];
  allowMemberEdit?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SKILL_OPTIONS: string[] = [
  'Video Editing',
  'Photo Editing / Graphic Design',
  'Social Media Management',
  'Communication & Public Speaking',
  'Event Management & Organizing',
  'Content Writing & Scripting',
  'Web & Technology',
  'Photography',
  'Robotics & Electronics'
];

export type AttendanceStatus = 'present' | 'absent';
export type AttendanceMethod = 'qr_scan' | 'manual';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  eventTitle: string;
  memberId: string;
  membershipId: string;
  memberName: string;
  memberRoll?: string;
  memberBatch?: string;
  memberSection?: string;
  memberUid?: string | null;
  memberEmail?: string | null;
  memberEmailLower?: string | null;
  status: AttendanceStatus;
  scannedAt: string; // ISO timestamp
  scannedTimeLabel: string; // e.g. 03:45:12 PM
  method: AttendanceMethod;
  note?: string;
  markedBy?: string;
  updatedAt?: string;
}

export interface AttendanceSession {
  date: string; // YYYY-MM-DD
  eventTitle: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const PRESIDENT_EMAIL = 'info.tamimiq@gmail.com';
export const PRESIDENT_DISPLAY_NAME = 'Tamim Iqbal';
export const PRESIDENT_ROLE_LABEL = 'President';
export const PRESIDENT_PHOTO_URL =
  'https://raw.githubusercontent.com/tamimiqbal3/tamimiqshop/refs/heads/main/profile.jpg';

export type InboxSenderRole = 'president' | 'member';

export interface InboxThread {
  id: string;
  memberId: string;
  memberUid?: string | null;
  memberEmail: string;
  memberEmailLower: string;
  memberName: string;
  memberRoll?: string;
  memberMembershipId?: string;
  memberBatch?: string;
  memberSection?: string;
  memberPhoto?: string | null;
  lastMessage: string;
  lastSenderEmail: string;
  lastSenderName: string;
  lastSenderRole: InboxSenderRole;
  lastMessageAt: string;
  unreadByPresident: number;
  unreadByMember: number;
  presidentLastReadAt?: string;
  memberLastReadAt?: string;
  updatedAt?: string;
}

export interface InboxMessage {
  id: string;
  threadId: string;
  senderEmail: string;
  senderEmailLower: string;
  senderUid?: string | null;
  senderName: string;
  senderRole: InboxSenderRole;
  text: string;
  createdAt: string;
}

/**
 * Auto-detects Academic Group (Science / Arts / Commerce) from NGDC College Roll number.
 * Examples:
 * - 2025'1'133, 2026'1'133, 2025(1)133, 2025-1-133, 20251133 -> Science (middle code 1)
 * - 2025'2'133, 2026(2)133, 20252133 -> Arts (middle code 2)
 * - 2025'3'133, 2026(3)133, 20253133 -> Commerce (middle code 3)
 */
export function detectGroupFromRoll(roll?: string | null): AcademicGroup | null {
  if (!roll) return null;
  const trimmed = roll.trim();
  if (!trimmed) return null;

  // 1. Explicit quote/bracket/dash separator around the group digit: e.g. 2025'1'133, 2026(1)133, 25'2'105
  const delimitedMatch = trimmed.match(
    /^\d{2,4}\s*['"(\[\-\/\s.]+\s*([123])(?:\s*['")\-\/\s.\]]|\d|$)/
  );
  if (delimitedMatch) {
    if (delimitedMatch[1] === '1') return 'Science';
    if (delimitedMatch[1] === '2') return 'Arts';
    if (delimitedMatch[1] === '3') return 'Commerce';
  }

  // 2. Compact numeric format with 4-digit year + group digit + serial: e.g. 20251133, 20261133, 20252045
  const digitsOnly = trimmed.replace(/\D/g, '');
  const compactMatch = digitsOnly.match(/^(?:19|20)\d{2}([123])\d+$/);
  if (compactMatch) {
    if (compactMatch[1] === '1') return 'Science';
    if (compactMatch[1] === '2') return 'Arts';
    if (compactMatch[1] === '3') return 'Commerce';
  }

  return null;
}

export function getEffectiveMemberGroup(
  member?: { studentId?: string | null; academicGroup?: string | null } | null
): AcademicGroup | null {
  if (!member) return null;
  const detected = detectGroupFromRoll(member.studentId);
  if (detected) return detected;
  if (
    member.academicGroup === 'Science' ||
    member.academicGroup === 'Arts' ||
    member.academicGroup === 'Commerce'
  ) {
    return member.academicGroup;
  }
  return null;
}

export const GROUP_BADGE_STYLES: Record<AcademicGroup, string> = {
  Science: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Arts: 'bg-violet-50 text-violet-800 border-violet-200',
  Commerce: 'bg-amber-50 text-amber-800 border-amber-200'
};


