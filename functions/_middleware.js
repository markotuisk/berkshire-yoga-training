/**
 * Cloudflare Pages middleware (shadow branch):
 * - Markdown for Agents content negotiation
 * - Inject shadow review overlay + noindex into HTML
 */

import { htmlToMarkdown } from './lib/html-to-markdown.js';

const STATIC_ASSET = /\.(css|js|mjs|md|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|webmanifest|pdf|map|txt|xml)$/i;

const AGENT_LINK_HEADER =
  '</.well-known/api-catalog>; rel="api-catalog", </.well-known/agent-card.json>; rel="service-desc"; type="application/json", </llms.txt>; rel="describedby"; type="text/plain", </auth.md>; rel="service-doc"; type="text/markdown", </sitemap.xml>; rel="sitemap"; type="application/xml"';

const SHADOW_STYLE_SCRIPT = `
<link rel="stylesheet" href="/css/shadow-review.css">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#E8612E">
<script src="/js/shadow-review.js" defer></script>
`;

/** Private review link previews (WhatsApp, iMessage, Slack) */
const SHADOW_OG = {
  title: 'Thames Wellness Academy · Private review',
  description:
    'A calm, private room to refine the Academy site together. Flag copy, images and details before anything goes live. For Katia, Raili and Marko only.',
  siteName: 'Thames Wellness Academy',
  image: 'https://berkshireyogatraining.co.uk/assets/og-image.jpg',
  imageAlt: 'Thames Wellness Academy: private partner review',
  twitterTitle: 'Thames Wellness Academy · Private review',
  twitterDescription:
    'Private partner review for Thames Wellness Academy. Comment on any detail. The public site stays untouched.'
};

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

function applyShadowOpenGraph(html, pageUrl) {
  let out = html;
  out = out.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${SHADOW_OG.title}</title>`
  );
  const pairs = [
    ['name', 'description', SHADOW_OG.description],
    ['property', 'og:title', SHADOW_OG.title],
    ['property', 'og:description', SHADOW_OG.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:locale', 'en_GB'],
    ['property', 'og:site_name', SHADOW_OG.siteName],
    ['property', 'og:url', pageUrl],
    ['property', 'og:image', SHADOW_OG.image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', SHADOW_OG.imageAlt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', SHADOW_OG.twitterTitle],
    ['name', 'twitter:description', SHADOW_OG.twitterDescription],
    ['name', 'twitter:image', SHADOW_OG.image]
  ];
  for (const [attr, key, content] of pairs) {
    out = upsertMeta(out, attr, key, content.replace(/"/g, '&quot;'));
  }
  return out;
}

function injectShadowReview(html, pageUrl) {
  let out = applyShadowOpenGraph(html, pageUrl);
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

async function htmlWithShadow(response, pageUrl) {
  const html = await response.text();
  const injected = injectShadowReview(html, pageUrl);
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

  if (pathname.startsWith('/api/')) {
    return next();
  }

  if (!['GET', 'HEAD'].includes(request.method) || !prefersMarkdown(accept)) {
    const response = await next();
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && /text\/html/i.test(contentType) && isHtmlPagePath(pathname)) {
      return htmlWithShadow(response, url.origin + pathname);
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
