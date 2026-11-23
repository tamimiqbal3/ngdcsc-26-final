import type { ClubNotice } from '../types';
import {
  buildRouteSeoMetadata,
  buildStructuredDataJsonLd,
  type SeoRouteKey
} from './seoData';

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLinkTag(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function applyRouteSeo(route: SeoRouteKey, activeNotice?: ClubNotice | null) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const origin = window.location.origin;
  const meta = buildRouteSeoMetadata(route, activeNotice);
  const fullUrl = `${origin}${meta.canonicalPath}`;
  const imageUrl = `${origin}/assets/club-logo.png`;

  // Preserve unread count prefix if InboxToastNotification added one
  const prefixMatch = document.title.match(/^(\(\d+\)\s*)/);
  const unreadPrefix = prefixMatch ? prefixMatch[1] : '';
  document.title = `${unreadPrefix}${meta.title}`;

  upsertMetaTag('name', 'description', meta.description);
  upsertMetaTag('name', 'keywords', meta.keywords.join(', '));
  upsertMetaTag('name', 'robots', meta.robots);
  upsertMetaTag('name', 'googlebot', meta.robots);
  upsertMetaTag('name', 'application-name', 'NGDC SCIENCE CLUB');
  upsertMetaTag('name', 'apple-mobile-web-app-title', 'NGDC SCIENCE CLUB');

  upsertMetaTag('property', 'og:site_name', 'NGDC SCIENCE CLUB');
  upsertMetaTag('property', 'og:type', meta.ogType);
  upsertMetaTag('property', 'og:title', meta.title);
  upsertMetaTag('property', 'og:description', meta.description);
  upsertMetaTag('property', 'og:url', fullUrl);
  upsertMetaTag('property', 'og:image', imageUrl);
  upsertMetaTag('property', 'og:locale', 'en_US');
  upsertMetaTag('property', 'og:locale:alternate', 'bn_BD');

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', meta.title);
  upsertMetaTag('name', 'twitter:description', meta.description);
  upsertMetaTag('name', 'twitter:image', imageUrl);

  upsertLinkTag('canonical', fullUrl);

  const jsonLd = buildStructuredDataJsonLd(meta, origin, route, activeNotice);
  let scriptEl = document.head.querySelector<HTMLScriptElement>(
    'script#ngdcsc-route-jsonld[type="application/ld+json"]'
  );
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'ngdcsc-route-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(jsonLd);
}
