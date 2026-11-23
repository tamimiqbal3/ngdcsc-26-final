import {
  buildRouteSeoMetadata,
  buildStructuredDataJsonLd,
  type SeoRouteKey
} from '../src/utils/seoData.ts';
import type { ClubNotice } from '../src/types.ts';

interface HeaderMap {
  [key: string]: string | string[] | undefined;
}

export interface SeoRequestLike {
  method?: string;
  headers?: HeaderMap;
}

export interface SeoResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => SeoResponseLike;
  send?: (body: string) => void;
  end?: (body?: string) => void;
}

function getSingleHeader(headers: HeaderMap | undefined, name: string): string {
  if (!headers) return '';
  const val = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(val)) return String(val[0] || '').trim();
  return val ? String(val).split(',')[0].trim() : '';
}

function resolveOrigin(req: SeoRequestLike): string {
  const host =
    getSingleHeader(req.headers, 'x-forwarded-host') ||
    getSingleHeader(req.headers, 'host') ||
    'ngdcsc.vercel.app';
  const rawProto = getSingleHeader(req.headers, 'x-forwarded-proto');
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = rawProto || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sendTextResponse(
  res: SeoResponseLike,
  statusCode: number,
  contentType: string,
  body: string
) {
  res.setHeader('Content-Type', contentType);
  const target = res.status(statusCode);
  if (typeof target.send === 'function') {
    target.send(body);
  } else if (typeof target.end === 'function') {
    target.end(body);
  }
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

async function fetchPublicNoticeEntries(origin: string): Promise<SitemapEntry[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const resp = await fetch(
      'https://firestore.googleapis.com/v1/projects/ngdcsc-a8228/databases/(default)/documents/notices?pageSize=100',
      { signal: controller.signal }
    );
    if (!resp.ok) return [];
    const data: any = await resp.json();
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    const entries: SitemapEntry[] = [];
    for (const d of docs) {
      const fields = d?.fields || {};
      const id =
        fields?.id?.stringValue ||
        (typeof d?.name === 'string' ? d.name.split('/').pop() : '');
      if (!id) continue;
      const dateStr = fields?.date?.stringValue;
      const validDate =
        dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : undefined;
      entries.push({
        loc: `${origin}/notices?id=${encodeURIComponent(id)}`,
        lastmod: validDate,
        changefreq: 'weekly',
        priority: '0.7'
      });
    }
    return entries;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function handleSitemap(req: SeoRequestLike, res: SeoResponseLike) {
  const origin = resolveOrigin(req);
  const today = new Date().toISOString().split('T')[0];

  const staticEntries: SitemapEntry[] = [
    { loc: `${origin}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${origin}/notices`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${origin}/committee`, lastmod: today, changefreq: 'monthly', priority: '0.8' },
    { loc: `${origin}/status`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${origin}/form`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${origin}/login`, lastmod: today, changefreq: 'monthly', priority: '0.6' }
  ];

  const noticeEntries = await fetchPublicNoticeEntries(origin);
  const allEntries = [...staticEntries, ...noticeEntries];

  const urlBlocks = allEntries
    .map((item) => {
      const lastmodLine = item.lastmod
        ? `\n    <lastmod>${escapeXml(item.lastmod)}</lastmod>`
        : '';
      return `  <url>\n    <loc>${escapeXml(item.loc)}</loc>${lastmodLine}\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlBlocks}\n</urlset>\n`;

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  sendTextResponse(res, 200, 'application/xml; charset=utf-8', xml);
}

export async function handleRobots(req: SeoRequestLike, res: SeoResponseLike) {
  const origin = resolveOrigin(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    ''
  ].join('\n');

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  sendTextResponse(res, 200, 'text/plain; charset=utf-8', body);
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveRouteFromRequestPath(rawPath: string, noticeId: string | null): SeoRouteKey {
  const clean = rawPath.toLowerCase().replace(/\/+$/, '');
  if (clean === '/admin' || clean.endsWith('/admin')) return 'admin';
  if (clean === '/login' || clean.endsWith('/login')) return 'login';
  if (clean === '/dashboard' || clean === '/my-dashboard' || clean.endsWith('/dashboard')) return 'dashboard';
  if (clean === '/notices' || clean.endsWith('/notices')) return noticeId ? 'notice_detail' : 'notices';
  if (clean === '/committee' || clean.endsWith('/committee')) return 'committee';
  if (clean === '/status' || clean.endsWith('/status')) return 'status';
  if (clean === '/slip' || clean.endsWith('/slip')) return 'slip';
  if (clean === '/form' || clean === '/register' || clean === '/signup' || clean.endsWith('/form') || clean.endsWith('/register')) return 'form';
  if (clean === '' || clean === '/' || clean === '/index.html') return 'home';
  return '404';
}

async function fetchSingleNoticeForSeo(noticeId: string): Promise<ClubNotice | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1200);
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/ngdcsc-a8228/databases/(default)/documents/notices/${encodeURIComponent(noticeId)}`,
      { signal: controller.signal }
    );
    if (!resp.ok) return null;
    const doc: any = await resp.json();
    const f = doc?.fields;
    if (!f) return null;
    return {
      id: f?.id?.stringValue || noticeId,
      title: f?.title?.stringValue || 'Official Notice',
      date: f?.date?.stringValue || '',
      category: (f?.category?.stringValue as any) || 'Notice',
      content: f?.content?.stringValue || '',
      fileName: f?.fileName?.stringValue || null,
      publishedBy: f?.publishedBy?.stringValue || 'Executive Committee'
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function injectRouteSeoIntoHtml(
  html: string,
  reqUrl: string,
  headers?: HeaderMap
): Promise<string> {
  const origin = resolveOrigin({ headers });
  let pathname = '/';
  let noticeId: string | null = null;
  try {
    const parsed = new URL(reqUrl || '/', origin);
    pathname = parsed.pathname;
    noticeId = parsed.searchParams.get('id');
  } catch {
    pathname = '/';
  }

  const route = resolveRouteFromRequestPath(pathname, noticeId);
  const activeNotice =
    route === 'notice_detail' && noticeId
      ? await fetchSingleNoticeForSeo(noticeId)
      : null;

  const meta = buildRouteSeoMetadata(route, activeNotice);
  const fullUrl = `${origin}${meta.canonicalPath}`;
  const imageUrl = `${origin}/assets/club-logo.png`;
  const jsonLd = JSON.stringify(
    buildStructuredDataJsonLd(meta, origin, route, activeNotice)
  ).replace(/</g, '\\u003c');

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(meta.title)}</title>`);
  out = out.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtmlAttr(meta.description)}" />`
  );
  out = out.replace(
    /<meta\s+name="keywords"[^>]*>/i,
    `<meta name="keywords" content="${escapeHtmlAttr(meta.keywords.join(', '))}" />`
  );
  out = out.replace(
    /<meta\s+name="robots"[^>]*>/i,
    `<meta name="robots" content="${escapeHtmlAttr(meta.robots)}" />`
  );
  out = out.replace(
    /<meta\s+name="googlebot"[^>]*>/i,
    `<meta name="googlebot" content="${escapeHtmlAttr(meta.robots)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:type"[^>]*>/i,
    `<meta property="og:type" content="${escapeHtmlAttr(meta.ogType)}" />`
  );
  out = out.replace(
    /<meta\s+property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${escapeHtmlAttr(imageUrl)}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtmlAttr(meta.title)}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtmlAttr(meta.description)}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${escapeHtmlAttr(imageUrl)}" />`
  );
  out = out.replace(
    /<script\s+id="ngdcsc-route-jsonld"[^>]*>[\s\S]*?<\/script>/i,
    `<script id="ngdcsc-route-jsonld" type="application/ld+json">${jsonLd}</script>`
  );

  const canonicalAndOgUrl = `<link rel="canonical" href="${escapeHtmlAttr(fullUrl)}" />\n    <meta property="og:url" content="${escapeHtmlAttr(fullUrl)}" />`;
  out = out.replace('</head>', `    ${canonicalAndOgUrl}\n  </head>`);
  return out;
}
