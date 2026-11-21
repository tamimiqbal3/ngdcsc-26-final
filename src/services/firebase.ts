import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
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
  getDocsFromServer,
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  getCountFromServer,
  increment,
  Unsubscribe
} from 'firebase/firestore';
import { 
  MembershipFormData,
  SubmissionRecord, 
  ExecutiveMember, 
  ClubNotice, 
  PublicMemberStatus, 
  MemberStatus, 
  MembershipRegistrationSetting, 
  RegistrationStatusMode,
  DEFAULT_SKILL_OPTIONS,
  EmailLogRecord,
  EmailType,
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  AttendanceMethod,
  PRESIDENT_EMAIL,
  PRESIDENT_DISPLAY_NAME,
  InboxSenderRole,
  InboxThread,
  InboxMessage
} from '../types';

import { getAnalytics, isSupported } from 'firebase/analytics';
import { triggerRecipientWebPush, unregisterCurrentPushEndpoint } from '../utils/browserNotifications';

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
  setLogLevel('silent');
} catch {
  // ignore
}

// Initialize Firestore with resilient HTTP long-polling (prevents sandboxed iframe & proxy WebChannel [code=unavailable] errors)
// while real-time speed is guaranteed by eager getDocsFromServer fetches & live catch-up sync.
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
const LS_ACTIVE_MEMBER_COUNT_KEY = 'ngdcsc_active_member_count_cache';

export function getCachedActiveMemberCount(): number | null {
  try {
    const raw = localStorage.getItem(LS_ACTIVE_MEMBER_COUNT_KEY);
    if (raw !== null) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 0) return n;
    }
    const members = getCachedMembers();
    if (members.length > 0) {
      return members.filter((m) => m.status === 'approved').length;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getCachedNotices(): ClubNotice[] {
  try {
    const raw = localStorage.getItem(LS_NOTICES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

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
 * Lightweight listener for Active (Approved) Member Count using server-side count aggregation
 * Avoids downloading heavy member documents & base64 photos on page load.
 */
export function subscribeToActiveMemberCount(
  callback: (count: number) => void
): Unsubscribe {
  const cachedCount = getCachedActiveMemberCount();
  if (cachedCount !== null) {
    callback(cachedCount);
  }

  let cancelled = false;
  const approvedQuery = query(collection(db, 'members'), where('status', '==', 'approved'));

  const refreshCount = async () => {
    if (cancelled) return;
    try {
      const snapshot = await getCountFromServer(approvedQuery);
      if (cancelled) return;
      const count = snapshot.data().count;
      try {
        localStorage.setItem(LS_ACTIVE_MEMBER_COUNT_KEY, String(count));
      } catch {
        // ignore
      }
      callback(count);
    } catch (err) {
      console.warn('Active member count fetch warning:', err);
      const fallback = getCachedActiveMemberCount();
      if (!cancelled && fallback !== null) {
        callback(fallback);
      }
    }
  };

  refreshCount();
  const intervalId = typeof window !== 'undefined' ? window.setInterval(refreshCount, 45000) : 0;
  const handleFocus = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      refreshCount();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
  }

  return () => {
    cancelled = true;
    if (intervalId) window.clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
    }
  };
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
            // Attempt to enrich with full members record if available
            let enriched: any = { ...data };
            const memberDocId = data.id || (snap.id.startsWith('ngdc_') ? snap.id : null);
            if (memberDocId) {
              try {
                const fullSnap = await getDoc(doc(db, 'members', memberDocId));
                if (fullSnap.exists()) {
                  enriched = { ...fullSnap.data(), ...data };
                }
              } catch {}
            }
            if (!enriched.phone || !enriched.email || !enriched.studentId) {
              const cached = getCachedMembers();
              const match = cached.find(m => m.id === memberDocId || (data.membershipId && m.membershipId === data.membershipId));
              if (match) {
                enriched = { ...match, ...enriched };
              }
            }
            return {
              id: enriched.id || snap.id,
              membershipId: enriched.membershipId || (isMid ? midStandard : undefined),
              name: enriched.name || 'Member',
              photo: enriched.photo || null,
              status: (enriched.status as MemberStatus) || 'pending',
              rejectionReason: enriched.rejectionReason || undefined,
              batch: enriched.batch,
              section: enriched.section,
              submittedAt: enriched.submittedAt || enriched.createdAt,
              phone: enriched.phone,
              whatsapp: enriched.whatsapp,
              email: enriched.email,
              studentId: enriched.studentId,
              dob: enriched.dob,
              interestedSegments: enriched.interestedSegments,
              skills: enriched.skills,
              experienceAchievements: enriched.experienceAchievements
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
              submittedAt: data.submittedAt || data.createdAt,
              phone: data.phone,
              whatsapp: data.whatsapp,
              email: data.email,
              studentId: data.studentId,
              dob: data.dob,
              interestedSegments: data.interestedSegments,
              skills: data.skills,
              experienceAchievements: data.experienceAchievements
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
  const cachedNotices = getCachedNotices();
  if (cachedNotices.length > 0) {
    callback(cachedNotices);
  }

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
  skills: DEFAULT_SKILL_OPTIONS,
  allowMemberEdit: true
};

export function getCachedRegistrationSetting(): MembershipRegistrationSetting {
  try {
    const raw = localStorage.getItem(LS_REGISTRATION_SETTING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MembershipRegistrationSetting;
      return {
        ...DEFAULT_REGISTRATION_SETTING,
        ...parsed,
        skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : DEFAULT_SKILL_OPTIONS,
        allowMemberEdit: parsed.allowMemberEdit !== false
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_REGISTRATION_SETTING;
}

/**
 * Get current registration setting
 */
export async function getRegistrationSetting(): Promise<MembershipRegistrationSetting> {
  try {
    const raw = localStorage.getItem(LS_REGISTRATION_SETTING_KEY);
    const cached = raw ? JSON.parse(raw) : null;
    if (cached) {
      return {
        ...DEFAULT_REGISTRATION_SETTING,
        ...cached,
        skills: cached.skills && cached.skills.length > 0 ? cached.skills : DEFAULT_SKILL_OPTIONS,
        allowMemberEdit: cached.allowMemberEdit !== false
      };
    }
  } catch {}

  try {
    const snap = await getDoc(doc(db, 'settings', 'membership_registration'));
    if (snap.exists()) {
      const raw = snap.data() as MembershipRegistrationSetting;
      const data: MembershipRegistrationSetting = {
        ...DEFAULT_REGISTRATION_SETTING,
        ...raw,
        skills: raw.skills && raw.skills.length > 0 ? raw.skills : DEFAULT_SKILL_OPTIONS,
        allowMemberEdit: raw.allowMemberEdit !== false
      };
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
  callback(getCachedRegistrationSetting());

  const docRef = doc(db, 'settings', 'membership_registration');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as MembershipRegistrationSetting;
        const data: MembershipRegistrationSetting = {
          ...DEFAULT_REGISTRATION_SETTING,
          ...raw,
          skills: raw.skills && raw.skills.length > 0 ? raw.skills : DEFAULT_SKILL_OPTIONS,
          allowMemberEdit: raw.allowMemberEdit !== false
        };
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
    skills: setting.skills && setting.skills.length > 0 ? setting.skills : DEFAULT_SKILL_OPTIONS,
    allowMemberEdit: setting.allowMemberEdit !== false
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
    allowMemberEdit: completeSetting.allowMemberEdit,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// ==================== EMAIL LOGS & DISPATCH SERVICES ====================

const LS_EMAIL_LOGS_KEY = 'ngdcsc_firebase_email_logs_cache';

/**
 * Fetch recent email dispatch logs from Firestore
 */
export async function fetchEmailLogsFromFirebase(): Promise<EmailLogRecord[]> {
  try {
    const q = query(collection(db, 'email_logs'), orderBy('sentAt', 'desc'), limit(150));
    const snap = await getDocs(q);
    const logs: EmailLogRecord[] = [];
    snap.forEach((docSnap) => {
      logs.push({ ...(docSnap.data() as EmailLogRecord), id: docSnap.id });
    });
    try {
      localStorage.setItem(LS_EMAIL_LOGS_KEY, JSON.stringify(logs));
    } catch {}
    return logs;
  } catch (err) {
    console.warn('Error fetching email logs from Firestore:', err);
    try {
      const cached = localStorage.getItem(LS_EMAIL_LOGS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

/**
 * Real-time subscription to email dispatch logs
 */
export function subscribeToEmailLogs(callback: (logs: EmailLogRecord[]) => void): Unsubscribe {
  try {
    const cached = localStorage.getItem(LS_EMAIL_LOGS_KEY);
    if (cached) {
      callback(JSON.parse(cached));
    }
  } catch {}

  const q = query(collection(db, 'email_logs'), orderBy('sentAt', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const list: EmailLogRecord[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as EmailLogRecord), id: d.id });
      });
      try {
        localStorage.setItem(LS_EMAIL_LOGS_KEY, JSON.stringify(list));
      } catch {}
      callback(list);
    },
    (err) => {
      console.warn('Realtime email logs listener warning:', err);
      try {
        const cached = localStorage.getItem(LS_EMAIL_LOGS_KEY);
        if (cached) callback(JSON.parse(cached));
      } catch {}
    }
  );
}

/**
 * Save an email dispatch record to Firestore and update the member's lastEmailSent
 */
export async function saveEmailLogToFirebase(log: EmailLogRecord): Promise<void> {
  const logId = log.id || `email_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: EmailLogRecord = {
    ...log,
    id: logId,
    sentAt: log.sentAt || new Date().toISOString()
  };

  // 1. Update local cache immediately
  try {
    const cached: EmailLogRecord[] = JSON.parse(localStorage.getItem(LS_EMAIL_LOGS_KEY) || '[]');
    const updated = [record, ...cached.filter((l) => l.id !== logId)];
    localStorage.setItem(LS_EMAIL_LOGS_KEY, JSON.stringify(updated.slice(0, 200)));
  } catch {}

  // 2. Update member's lastEmailSent if memberId is present
  if (record.memberId) {
    try {
      const memberDocRef = doc(db, 'members', record.memberId);
      await setDoc(
        memberDocRef,
        {
          lastEmailSent: {
            type: record.emailType,
            sentAt: record.sentAt,
            subject: record.subject,
            sentBy: record.sentBy
          }
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Warning updating member lastEmailSent in Firestore:', err);
    }
  }

  // 3. Save to email_logs in Firestore
  try {
    const docRef = doc(db, 'email_logs', logId);
    await setDoc(docRef, {
      ...record,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Warning writing to email_logs in Firestore:', err);
  }
}

/**
 * Delete an email log record
 */
export async function deleteEmailLogFromFirebase(logId: string): Promise<void> {
  try {
    const cached: EmailLogRecord[] = JSON.parse(localStorage.getItem(LS_EMAIL_LOGS_KEY) || '[]');
    const updated = cached.filter((l) => l.id !== logId);
    localStorage.setItem(LS_EMAIL_LOGS_KEY, JSON.stringify(updated));
  } catch {}

  try {
    const docRef = doc(db, 'email_logs', logId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting email log:', err);
  }
}

// ==================== MEMBER AUTH & DASHBOARD PROFILE ====================

/**
 * Translates authentication error codes into clean user-facing messages
 */
export function formatAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in or use Forgot Password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-not-found':
      return 'No member account found with this email address.';
    case 'auth/not-registered-member':
      return 'This email is not registered as a club member. Only registered members can reset their password.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please check and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact the club committee.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign back in before updating your password.';
    case 'auth/operation-not-allowed':
      return 'Email & password sign-in is temporarily unavailable. Please contact the club administrator.';
    default:
      return err?.message && !String(err.message).toLowerCase().includes('firebase')
        ? String(err.message)
        : 'Authentication failed. Please check your credentials and try again.';
  }
}

/**
 * Create a new member account during membership registration
 */
export async function registerMemberAccount(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    } catch {
      // non-critical
    }
  }
  return cred.user;
}

/**
 * Sign in an existing member with email and password
 */
export async function loginMemberAccount(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

/**
 * Check whether an email belongs to a registered club member
 */
export async function checkIsRegisteredMemberEmail(email: string): Promise<boolean> {
  const cleanEmail = email.trim();
  const lowerEmail = cleanEmail.toLowerCase();
  if (!lowerEmail) return false;

  try {
    const colRef = collection(db, 'members');

    // Fast exact / lowercase queries first
    const queries = [
      query(colRef, where('email', '==', cleanEmail), limit(1)),
      ...(lowerEmail !== cleanEmail ? [query(colRef, where('email', '==', lowerEmail), limit(1))] : [])
    ];

    for (const q of queries) {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as any;
        if (data && data.status !== 'deleted') {
          return true;
        }
      }
    }

    // Fallback case-insensitive check across members collection
    const allSnap = await getDocs(colRef);
    let found = false;
    allSnap.forEach((d) => {
      const data = d.data() as any;
      if (
        data &&
        data.status !== 'deleted' &&
        typeof data.email === 'string' &&
        data.email.trim().toLowerCase() === lowerEmail
      ) {
        found = true;
      }
    });
    if (found) return true;
  } catch (err) {
    console.warn('Registered member email check warning:', err);
  }

  // Fallback to local cache if offline
  const cached = getCachedMembers();
  return cached.some(
    (m) => m.status !== ('deleted' as any) && (m.email || '').trim().toLowerCase() === lowerEmail
  );
}

let secondaryAuthInstance: ReturnType<typeof getAuth> | null = null;

function getSecondaryAuth() {
  if (secondaryAuthInstance) return secondaryAuthInstance;
  const existing = getApps().find((a) => a.name === 'ngdcsc-secondary-worker');
  const secondaryApp = existing || initializeApp(firebaseConfig, 'ngdcsc-secondary-worker');
  try {
    secondaryAuthInstance = initializeAuth(secondaryApp, {
      persistence: inMemoryPersistence
    });
  } catch {
    secondaryAuthInstance = getAuth(secondaryApp);
  }
  return secondaryAuthInstance;
}

function generateSecureTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/**
 * Ensures an Auth account exists for a manually-added registered member using an isolated
 * in-memory secondary session so the admin's active session is never disturbed.
 */
export async function ensureMemberAuthAccount(
  email: string,
  displayName?: string,
  customPassword?: string
): Promise<string | null> {
  const cleanEmail = email.trim();
  if (!cleanEmail) return null;

  const passwordToUse =
    customPassword && customPassword.length >= 6
      ? customPassword
      : generateSecureTempPassword();

  const secAuth = getSecondaryAuth();
  try {
    const cred = await createUserWithEmailAndPassword(
      secAuth,
      cleanEmail,
      passwordToUse
    );
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName: displayName.trim() }).catch(() => {});
    }
    return cred.user.uid;
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      return null;
    }
    console.warn('Account setup warning:', err);
    return null;
  } finally {
    await signOut(secAuth).catch(() => {});
  }
}

/**
 * Send password reset email ONLY if the email belongs to a registered club member.
 * Automatically provisions an Auth account for manually-added members (added without a password)
 * so they can set their own password directly via the reset link.
 */
export async function sendMemberPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim();
  const isRegistered = await checkIsRegisteredMemberEmail(cleanEmail);
  if (!isRegistered) {
    const err: any = new Error(
      'This email is not registered as a club member. Only registered members can reset their password.'
    );
    err.code = 'auth/not-registered-member';
    throw err;
  }
  await ensureMemberAuthAccount(cleanEmail);
  await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Sign out current user
 */
export async function logoutMemberAccount(): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    if (token) {
      await unregisterCurrentPushEndpoint(token);
    }
  } catch {
    // ignore
  }
  await signOut(auth);
}

/**
 * Re-authenticate with current password and update to new password.
 * Old password immediately becomes invalid once updated.
 */
export async function changeMemberPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    const err: any = new Error('Please sign in again to change your password.');
    err.code = 'auth/requires-recent-login';
    throw err;
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/**
 * Synchronously check local cache for the logged-in member's profile (0ms render)
 */
export function getCachedMemberProfileForUser(
  uid?: string | null,
  email?: string | null
): SubmissionRecord | null {
  const cached = getCachedMembers();
  const normEmail = (email || '').trim().toLowerCase();
  const match = cached.find(
    (m) =>
      (uid && m.uid && m.uid === uid) ||
      (normEmail && (m.email || '').trim().toLowerCase() === normEmail)
  );
  return match || null;
}

/**
 * Fetch the logged-in member's profile record by UID (or fallback to email)
 */
export async function fetchMemberProfileForUser(
  uid: string,
  email?: string | null
): Promise<SubmissionRecord | null> {
  const cacheMatch = (record: SubmissionRecord) => {
    try {
      const cached = getCachedMembers();
      const updated = [record, ...cached.filter((m) => m.id !== record.id)];
      localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  try {
    const colRef = collection(db, 'members');
    const queries: any[] = [query(colRef, where('uid', '==', uid), limit(1))];

    if (email && email.trim()) {
      const cleanEmail = email.trim();
      const lowerEmail = cleanEmail.toLowerCase();
      queries.push(query(colRef, where('email', '==', cleanEmail), limit(1)));
      if (lowerEmail !== cleanEmail) {
        queries.push(query(colRef, where('email', '==', lowerEmail), limit(1)));
      }
    }

    const snaps = await Promise.all(queries.map((q) => getDocs(q).catch(() => null)));
    for (const snap of snaps) {
      if (snap && !snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as any;
        if (!data.uid) {
          updateDoc(doc(db, 'members', d.id), { uid }).catch(() => {});
        }
        const record = { id: d.id, ...data, uid: data.uid || uid } as SubmissionRecord;
        cacheMatch(record);
        return record;
      }
    }
  } catch (err) {
    console.warn('Member profile lookup warning:', err);
  }

  return getCachedMemberProfileForUser(uid, email);
}

/**
 * Self-service profile update from My Dashboard.
 * Strictly strips studentId (Roll), phone, email, status, membershipId, and rejectionReason so locked fields can NEVER be changed.
 */
export async function updateOwnMemberProfile(
  memberId: string,
  uid: string,
  updates: Partial<MembershipFormData>,
  existingMember?: SubmissionRecord
): Promise<SubmissionRecord> {
  // Verify admin allows member profile editing
  try {
    const settingSnap = await getDoc(doc(db, 'settings', 'membership_registration'));
    if (settingSnap.exists() && settingSnap.data()?.allowMemberEdit === false) {
      const err: any = new Error('Profile editing is currently disabled by the club administrator.');
      err.code = 'edit-locked-by-admin';
      throw err;
    }
  } catch (checkErr: any) {
    if (checkErr?.code === 'edit-locked-by-admin') {
      throw checkErr;
    }
  }

  // Explicitly pick ONLY allowed editable fields (excluding studentId / Roll, phone, and email)
  const safeUpdates: Record<string, any> = cleanFirestoreData({
    photo: updates.photo !== undefined ? updates.photo : existingMember?.photo ?? null,
    name: updates.name !== undefined ? updates.name.trim() : existingMember?.name,
    whatsapp: updates.whatsapp !== undefined ? updates.whatsapp.trim() : existingMember?.whatsapp,
    sameAsPhone: updates.sameAsPhone !== undefined ? updates.sameAsPhone : existingMember?.sameAsPhone,
    section: updates.section !== undefined ? updates.section : existingMember?.section,
    dob: updates.dob !== undefined ? updates.dob : existingMember?.dob,
    batch: updates.batch !== undefined ? updates.batch : existingMember?.batch,
    interestedSegments: updates.interestedSegments !== undefined ? updates.interestedSegments : existingMember?.interestedSegments,
    skills: updates.skills !== undefined ? updates.skills : existingMember?.skills,
    experienceAchievements: updates.experienceAchievements !== undefined ? updates.experienceAchievements : existingMember?.experienceAchievements,
    uid
  });

  // Update Firestore 'members' document
  const docRef = doc(db, 'members', memberId);
  try {
    await updateDoc(docRef, {
      ...safeUpdates,
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    if (err?.code === 'not-found' && existingMember) {
      await setDoc(docRef, cleanFirestoreData({
        ...existingMember,
        ...safeUpdates,
        studentId: existingMember.studentId,
        updatedAt: serverTimestamp()
      }));
    } else {
      throw err;
    }
  }

  const mergedRecord: SubmissionRecord = {
    ...(existingMember || ({} as SubmissionRecord)),
    ...safeUpdates,
    id: memberId,
    uid,
    studentId: existingMember?.studentId || ''
  };

  // Update localStorage caches
  try {
    const cached = getCachedMembers();
    const updatedList = cached.some(m => m.id === memberId)
      ? cached.map(m => (m.id === memberId ? mergedRecord : m))
      : [mergedRecord, ...cached];
    localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updatedList));
    localStorage.setItem('ngdc_sc_submissions_v1', JSON.stringify(updatedList));
  } catch {
    // ignore
  }

  // Sync member_status docs so status lookup reflects updated name/photo/phone/batch/section
  const oldNormPhone = existingMember?.phone ? normalizePhoneNumber(existingMember.phone) : '';
  const newNormPhone = mergedRecord.phone ? normalizePhoneNumber(mergedRecord.phone) : '';

  if (oldNormPhone && newNormPhone && oldNormPhone !== newNormPhone) {
    const staleKeys = [oldNormPhone, `+88${oldNormPhone}`, `88${oldNormPhone}`, existingMember?.phone?.trim() || ''].filter(Boolean);
    await Promise.allSettled(staleKeys.map(k => deleteDoc(doc(db, 'member_status', k)).catch(() => {})));
  }

  const statusPayload = cleanFirestoreData({
    id: memberId,
    membershipId: mergedRecord.membershipId || null,
    name: mergedRecord.name,
    photo: mergedRecord.photo || null,
    status: mergedRecord.status || 'pending',
    rejectionReason: mergedRecord.status === 'approved' ? null : (mergedRecord.rejectionReason || null),
    batch: mergedRecord.batch,
    section: mergedRecord.section,
    phone: mergedRecord.phone,
    submittedAt: mergedRecord.submittedAt || mergedRecord.createdAt,
    updatedAt: serverTimestamp()
  });

  const lookupKeys = new Set<string>();
  if (newNormPhone) {
    lookupKeys.add(newNormPhone);
    lookupKeys.add(`+88${newNormPhone}`);
    lookupKeys.add(`88${newNormPhone}`);
  }
  if (mergedRecord.phone) {
    lookupKeys.add(mergedRecord.phone.trim());
  }
  if (mergedRecord.membershipId) {
    const mid = mergedRecord.membershipId.toUpperCase().trim();
    lookupKeys.add(mid);
    const digits = mid.replace(/\D/g, '');
    if (digits) lookupKeys.add(digits);
  }

  await Promise.allSettled(
    Array.from(lookupKeys).map(k =>
      setDoc(doc(db, 'member_status', k), statusPayload, { merge: true }).catch(() => {})
    )
  );

  return mergedRecord;
}

// ==================== EVENT & SESSION ATTENDANCE OPERATIONS ====================

const LS_ATTENDANCE_KEY = 'ngdcsc_firebase_attendance_cache';
const LS_ATTENDANCE_SESSIONS_KEY = 'ngdcsc_firebase_attendance_sessions_cache';

export function getTodayLocalDateStr(dateObj: Date = new Date()): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLiveTimeLabel(dateObj: Date = new Date()): string {
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function extractMembershipIdFromQr(rawValue: string): string {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';

  // Match explicit NGDCSC-XXX pattern anywhere inside text or URL
  const directMatch = trimmed.toUpperCase().match(/NGDCSC[-\s_]?(\d{1,5})/);
  if (directMatch) {
    return `NGDCSC-${directMatch[1].padStart(3, '0')}`;
  }

  // Try JSON payload if applicable
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const candidate = parsed.membershipId || parsed.id || parsed.memberId || '';
      if (typeof candidate === 'string' && candidate.trim()) {
        return extractMembershipIdFromQr(candidate);
      }
    } catch {
      // ignore invalid JSON
    }
  }

  // Numeric-only fallback (e.g. "8" -> "NGDCSC-008")
  if (/^\d{1,5}$/.test(trimmed)) {
    return `NGDCSC-${trimmed.padStart(3, '0')}`;
  }

  return trimmed.toUpperCase();
}

export function getCachedAttendance(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(LS_ATTENDANCE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function getCachedAttendanceSessions(): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(LS_ATTENDANCE_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function getMemberAttendanceCacheKey(uid: string): string {
  return `ngdcsc_my_attendance_cache_${uid}`;
}

export function getCachedMyAttendance(uid?: string | null): AttendanceRecord[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(getMemberAttendanceCacheKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function sortAttendanceNewestFirst(list: AttendanceRecord[]): AttendanceRecord[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.scannedAt || '').localeCompare(a.scannedAt || '');
  });
}

export function subscribeToAttendanceSessions(
  callback: (sessions: AttendanceSession[]) => void
): Unsubscribe {
  const cached = getCachedAttendanceSessions();
  if (cached.length > 0) {
    callback(cached);
  }

  const colRef = collection(db, 'attendance_sessions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AttendanceSession[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        list.push({
          date: data.date || d.id,
          eventTitle: data.eventTitle || 'Club Session',
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        });
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      try {
        localStorage.setItem(LS_ATTENDANCE_SESSIONS_KEY, JSON.stringify(list));
      } catch {
        // ignore
      }
      callback(list);
    },
    (err) => {
      console.warn('Attendance sessions listener error:', err);
    }
  );
}

export async function upsertAttendanceSession(
  date: string,
  eventTitle: string,
  adminEmail?: string
): Promise<AttendanceSession> {
  const cleanDate = date.trim() || getTodayLocalDateStr();
  const cleanTitle = eventTitle.trim() || 'Club Session';
  const payload = cleanFirestoreData({
    date: cleanDate,
    eventTitle: cleanTitle,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'Admin'
  });

  await setDoc(doc(db, 'attendance_sessions', cleanDate), payload, { merge: true });

  const session: AttendanceSession = {
    date: cleanDate,
    eventTitle: cleanTitle,
    updatedAt: payload.updatedAt,
    updatedBy: payload.updatedBy
  };

  try {
    const existing = getCachedAttendanceSessions();
    const merged = [session, ...existing.filter((s) => s.date !== cleanDate)].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    localStorage.setItem(LS_ATTENDANCE_SESSIONS_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }

  return session;
}

export function subscribeToAllAttendance(
  callback: (records: AttendanceRecord[]) => void
): Unsubscribe {
  const cached = getCachedAttendance();
  if (cached.length > 0) {
    callback(cached);
  }

  const colRef = collection(db, 'attendance');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) } as AttendanceRecord);
      });
      const sorted = sortAttendanceNewestFirst(list);
      try {
        localStorage.setItem(LS_ATTENDANCE_KEY, JSON.stringify(sorted));
      } catch {
        // ignore
      }
      callback(sorted);
    },
    (err) => {
      console.warn('Attendance listener error:', err);
    }
  );
}

export async function markMemberAttendance(params: {
  member: SubmissionRecord;
  date: string;
  eventTitle: string;
  status?: AttendanceStatus;
  method?: AttendanceMethod;
  note?: string;
  markedBy?: string;
  scannedDateObj?: Date;
}): Promise<AttendanceRecord> {
  const {
    member,
    date,
    eventTitle,
    status = 'present',
    method = 'qr_scan',
    note = '',
    markedBy = 'Admin',
    scannedDateObj = new Date()
  } = params;

  const cleanDate = date.trim() || getTodayLocalDateStr(scannedDateObj);
  const memberDocId = member.id || member.membershipId || member.studentId || member.phone;
  const recordId = `${cleanDate}__${memberDocId}`;
  const cleanTitle = eventTitle.trim() || 'Club Session';
  const cleanEmail = (member.email || '').trim();
  const cleanEmailLower = cleanEmail.toLowerCase();

  const record: AttendanceRecord = {
    id: recordId,
    date: cleanDate,
    eventTitle: cleanTitle,
    memberId: memberDocId,
    membershipId: (member.membershipId || '').toUpperCase() || memberDocId,
    memberName: member.name || 'Member',
    memberRoll: member.studentId || '',
    memberBatch: member.batch || '',
    memberSection: member.section || '',
    memberUid: member.uid || null,
    memberEmail: cleanEmail || null,
    memberEmailLower: cleanEmailLower || null,
    status,
    scannedAt: scannedDateObj.toISOString(),
    scannedTimeLabel: formatLiveTimeLabel(scannedDateObj),
    method,
    note: note.trim(),
    markedBy,
    updatedAt: new Date().toISOString()
  };

  await Promise.all([
    setDoc(doc(db, 'attendance', recordId), cleanFirestoreData(record), { merge: true }),
    upsertAttendanceSession(cleanDate, cleanTitle, markedBy)
  ]);

  try {
    const cached = getCachedAttendance();
    const updated = sortAttendanceNewestFirst([
      record,
      ...cached.filter((r) => r.id !== recordId)
    ]);
    localStorage.setItem(LS_ATTENDANCE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return record;
}

export async function updateAttendanceRecord(
  existing: AttendanceRecord,
  updates: {
    date?: string;
    eventTitle?: string;
    status?: AttendanceStatus;
    scannedTimeLabel?: string;
    scannedAt?: string;
    note?: string;
  },
  adminEmail?: string
): Promise<AttendanceRecord> {
  const newDate = (updates.date ?? existing.date).trim() || existing.date;
  const newId = `${newDate}__${existing.memberId}`;
  const newTitle = (updates.eventTitle ?? existing.eventTitle).trim() || 'Club Session';

  const updatedRecord: AttendanceRecord = {
    ...existing,
    id: newId,
    date: newDate,
    eventTitle: newTitle,
    status: updates.status ?? existing.status,
    scannedTimeLabel: (updates.scannedTimeLabel ?? existing.scannedTimeLabel).trim() || formatLiveTimeLabel(),
    scannedAt: updates.scannedAt ?? existing.scannedAt,
    note: (updates.note ?? existing.note ?? '').trim(),
    markedBy: adminEmail || existing.markedBy || 'Admin',
    updatedAt: new Date().toISOString()
  };

  if (newId !== existing.id) {
    await deleteDoc(doc(db, 'attendance', existing.id)).catch(() => {});
  }

  await Promise.all([
    setDoc(doc(db, 'attendance', newId), cleanFirestoreData(updatedRecord), { merge: true }),
    upsertAttendanceSession(newDate, newTitle, adminEmail)
  ]);

  try {
    const cached = getCachedAttendance();
    const updated = sortAttendanceNewestFirst([
      updatedRecord,
      ...cached.filter((r) => r.id !== existing.id && r.id !== newId)
    ]);
    localStorage.setItem(LS_ATTENDANCE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return updatedRecord;
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  await deleteDoc(doc(db, 'attendance', recordId));
  try {
    const cached = getCachedAttendance();
    localStorage.setItem(
      LS_ATTENDANCE_KEY,
      JSON.stringify(cached.filter((r) => r.id !== recordId))
    );
  } catch {
    // ignore
  }
}

/**
 * Permanently deletes an entire date's attendance session and all member records for that date,
 * resetting that date so neither Present nor Absent is counted for any member (0 / 0).
 */
export async function deleteAttendanceByDate(date: string): Promise<{ deletedCount: number }> {
  const cleanDate = date.trim();
  if (!cleanDate) return { deletedCount: 0 };

  const colRef = collection(db, 'attendance');
  const snap = await getDocs(query(colRef, where('date', '==', cleanDate)));

  await Promise.all([
    ...snap.docs.map((d) => deleteDoc(d.ref)),
    deleteDoc(doc(db, 'attendance_sessions', cleanDate)).catch(() => {})
  ]);

  try {
    const cachedRecords = getCachedAttendance();
    localStorage.setItem(
      LS_ATTENDANCE_KEY,
      JSON.stringify(cachedRecords.filter((r) => r.date !== cleanDate))
    );
    const cachedSessions = getCachedAttendanceSessions();
    localStorage.setItem(
      LS_ATTENDANCE_SESSIONS_KEY,
      JSON.stringify(cachedSessions.filter((s) => s.date !== cleanDate))
    );
  } catch {
    // ignore
  }

  return { deletedCount: snap.size };
}

/**
 * Strictly isolated per-member attendance listener:
 * Queries ONLY records owned by the logged-in user's UID or lowercase email.
 */
export function subscribeToMyAttendance(
  uid: string,
  email: string | null | undefined,
  callback: (records: AttendanceRecord[]) => void
): Unsubscribe {
  const cached = getCachedMyAttendance(uid);
  if (cached.length > 0) {
    callback(cached);
  }

  const colRef = collection(db, 'attendance');
  const cleanEmailLower = (email || '').trim().toLowerCase();

  const uidRecords = new Map<string, AttendanceRecord>();
  const emailRecords = new Map<string, AttendanceRecord>();

  const emitMerged = () => {
    const combined = new Map<string, AttendanceRecord>();
    uidRecords.forEach((v, k) => combined.set(k, v));
    emailRecords.forEach((v, k) => combined.set(k, v));
    const sorted = sortAttendanceNewestFirst(Array.from(combined.values()));
    try {
      localStorage.setItem(getMemberAttendanceCacheKey(uid), JSON.stringify(sorted));
    } catch {
      // ignore
    }
    callback(sorted);
  };

  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(colRef, where('memberUid', '==', uid)),
      (snap) => {
        uidRecords.clear();
        snap.forEach((d) => {
          uidRecords.set(d.id, { id: d.id, ...(d.data() as any) } as AttendanceRecord);
        });
        emitMerged();
      },
      (err) => {
        console.warn('My attendance UID query error:', err);
      }
    )
  );

  if (cleanEmailLower) {
    unsubs.push(
      onSnapshot(
        query(colRef, where('memberEmailLower', '==', cleanEmailLower)),
        (snap) => {
          emailRecords.clear();
          snap.forEach((d) => {
            emailRecords.set(d.id, { id: d.id, ...(d.data() as any) } as AttendanceRecord);
          });
          emitMerged();
        },
        (err) => {
          console.warn('My attendance email query error:', err);
        }
      )
    );
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}

// ==================== PRESIDENT <-> MEMBER INBOX OPERATIONS ====================

const LS_PRESIDENT_INBOX_KEY = 'ngdcsc_president_inbox_threads_cache';
let inboxMsgSeq = 0;

export function isPresidentEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === PRESIDENT_EMAIL;
}

export async function loginWithGoogleAccount(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

function sanitizeInboxKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
}

export function getMemberInboxThreadId(member: {
  id?: string | null;
  email?: string | null;
  studentId?: string | null;
  phone?: string | null;
}): string {
  if (member.id && member.id.trim()) {
    return member.id.trim();
  }
  if (member.email && member.email.trim()) {
    return `email_${sanitizeInboxKey(member.email)}`;
  }
  if (member.studentId && member.studentId.trim()) {
    return `roll_${sanitizeInboxKey(member.studentId)}`;
  }
  if (member.phone && member.phone.trim()) {
    return `phone_${sanitizeInboxKey(member.phone)}`;
  }
  return `thread_${Date.now()}`;
}

export function getCachedPresidentInboxThreads(): InboxThread[] {
  try {
    const raw = localStorage.getItem(LS_PRESIDENT_INBOX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function getMemberInboxThreadCacheKey(uid: string): string {
  return `ngdcsc_my_inbox_thread_${uid}`;
}

export function getCachedMemberInboxThread(uid: string): InboxThread | null {
  try {
    const raw = localStorage.getItem(getMemberInboxThreadCacheKey(uid));
    if (raw) {
      return JSON.parse(raw) as InboxThread;
    }
  } catch {
    // ignore
  }
  return null;
}

function getInboxMessagesCacheKey(threadId: string): string {
  return `ngdcsc_inbox_msgs_${threadId}`;
}

export function getCachedInboxMessages(threadId: string): InboxMessage[] {
  try {
    const raw = localStorage.getItem(getInboxMessagesCacheKey(threadId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function sortThreadsNewestFirst(list: InboxThread[]): InboxThread[] {
  return [...list].sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
}

function sortMessagesChronological(list: InboxMessage[]): InboxMessage[] {
  return [...list].sort((a, b) => {
    const cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
    if (cmp !== 0) return cmp;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function buildThreadsFingerprint(list: InboxThread[]): string {
  return list
    .map(
      (t) =>
        `${t.id}|${t.lastMessageAt || ''}|${t.unreadByPresident || 0}|${t.unreadByMember || 0}|${t.presidentLastReadAt || ''}|${t.memberLastReadAt || ''}|${t.memberUid || ''}`
    )
    .join(';');
}

function buildMessagesFingerprint(list: InboxMessage[]): string {
  return list.map((m) => `${m.id}|${m.createdAt || ''}`).join(';');
}

/**
 * President-only real-time subscription to ALL member inbox threads, newest activity first.
 * Uses WebChannel onSnapshot + immediate server fetch + silent catch-up so new messages
 * always arrive live without ever needing a page refresh.
 */
export function subscribeToPresidentInboxThreads(
  callback: (threads: InboxThread[]) => void
): Unsubscribe {
  let disposed = false;
  let lastFp = '';

  const emitSorted = (threads: InboxThread[]) => {
    if (disposed) return;
    const sorted = sortThreadsNewestFirst(threads);
    const fp = buildThreadsFingerprint(sorted);
    if (fp === lastFp) return;
    lastFp = fp;
    try {
      localStorage.setItem(LS_PRESIDENT_INBOX_KEY, JSON.stringify(sorted));
    } catch {
      // ignore
    }
    callback(sorted);
  };

  const cached = getCachedPresidentInboxThreads();
  if (cached.length > 0) {
    emitSorted(cached);
  }

  const colRef = collection(db, 'inbox_threads');

  const fetchServerNow = async () => {
    if (disposed) return;
    try {
      const snap = await getDocsFromServer(colRef);
      if (disposed) return;
      const threads: InboxThread[] = [];
      snap.forEach((d) => {
        threads.push({ id: d.id, ...(d.data() as any) } as InboxThread);
      });
      emitSorted(threads);
    } catch {
      // fallback to active onSnapshot stream
    }
  };

  fetchServerNow();

  const unsubSnapshot = onSnapshot(
    colRef,
    (snap) => {
      const threads: InboxThread[] = [];
      snap.forEach((d) => {
        threads.push({ id: d.id, ...(d.data() as any) } as InboxThread);
      });
      emitSorted(threads);
    },
    (err) => {
      console.warn('President inbox threads subscription error:', err);
    }
  );

  const handleWake = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchServerNow();
    }
  };

  let catchUpTimer: number | null = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWake);
    window.addEventListener('online', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    catchUpTimer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchServerNow();
      }
    }, 4000);
  }

  return () => {
    disposed = true;
    unsubSnapshot();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('online', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
      if (catchUpTimer !== null) window.clearInterval(catchUpTimer);
    }
  };
}

/**
 * Member-only real-time subscription to their SINGLE thread with Tamim Iqbal (President).
 * Uses equality filters matching Firestore security rules cleanly + immediate server fetch + silent catch-up.
 */
export function subscribeToMemberInboxThread(
  uid: string,
  email: string | null | undefined,
  callback: (thread: InboxThread | null) => void
): Unsubscribe {
  let disposed = false;
  let lastFp = '__init__';

  const cached = getCachedMemberInboxThread(uid);
  if (cached) {
    lastFp = buildThreadsFingerprint([cached]);
    callback(cached);
  }

  const colRef = collection(db, 'inbox_threads');
  const cleanEmailLower = (email || '').trim().toLowerCase();
  const uidQuery = query(colRef, where('memberUid', '==', uid));
  const emailQuery = cleanEmailLower
    ? query(colRef, where('memberEmailLower', '==', cleanEmailLower))
    : null;

  const uidMap = new Map<string, InboxThread>();
  const emailMap = new Map<string, InboxThread>();

  const emitBest = () => {
    if (disposed) return;
    const merged = new Map<string, InboxThread>();
    uidMap.forEach((v, k) => merged.set(k, v));
    emailMap.forEach((v, k) => merged.set(k, v));
    const list = sortThreadsNewestFirst(Array.from(merged.values()));
    const best = list[0] || null;
    const fp = best ? buildThreadsFingerprint([best]) : 'null';
    if (fp === lastFp) return;
    lastFp = fp;
    try {
      if (best) {
        localStorage.setItem(getMemberInboxThreadCacheKey(uid), JSON.stringify(best));
      }
    } catch {
      // ignore
    }
    callback(best);
  };

  const fetchServerNow = async () => {
    if (disposed) return;
    try {
      const [uidSnap, emailSnap] = await Promise.all([
        getDocsFromServer(uidQuery).catch(() => null),
        emailQuery ? getDocsFromServer(emailQuery).catch(() => null) : Promise.resolve(null)
      ]);
      if (disposed) return;
      if (uidSnap) {
        uidMap.clear();
        uidSnap.forEach((d) => {
          uidMap.set(d.id, { id: d.id, ...(d.data() as any) } as InboxThread);
        });
      }
      if (emailSnap) {
        emailMap.clear();
        emailSnap.forEach((d) => {
          emailMap.set(d.id, { id: d.id, ...(d.data() as any) } as InboxThread);
        });
      }
      if (uidSnap || emailSnap) {
        emitBest();
      }
    } catch {
      // fallback to active onSnapshot listeners
    }
  };

  fetchServerNow();

  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      uidQuery,
      (snap) => {
        uidMap.clear();
        snap.forEach((d) => {
          uidMap.set(d.id, { id: d.id, ...(d.data() as any) } as InboxThread);
        });
        emitBest();
      },
      (err) => {
        console.warn('Member inbox thread UID query warning:', err);
      }
    )
  );

  if (emailQuery) {
    unsubs.push(
      onSnapshot(
        emailQuery,
        (snap) => {
          emailMap.clear();
          snap.forEach((d) => {
            emailMap.set(d.id, { id: d.id, ...(d.data() as any) } as InboxThread);
          });
          emitBest();
        },
        (err) => {
          console.warn('Member inbox thread email query warning:', err);
        }
      )
    );
  }

  const handleWake = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchServerNow();
    }
  };

  let catchUpTimer: number | null = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWake);
    window.addEventListener('online', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    catchUpTimer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchServerNow();
      }
    }, 3000);
  }

  return () => {
    disposed = true;
    unsubs.forEach((u) => u());
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('online', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
      if (catchUpTimer !== null) window.clearInterval(catchUpTimer);
    }
  };
}

/**
 * Real-time subscription to chronological chat history messages inside a specific thread.
 * Pairs WebChannel onSnapshot with instant server fetch + silent live catch-up so new
 * messages always stream in immediately without needing a page refresh.
 */
export function subscribeToInboxMessages(
  threadId: string,
  callback: (messages: InboxMessage[]) => void
): Unsubscribe {
  let disposed = false;
  let lastFp = '__init__';

  const emitSorted = (msgs: InboxMessage[]) => {
    if (disposed) return;
    const sorted = sortMessagesChronological(msgs);
    const fp = buildMessagesFingerprint(sorted);
    if (fp === lastFp) return;
    lastFp = fp;
    try {
      localStorage.setItem(getInboxMessagesCacheKey(threadId), JSON.stringify(sorted));
    } catch {
      // ignore
    }
    callback(sorted);
  };

  const cached = getCachedInboxMessages(threadId);
  if (cached.length > 0) {
    emitSorted(cached);
  }

  const msgsRef = collection(db, 'inbox_threads', threadId, 'messages');

  const fetchServerNow = async () => {
    if (disposed) return;
    try {
      const snap = await getDocsFromServer(msgsRef);
      if (disposed) return;
      const msgs: InboxMessage[] = [];
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as any) } as InboxMessage);
      });
      emitSorted(msgs);
    } catch {
      // fallback to active onSnapshot listener
    }
  };

  fetchServerNow();

  const unsubSnapshot = onSnapshot(
    msgsRef,
    (snap) => {
      const msgs: InboxMessage[] = [];
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as any) } as InboxMessage);
      });
      emitSorted(msgs);
    },
    (err) => {
      console.warn('Inbox messages subscription warning:', err);
    }
  );

  const handleWake = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchServerNow();
    }
  };

  let catchUpTimer: number | null = null;
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWake);
    window.addEventListener('online', handleWake);
    document.addEventListener('visibilitychange', handleWake);
    catchUpTimer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchServerNow();
      }
    }, 2000);
  }

  return () => {
    disposed = true;
    unsubSnapshot();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('online', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
      if (catchUpTimer !== null) window.clearInterval(catchUpTimer);
    }
  };
}

function maxIsoTimestamp(...values: Array<string | null | undefined>): string {
  let best = '';
  let bestMs = -Infinity;
  for (const val of values) {
    if (!val || typeof val !== 'string') continue;
    const ms = Date.parse(val);
    if (!Number.isNaN(ms)) {
      if (ms > bestMs || (ms === bestMs && val > best)) {
        bestMs = ms;
        best = val;
      }
    } else if (!best || val > best) {
      best = val;
    }
  }
  return best || new Date().toISOString();
}

/**
 * Sends a persistent chat message inside the 1-on-1 thread between Tamim Iqbal (President) and a member.
 * Updates/creates the thread metadata document first so security rules verify thread ownership immediately.
 */
export async function sendInboxMessage(params: {
  threadId: string;
  memberInfo: {
    id?: string;
    uid?: string | null;
    email: string;
    name: string;
    studentId?: string;
    membershipId?: string;
    batch?: string;
    section?: string;
    photo?: string | null;
  };
  senderEmail: string;
  senderUid?: string | null;
  text: string;
}): Promise<InboxMessage> {
  const trimmedText = params.text.trim();
  if (!trimmedText) {
    throw new Error('Message cannot be empty.');
  }

  const senderEmailClean = params.senderEmail.trim();
  const senderEmailLower = senderEmailClean.toLowerCase();
  const senderIsPresident = isPresidentEmail(senderEmailLower);
  const senderRole: InboxSenderRole = senderIsPresident ? 'president' : 'member';
  const senderName = senderIsPresident
    ? PRESIDENT_DISPLAY_NAME
    : (params.memberInfo.name || senderEmailClean).trim();

  const memberEmailClean = (params.memberInfo.email || '').trim();
  const memberEmailLower = memberEmailClean.toLowerCase();
  const nowIso = new Date().toISOString();
  inboxMsgSeq = (inboxMsgSeq + 1) % 10000;
  const msgId = `msg_${Date.now()}_${String(inboxMsgSeq).padStart(4, '0')}_${Math.random().toString(36).slice(2, 6)}`;

  const threadRef = doc(db, 'inbox_threads', params.threadId);
  const existingSnap = await getDoc(threadRef).catch(() => null);
  const existingData = existingSnap?.exists() ? (existingSnap.data() as any) : null;

  const memberUidToStore = !senderIsPresident && params.senderUid
    ? params.senderUid
    : (params.memberInfo.uid || existingData?.memberUid || null);

  const threadBasePayload = cleanFirestoreData({
    id: params.threadId,
    memberId: params.memberInfo.id || params.threadId,
    memberUid: memberUidToStore,
    memberEmail: memberEmailClean,
    memberEmailLower,
    memberName: (params.memberInfo.name || 'Club Member').trim(),
    memberRoll: params.memberInfo.studentId || '',
    memberMembershipId: params.memberInfo.membershipId || '',
    memberBatch: params.memberInfo.batch || '',
    memberSection: params.memberInfo.section || '',
    memberPhoto: params.memberInfo.photo || null,
    lastMessage: trimmedText,
    lastSenderEmail: senderEmailClean,
    lastSenderName: senderName,
    lastSenderRole: senderRole,
    lastMessageAt: nowIso,
    updatedAt: nowIso
  });

  if (existingData) {
    const nextPresidentReadAt = maxIsoTimestamp(
      nowIso,
      existingData.presidentLastReadAt,
      existingData.lastSenderRole === 'member' ? existingData.lastMessageAt : undefined
    );
    const nextMemberReadAt = maxIsoTimestamp(
      nowIso,
      existingData.memberLastReadAt,
      existingData.lastSenderRole === 'president' ? existingData.lastMessageAt : undefined
    );

    await updateDoc(threadRef, {
      ...threadBasePayload,
      ...(senderIsPresident
        ? {
            unreadByMember: increment(1),
            unreadByPresident: 0,
            presidentLastReadAt: nextPresidentReadAt
          }
        : {
            unreadByPresident: increment(1),
            unreadByMember: 0,
            memberLastReadAt: nextMemberReadAt
          })
    });
  } else {
    await setDoc(threadRef, {
      ...threadBasePayload,
      unreadByPresident: senderIsPresident ? 0 : 1,
      unreadByMember: senderIsPresident ? 1 : 0,
      ...(senderIsPresident ? { presidentLastReadAt: nowIso } : { memberLastReadAt: nowIso })
    });
  }

  const messagePayload: InboxMessage = {
    id: msgId,
    threadId: params.threadId,
    senderEmail: senderEmailClean,
    senderEmailLower,
    senderUid: params.senderUid || null,
    senderName,
    senderRole,
    text: trimmedText,
    createdAt: nowIso
  };

  await setDoc(
    doc(db, 'inbox_threads', params.threadId, 'messages', msgId),
    cleanFirestoreData(messagePayload)
  );

  // Fire-and-forget Web Push so recipient gets notified immediately even when not on the website
  const effectiveMemberEmailLower =
    memberEmailLower || String(existingData?.memberEmailLower || '').trim().toLowerCase();
  auth.currentUser
    ?.getIdToken()
    .then((idToken) => {
      if (!idToken) return;
      const targets = senderIsPresident
        ? (effectiveMemberEmailLower ? [effectiveMemberEmailLower] : [])
        : [PRESIDENT_EMAIL];
      return triggerRecipientWebPush({
        idToken,
        targetEmails: targets,
        targetUid: senderIsPresident ? memberUidToStore : undefined,
        title: 'NGDC Science Club • 1 New Message',
        body: 'Check your dashboard.',
        tag: `ngdcsc-msg-${params.threadId}-${nowIso}`,
        url: '/dashboard?open=inbox'
      });
    })
    .catch(() => {});

  return messagePayload;
}

/**
 * Directly resets the unread counter and advances the monotonic read watermark timestamp
 * in Firestore in a single write so double-tick seen receipts appear immediately on both sides.
 */
export async function markInboxThreadRead(
  threadId: string,
  viewerRole: InboxSenderRole,
  options?: {
    latestIncomingCreatedAt?: string;
    currentLastReadAt?: string;
    viewerUid?: string | null;
    currentMemberUid?: string | null;
  }
): Promise<void> {
  if (!threadId) return;
  try {
    const threadRef = doc(db, 'inbox_threads', threadId);
    const nowIso = new Date().toISOString();
    const nextReadTs = maxIsoTimestamp(
      nowIso,
      options?.latestIncomingCreatedAt,
      options?.currentLastReadAt
    );

    if (viewerRole === 'president') {
      await updateDoc(threadRef, {
        unreadByPresident: 0,
        presidentLastReadAt: nextReadTs
      });
    } else if (viewerRole === 'member') {
      const patch: Record<string, any> = {
        unreadByMember: 0,
        memberLastReadAt: nextReadTs
      };
      if (!options?.currentMemberUid && options?.viewerUid) {
        patch.memberUid = options.viewerUid;
      }
      await updateDoc(threadRef, patch);
    }
  } catch (err) {
    console.warn('Mark inbox thread read warning:', err);
  }
}

/**
 * President-only: Sends the exact same message individually into multiple members'
 * separate 1-on-1 private Inbox threads so each member receives it in their own chat.
 */
export async function sendPresidentIndividualBroadcast(params: {
  recipients: Array<{
    threadId: string;
    memberId?: string;
    memberUid?: string | null;
    email: string;
    name: string;
    studentId?: string;
    membershipId?: string;
    batch?: string;
    section?: string;
    photo?: string | null;
  }>;
  senderEmail: string;
  senderUid?: string | null;
  text: string;
  onProgress?: (completed: number, total: number) => void;
}): Promise<{ sentCount: number; failedCount: number }> {
  if (!isPresidentEmail(params.senderEmail)) {
    throw new Error('Only the President can send individual messages to all members.');
  }
  const cleanText = params.text.trim();
  if (!cleanText) {
    throw new Error('Message cannot be empty.');
  }

  const total = params.recipients.length;
  let completed = 0;
  let sentCount = 0;
  let failedCount = 0;

  const CHUNK_SIZE = 5;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = params.recipients.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((r) =>
        sendInboxMessage({
          threadId: r.threadId,
          memberInfo: {
            id: r.memberId || r.threadId,
            uid: r.memberUid || null,
            email: r.email,
            name: r.name,
            studentId: r.studentId,
            membershipId: r.membershipId,
            batch: r.batch,
            section: r.section,
            photo: r.photo || null
          },
          senderEmail: params.senderEmail,
          senderUid: params.senderUid || null,
          text: cleanText
        })
      )
    );
    results.forEach((res) => {
      completed += 1;
      if (res.status === 'fulfilled') {
        sentCount += 1;
      } else {
        failedCount += 1;
      }
    });
    if (params.onProgress) {
      params.onProgress(completed, total);
    }
  }

  return { sentCount, failedCount };
}



