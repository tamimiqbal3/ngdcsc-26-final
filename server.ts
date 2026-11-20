import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type webPushType from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof webPushType;

const PORT = Number(process.env.PORT || 3000);
const PRESIDENT_EMAIL = 'info.tamimiq@gmail.com';
const SUPER_ADMIN_EMAILS = new Set([
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

interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  emailLower: string;
  uid: string;
  updatedAt: string;
}

interface VapidKeysPair {
  publicKey: string;
  privateKey: string;
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

function saveVapidKeysToDisk(keys: VapidKeysPair) {
  ensureDataDir();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

function loadOrCreateVapidKeys(): VapidKeysPair {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
      privateKey: process.env.VAPID_PRIVATE_KEY.trim()
    };
  }

  ensureDataDir();
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
      if (parsed?.publicKey && parsed?.privateKey) {
        return { publicKey: parsed.publicKey, privateKey: parsed.privateKey };
      }
    }
  } catch {
    // ignore and regenerate
  }

  const generated = webpush.generateVAPIDKeys();
  saveVapidKeysToDisk(generated);
  return generated;
}

let vapidKeys: VapidKeysPair = loadOrCreateVapidKeys();
let canonicalVapidSynced = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

function applyVapidKeys(nextKeys: VapidKeysPair) {
  vapidKeys = nextKeys;
  webpush.setVapidDetails(
    `mailto:${PRESIDENT_EMAIL}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

applyVapidKeys(vapidKeys);

function deriveSealingKey(privateKey: string): Buffer {
  return crypto
    .createHash('sha256')
    .update(`ngdcsc-push-seal-v1:${FIREBASE_PROJECT_ID}:${privateKey}`)
    .digest();
}

function sealSubscriptions(subs: StoredPushSubscription[], privateKey: string): string {
  const key = deriveSealingKey(privateKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(subs);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  });
}

function unsealSubscriptions(blob: string, privateKey: string): StoredPushSubscription[] {
  try {
    const parsed = JSON.parse(blob);
    if (!parsed?.iv || !parsed?.tag || !parsed?.data) return [];
    const key = deriveSealingKey(privateKey);
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
      signal: AbortSignal.timeout(4000)
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
      signal: AbortSignal.timeout(4000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

let vapidSyncInFlight: Promise<void> | null = null;

async function syncCanonicalVapidKeysWithAdminToken(idToken: string): Promise<void> {
  if (canonicalVapidSynced) return;
  if (vapidSyncInFlight) {
    await vapidSyncInFlight;
    return;
  }

  vapidSyncInFlight = (async () => {
    try {
      const existing = await getFirestoreDoc('system_meta/webpush_vapid', idToken);
      const remotePub = existing?.publicKey?.stringValue;
      const remotePriv = existing?.privateKey?.stringValue;
      if (remotePub && remotePriv) {
        if (remotePub !== vapidKeys.publicKey || remotePriv !== vapidKeys.privateKey) {
          const nextKeys = { publicKey: remotePub, privateKey: remotePriv };
          applyVapidKeys(nextKeys);
          saveVapidKeysToDisk(nextKeys);
        }
        canonicalVapidSynced = true;
        return;
      }

      const ok = await patchFirestoreDoc(
        'system_meta/webpush_vapid',
        {
          publicKey: { stringValue: vapidKeys.publicKey },
          privateKey: { stringValue: vapidKeys.privateKey },
          updatedAt: { stringValue: new Date().toISOString() }
        },
        idToken
      );
      if (ok) {
        canonicalVapidSynced = true;
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

  const trimmedSubs = [...subsForUser]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 10);

  const sealed = sealSubscriptions(trimmedSubs, vapidKeys.privateKey);
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
    // ignore
  }
}

async function verifyFirebaseToken(
  authHeader: string | undefined
): Promise<{ uid: string; emailLower: string; idToken: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(4000)
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{ localId?: string; email?: string }>;
    };
    const user = data?.users?.[0];
    if (!user?.localId || !user?.email) return null;
    return {
      uid: user.localId,
      emailLower: user.email.trim().toLowerCase(),
      idToken
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.use(['/sw.js', '/sw-notify.js'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    next();
  });

  app.get('/api/push/public-key', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/sync-keys', async (req, res) => {
    const user = await verifyFirebaseToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (SUPER_ADMIN_EMAILS.has(user.emailLower)) {
      await syncCanonicalVapidKeysWithAdminToken(user.idToken);
    }
    res.json({ ok: true, publicKey: vapidKeys.publicKey });
  });

  app.get('/api/push/status', async (req, res) => {
    const user = await verifyFirebaseToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const remoteForUser = await readRemoteSubsForEmail(user.emailLower, user.idToken);
    const localForUser = subscriptionStore.filter((s) => s.emailLower === user.emailLower);
    const merged = mergeSubscriptionLists(remoteForUser, localForUser);
    res.json({ registered: merged.length > 0, deviceCount: merged.length });
  });

  app.post('/api/push/register', async (req, res) => {
    const user = await verifyFirebaseToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (SUPER_ADMIN_EMAILS.has(user.emailLower)) {
      await syncCanonicalVapidKeysWithAdminToken(user.idToken);
    }

    const sub = req.body?.subscription;
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

    const remoteForUser = await readRemoteSubsForEmail(user.emailLower, user.idToken);
    const mergedForUser = mergeSubscriptionLists(
      remoteForUser,
      subscriptionStore.filter((s) => s.emailLower === user.emailLower),
      [record]
    ).filter((s) => s.emailLower === user.emailLower);

    subscriptionStore = mergeSubscriptionLists(subscriptionStore, mergedForUser);
    saveSubscriptionsToDisk();
    await writeRemoteSubsForEmail(user.emailLower, mergedForUser, user.idToken);

    console.log(`[web-push] registered device for ${user.emailLower} (${mergedForUser.length} active)`);
    res.json({ ok: true, publicKey: vapidKeys.publicKey, deviceCount: mergedForUser.length });
  });

  app.post('/api/push/unregister', async (req, res) => {
    const user = await verifyFirebaseToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const endpoint = req.body?.endpoint;
    if (typeof endpoint === 'string' && endpoint) {
      subscriptionStore = subscriptionStore.filter(
        (s) => !(s.endpoint === endpoint && (s.uid === user.uid || s.emailLower === user.emailLower))
      );
      saveSubscriptionsToDisk();

      const remoteForUser = await readRemoteSubsForEmail(user.emailLower, user.idToken);
      const filteredRemote = mergeSubscriptionLists(
        remoteForUser,
        subscriptionStore.filter((s) => s.emailLower === user.emailLower)
      ).filter((s) => s.emailLower === user.emailLower && s.endpoint !== endpoint);
      await writeRemoteSubsForEmail(user.emailLower, filteredRemote, user.idToken);
    }
    res.json({ ok: true });
  });

  app.post('/api/push/send', async (req, res) => {
    const sender = await verifyFirebaseToken(req.headers.authorization);
    if (!sender) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (SUPER_ADMIN_EMAILS.has(sender.emailLower)) {
      await syncCanonicalVapidKeysWithAdminToken(sender.idToken);
    }

    const senderIsPresident = sender.emailLower === PRESIDENT_EMAIL;
    const rawTargets: unknown = req.body?.targetEmails;
    const targetEmails: string[] = Array.isArray(rawTargets)
      ? rawTargets
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
          .map((e) => e.trim().toLowerCase())
      : [];

    const allowedTargets = senderIsPresident
      ? Array.from(new Set(targetEmails))
      : [PRESIDENT_EMAIL];

    if (allowedTargets.length === 0) {
      res.json({ sent: 0 });
      return;
    }

    const remoteLists = await Promise.all(
      allowedTargets.map((email) => readRemoteSubsForEmail(email, sender.idToken))
    );

    const targetSet = new Set(allowedTargets);
    const localMatching = subscriptionStore.filter(
      (s) =>
        targetSet.has(s.emailLower) ||
        (senderIsPresident &&
          typeof req.body?.targetUid === 'string' &&
          s.uid === req.body.targetUid)
    );

    const matchingSubs = mergeSubscriptionLists(localMatching, ...remoteLists);

    if (matchingSubs.length === 0) {
      res.json({ sent: 0 });
      return;
    }

    const payload = JSON.stringify({
      title: typeof req.body?.title === 'string' ? req.body.title : 'NGDC Science Club • 1 New Message',
      body: typeof req.body?.body === 'string' ? req.body.body : 'Check your dashboard.',
      icon: '/assets/club-logo.png',
      badge: '/assets/club-logo.png',
      tag: typeof req.body?.tag === 'string' ? req.body.tag : `ngdcsc-push-${Date.now()}`,
      url: typeof req.body?.url === 'string' ? req.body.url : '/dashboard?open=inbox'
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
          if (code === 404 || code === 410 || code === 403) {
            expiredEndpoints.add(sub.endpoint);
            affectedEmails.add(sub.emailLower);
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

    res.json({ sent, targeted: matchingSubs.length });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
