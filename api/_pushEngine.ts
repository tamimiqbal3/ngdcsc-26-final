import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type webPushType from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof webPushType;

export const PRESIDENT_EMAIL = 'info.tamimiq@gmail.com';
export const SUPER_ADMIN_EMAILS = new Set([
  'ngdcsc.org@gmail.com',
  'info.tamimiq@gmail.com',
  'tahmidahmmed007@gmail.com'
]);

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ngdcsc-a8228';
const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY || 'AIzaSyC-J4YtNcvqUQYUA9WgFckP7pQC9KtDNMo';
const FIRESTORE_DOC_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const DATA_DIR = path.resolve(process.cwd(), '.ngdcsc-data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid-keys.json');
const SUBS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

export interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  emailLower: string;
  uid: string;
  updatedAt: string;
}

export interface VapidKeysPair {
  publicKey: string;
  privateKey: string;
}

interface SealedEnvelopeV2Item {
  v: 2;
  eid: string;
  epk: string;
  iv: string;
  tag: string;
  data: string;
  updatedAt: string;
}

interface SealedEnvelopeV2Bundle {
  v: 2;
  items: SealedEnvelopeV2Item[];
}

export interface ApiRequestLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
  on?: (event: string, listener: (...args: any[]) => void) => any;
}

export interface ApiResponseLike {
  status: (code: number) => ApiResponseLike;
  json: (payload: any) => any;
  setHeader: (name: string, value: string) => any;
}

function isValidVapidPublicKey(pub: string): boolean {
  try {
    const buf = Buffer.from(pub.trim(), 'base64url');
    return buf.length === 65 && buf[0] === 0x04;
  } catch {
    return false;
  }
}

function isValidVapidPrivateKey(priv: string): boolean {
  try {
    const buf = Buffer.from(priv.trim(), 'base64url');
    return buf.length === 32;
  } catch {
    return false;
  }
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // read-only serverless fs
  }
}

function saveVapidKeysToDisk(keys: VapidKeysPair) {
  ensureDataDir();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), 'utf8');
  } catch {
    // read-only serverless fs
  }
}

interface InitialVapidLoad {
  keys: VapidKeysPair;
  fromEnv: boolean;
  fromDisk: boolean;
}

function loadOrCreateVapidKeys(): InitialVapidLoad {
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim() || '';
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim() || '';
  if (envPub && envPriv && isValidVapidPublicKey(envPub) && isValidVapidPrivateKey(envPriv)) {
    return {
      keys: { publicKey: envPub, privateKey: envPriv },
      fromEnv: true,
      fromDisk: false
    };
  }

  ensureDataDir();
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
      if (
        parsed?.publicKey &&
        parsed?.privateKey &&
        isValidVapidPublicKey(parsed.publicKey) &&
        isValidVapidPrivateKey(parsed.privateKey)
      ) {
        return {
          keys: { publicKey: parsed.publicKey.trim(), privateKey: parsed.privateKey.trim() },
          fromEnv: false,
          fromDisk: true
        };
      }
    }
  } catch {
    // ignore and regenerate
  }

  const generated = webpush.generateVAPIDKeys();
  saveVapidKeysToDisk(generated);
  return {
    keys: generated,
    fromEnv: false,
    fromDisk: false
  };
}

const initialVapid = loadOrCreateVapidKeys();
let vapidKeys: VapidKeysPair = initialVapid.keys;
let canonicalVapidSynced = initialVapid.fromEnv;
let hasUsablePrivateKey = initialVapid.fromEnv || initialVapid.fromDisk;
let canonicalPublicKeyOverride = initialVapid.fromEnv ? initialVapid.keys.publicKey : '';

function applyVapidKeys(nextKeys: VapidKeysPair, markSynced = true) {
  vapidKeys = nextKeys;
  canonicalPublicKeyOverride = nextKeys.publicKey;
  hasUsablePrivateKey = true;
  if (markSynced) {
    canonicalVapidSynced = true;
  }
  webpush.setVapidDetails(
    `mailto:${PRESIDENT_EMAIL}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

applyVapidKeys(vapidKeys, initialVapid.fromEnv);

function endpointFingerprint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 16);
}

function deriveLegacySealingKey(privateKey: string): Buffer {
  return crypto
    .createHash('sha256')
    .update(`ngdcsc-push-seal-v1:${FIREBASE_PROJECT_ID}:${privateKey}`)
    .digest();
}

function sealItemToPublicKey(
  sub: StoredPushSubscription,
  publicKey: string
): SealedEnvelopeV2Item {
  const eph = crypto.createECDH('prime256v1');
  eph.generateKeys();
  const sharedSecret = eph.computeSecret(Buffer.from(publicKey.trim(), 'base64url'));
  const aesKey = crypto
    .createHash('sha256')
    .update(`ngdcsc-ecies-v2:${FIREBASE_PROJECT_ID}:`)
    .update(sharedSecret)
    .digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const plaintext = JSON.stringify(sub);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 2,
    eid: endpointFingerprint(sub.endpoint),
    epk: eph.getPublicKey('base64url'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
    updatedAt: sub.updatedAt || new Date().toISOString()
  };
}

function unsealItemWithPrivateKey(
  item: SealedEnvelopeV2Item,
  privateKey: string
): StoredPushSubscription | null {
  try {
    if (!item?.epk || !item?.iv || !item?.tag || !item?.data) return null;
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(privateKey.trim(), 'base64url'));
    const sharedSecret = ecdh.computeSecret(Buffer.from(item.epk.trim(), 'base64url'));
    const aesKey = crypto
      .createHash('sha256')
      .update(`ngdcsc-ecies-v2:${FIREBASE_PROJECT_ID}:`)
      .update(sharedSecret)
      .digest();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      aesKey,
      Buffer.from(item.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(item.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(item.data, 'base64')),
      decipher.final()
    ]).toString('utf8');
    const parsed = JSON.parse(decrypted);
    if (!parsed?.endpoint || !parsed?.keys?.p256dh || !parsed?.keys?.auth) return null;
    return parsed as StoredPushSubscription;
  } catch {
    return null;
  }
}

function unsealSubscriptions(blob: string, privateKey: string): StoredPushSubscription[] {
  try {
    const parsed = JSON.parse(blob);
    if (parsed?.v === 2 && Array.isArray(parsed.items)) {
      const results: StoredPushSubscription[] = [];
      for (const item of parsed.items as SealedEnvelopeV2Item[]) {
        const dec = unsealItemWithPrivateKey(item, privateKey);
        if (dec) results.push(dec);
      }
      return results;
    }

    if (!parsed?.iv || !parsed?.tag || !parsed?.data) return [];
    const key = deriveLegacySealingKey(privateKey);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parsed.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, 'base64')),
      decipher.final()
    ]).toString('utf8');
    const list = JSON.parse(decrypted);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function extractRawV2Items(blob: string | undefined): SealedEnvelopeV2Item[] {
  if (!blob) return [];
  try {
    const parsed = JSON.parse(blob);
    if (parsed?.v === 2 && Array.isArray(parsed.items)) {
      return parsed.items.filter(
        (x: any) => x && x.v === 2 && typeof x.eid === 'string' && typeof x.epk === 'string'
      );
    }
  } catch {
    // legacy v1 blob cannot be unpacked without privateKey
  }
  return [];
}

function packV2Bundle(items: SealedEnvelopeV2Item[]): string {
  const byEid = new Map<string, SealedEnvelopeV2Item>();
  for (const item of items) {
    if (!item?.eid || !item?.epk || !item?.data) continue;
    const prev = byEid.get(item.eid);
    if (!prev || (item.updatedAt || '') >= (prev.updatedAt || '')) {
      byEid.set(item.eid, item);
    }
  }
  const trimmed = Array.from(byEid.values())
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 25);
  const bundle: SealedEnvelopeV2Bundle = { v: 2, items: trimmed };
  return JSON.stringify(bundle);
}

function sanitizeEmailDocKey(emailLower: string): string {
  return `push_${emailLower.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

async function getFirestoreDoc(
  docPath: string,
  idToken?: string
): Promise<Record<string, any> | null> {
  try {
    const headers: Record<string, string> = {};
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
    const res = await fetch(`${FIRESTORE_DOC_BASE}/${docPath}`, {
      headers,
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { fields?: Record<string, any> };
    return json?.fields || null;
  } catch {
    return null;
  }
}

async function patchFirestoreDoc(
  docPath: string,
  fields: Record<string, { stringValue?: string }>,
  idToken?: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
    const res = await fetch(`${FIRESTORE_DOC_BASE}/${docPath}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) {
      console.warn(`[web-push] Firestore PATCH ${docPath} failed: HTTP ${res.status}`);
    }
    return res.ok;
  } catch (err: any) {
    console.warn(`[web-push] Firestore PATCH ${docPath} error:`, err?.message || err);
    return false;
  }
}

let vapidSyncInFlight: Promise<void> | null = null;

async function resolvePublicKeyForClient(): Promise<string> {
  if (canonicalVapidSynced && canonicalPublicKeyOverride) {
    return canonicalPublicKeyOverride;
  }
  if (canonicalPublicKeyOverride && isValidVapidPublicKey(canonicalPublicKeyOverride)) {
    return canonicalPublicKeyOverride;
  }

  const settingsDoc = await getFirestoreDoc('settings/webpush_public');
  const remoteOnlyPub = settingsDoc?.publicKey?.stringValue?.trim();
  if (remoteOnlyPub && isValidVapidPublicKey(remoteOnlyPub)) {
    canonicalPublicKeyOverride = remoteOnlyPub;
    return remoteOnlyPub;
  }

  return vapidKeys.publicKey;
}

async function syncCanonicalVapidKeysWithAdminToken(idToken: string): Promise<void> {
  if (canonicalVapidSynced) return;
  if (vapidSyncInFlight) {
    await vapidSyncInFlight;
    return;
  }

  vapidSyncInFlight = (async () => {
    try {
      const existing = await getFirestoreDoc('system_meta/webpush_vapid', idToken);
      const remotePub = existing?.publicKey?.stringValue?.trim() || '';
      const remotePriv = existing?.privateKey?.stringValue?.trim() || '';
      if (
        remotePub &&
        remotePriv &&
        isValidVapidPublicKey(remotePub) &&
        isValidVapidPrivateKey(remotePriv)
      ) {
        if (remotePub !== vapidKeys.publicKey || remotePriv !== vapidKeys.privateKey) {
          const nextKeys = { publicKey: remotePub, privateKey: remotePriv };
          applyVapidKeys(nextKeys, true);
          saveVapidKeysToDisk(nextKeys);
        } else {
          canonicalVapidSynced = true;
          hasUsablePrivateKey = true;
          canonicalPublicKeyOverride = remotePub;
        }
        await patchFirestoreDoc(
          'settings/webpush_public',
          {
            publicKey: { stringValue: remotePub },
            updatedAt: { stringValue: new Date().toISOString() }
          },
          idToken
        );
        return;
      }

      const nowIso = new Date().toISOString();
      const ok = await patchFirestoreDoc(
        'system_meta/webpush_vapid',
        {
          publicKey: { stringValue: vapidKeys.publicKey },
          privateKey: { stringValue: vapidKeys.privateKey },
          updatedAt: { stringValue: nowIso }
        },
        idToken
      );
      if (ok) {
        canonicalVapidSynced = true;
        hasUsablePrivateKey = true;
        canonicalPublicKeyOverride = vapidKeys.publicKey;
        await patchFirestoreDoc(
          'settings/webpush_public',
          {
            publicKey: { stringValue: vapidKeys.publicKey },
            updatedAt: { stringValue: nowIso }
          },
          idToken
        );
      }
    } finally {
      vapidSyncInFlight = null;
    }
  })();

  await vapidSyncInFlight;
}

async function readRemoteSubsForEmail(
  emailLower: string,
  idToken?: string
): Promise<StoredPushSubscription[]> {
  if (!hasUsablePrivateKey) return [];
  const cleanEmail = emailLower.trim().toLowerCase();
  if (!cleanEmail) return [];

  const collected: StoredPushSubscription[] = [];
  const docKey = sanitizeEmailDocKey(cleanEmail);
  const memberFields = await getFirestoreDoc(`member_status/${docKey}`, idToken);
  const memberBlob = memberFields?.sealed?.stringValue;
  if (memberBlob) {
    collected.push(...unsealSubscriptions(memberBlob, vapidKeys.privateKey));
  }

  if (cleanEmail === PRESIDENT_EMAIL) {
    const presFields = await getFirestoreDoc('settings/president_push_subs', idToken);
    const presBlob = presFields?.sealed?.stringValue;
    if (presBlob) {
      collected.push(...unsealSubscriptions(presBlob, vapidKeys.privateKey));
    }
  }

  return collected;
}

async function writeRemoteSubsForEmail(
  emailLower: string,
  subsForUser: StoredPushSubscription[],
  idToken?: string
): Promise<void> {
  const cleanEmail = emailLower.trim().toLowerCase();
  if (!cleanEmail) return;
  const sealingPubKey = await resolvePublicKeyForClient();

  const trimmedSubs = [...subsForUser]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 25);

  const items = trimmedSubs.map((s) => sealItemToPublicKey(s, sealingPubKey));
  const sealed = packV2Bundle(items);
  const nowIso = new Date().toISOString();
  const docKey = sanitizeEmailDocKey(cleanEmail);

  await patchFirestoreDoc(
    `member_status/${docKey}`,
    {
      kind: { stringValue: 'push_subs' },
      sealed: { stringValue: sealed },
      updatedAt: { stringValue: nowIso }
    },
    idToken
  );

  if (cleanEmail === PRESIDENT_EMAIL && idToken) {
    await patchFirestoreDoc(
      'settings/president_push_subs',
      {
        sealed: { stringValue: sealed },
        updatedAt: { stringValue: nowIso }
      },
      idToken
    );
  }
}

async function upsertEncryptedDeviceWithoutPrivateKey(
  emailLower: string,
  record: StoredPushSubscription,
  sealingPubKey: string,
  idToken?: string
): Promise<number> {
  const cleanEmail = emailLower.trim().toLowerCase();
  const docKey = sanitizeEmailDocKey(cleanEmail);
  const existingDoc = await getFirestoreDoc(`member_status/${docKey}`, idToken);
  const existingItems = extractRawV2Items(existingDoc?.sealed?.stringValue);
  const newItem = sealItemToPublicKey(record, sealingPubKey);
  const nextItems = existingItems.filter((i) => i.eid !== newItem.eid);
  nextItems.push(newItem);
  const sealed = packV2Bundle(nextItems);
  const nowIso = new Date().toISOString();

  await patchFirestoreDoc(
    `member_status/${docKey}`,
    {
      kind: { stringValue: 'push_subs' },
      sealed: { stringValue: sealed },
      updatedAt: { stringValue: nowIso }
    },
    idToken
  );
  return Math.min(nextItems.length, 25);
}

async function removeEncryptedDeviceWithoutPrivateKey(
  emailLower: string,
  endpoint: string,
  idToken?: string
): Promise<void> {
  const cleanEmail = emailLower.trim().toLowerCase();
  const docKey = sanitizeEmailDocKey(cleanEmail);
  const existingDoc = await getFirestoreDoc(`member_status/${docKey}`, idToken);
  const existingItems = extractRawV2Items(existingDoc?.sealed?.stringValue);
  if (existingItems.length === 0) return;

  const targetEid = endpointFingerprint(endpoint);
  const remaining = existingItems.filter((i) => i.eid !== targetEid);
  const sealed = packV2Bundle(remaining);
  await patchFirestoreDoc(
    `member_status/${docKey}`,
    {
      kind: { stringValue: 'push_subs' },
      sealed: { stringValue: sealed },
      updatedAt: { stringValue: new Date().toISOString() }
    },
    idToken
  );
}

function mergeSubscriptionLists(...lists: StoredPushSubscription[][]): StoredPushSubscription[] {
  const byEndpoint = new Map<string, StoredPushSubscription>();
  for (const list of lists) {
    for (const item of list) {
      if (!item?.endpoint || !item?.keys?.p256dh || !item?.keys?.auth) continue;
      const existing = byEndpoint.get(item.endpoint);
      if (!existing || (item.updatedAt || '') >= (existing.updatedAt || '')) {
        byEndpoint.set(item.endpoint, item);
      }
    }
  }
  return Array.from(byEndpoint.values());
}

function loadSubscriptionsFromDisk(): StoredPushSubscription[] {
  ensureDataDir();
  try {
    if (fs.existsSync(SUBS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

let subscriptionStore: StoredPushSubscription[] = loadSubscriptionsFromDisk();

function saveSubscriptionsToDisk() {
  ensureDataDir();
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subscriptionStore, null, 2), 'utf8');
  } catch {
    // read-only serverless fs
  }
}

const verifiedTokenCache = new Map<
  string,
  { uid: string; emailLower: string; expiresAt: number }
>();

async function parseJsonBody(req: ApiRequestLike): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.on === 'function') {
    const raw = await new Promise<string>((resolve) => {
      const chunks: Buffer[] = [];
      let total = 0;
      req.on!('data', (chunk: Buffer | string) => {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        total += buf.length;
        if (total <= 262144) chunks.push(buf);
      });
      req.on!('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on!('error', () => resolve(''));
    });
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
  }
  return {};
}

async function verifyFirebaseToken(
  req: ApiRequestLike,
  body: Record<string, any>
): Promise<{ uid: string; emailLower: string; idToken: string } | null> {
  const headerCustom = req.headers['x-firebase-token'];
  const customToken = Array.isArray(headerCustom) ? headerCustom[0] : headerCustom;
  const bodyToken = typeof body?.idToken === 'string' ? body.idToken : '';
  const rawAuth = req.headers.authorization || req.headers['Authorization'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';

  const idToken = (customToken || bodyToken || bearerToken || '').trim();
  if (!idToken) return null;

  const now = Date.now();
  const cached = verifiedTokenCache.get(idToken);
  if (cached && cached.expiresAt > now) {
    return { uid: cached.uid, emailLower: cached.emailLower, idToken };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          signal: AbortSignal.timeout(7000)
        }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        users?: Array<{ localId?: string; email?: string }>;
      };
      const user = data?.users?.[0];
      if (!user?.localId || !user?.email) return null;
      const verified = {
        uid: user.localId,
        emailLower: user.email.trim().toLowerCase(),
        idToken
      };
      if (verifiedTokenCache.size > 500) {
        verifiedTokenCache.clear();
      }
      verifiedTokenCache.set(idToken, {
        uid: verified.uid,
        emailLower: verified.emailLower,
        expiresAt: now + 5 * 60 * 1000
      });
      return verified;
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

export async function handlePublicKey(_req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const publicKey = await resolvePublicKeyForClient();
  res.status(200).json({ publicKey });
}

export async function handleSyncKeys(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const body = await parseJsonBody(req);
  const user = await verifyFirebaseToken(req, body);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (SUPER_ADMIN_EMAILS.has(user.emailLower)) {
    await syncCanonicalVapidKeysWithAdminToken(user.idToken);
  }
  const publicKey = await resolvePublicKeyForClient();
  res.status(200).json({ ok: true, publicKey });
}

export async function handleStatus(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const body = await parseJsonBody(req);
  const user = await verifyFirebaseToken(req, body);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (hasUsablePrivateKey) {
    const remoteForUser = await readRemoteSubsForEmail(user.emailLower, user.idToken);
    const localForUser = subscriptionStore.filter((s) => s.emailLower === user.emailLower);
    const merged = mergeSubscriptionLists(remoteForUser, localForUser);
    res.status(200).json({ registered: merged.length > 0, deviceCount: merged.length });
    return;
  }

  const docKey = sanitizeEmailDocKey(user.emailLower);
  const existingDoc = await getFirestoreDoc(`member_status/${docKey}`, user.idToken);
  const items = extractRawV2Items(existingDoc?.sealed?.stringValue);
  res.status(200).json({ registered: items.length > 0, deviceCount: items.length });
}

export async function handleRegister(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const body = await parseJsonBody(req);
  const user = await verifyFirebaseToken(req, body);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (SUPER_ADMIN_EMAILS.has(user.emailLower)) {
    await syncCanonicalVapidKeysWithAdminToken(user.idToken);
  }

  const sub = body?.subscription;
  if (
    !sub ||
    typeof sub.endpoint !== 'string' ||
    !sub.keys ||
    typeof sub.keys.p256dh !== 'string' ||
    typeof sub.keys.auth !== 'string'
  ) {
    res.status(400).json({ error: 'Invalid push subscription' });
    return;
  }

  const record: StoredPushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth
    },
    emailLower: user.emailLower,
    uid: user.uid,
    updatedAt: new Date().toISOString()
  };

  const existingIdx = subscriptionStore.findIndex((s) => s.endpoint === record.endpoint);
  if (existingIdx >= 0) {
    subscriptionStore[existingIdx] = record;
  } else {
    subscriptionStore.push(record);
  }
  saveSubscriptionsToDisk();

  const effectivePublicKey = await resolvePublicKeyForClient();

  if (hasUsablePrivateKey) {
    const remoteForUser = await readRemoteSubsForEmail(user.emailLower, user.idToken);
    const mergedForUser = mergeSubscriptionLists(
      remoteForUser,
      subscriptionStore.filter((s) => s.emailLower === user.emailLower),
      [record]
    ).filter((s) => s.emailLower === user.emailLower);

    subscriptionStore = mergeSubscriptionLists(subscriptionStore, mergedForUser);
    saveSubscriptionsToDisk();
    await writeRemoteSubsForEmail(user.emailLower, mergedForUser, user.idToken);

    console.log(
      `[web-push] registered device for ${user.emailLower} (${mergedForUser.length} active)`
    );
    res
      .status(200)
      .json({ ok: true, publicKey: effectivePublicKey, deviceCount: mergedForUser.length });
    return;
  }

  const deviceCount = await upsertEncryptedDeviceWithoutPrivateKey(
    user.emailLower,
    record,
    effectivePublicKey,
    user.idToken
  );
  console.log(`[web-push] sealed device for ${user.emailLower} (${deviceCount} stored)`);
  res.status(200).json({ ok: true, publicKey: effectivePublicKey, deviceCount });
}

export async function handleUnregister(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const body = await parseJsonBody(req);
  const user = await verifyFirebaseToken(req, body);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const endpoint = body?.endpoint;
  if (typeof endpoint === 'string' && endpoint) {
    subscriptionStore = subscriptionStore.filter(
      (s) => !(s.endpoint === endpoint && (s.uid === user.uid || s.emailLower === user.emailLower))
    );
    saveSubscriptionsToDisk();

    if (hasUsablePrivateKey) {
      const remoteForUser = await readRemoteSubsForEmail(user.emailLower, user.idToken);
      const filteredRemote = mergeSubscriptionLists(
        remoteForUser,
        subscriptionStore.filter((s) => s.emailLower === user.emailLower)
      ).filter((s) => s.emailLower === user.emailLower && s.endpoint !== endpoint);
      await writeRemoteSubsForEmail(user.emailLower, filteredRemote, user.idToken);
    } else {
      await removeEncryptedDeviceWithoutPrivateKey(user.emailLower, endpoint, user.idToken);
    }
  }
  res.status(200).json({ ok: true });
}

export async function handleSend(req: ApiRequestLike, res: ApiResponseLike): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  const body = await parseJsonBody(req);
  const sender = await verifyFirebaseToken(req, body);
  if (!sender) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (SUPER_ADMIN_EMAILS.has(sender.emailLower)) {
    await syncCanonicalVapidKeysWithAdminToken(sender.idToken);
  }

  if (!hasUsablePrivateKey) {
    console.warn(
      '[web-push] Cannot sign Web Push in stateless instance without VAPID_PRIVATE_KEY env var'
    );
    res.status(200).json({ sent: 0, reason: 'missing-vapid-private-key' });
    return;
  }

  const senderIsPresident = sender.emailLower === PRESIDENT_EMAIL;
  const rawTargets: unknown = body?.targetEmails;
  const targetEmails: string[] = Array.isArray(rawTargets)
    ? rawTargets
        .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
        .map((e) => e.trim().toLowerCase())
    : [];

  const allowedTargets = senderIsPresident
    ? Array.from(new Set(targetEmails))
    : [PRESIDENT_EMAIL];

  if (allowedTargets.length === 0) {
    res.status(200).json({ sent: 0 });
    return;
  }

  const remoteLists = await Promise.all(
    allowedTargets.map((email) => readRemoteSubsForEmail(email, sender.idToken))
  );

  const targetSet = new Set(allowedTargets);
  const cleanTargetUid =
    senderIsPresident && typeof body?.targetUid === 'string'
      ? body.targetUid.trim()
      : '';
  const localMatching = subscriptionStore.filter(
    (s) => targetSet.has(s.emailLower) || (cleanTargetUid.length > 0 && s.uid === cleanTargetUid)
  );

  const matchingSubs = mergeSubscriptionLists(localMatching, ...remoteLists);

  if (matchingSubs.length === 0) {
    console.log(`[web-push] 0 registered devices for ${allowedTargets.join(', ')}`);
    res.status(200).json({ sent: 0 });
    return;
  }

  const payload = JSON.stringify({
    title: typeof body?.title === 'string' ? body.title : 'NGDC Science Club • 1 New Message',
    body: typeof body?.body === 'string' ? body.body : 'Check your dashboard.',
    icon: '/assets/club-logo.png',
    badge: '/assets/club-logo.png',
    tag: typeof body?.tag === 'string' ? body.tag : `ngdcsc-push-${Date.now()}`,
    url: typeof body?.url === 'string' ? body.url : '/dashboard?open=inbox'
  });

  const expiredEndpoints = new Set<string>();
  const affectedEmails = new Set<string>();
  let sent = 0;

  await Promise.all(
    matchingSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payload,
          { TTL: 604800, urgency: 'high' }
        );
        sent++;
      } catch (err: any) {
        const code = err?.statusCode;
        // Only remove genuinely expired/unsubscribed endpoints (404/410)
        if (code === 404 || code === 410) {
          expiredEndpoints.add(sub.endpoint);
          affectedEmails.add(sub.emailLower);
        } else {
          console.warn(`[web-push] push error HTTP ${code || 'unknown'}:`, err?.body || err?.message);
        }
      }
    })
  );

  if (expiredEndpoints.size > 0) {
    subscriptionStore = subscriptionStore.filter((s) => !expiredEndpoints.has(s.endpoint));
    saveSubscriptionsToDisk();
    await Promise.all(
      Array.from(affectedEmails).map(async (emailLower) => {
        const remaining = matchingSubs.filter(
          (s) => s.emailLower === emailLower && !expiredEndpoints.has(s.endpoint)
        );
        await writeRemoteSubsForEmail(emailLower, remaining, sender.idToken);
      })
    );
  }

  console.log(
    `[web-push] sent ${sent}/${matchingSubs.length} push alerts for ${allowedTargets.join(', ')}`
  );
  res.status(200).json({ sent, targeted: matchingSubs.length });
}
