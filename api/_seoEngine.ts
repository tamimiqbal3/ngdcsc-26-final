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
