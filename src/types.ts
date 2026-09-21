export type SectionType = 'A' | 'B' | 'C' | 'D';
export type BatchType = 'HSC 27' | 'HSC 28';

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
  submittedAt: string;
}
