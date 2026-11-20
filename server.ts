import express from 'express';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type webPushType from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof webPushType;

const PORT = Number(process.env.PORT || 3000);
const PRESIDENT_EMAIL = 'info.tamimiq@gmail.com';
const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY || 'AIzaSyC-J4YtNcvqUQYUA9WgFckP7pQC9KtDNMo';

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

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

function loadOrCreateVapidKeys(): { publicKey: string; privateKey: string } {
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
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(generated, null, 2), 'utf8');
  } catch {
    // ignore
  }
  return generated;
}

const vapidKeys = loadOrCreateVapidKeys();
webpush.setVapidDetails(
  `mailto:${PRESIDENT_EMAIL}`,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

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
): Promise<{ uid: string; emailLower: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
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
      emailLower: user.email.trim().toLowerCase()
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/push/public-key', (_req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/register', async (req, res) => {
    const user = await verifyFirebaseToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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

    const idx = subscriptionStore.findIndex((s) => s.endpoint === record.endpoint);
    if (idx >= 0) {
      subscriptionStore[idx] = record;
    } else {
      subscriptionStore.push(record);
    }
    saveSubscriptionsToDisk();
    res.json({ ok: true });
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
        (s) => !(s.endpoint === endpoint && s.uid === user.uid)
      );
      saveSubscriptionsToDisk();
    }
    res.json({ ok: true });
  });

  app.post('/api/push/send', async (req, res) => {
    const sender = await verifyFirebaseToken(req.headers.authorization);
    if (!sender) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const senderIsPresident = sender.emailLower === PRESIDENT_EMAIL;
    const rawTargets: unknown = req.body?.targetEmails;
    const targetEmails: string[] = Array.isArray(rawTargets)
      ? rawTargets
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
          .map((e) => e.trim().toLowerCase())
      : [];

    const allowedTargets = senderIsPresident
      ? targetEmails
      : [PRESIDENT_EMAIL];

    if (allowedTargets.length === 0) {
      res.json({ sent: 0 });
      return;
    }

    const targetSet = new Set(allowedTargets);
    const matchingSubs = subscriptionStore.filter(
      (s) =>
        targetSet.has(s.emailLower) ||
        (senderIsPresident &&
          typeof req.body?.targetUid === 'string' &&
          s.uid === req.body.targetUid)
    );

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
            { TTL: 86400, urgency: 'high' }
          );
          sent++;
        } catch (err: any) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) {
            expiredEndpoints.add(sub.endpoint);
          }
        }
      })
    );

    if (expiredEndpoints.size > 0) {
      subscriptionStore = subscriptionStore.filter((s) => !expiredEndpoints.has(s.endpoint));
      saveSubscriptionsToDisk();
    }

    res.json({ sent });
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
