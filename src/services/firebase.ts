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
  initializeFirestore,
  setLogLevel,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  Unsubscribe
} from 'firebase/firestore';
import { 
  SubmissionRecord, 
  ExecutiveMember, 
  ClubNotice, 
  PublicMemberStatus, 
  MemberStatus, 
  MembershipRegistrationSetting, 
  RegistrationStatusMode,
  DEFAULT_SKILL_OPTIONS
} from '../types';

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

// Suppress internal Firestore connection/retry notices from triggering false-positive error triggers
try {
  setLogLevel('error');
} catch {
  // ignore
}

// Initialize Firestore with resilient connection handling:
// experimentalForceLongPolling connects immediately using standard HTTP POST long-polling
// without attempting WebChannel streaming (which fails in sandboxed iframes and triggers [code=unavailable]).
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

/**
 * Utility to strip undefined properties from objects to prevent Firestore rejection
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

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
  'info.tamimiq@gmail.com',
  'tahmidahmmed007@gmail.com'
];

// Offline & Local Storage fallback keys
const LS_MEMBERS_KEY = 'ngdcsc_firebase_members_cache';
const LS_COMMITTEE_KEY = 'ngdcsc_firebase_committee_cache';
const LS_NOTICES_KEY = 'ngdcsc_firebase_notices_cache';

// ==================== MEMBER / REGISTRATION OPERATIONS ====================

/**
 * Extracts numeric serial from membership ID or serial string (e.g. NGDCSC-001 -> 1, NGDCSC-12 -> 12, 5 -> 5)
 */
export function extractSerial(idOrMid?: string | null): number {
  if (!idOrMid) return 0;
  const match = idOrMid.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Normalizes a phone number to standard Bangladeshi 11 digits format (e.g. 017xxxxxxxx)
 * Works reliably with +8801..., 8801..., 01..., spaces, dashes, or 10-digit without leading 0.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // If it contains a standard 11-digit BD number starting with 01
  if (digits.length >= 11) {
    const idx = digits.lastIndexOf('01');
    if (idx !== -1 && digits.length - idx >= 11) {
      return digits.substring(idx, idx + 11);
    }
  }

  // If 10 digits starting with 1 (e.g. 1712345678)
  if (digits.length === 10 && digits.startsWith('1')) {
    return '0' + digits;
  }

  return digits;
}

/**
 * Synchronous serial helper for local fallback or cache
 */
export function getNextMembershipId(existingMembers: SubmissionRecord[]): string {
  let maxNum = 0;
  for (const m of existingMembers) {
    const num = extractSerial(m.membershipId);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  return `NGDCSC-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Generate next serial membership ID by scanning all existing members
 * in Admin Panel, localStorage and live Firestore to prevent any duplicates.
 */
export async function generateNextMembershipId(currentList?: SubmissionRecord[]): Promise<string> {
  let maxSerial = 0;

  // 1. If list is already provided in memory, compute instantly with zero network delay
  if (currentList && Array.isArray(currentList) && currentList.length > 0) {
    for (const m of currentList) {
      const num = extractSerial(m.membershipId);
      if (num > maxSerial) maxSerial = num;
    }
    const nextSerial = maxSerial + 1;
    return `NGDCSC-${String(nextSerial).padStart(3, '0')}`;
  }

  // 2. Check local storage cache
  const cached = getCachedMembers();
  for (const m of cached) {
    const num = extractSerial(m.membershipId);
    if (num > maxSerial) maxSerial = num;
  }

  // 3. Fallback to live Firestore if needed
  try {
    const counterRef = doc(db, 'system_meta', 'membership_serial');
    const counterSnap = await getDoc(counterRef);
    if (counterSnap.exists()) {
      const val = counterSnap.data()?.lastSerial;
      if (typeof val === 'number' && val > maxSerial) {
        maxSerial = val;
      }
    }

    const nextSerial = maxSerial + 1;
    setDoc(counterRef, {
      lastSerial: nextSerial,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(() => {});

    return `NGDCSC-${String(nextSerial).padStart(3, '0')}`;
  } catch (err) {
    console.warn('Firestore serial lookup warning:', err);
    const nextSerial = maxSerial + 1;
    return `NGDCSC-${String(nextSerial).padStart(3, '0')}`;
  }
}

/**
 * Submit / save a student membership registration to Firebase Firestore
 */
export async function saveMemberToFirebase(member: SubmissionRecord): Promise<string> {
  const cached = getCachedMembers();
  const status = member.status || 'pending';
  let membershipId = member.membershipId ? member.membershipId.trim().toUpperCase() : '';

  // Only assign ID if member is approved (or admin explicitly provided ID)
  if (!membershipId && status === 'approved') {
    try {
      membershipId = await generateNextMembershipId(cached);
    } catch {
      membershipId = getNextMembershipId(cached);
    }
  }

  const memberId = member.id || `ngdc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const recordWithId: SubmissionRecord = {
    ...member,
    id: memberId,
    membershipId: membershipId || undefined,
    status,
    createdAt: member.createdAt || new Date().toISOString()
  };

  // 1. Save to local cache first
  try {
    const updated = [recordWithId, ...cached.filter(m => m.id !== memberId)];
    localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));
    localStorage.setItem('ngdc_sc_submissions_v1', JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  // 2. Save full record to Firestore 'members' collection
  try {
    const docRef = doc(db, 'members', memberId);
    const firestoreData = cleanFirestoreData({
      ...recordWithId,
      updatedAt: serverTimestamp()
    });
    // Create new document cleanly
    await setDoc(docRef, firestoreData);
  } catch (err) {
    console.warn('Firestore write warning (data retained in local cache):', err);
  }

  // 3. Save lightweight public status to 'member_status' by multiple keys for instant lookup
  const cleanPhone = normalizePhoneNumber(recordWithId.phone);
  const statusPayload: any = cleanFirestoreData({
    id: memberId,
    membershipId: recordWithId.membershipId || null,
    name: recordWithId.name,
    photo: recordWithId.photo || null,
    status: recordWithId.status || 'pending',
    rejectionReason: recordWithId.rejectionReason || null,
    batch: recordWithId.batch,
    section: recordWithId.section,
    submittedAt: recordWithId.submittedAt || recordWithId.createdAt,
    updatedAt: serverTimestamp()
  });

  const lookupKeys = new Set<string>();
  if (cleanPhone) {
    lookupKeys.add(cleanPhone);
    lookupKeys.add(`+88${cleanPhone}`);
    lookupKeys.add(`88${cleanPhone}`);
  }
  if (recordWithId.phone) {
    lookupKeys.add(recordWithId.phone.trim());
  }
  if (membershipId) {
    lookupKeys.add(membershipId.toUpperCase().trim());
    const digitsOnly = membershipId.replace(/\D/g, '');
    if (digitsOnly) lookupKeys.add(digitsOnly);
  }

  for (const k of Array.from(lookupKeys)) {
    try {
      await setDoc(doc(db, 'member_status', k), statusPayload, { merge: true });
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
        const num = extractSerial(r.membershipId);
        if (num > maxSerial) maxSerial = num;
      });

      // If any approved records lack a membershipId, assign them serially
      const missingIdApproved = records.filter(r => !r.membershipId && r.status === 'approved');
      if (missingIdApproved.length > 0) {
        missingIdApproved.sort((a, b) => 
          new Date(a.submittedAt || a.createdAt || 0).getTime() - new Date(b.submittedAt || b.createdAt || 0).getTime()
        );
        for (const item of missingIdApproved) {
          maxSerial += 1;
          item.membershipId = `NGDCSC-${String(maxSerial).padStart(3, '0')}`;
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
 * Real-time listener for Registered Members
 * Fires immediately with live data and auto-updates on any registration, edit, approval, or deletion across all devices.
 */
export function subscribeToMembers(
  callback: (members: SubmissionRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'members');
  return onSnapshot(colRef, (snapshot) => {
    const list: SubmissionRecord[] = [];
    snapshot.forEach(d => {
      list.push({ id: d.id, ...d.data() } as SubmissionRecord);
    });
    try {
      localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(list));
    } catch {}
    callback(list);
  }, (err) => {
    console.warn('Realtime members listener warning (using cache):', err);
    callback(getCachedMembers());
  });
}

/**
 * Update member details or status (pending, approved, rejected, membershipId)
 * Sanitizes all undefined values so Firestore does not throw errors
 */
export async function updateMemberInFirebase(id: string, updates: Partial<SubmissionRecord>): Promise<void> {
  // Update local cache
  const cached = getCachedMembers();
  const targetMember = cached.find(m => m.id === id);
  const updated = cached.map(m => m.id === id ? { ...m, ...updates } : m);
  localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));

  // Sanitize updates to replace undefined with null for Firestore compatibility
  const sanitizedUpdates: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    sanitizedUpdates[key] = val === undefined ? null : val;
  }

  // Update Firestore 'members' collection
  try {
    const docRef = doc(db, 'members', id);
    await setDoc(docRef, {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore update error (updated locally):', err);
  }

  // Update 'member_status' public collection documents
  let effectivePhone = updates.phone || targetMember?.phone;
  let effectiveName = updates.name || targetMember?.name || 'Club Member';
  let effectivePhoto = updates.photo !== undefined ? updates.photo : (targetMember?.photo || null);
  let effectiveStatus = updates.status !== undefined ? updates.status : (targetMember?.status || 'pending');
  let effectiveReason = updates.rejectionReason !== undefined ? updates.rejectionReason : (targetMember?.rejectionReason || null);
  let effectiveBatch = updates.batch !== undefined ? updates.batch : (targetMember?.batch || null);
  let effectiveSection = updates.section !== undefined ? updates.section : (targetMember?.section || null);
  let effectiveSubmittedAt = updates.submittedAt || targetMember?.submittedAt || targetMember?.createdAt || null;
  let effectiveMid = updates.membershipId !== undefined ? updates.membershipId : targetMember?.membershipId;

  // If phone is missing, fetch from Firestore 'members' collection
  if (!effectivePhone) {
    try {
      const docSnap = await getDoc(doc(db, 'members', id));
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.phone) effectivePhone = d.phone;
        if (!effectiveName && d.name) effectiveName = d.name;
        if (!effectivePhoto && d.photo) effectivePhoto = d.photo;
        if (!effectiveMid && d.membershipId) effectiveMid = d.membershipId;
        if (!effectiveBatch && d.batch) effectiveBatch = d.batch;
        if (!effectiveSection && d.section) effectiveSection = d.section;
        if (!effectiveSubmittedAt && (d.submittedAt || d.createdAt)) effectiveSubmittedAt = d.submittedAt || d.createdAt;
      }
    } catch (err) {
      console.warn('Firestore member lookup error:', err);
    }
  }

  const statusPayload: any = {
    id,
    name: effectiveName,
    photo: effectivePhoto,
    status: effectiveStatus,
    rejectionReason: effectiveStatus === 'approved' ? null : effectiveReason,
    batch: effectiveBatch,
    section: effectiveSection,
    submittedAt: effectiveSubmittedAt,
    updatedAt: serverTimestamp()
  };
  if (effectivePhone) {
    statusPayload.phone = effectivePhone;
  }
  if (effectiveMid) {
    statusPayload.membershipId = effectiveMid.toUpperCase().trim();
  }

  // Write to all key variations in member_status so phone search always finds the latest status
  const lookupKeys = new Set<string>();
  if (effectivePhone) {
    const norm = normalizePhoneNumber(effectivePhone);
    if (norm) {
      lookupKeys.add(norm);
      lookupKeys.add(`+88${norm}`);
      lookupKeys.add(`88${norm}`);
    }
    lookupKeys.add(effectivePhone.trim());
  }
  if (effectiveMid) {
    const cleanMid = effectiveMid.toUpperCase().trim();
    lookupKeys.add(cleanMid);
    const digitsOnly = cleanMid.replace(/\D/g, '');
    if (digitsOnly) lookupKeys.add(digitsOnly);
  }

  for (const k of Array.from(lookupKeys)) {
    try {
      await setDoc(doc(db, 'member_status', k), statusPayload, { merge: true });
    } catch (e) {
      console.warn(`Firestore member_status sync warning for key ${k}:`, e);
    }
  }
}

/**
 * Delete a member registration from Firebase
 */
export async function deleteMemberFromFirebase(id: string, memberData?: SubmissionRecord): Promise<void> {
  const cached = getCachedMembers();
  let targetMember = memberData || cached.find(m => m.id === id);

  // If phone is missing from cached/target, try to fetch doc once before deleting
  if (!targetMember?.phone && !targetMember?.membershipId) {
    try {
      const snap = await getDoc(doc(db, 'members', id));
      if (snap.exists()) {
        targetMember = { id, ...snap.data() } as SubmissionRecord;
      }
    } catch {}
  }

  // 1. Remove from all local caches
  const updated = cached.filter(m => m.id !== id);
  try {
    localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));
    const rawSub = localStorage.getItem('ngdc_sc_submissions_v1');
    if (rawSub) {
      const subList = JSON.parse(rawSub);
      localStorage.setItem('ngdc_sc_submissions_v1', JSON.stringify(subList.filter((m: any) => m.id !== id)));
    }
    const rawFb = localStorage.getItem('ngdc_sc_firebase_members_v1');
    if (rawFb) {
      const fbList = JSON.parse(rawFb);
      localStorage.setItem('ngdc_sc_firebase_members_v1', JSON.stringify(fbList.filter((m: any) => m.id !== id)));
    }
  } catch {}

  // 2. Delete main document from Firestore 'members' collection
  try {
    const docRef = doc(db, 'members', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete error:', err);
  }

  // 3. Delete all associated status documents from 'member_status' collection
  const keysToDelete = new Set<string>();
  if (targetMember?.phone) {
    const norm = normalizePhoneNumber(targetMember.phone);
    if (norm) {
      keysToDelete.add(norm);
      keysToDelete.add(`+88${norm}`);
      keysToDelete.add(`88${norm}`);
    }
    keysToDelete.add(targetMember.phone.trim());
  }
  if (targetMember?.whatsapp) {
    const normW = normalizePhoneNumber(targetMember.whatsapp);
    if (normW) {
      keysToDelete.add(normW);
      keysToDelete.add(`+88${normW}`);
      keysToDelete.add(`88${normW}`);
    }
    keysToDelete.add(targetMember.whatsapp.trim());
  }
  if (targetMember?.membershipId) {
    const midClean = targetMember.membershipId.toUpperCase().trim();
    keysToDelete.add(midClean);
    const digits = midClean.replace(/\D/g, '');
    if (digits) keysToDelete.add(digits);
  }
  keysToDelete.add(id);

  const deletePromises = Array.from(keysToDelete).map(k => 
    deleteDoc(doc(db, 'member_status', k)).catch(() => {})
  );
  await Promise.allSettled(deletePromises);
}

/**
 * Public Search for Member Status using Phone Number (+88 or 01) OR Membership ID (e.g. NGDCSC-008, 008)
 * Checks the live Firestore 'members' collection first, then 'member_status', then local cache.
 */
/**
 * Helper to purge stale deleted records from client localStorage
 */
function cleanStaleLocalMember(cleanPhone?: string, mid?: string) {
  try {
    const rawSub = localStorage.getItem('ngdc_sc_submissions_v1');
    if (rawSub) {
      const list = JSON.parse(rawSub);
      const filtered = list.filter((m: any) => {
        if (cleanPhone && normalizePhoneNumber(m.phone || '') === cleanPhone) return false;
        if (mid && m.membershipId && m.membershipId.toUpperCase() === mid.toUpperCase()) return false;
        return true;
      });
      localStorage.setItem('ngdc_sc_submissions_v1', JSON.stringify(filtered));
    }
  } catch {}
}

/**
 * Public Search for Member Status using Phone Number (+88 or 01) OR Membership ID (e.g. NGDCSC-008, 008)
 * Checks live Firestore 'member_status' and 'members' directly with timeout protection.
 * If deleted or not found, reliably returns null (NOT found).
 */
export async function searchMemberStatus(queryStr: string): Promise<PublicMemberStatus | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 3500);
  });

  const searchAction = async (): Promise<PublicMemberStatus | null> => {
    const trimmed = queryStr.trim();
    if (!trimmed || trimmed.length < 2) return null;

    const cleanPhone = normalizePhoneNumber(trimmed);
    const isMid = trimmed.toUpperCase().startsWith('NGDCSC') || /^\d{1,4}$/.test(trimmed);
    const midStandard = trimmed.toUpperCase().startsWith('NGDCSC') 
      ? trimmed.toUpperCase() 
      : (/^\d+$/.test(trimmed) ? `NGDCSC-${trimmed.padStart(3, '0')}` : trimmed.toUpperCase());

    // 1. Direct document key lookups in 'member_status' (point queries - fastest O(1) response)
    const candidateKeys = new Set<string>();
    if (cleanPhone) {
      candidateKeys.add(cleanPhone);
      candidateKeys.add(`+88${cleanPhone}`);
      candidateKeys.add(`88${cleanPhone}`);
    }
    candidateKeys.add(trimmed);
    if (isMid) {
      candidateKeys.add(trimmed.toUpperCase());
      if (midStandard) candidateKeys.add(midStandard);
      const digits = trimmed.replace(/\D/g, '');
      if (digits) candidateKeys.add(digits);
    }

    try {
      const statusPromises = Array.from(candidateKeys).map(k => getDoc(doc(db, 'member_status', k)).catch(() => null));
      const statusSnaps = await Promise.all(statusPromises);
      for (const snap of statusSnaps) {
        if (snap && snap.exists()) {
          const data = snap.data();
          if (data && data.status !== 'deleted') {
            return {
              id: data.id || snap.id,
              membershipId: data.membershipId || (isMid ? midStandard : undefined),
              name: data.name || 'Member',
              photo: data.photo || null,
              status: (data.status as MemberStatus) || 'pending',
              rejectionReason: data.rejectionReason || undefined,
              batch: data.batch,
              section: data.section,
              submittedAt: data.submittedAt
            };
          }
        }
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        throw new Error('PERMISSION_DENIED');
      }
    }

    // 2. Targeted queries on 'members' collection with limit(1)
    try {
      const membersCol = collection(db, 'members');
      const queriesToRun: any[] = [];
      if (cleanPhone) {
        queriesToRun.push(query(membersCol, where('phone', '==', cleanPhone), limit(1)));
        queriesToRun.push(query(membersCol, where('phone', '==', trimmed), limit(1)));
        queriesToRun.push(query(membersCol, where('whatsapp', '==', cleanPhone), limit(1)));
      }
      if (isMid) {
        queriesToRun.push(query(membersCol, where('membershipId', '==', trimmed.toUpperCase()), limit(1)));
        if (midStandard) {
          queriesToRun.push(query(membersCol, where('membershipId', '==', midStandard), limit(1)));
        }
      }

      const querySnaps = await Promise.all(queriesToRun.map(q => getDocs(q).catch(() => null)));
      for (const qSnap of querySnaps) {
        if (qSnap && !qSnap.empty) {
          const docSnap = qSnap.docs[0];
          const data = docSnap.data() as any;
          if (data && data.status !== 'deleted') {
            return {
              id: docSnap.id,
              membershipId: data.membershipId,
              name: data.name || 'Member',
              photo: data.photo || null,
              status: (data.status as MemberStatus) || 'pending',
              rejectionReason: data.rejectionReason || undefined,
              batch: data.batch,
              section: data.section,
              submittedAt: data.submittedAt || data.createdAt
            };
          }
        }
      }
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        throw new Error('PERMISSION_DENIED');
      }
    }

    // 3. If not found in live Firestore:
    // This member was permanently deleted by Admin (or never registered).
    // Purge any stale client local storage so deleted records NEVER reappear!
    cleanStaleLocalMember(cleanPhone, isMid ? (midStandard || trimmed) : undefined);

    return null;
  };

  return Promise.race([searchAction(), timeoutPromise]);
}

// Alias for backwards compatibility
export const searchMemberStatusByPhone = searchMemberStatus;

/**
 * Sync all existing members into member_status collection
 */
let lastSyncTime = 0;
export async function syncAllMembersToStatusDocs(members: SubmissionRecord[]): Promise<void> {
  if (!members || members.length === 0) return;
  // Prevent flooding: allow sync at most once every 10 minutes
  const now = Date.now();
  if (now - lastSyncTime < 10 * 60 * 1000) return;
  lastSyncTime = now;
  try {
    for (const member of members.slice(0, 50)) {
      const statusPayload = cleanFirestoreData({
        id: member.id,
        membershipId: member.membershipId || null,
        name: member.name,
        photo: member.photo || null,
        status: member.status || 'pending',
        rejectionReason: member.rejectionReason || null,
        batch: member.batch,
        section: member.section,
        phone: member.phone,
        submittedAt: member.submittedAt || member.createdAt,
        updatedAt: serverTimestamp()
      });

      const cleanPhone = normalizePhoneNumber(member.phone);
      if (cleanPhone) {
        setDoc(doc(db, 'member_status', cleanPhone), statusPayload, { merge: true }).catch(() => {});
      }
      if (member.membershipId) {
        setDoc(doc(db, 'member_status', member.membershipId.toUpperCase().trim()), statusPayload, { merge: true }).catch(() => {});
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
 * Real-time listener for Executive Committee
 * Updates instantly on all devices whenever an executive member is added, edited, or removed in Admin Panel.
 */
export function subscribeToCommittee(
  callback: (committee: ExecutiveMember[]) => void,
  defaultList?: ExecutiveMember[]
): Unsubscribe {
  const colRef = collection(db, 'executive_committee');

  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const list: ExecutiveMember[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as ExecutiveMember);
      });
      list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      try {
        localStorage.setItem(LS_COMMITTEE_KEY, JSON.stringify(list));
      } catch {}
      callback(list);
    } else {
      if (defaultList && defaultList.length > 0) {
        callback(defaultList);
      }
    }
  }, (err) => {
    console.warn('Realtime committee listener warning:', err);
    try {
      const cached = localStorage.getItem(LS_COMMITTEE_KEY);
      if (cached) callback(JSON.parse(cached));
    } catch {}
  });
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
 * Real-time listener for Club Notices
 * Updates instantly on all devices whenever a notice is created, edited, or removed.
 */
export function subscribeToNotices(
  callback: (notices: ClubNotice[]) => void
): Unsubscribe {
  const colRef = collection(db, 'notices');

  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const list: ClubNotice[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as ClubNotice);
      });
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
      try {
        localStorage.setItem(LS_NOTICES_KEY, JSON.stringify(list));
      } catch {}
      callback(list);
    } else {
      callback(INITIAL_DEFAULT_NOTICES);
    }
  }, (err) => {
    console.warn('Realtime notices listener warning:', err);
    try {
      const cached = localStorage.getItem(LS_NOTICES_KEY);
      if (cached) callback(JSON.parse(cached));
    } catch {}
  });
}

/**
 * Add or update a notice in Firebase
 */
export async function saveNoticeToFirebase(notice: ClubNotice): Promise<void> {
  const noticeId = notice.id || `notice_${Date.now()}`;
  const record: ClubNotice = {
    ...notice,
    id: noticeId,
    fileUrl: notice.fileUrl || null,
    fileName: notice.fileUrl && notice.fileName ? notice.fileName : null,
    fileType: notice.fileUrl && notice.fileType ? notice.fileType : null,
    isPinned: Boolean(notice.isPinned)
  };

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

  // Update Firestore: Replace document so removed fields (like fileUrl) are explicitly updated/cleared
  try {
    const docRef = doc(db, 'notices', noticeId);
    await setDoc(docRef, {
      id: record.id,
      title: record.title.trim(),
      category: record.category,
      content: record.content.trim(),
      date: record.date,
      fileUrl: record.fileUrl,
      fileName: record.fileName,
      fileType: record.fileType,
      isPinned: record.isPinned,
      publishedBy: record.publishedBy || 'Executive Committee',
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore notice save error:', err);
    throw err;
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

const LS_REGISTRATION_SETTING_KEY = 'ngdcsc_registration_setting_v1';

export const DEFAULT_REGISTRATION_SETTING: MembershipRegistrationSetting = {
  status: 'open',
  headline: 'Online Membership Registration',
  message: 'Welcome to NGDC Science Club (New Government Degree College, Rajshahi). Please complete the form below to join our community.',
  skills: DEFAULT_SKILL_OPTIONS
};

/**
 * Get current registration setting
 */
export async function getRegistrationSetting(): Promise<MembershipRegistrationSetting> {
  try {
    const raw = localStorage.getItem(LS_REGISTRATION_SETTING_KEY);
    const cached = raw ? JSON.parse(raw) : null;
    if (cached) return cached;
  } catch {}

  try {
    const snap = await getDoc(doc(db, 'settings', 'membership_registration'));
    if (snap.exists()) {
      const data = snap.data() as MembershipRegistrationSetting;
      if (!data.skills || data.skills.length === 0) {
        data.skills = DEFAULT_SKILL_OPTIONS;
      }
      localStorage.setItem(LS_REGISTRATION_SETTING_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Error fetching registration setting:', err);
  }

  return DEFAULT_REGISTRATION_SETTING;
}

/**
 * Subscribe to registration setting in real-time
 */
export function subscribeRegistrationSetting(callback: (setting: MembershipRegistrationSetting) => void): Unsubscribe {
  try {
    const raw = localStorage.getItem(LS_REGISTRATION_SETTING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.skills || parsed.skills.length === 0) {
        parsed.skills = DEFAULT_SKILL_OPTIONS;
      }
      callback(parsed);
    } else {
      callback(DEFAULT_REGISTRATION_SETTING);
    }
  } catch {
    callback(DEFAULT_REGISTRATION_SETTING);
  }

  const docRef = doc(db, 'settings', 'membership_registration');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MembershipRegistrationSetting;
        if (!data.skills || data.skills.length === 0) {
          data.skills = DEFAULT_SKILL_OPTIONS;
        }
        localStorage.setItem(LS_REGISTRATION_SETTING_KEY, JSON.stringify(data));
        callback(data);
      } else {
        callback(DEFAULT_REGISTRATION_SETTING);
      }
    },
    (err) => {
      console.warn('Registration setting snapshot warning:', err);
    }
  );
}

/**
 * Update registration setting in Firestore (Admin only)
 */
export async function updateRegistrationSetting(setting: MembershipRegistrationSetting): Promise<void> {
  const completeSetting: MembershipRegistrationSetting = {
    ...setting,
    skills: setting.skills && setting.skills.length > 0 ? setting.skills : DEFAULT_SKILL_OPTIONS
  };

  try {
    localStorage.setItem(LS_REGISTRATION_SETTING_KEY, JSON.stringify(completeSetting));
  } catch {}

  const docRef = doc(db, 'settings', 'membership_registration');
  await setDoc(docRef, {
    status: completeSetting.status,
    headline: completeSetting.headline || (completeSetting.status === 'coming_soon' ? 'NGDC Science Club Membership Registration Coming Soon' : completeSetting.status === 'closed' ? 'NGDC Science Club Membership Registration is Currently Closed' : 'NGDC Science Club Online Membership Registration'),
    message: completeSetting.message || (completeSetting.status === 'coming_soon' 
      ? 'The official membership registration for NGDC Science Club (New Government Degree College, Rajshahi) will open soon for HSC 27 and HSC 28 sessions. Eleventh and twelfth grade science students are requested to prepare their college information and photograph. For any inquiries, please contact us via email at ngdcsc.org@gmail.com.' 
      : completeSetting.status === 'closed'
      ? 'The membership registration window for NGDC Science Club (New Government Degree College, Rajshahi) is currently closed for this session. Thank you for your interest. For any queries or assistance, please contact us via email at ngdcsc.org@gmail.com.'
      : 'Welcome to NGDC Science Club (New Government Degree College, Rajshahi). Please complete the form below to join our community.'),
    skills: completeSetting.skills,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

