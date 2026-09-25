export type SectionType = 'A' | 'B' | 'C' | 'D';
export type BatchType = 'HSC 27' | 'HSC 28';
export type MemberStatus = 'pending' | 'approved' | 'rejected';

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
  agreedToRules: boolean;
}

export interface SubmissionRecord extends MembershipFormData {
  id?: string;
  membershipId?: string;
  submittedAt: string;
  status?: MemberStatus;
  rejectionReason?: string;
  createdAt?: string;
}

export interface PublicMemberStatus {
  id?: string;
  membershipId?: string;
  name: string;
  photo: string | null;
  status: MemberStatus;
  rejectionReason?: string;
  batch?: BatchType | string;
  section?: SectionType | string;
  submittedAt?: string;
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

