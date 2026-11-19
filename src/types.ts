export type SectionType = 'A' | 'B' | 'C' | 'D';
export type BatchType = 'HSC 27' | 'HSC 28';
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

