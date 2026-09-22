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
import { SubmissionRecord, ExecutiveMember, ClubNotice } from '../types';

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

// Pre-authorized primary admin emails - STRICTLY ngdcsc.org@gmail.com
export const SUPER_ADMIN_EMAILS = [
  'ngdcsc.org@gmail.com'
];

// Offline & Local Storage fallback keys
const LS_MEMBERS_KEY = 'ngdcsc_firebase_members_cache';
const LS_COMMITTEE_KEY = 'ngdcsc_firebase_committee_cache';
const LS_NOTICES_KEY = 'ngdcsc_firebase_notices_cache';

// ==================== MEMBER / REGISTRATION OPERATIONS ====================

/**
 * Submit / save a student membership registration to Firebase Firestore
 */
export async function saveMemberToFirebase(member: SubmissionRecord): Promise<string> {
  const memberId = member.id || `ngdc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const recordWithId: SubmissionRecord = {
    ...member,
    id: memberId,
    status: member.status || 'pending',
    createdAt: member.createdAt || new Date().toISOString()
  };

  // 1. Save to local cache first
  try {
    const cached = getCachedMembers();
    const updated = [recordWithId, ...cached.filter(m => m.id !== memberId)];
    localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  // 2. Save to Firestore
  try {
    const docRef = doc(db, 'members', memberId);
    await setDoc(docRef, {
      ...recordWithId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore write warning (data retained in local cache):', err);
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
      // Sort newest first
      records.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
      try {
        localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(records));
      } catch {
        // ignore
      }
      return records;
    }
  } catch (err) {
    console.warn('Firestore fetch members warning, falling back to cache:', err);
  }
  return getCachedMembers();
}

/**
 * Update member details or status (pending, approved, rejected)
 */
export async function updateMemberInFirebase(id: string, updates: Partial<SubmissionRecord>): Promise<void> {
  // Update local cache
  const cached = getCachedMembers();
  const updated = cached.map(m => m.id === id ? { ...m, ...updates } : m);
  localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));

  // Update Firestore
  try {
    const docRef = doc(db, 'members', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore update error (updated locally):', err);
  }
}

/**
 * Delete a member registration from Firebase
 */
export async function deleteMemberFromFirebase(id: string): Promise<void> {
  // Delete from local cache
  const cached = getCachedMembers();
  const updated = cached.filter(m => m.id !== id);
  localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));

  // Delete from Firestore
  try {
    const docRef = doc(db, 'members', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete error (deleted locally):', err);
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
  } catch (err) {
    console.warn('Firestore fetch committee error, using cache/default:', err);
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
  } catch (err) {
    console.warn('Firestore fetch notices error, using cached notices:', err);
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
