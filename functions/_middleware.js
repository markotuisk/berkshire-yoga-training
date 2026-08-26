/**
 * Cloudflare Pages middleware (shadow branch):
 * - Markdown for Agents content negotiation
 * - Inject shadow review overlay + noindex into HTML
 */

import { htmlToMarkdown } from './lib/html-to-markdown.js';

const STATIC_ASSET = /\.(css|js|mjs|md|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|webmanifest|pdf|map|txt|xml)$/i;

const AGENT_LINK_HEADER =
  '</.well-known/api-catalog>; rel="api-catalog", </.well-known/agent-card.json>; rel="service-desc"; type="application/json", </llms.txt>; rel="describedby"; type="text/plain", </auth.md>; rel="service-doc"; type="text/markdown", </sitemap.xml>; rel="sitemap"; type="application/xml"';

/** Keep in sync with js/shadow-changelog.js — busts browser cache on deploy */
const SHADOW_ASSET_VERSION = '1.11.0';

const SHADOW_STYLE_SCRIPT = `
<link rel="stylesheet" href="/css/shadow-review.css?v=${SHADOW_ASSET_VERSION}">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#E8612E">
<script src="/js/shadow-changelog.js?v=${SHADOW_ASSET_VERSION}" defer></script>
<script src="/js/shadow-seo.js?v=${SHADOW_ASSET_VERSION}" defer></script>
<script src="/js/shadow-design.js?v=${SHADOW_ASSET_VERSION}" defer></script>
<script src="/js/shadow-review.js?v=${SHADOW_ASSET_VERSION}" defer></script>
`;

const OG_IMAGE = 'https://berkshireyogatraining.co.uk/assets/og-image.jpg';

/**
 * Access gate link previews — shown to social crawlers (WhatsApp, iMessage, Slack)
 * that hit the hostname before partners log in. Distinct from the in-site Shadow mode OG.
 * Requires an Access Bypass policy for those bots (see docs/SHADOW-REVIEW.md).
 */
const SHADOW_ACCESS_OG = {
  title: 'Thames Wellness Academy · Shadow Access',
  description:
    'Private partner login for the TWA Shadow review site. One-time email code. For Katia, Raili and Marko only. Not the public Academy site.',
  siteName: 'Thames Wellness Academy · Shadow Access',
  image: OG_IMAGE,
  imageAlt: 'Thames Wellness Academy: Shadow Access',
  twitterTitle: 'Thames Wellness Academy · Shadow Access',
  twitterDescription:
    'Secure Access login for the TWA Shadow review. Partners only.'
};

/** In-site Shadow mode previews (after Access login / normal HTML pages) */
const SHADOW_SITE_OG = {
  title: 'Thames Wellness Academy · Shadow mode',
  description:
    'A calm private Shadow mode room to refine the Academy site together. Flag copy, images and details before anything goes live. For Katia, Raili and Marko only.',
  siteName: 'Thames Wellness Academy',
  image: OG_IMAGE,
  imageAlt: 'Thames Wellness Academy: Shadow mode',
  twitterTitle: 'Thames Wellness Academy · Shadow mode',
  twitterDescription:
    'Shadow mode for Thames Wellness Academy partners. Comment on any detail. The public site stays untouched.'
};

/** Social / messaging crawlers used for link unfurls (not search indexing). */
function isLinkPreviewCrawler(userAgent) {
  if (!userAgent) return false;
  return /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Slack-ImgProxy|Discordbot|TelegramBot|WhatsApp|SkypeUriPreview|Viber|Pinterest|redditbot|Applebot|iMessage|Google-PageRenderer|Embedly|Quora Link Preview|BitlyBot|Tumblr/i.test(
    userAgent
  );
}

function prefersMarkdown(accept) {
  return !!accept && /\btext\/markdown\b/i.test(accept);
}

function isHtmlPagePath(pathname) {
  if (pathname.startsWith('/api/')) return false;
  if (pathname === '/' || pathname === '/index.html') return true;
  if (/\.html$/i.test(pathname)) return true;

  const excludedPrefixes = ['/assets/', '/css/', '/js/'];
  if (excludedPrefixes.some((prefix) => pathname.startsWith(prefix))) return false;

  if (pathname.endsWith('/')) return true;

  const lastSegment = pathname.split('/').pop();
  if (lastSegment && !/\.[a-z0-9]+$/i.test(lastSegment)) return true;

  return false;
}

function estimateTokens(text) {
  return String(Math.ceil(text.length / 4));
}

function applyAgentLinkHeaders(headers) {
  headers.set('Link', AGENT_LINK_HEADER);
}

function upsertMeta(html, attr, key, content) {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*>`,
    'i'
  );
  const tag =
    attr === 'name'
      ? `<meta name="${key}" content="${content}">`
      : `<meta property="${key}" content="${content}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function applyShadowOpenGraph(html, pageUrl, og) {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${og.title}</title>`);
  const pairs = [
    ['name', 'description', og.description],
    ['property', 'og:title', og.title],
    ['property', 'og:description', og.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:locale', 'en_GB'],
    ['property', 'og:site_name', og.siteName],
    ['property', 'og:url', pageUrl],
    ['property', 'og:image', og.image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', og.imageAlt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', og.twitterTitle],
    ['name', 'twitter:description', og.twitterDescription],
    ['name', 'twitter:image', og.image]
  ];
  for (const [attr, key, content] of pairs) {
    out = upsertMeta(out, attr, key, content.replace(/"/g, '&quot;'));
  }
  return out;
}

function injectShadowReview(html, pageUrl, { accessPreview = false } = {}) {
  const og = accessPreview ? SHADOW_ACCESS_OG : SHADOW_SITE_OG;
  let out = applyShadowOpenGraph(html, pageUrl, og);
  // Crawlers only need meta for unfurls — skip the review overlay UI
  if (accessPreview) return out;
  if (!out.includes('shadow-review.js')) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, SHADOW_STYLE_SCRIPT + '</head>');
    } else if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, SHADOW_STYLE_SCRIPT + '</body>');
    } else {
      out += SHADOW_STYLE_SCRIPT;
    }
  }
  return out;
}

function markdownResponse(body, sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  headers.set('Vary', 'Accept');
  applyAgentLinkHeaders(headers);
  headers.set('x-markdown-tokens', estimateTokens(body));
  headers.set('Content-Signal', 'ai-train=yes, search=yes, ai-input=yes');
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  return new Response(body, { status: 200, headers });
}

async function htmlWithShadow(response, pageUrl, opts) {
  const html = await response.text();
  const injected = injectShadowReview(html, pageUrl, opts);
  const headers = new Headers(response.headers);
  applyAgentLinkHeaders(headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.delete('Content-Length');
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const { pathname } = url;
  const accept = request.headers.get('Accept') || '';
  const accessPreview = isLinkPreviewCrawler(request.headers.get('User-Agent') || '');

  if (pathname.startsWith('/api/')) {
    return next();
  }

  if (!['GET', 'HEAD'].includes(request.method) || !prefersMarkdown(accept)) {
    const response = await next();
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && /text\/html/i.test(contentType) && isHtmlPagePath(pathname)) {
      return htmlWithShadow(response, url.origin + pathname, { accessPreview });
    }
    return response;
  }

  if (STATIC_ASSET.test(pathname) || pathname.startsWith('/.well-known/')) {
    return next();
  }

  if (!isHtmlPagePath(pathname)) {
    return next();
  }

  const htmlHeaders = new Headers(request.headers);
  htmlHeaders.set('Accept', 'text/html,*/*');
  const htmlRequest = new Request(request.url, { method: 'GET', headers: htmlHeaders });
  const response = await next(htmlRequest);
  if (!response.ok) {
    return response;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!/text\/html/i.test(contentType)) {
    return response;
  }

  const html = await response.text();
  const markdown = htmlToMarkdown(html, url.href);
  if (request.method === 'HEAD') {
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'text/markdown; charset=utf-8');
    headers.set('Vary', 'Accept');
    applyAgentLinkHeaders(headers);
    headers.set('x-markdown-tokens', estimateTokens(markdown));
    headers.set('Content-Signal', 'ai-train=yes, search=yes, ai-input=yes');
    headers.delete('Content-Encoding');
    headers.delete('Content-Length');
    headers.delete('ETag');
    headers.delete('Last-Modified');
    return new Response(null, { status: 200, headers });
  }
  return markdownResponse(markdown, response.headers);
}
