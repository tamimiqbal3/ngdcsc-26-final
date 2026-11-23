import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  handlePublicKey,
  handleRegister,
  handleSend,
  handleStatus,
  handleSyncKeys,
  handleUnregister
} from './api/_pushEngine.ts';
import { handleRobots, handleSitemap, injectRouteSeoIntoHtml } from './api/_seoEngine.ts';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.use(['/sw.js', '/sw-notify.js', '/firebase-messaging-sw.js'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    next();
  });

  app.get('/sitemap.xml', (req, res) => {
    void handleSitemap(req, res).catch((err: any) => {
      res.status(500).send(err?.message || 'Failed to generate sitemap');
    });
  });

  app.get('/robots.txt', (req, res) => {
    void handleRobots(req, res).catch((err: any) => {
      res.status(500).send(err?.message || 'Failed to generate robots.txt');
    });
  });

  app.get('/api/push/public-key', (req, res) => {
    void handlePublicKey(req, res).catch((err: any) => {
      res.status(500).json({ error: err?.message || 'Internal error' });
    });
  });

  app.post('/api/push/sync-keys', (req, res) => {
    void handleSyncKeys(req, res).catch((err: any) => {
      res.status(500).json({ error: err?.message || 'Internal error' });
    });
  });

  app.get('/api/push/status', (req, res) => {
    void handleStatus(req, res).catch((err: any) => {
      res.status(500).json({ error: err?.message || 'Internal error' });
    });
  });

  app.post('/api/push/register', (req, res) => {
    void handleRegister(req, res).catch((err: any) => {
      res.status(500).json({ error: err?.message || 'Internal error' });
    });
  });

  app.post('/api/push/unregister', (req, res) => {
    void handleUnregister(req, res).catch((err: any) => {
      res.status(500).json({ error: err?.message || 'Internal error' });
    });
  });

  app.post('/api/push/send', (req, res) => {
    void handleSend(req, res).catch((err: any) => {
      res.status(500).json({ error: err?.message || 'Internal error' });
    });
  });

  app.use('/api', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ error: 'API route not found' });
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
    const indexHtmlPath = path.join(distDir, 'index.html');
    const cachedTemplate = fs.existsSync(indexHtmlPath)
      ? fs.readFileSync(indexHtmlPath, 'utf-8')
      : '';
    app.use(express.static(distDir, { index: false }));
    app.get('/{*splat}', async (req, res) => {
      try {
        const template = cachedTemplate || fs.readFileSync(indexHtmlPath, 'utf-8');
        const seoHtml = await injectRouteSeoIntoHtml(template, req.originalUrl || req.url, req.headers);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(seoHtml);
      } catch {
        res.sendFile(indexHtmlPath);
      }
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
