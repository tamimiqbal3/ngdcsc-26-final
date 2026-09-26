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

// Initialize Firestore with resilient connection handling:
// experimentalAutoDetectLongPolling allows Firestore to automatically fallback to HTTP long polling
// when WebSockets or WebChannel streams are interrupted or blocked by proxies/firewalls.
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

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

  // 1. Check in-memory list if provided
  if (currentList && Array.isArray(currentList)) {
    for (const m of currentList) {
      const num = extractSerial(m.membershipId);
      if (num > maxSerial) maxSerial = num;
    }
  }

  // 2. Check local storage cache
  const cached = getCachedMembers();
  for (const m of cached) {
    const num = extractSerial(m.membershipId);
    if (num > maxSerial) maxSerial = num;
  }

  // 3. Check live Firestore
  try {
    const membersSnap = await getDocs(collection(db, 'members'));
    membersSnap.forEach(d => {
      const data = d.data();
      const num = extractSerial(data.membershipId);
      if (num > maxSerial) maxSerial = num;
    });

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
      await setDoc(counterRef, {
        lastSerial: nextSerial,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return `NGDCSC-${String(nextSerial).padStart(3, '0')}`;
    } catch {
      const nextSerial = maxSerial + 1;
      return `NGDCSC-${String(nextSerial).padStart(3, '0')}`;
    }
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
  // Pending student registrations receive official Membership ID upon Admin approval
  if (!membershipId && status === 'approved') {
    try {
      membershipId = await generateNextMembershipId();
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

  // 3. Save lightweight public status to 'member_status' by multiple keys for instant lookup
  const cleanPhone = normalizePhoneNumber(recordWithId.phone);
  const statusPayload: any = {
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
export async function deleteMemberFromFirebase(id: string): Promise<void> {
  const cached = getCachedMembers();
  const targetMember = cached.find(m => m.id === id);
  const updated = cached.filter(m => m.id !== id);
  localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(updated));

  try {
    const docRef = doc(db, 'members', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete error (deleted locally):', err);
  }

  // Delete status docs
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
  if (targetMember?.membershipId) {
    keysToDelete.add(targetMember.membershipId.toUpperCase().trim());
  }

  for (const k of Array.from(keysToDelete)) {
    try {
      await deleteDoc(doc(db, 'member_status', k));
    } catch {
      // ignore
    }
  }
}

/**
 * Public Search for Member Status using Phone Number (+88 or 01) OR Membership ID (e.g. NGDCSC-008, 008)
 * Checks the live Firestore 'members' collection first, then 'member_status', then local cache.
 */
export async function searchMemberStatus(queryStr: string): Promise<PublicMemberStatus | null> {
  const trimmed = queryStr.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const cleanPhone = normalizePhoneNumber(trimmed);
  const isMid = trimmed.toUpperCase().startsWith('NGDCSC') || /^\d{1,4}$/.test(trimmed);
  const midStandard = trimmed.toUpperCase().startsWith('NGDCSC') 
    ? trimmed.toUpperCase() 
    : (/^\d+$/.test(trimmed) ? `NGDCSC-${trimmed.padStart(3, '0')}` : trimmed.toUpperCase());

  let hadPermissionDenied = false;

  // 1. First priority: Check live Firestore 'members' collection (Source of Truth for Admin Panel)
  try {
    const membersCol = collection(db, 'members');
    
    // Fast targeted query by exact phone candidates
    const phoneCandidates = Array.from(new Set([cleanPhone, `+88${cleanPhone}`, `88${cleanPhone}`, trimmed].filter(Boolean)));
    for (const phoneVal of phoneCandidates) {
      try {
        const q = query(membersCol, where('phone', '==', phoneVal));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const docSnap = qSnap.docs[0];
          const data = docSnap.data();
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
      } catch (e: any) {
        if (e?.code === 'permission-denied') hadPermissionDenied = true;
      }
    }

    // Check whatsapp candidates
    for (const phoneVal of phoneCandidates) {
      try {
        const q = query(membersCol, where('whatsapp', '==', phoneVal));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const docSnap = qSnap.docs[0];
          const data = docSnap.data();
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
      } catch (e: any) {
        if (e?.code === 'permission-denied') hadPermissionDenied = true;
      }
    }

    // Direct scan across all documents in 'members' collection (handles non-standard spacing, dashes, etc.)
    const allMembersSnap = await getDocs(membersCol);
    if (!allMembersSnap.empty) {
      for (const d of allMembersSnap.docs) {
        const data = d.data();
        const pNorm = normalizePhoneNumber(data.phone || '');
        const wNorm = normalizePhoneNumber(data.whatsapp || '');
        
        const isPhoneMatch = cleanPhone && (
          pNorm === cleanPhone || 
          wNorm === cleanPhone ||
          (cleanPhone.length >= 10 && (pNorm.endsWith(cleanPhone.slice(-10)) || wNorm.endsWith(cleanPhone.slice(-10))))
        );
        const isRawPhoneMatch = (data.phone && data.phone.trim() === trimmed) || (data.whatsapp && data.whatsapp.trim() === trimmed);
        const isMidMatch = data.membershipId && (
          data.membershipId.toUpperCase().trim() === trimmed.toUpperCase() ||
          (midStandard && data.membershipId.toUpperCase().trim() === midStandard)
        );

        if (isPhoneMatch || isRawPhoneMatch || isMidMatch) {
          return {
            id: d.id,
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
    if (err?.code === 'permission-denied') hadPermissionDenied = true;
    console.warn('Firestore members direct lookup error:', err);
  }

  // 2. Second priority: Direct doc lookups in 'member_status'
  const keysToCheck = new Set<string>();
  if (cleanPhone) {
    keysToCheck.add(cleanPhone);
    keysToCheck.add(`+88${cleanPhone}`);
    keysToCheck.add(`88${cleanPhone}`);
  }
  keysToCheck.add(trimmed);
  keysToCheck.add(trimmed.toUpperCase());
  if (midStandard) keysToCheck.add(midStandard);
  if (isMid) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly) keysToCheck.add(digitsOnly);
  }

  for (const k of Array.from(keysToCheck)) {
    try {
      const snap = await getDoc(doc(db, 'member_status', k));
      if (snap.exists()) {
        const data = snap.data();
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
    } catch (e: any) {
      if (e?.code === 'permission-denied') hadPermissionDenied = true;
    }
  }

  // 3. Third priority: Collection scan of member_status
  try {
    const colRef = collection(db, 'member_status');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      for (const d of snap.docs) {
        const data = d.data();
        const docId = d.id;

        // Check phone match
        if (cleanPhone) {
          const docNorm = normalizePhoneNumber(docId);
          const dataPhoneNorm = data.phone ? normalizePhoneNumber(data.phone) : '';
          if (
            docNorm === cleanPhone ||
            dataPhoneNorm === cleanPhone ||
            (cleanPhone.length >= 10 && (docNorm.endsWith(cleanPhone.slice(-10)) || dataPhoneNorm.endsWith(cleanPhone.slice(-10))))
          ) {
            return {
              id: data.id || d.id,
              membershipId: data.membershipId,
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

        // Check membership ID match
        if (data.membershipId) {
          const mIdClean = data.membershipId.toUpperCase().replace(/\s/g, '');
          if (mIdClean === trimmed.toUpperCase().replace(/\s/g, '') || (midStandard && mIdClean === midStandard)) {
            return {
              id: data.id || d.id,
              membershipId: data.membershipId,
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
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied') hadPermissionDenied = true;
    console.warn('Firestore member_status scan error:', err);
  }

  // 4. Fourth priority: Local cache fallback
  const cached = getCachedMembers();
  const matchedMember = cached.find(m => {
    // Check membership ID match
    if (m.membershipId) {
      const mIdNorm = m.membershipId.toUpperCase().replace(/\s/g, '');
      if (mIdNorm === trimmed.toUpperCase().replace(/\s/g, '') || (midStandard && mIdNorm === midStandard)) return true;
      const idNum = m.membershipId.replace(/[^0-9]/g, '');
      const qNum = trimmed.replace(/[^0-9]/g, '');
      if (idNum && qNum && parseInt(idNum, 10) === parseInt(qNum, 10)) {
        return true;
      }
    }
    // Check phone match
    const mPhone = normalizePhoneNumber(m.phone || '');
    const mWp = normalizePhoneNumber(m.whatsapp || '');
    if (cleanPhone && (
      mPhone === cleanPhone || 
      mWp === cleanPhone ||
      (cleanPhone.length >= 10 && (mPhone.endsWith(cleanPhone.slice(-10)) || mWp.endsWith(cleanPhone.slice(-10))))
    )) {
      return true;
    }
    return false;
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

  if (hadPermissionDenied) {
    throw new Error('PERMISSION_DENIED');
  }

  return null;
}

// Alias for backwards compatibility
export const searchMemberStatusByPhone = searchMemberStatus;

/**
 * Sync all existing members into member_status collection
 */
export async function syncAllMembersToStatusDocs(members: SubmissionRecord[]): Promise<void> {
  if (!members || members.length === 0) return;
  try {
    const promises: Promise<any>[] = [];
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
        phone: member.phone,
        submittedAt: member.submittedAt || member.createdAt,
        updatedAt: serverTimestamp()
      };

      const cleanPhone = normalizePhoneNumber(member.phone);
      if (cleanPhone) {
        promises.push(setDoc(doc(db, 'member_status', cleanPhone), statusPayload, { merge: true }).catch(() => {}));
        promises.push(setDoc(doc(db, 'member_status', `+88${cleanPhone}`), statusPayload, { merge: true }).catch(() => {}));
      }

      if (member.membershipId) {
        promises.push(setDoc(doc(db, 'member_status', member.membershipId.toUpperCase().trim()), statusPayload, { merge: true }).catch(() => {}));
      }
    }
    await Promise.allSettled(promises);
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
