import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { SubmissionRecord, ExecutiveMember, ClubNotice, PublicMemberStatus, MemberStatus } from '../types';

import { getAnalytics, isSupported } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: "AIzaSyC-J4YtNcvqUQYUA9WgFckP7pQC9KtDNMo",
  authDomain: "ngdcsc-a8228.firebaseapp.com",
  databaseURL: "https://ngdcsc-a8228-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ngdcsc-a8228",
  storageBucket: "ngdcsc-a8228.firebasestorage.app",
  messagingSenderId: "315370542065",
  appId: "1:315370542065:web:740142776b5a4450152a50",
  measurementId: "G-SMC8605ZNP"
};

// Initialize Firebase singleton
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Initialize analytics safely if supported
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(firebaseApp);
    }
  }).catch(() => {});
}

export const googleProvider = new GoogleAuthProvider();

// Pre-authorized primary admin emails
export const SUPER_ADMIN_EMAILS = [
  'ngdcsc.org@gmail.com',
  'info.tamimiq@gmail.com'
];

// Offline & Local Storage fallback keys
const LS_MEMBERS_KEY = 'ngdcsc_firebase_members_cache';
const LS_COMMITTEE_KEY = 'ngdcsc_firebase_committee_cache';
const LS_NOTICES_KEY = 'ngdcsc_firebase_notices_cache';

// ==================== MEMBER / REGISTRATION OPERATIONS ====================

/**
 * Normalizes a phone number to standard Bangladeshi 11 digits format (e.g. 017xxxxxxxx)
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, '');
  // If starts with 880 (e.g. 8801712345678)
  if (digits.startsWith('880') && digits.length >= 13) {
    return '0' + digits.slice(3);
  }
  // If 10 digits starting with 1 (e.g. 1712345678)
  if (digits.length === 10 && digits.startsWith('1')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Generate next serial membership ID in format NGDCSC-001, NGDCSC-002, etc.
 */
export function getNextMembershipId(existingMembers: SubmissionRecord[]): string {
  let maxNum = 0;
  for (const m of existingMembers) {
    if (m.membershipId) {
      const match = m.membershipId.match(/NGDCSC-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  // If no serial found yet, fallback to total count or 0
  const nextNum = maxNum > 0 ? maxNum + 1 : (existingMembers.length > 0 ? existingMembers.length + 1 : 1);
  return `NGDCSC-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Submit / save a student membership registration to Firebase Firestore
 */
export async function saveMemberToFirebase(member: SubmissionRecord): Promise<string> {
  const cached = getCachedMembers();
  const membershipId = (member.membershipId && member.membershipId.trim()) 
    ? member.membershipId.trim().toUpperCase() 
    : getNextMembershipId(cached);

  const memberId = member.id || `ngdc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const recordWithId: SubmissionRecord = {
    ...member,
    id: memberId,
    membershipId,
    status: member.status || 'pending',
    createdAt: member.createdAt || new Date().toISOString()
  };

  // 1. Save to local cache first
  try {
    const updated = [recordWithId, ...cached.filter(m => m.id !== memberId)];
    localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  // 2. Save full record to Firestore 'members' collection
  try {
    const docRef = doc(db, 'members', memberId);
    await setDoc(docRef, {
      ...recordWithId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore write warning (data retained in local cache):', err);
  }

  // 3. Save lightweight public status to 'member_status' by normalized phone & membership ID
  const cleanPhone = normalizePhoneNumber(recordWithId.phone);
  const statusPayload = {
    id: memberId,
    membershipId: recordWithId.membershipId,
    name: recordWithId.name,
    photo: recordWithId.photo || null,
    status: recordWithId.status || 'pending',
    rejectionReason: recordWithId.rejectionReason || null,
    batch: recordWithId.batch,
    section: recordWithId.section,
    submittedAt: recordWithId.submittedAt || recordWithId.createdAt,
    updatedAt: serverTimestamp()
  };

  if (cleanPhone) {
    try {
      const statusRef = doc(db, 'member_status', cleanPhone);
      await setDoc(statusRef, statusPayload, { merge: true });
    } catch (err) {
      console.warn('Firestore member_status sync warning:', err);
    }
  }

  if (membershipId) {
    try {
      const idRef = doc(db, 'member_status', membershipId.toUpperCase().trim());
      await setDoc(idRef, statusPayload, { merge: true });
    } catch {
      // ignore
    }
  }

  return memberId;
}

/**
 * Fetch all registered members from Firebase Firestore (with fallback)
 */
export async function fetchMembersFromFirebase(): Promise<SubmissionRecord[]> {
  try {
    const colRef = collection(db, 'members');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const records: SubmissionRecord[] = [];
      snap.forEach(d => {
        records.push({ id: d.id, ...d.data() } as SubmissionRecord);
      });

      // Find current max serial number among existing membership IDs
      let maxSerial = 0;
      records.forEach(r => {
        if (r.membershipId) {
          const match = r.membershipId.match(/NGDCSC-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSerial) maxSerial = num;
          }
        }
      });

      // If any existing records lack a membershipId, assign them serially by registration date
      const missingIdRecords = records.filter(r => !r.membershipId);
      if (missingIdRecords.length > 0) {
        // Sort oldest first for chronological serial numbering
        missingIdRecords.sort((a, b) => 
          new Date(a.submittedAt || a.createdAt || 0).getTime() - new Date(b.submittedAt || b.createdAt || 0).getTime()
        );
        for (const item of missingIdRecords) {
          maxSerial += 1;
          item.membershipId = `NGDCSC-${String(maxSerial).padStart(3, '0')}`;
          // Persist back to Firestore in background
          if (item.id) {
            setDoc(doc(db, 'members', item.id), { membershipId: item.membershipId }, { merge: true }).catch(() => {});
          }
        }
      }

      // Sort newest first for admin view
      records.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
      try {
        localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(records));
      } catch {
        // ignore
      }
      return records;
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.info('Firestore: Rules need to be published in Firebase Console. Using local members cache.');
    } else {
      console.warn('Firestore fetch members warning, falling back to cache:', err);
    }
  }
  return getCachedMembers();
}

/**
 * Update member details or status (pending, approved, rejected, membershipId)
 */
export async function updateMemberInFirebase(id: string, updates: Partial<SubmissionRecord>): Promise<void> {
  // Update local cache
  const cached = getCachedMembers();
  const targetMember = cached.find(m => m.id === id);
  const updated = cached.map(m => m.id === id ? { ...m, ...updates } : m);
  localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));

  // Update Firestore 'members' collection
  try {
    const docRef = doc(db, 'members', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore update error (updated locally):', err);
  }

  // Update 'member_status' public collection by phone and membership ID
  const effectiveMid = updates.membershipId !== undefined ? updates.membershipId : targetMember?.membershipId;
  const statusPayload: any = { updatedAt: serverTimestamp() };
  if (updates.status !== undefined) statusPayload.status = updates.status;
  if (updates.rejectionReason !== undefined) statusPayload.rejectionReason = updates.rejectionReason;
  if (updates.name !== undefined) statusPayload.name = updates.name;
  if (updates.photo !== undefined) statusPayload.photo = updates.photo;
  if (updates.batch !== undefined) statusPayload.batch = updates.batch;
  if (updates.section !== undefined) statusPayload.section = updates.section;
  if (effectiveMid) statusPayload.membershipId = effectiveMid.toUpperCase().trim();

  const memberPhone = updates.phone || targetMember?.phone;
  if (memberPhone) {
    const cleanPhone = normalizePhoneNumber(memberPhone);
    if (cleanPhone) {
      try {
        const statusRef = doc(db, 'member_status', cleanPhone);
        await setDoc(statusRef, statusPayload, { merge: true });
      } catch (err) {
        console.warn('Firestore member_status update error:', err);
      }
    }
  }

  // Update/cleanup membership ID lookup doc
  if (effectiveMid) {
    try {
      const cleanMid = effectiveMid.toUpperCase().trim();
      await setDoc(doc(db, 'member_status', cleanMid), statusPayload, { merge: true });
      // If previous membershipId was different, clean up old lookup doc
      if (targetMember?.membershipId && targetMember.membershipId.toUpperCase().trim() !== cleanMid) {
        await deleteDoc(doc(db, 'member_status', targetMember.membershipId.toUpperCase().trim())).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Delete a member registration from Firebase
 */
export async function deleteMemberFromFirebase(id: string): Promise<void> {
  // Delete from local cache
  const cached = getCachedMembers();
  const targetMember = cached.find(m => m.id === id);
  const updated = cached.filter(m => m.id !== id);
  localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));

  // Delete from Firestore 'members' collection
  try {
    const docRef = doc(db, 'members', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete error (deleted locally):', err);
  }

  // Delete from 'member_status' public collection by phone
  if (targetMember?.phone) {
    const cleanPhone = normalizePhoneNumber(targetMember.phone);
    if (cleanPhone) {
      try {
        await deleteDoc(doc(db, 'member_status', cleanPhone));
      } catch {
        // ignore
      }
    }
  }

  // Delete from 'member_status' public collection by membership ID
  if (targetMember?.membershipId) {
    try {
      await deleteDoc(doc(db, 'member_status', targetMember.membershipId.toUpperCase().trim()));
    } catch {
      // ignore
    }
  }
}

/**
 * Public Search for Member Status using Phone Number OR Membership ID (e.g. NGDCSC-001)
 * Returns strictly: id, membershipId, name, photo, status, rejectionReason (plus batch & section)
 */
export async function searchMemberStatus(query: string): Promise<PublicMemberStatus | null> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 3) return null;

  const isMembershipId = /^[a-zA-Z0-9-]+$/.test(trimmed) && (
    trimmed.toUpperCase().startsWith('NGDCSC') || 
    trimmed.includes('-')
  );
  const cleanKey = isMembershipId ? trimmed.toUpperCase().trim() : normalizePhoneNumber(trimmed);

  if (!cleanKey) return null;

  // 1. First attempt: check public 'member_status' Firestore collection
  try {
    const statusRef = doc(db, 'member_status', cleanKey);
    const snap = await getDoc(statusRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: data.id || snap.id,
        membershipId: data.membershipId || (isMembershipId ? cleanKey : undefined),
        name: data.name || 'Member',
        photo: data.photo || null,
        status: (data.status as MemberStatus) || 'pending',
        rejectionReason: data.rejectionReason || undefined,
        batch: data.batch,
        section: data.section,
        submittedAt: data.submittedAt
      };
    }
  } catch (err) {
    console.warn('Firestore member_status lookup check:', err);
  }

  // 2. Second attempt: Check local storage cached members
  const cached = getCachedMembers();
  const cleanKeyNorm = cleanKey.toUpperCase().replace(/\s/g, '');
  const matchedMember = cached.find(m => {
    // Check membership ID match
    if (m.membershipId) {
      const mIdNorm = m.membershipId.toUpperCase().replace(/\s/g, '');
      if (mIdNorm === cleanKeyNorm) return true;
      // Allow partial match if digits match (e.g., "NGDCSC-001" vs "001")
      const idNum = m.membershipId.replace(/[^0-9]/g, '');
      const qNum = trimmed.replace(/[^0-9]/g, '');
      if (idNum && qNum && parseInt(idNum, 10) === parseInt(qNum, 10) && (trimmed.toLowerCase().includes('ngdc') || idNum.length >= 3)) {
        return true;
      }
    }
    // Check phone match
    const mPhone = normalizePhoneNumber(m.phone || '');
    return mPhone === cleanKey || (cleanKey.length >= 10 && mPhone.endsWith(cleanKey.slice(-10)));
  });

  if (matchedMember) {
    return {
      id: matchedMember.id,
      membershipId: matchedMember.membershipId,
      name: matchedMember.name,
      photo: matchedMember.photo || null,
      status: (matchedMember.status as MemberStatus) || 'pending',
      rejectionReason: matchedMember.rejectionReason || undefined,
      batch: matchedMember.batch,
      section: matchedMember.section,
      submittedAt: matchedMember.submittedAt || matchedMember.createdAt
    };
  }

  return null;
}

// Alias for backwards compatibility
export const searchMemberStatusByPhone = searchMemberStatus;

/**
 * Sync all existing members into member_status collection (called by admin upon loading)
 */
export async function syncAllMembersToStatusDocs(members: SubmissionRecord[]): Promise<void> {
  if (!members || members.length === 0) return;
  try {
    for (const member of members) {
      const statusPayload = {
        id: member.id,
        membershipId: member.membershipId || null,
        name: member.name,
        photo: member.photo || null,
        status: member.status || 'pending',
        rejectionReason: member.rejectionReason || null,
        batch: member.batch,
        section: member.section,
        submittedAt: member.submittedAt || member.createdAt,
        updatedAt: serverTimestamp()
      };

      const cleanPhone = normalizePhoneNumber(member.phone);
      if (cleanPhone) {
        await setDoc(doc(db, 'member_status', cleanPhone), statusPayload, { merge: true });
      }

      if (member.membershipId) {
        await setDoc(doc(db, 'member_status', member.membershipId.toUpperCase().trim()), statusPayload, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Batch sync member_status notice:', err);
  }
}

function getCachedMembers(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(LS_MEMBERS_KEY) || localStorage.getItem('ngdc_sc_submissions_v1');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ==================== EXECUTIVE COMMITTEE OPERATIONS ====================

/**
 * Fetch executive committee from Firebase Firestore
 */
export async function fetchCommitteeFromFirebase(defaultList: ExecutiveMember[]): Promise<ExecutiveMember[]> {
  try {
    const colRef = collection(db, 'executive_committee');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: ExecutiveMember[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as ExecutiveMember);
      });
      list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      try {
        localStorage.setItem(LS_COMMITTEE_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
      return list;
    } else {
      // If collection is empty, seed with initial list
      seedDefaultCommittee(defaultList).catch(() => {});
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.info('Firestore: Rules need to be published in Firebase Console. Using local/default committee.');
    } else {
      console.warn('Firestore fetch committee error, using cache/default:', err);
    }
  }

  try {
    const cached = localStorage.getItem(LS_COMMITTEE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  return defaultList;
}

/**
 * Seed initial committee members into Firestore
 */
export async function seedDefaultCommittee(list: ExecutiveMember[]): Promise<void> {
  try {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const docRef = doc(db, 'executive_committee', item.id);
      await setDoc(docRef, { ...item, order: i + 1 }, { merge: true });
    }
    localStorage.setItem(LS_COMMITTEE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Error seeding committee:', err);
  }
}

/**
 * Save or update an executive member (photo, name, designation)
 */
export async function saveCommitteeMemberToFirebase(member: ExecutiveMember): Promise<void> {
  // Update local cache
  try {
    const cached: ExecutiveMember[] = JSON.parse(localStorage.getItem(LS_COMMITTEE_KEY) || '[]');
    const exists = cached.some(m => m.id === member.id);
    const updated = exists 
      ? cached.map(m => m.id === member.id ? member : m)
      : [...cached, member];
    localStorage.setItem(LS_COMMITTEE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // Update Firestore
  try {
    const docRef = doc(db, 'executive_committee', member.id);
    await setDoc(docRef, {
      ...member,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore committee save error:', err);
  }
}

/**
 * Delete an executive member
 */
export async function deleteCommitteeMemberFromFirebase(id: string): Promise<void> {
  try {
    const cached: ExecutiveMember[] = JSON.parse(localStorage.getItem(LS_COMMITTEE_KEY) || '[]');
    const updated = cached.filter(m => m.id !== id);
    localStorage.setItem(LS_COMMITTEE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  try {
    const docRef = doc(db, 'executive_committee', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore committee delete error:', err);
  }
}

// ==================== NOTICES OPERATIONS ====================

const INITIAL_DEFAULT_NOTICES: ClubNotice[] = [
  {
    id: 'notice_reg_2026',
    title: 'Membership Registration Open for HSC 27 & 28 Batches',
    date: '2026-09-20',
    category: 'Notice',
    content: 'The official membership registration for New Government Degree College Science Club (NGDCSC) is now open for students of HSC 2027 and HSC 2028 batches. Eligible students must submit their complete information along with their formal passport-size photograph before the deadline.',
    isPinned: true,
    publishedBy: 'Executive Committee'
  },
  {
    id: 'notice_olympiad_prep',
    title: 'Science Olympiad & Innovation Project Selection Camp',
    date: '2026-09-18',
    category: 'Olympiad',
    content: 'Upcoming intra-college selection tests for National Math, Physics, and Biology Olympiad participants will be conducted soon. Registered club members will receive priority guidance and resource packs.',
    isPinned: false,
    publishedBy: 'Academic Co-ordinator'
  }
];

/**
 * Fetch all notices from Firebase Firestore
 */
export async function fetchNoticesFromFirebase(): Promise<ClubNotice[]> {
  try {
    const colRef = collection(db, 'notices');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const notices: ClubNotice[] = [];
      snap.forEach(d => {
        notices.push({ id: d.id, ...d.data() } as ClubNotice);
      });
      // Sort pinned first, then by date descending
      notices.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
      try {
        localStorage.setItem(LS_NOTICES_KEY, JSON.stringify(notices));
      } catch {
        // ignore
      }
      return notices;
    } else {
      // Seed default notices if empty
      for (const n of INITIAL_DEFAULT_NOTICES) {
        await setDoc(doc(db, 'notices', n.id), n, { merge: true }).catch(() => {});
      }
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.info('Firestore: Rules need to be published in Firebase Console. Using local/default notices.');
    } else {
      console.warn('Firestore fetch notices error, using cached notices:', err);
    }
  }

  try {
    const cached = localStorage.getItem(LS_NOTICES_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  return INITIAL_DEFAULT_NOTICES;
}

/**
 * Add or update a notice in Firebase
 */
export async function saveNoticeToFirebase(notice: ClubNotice): Promise<void> {
  const noticeId = notice.id || `notice_${Date.now()}`;
  const record: ClubNotice = { ...notice, id: noticeId };

  // Update local cache
  try {
    const cached: ClubNotice[] = JSON.parse(localStorage.getItem(LS_NOTICES_KEY) || '[]');
    const exists = cached.some(n => n.id === noticeId);
    const updated = exists 
      ? cached.map(n => n.id === noticeId ? record : n)
      : [record, ...cached];
    localStorage.setItem(LS_NOTICES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // Update Firestore
  try {
    const docRef = doc(db, 'notices', noticeId);
    await setDoc(docRef, {
      ...record,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore notice save error:', err);
  }
}

/**
 * Delete a notice
 */
export async function deleteNoticeFromFirebase(id: string): Promise<void> {
  try {
    const cached: ClubNotice[] = JSON.parse(localStorage.getItem(LS_NOTICES_KEY) || '[]');
    const updated = cached.filter(n => n.id !== id);
    localStorage.setItem(LS_NOTICES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  try {
    const docRef = doc(db, 'notices', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore notice delete error:', err);
  }
}
