/**
 * Cloudflare Pages middleware (shadow branch):
 * - Markdown for Agents content negotiation
 * - Inject shadow review overlay + noindex into HTML
 */

import { htmlToMarkdown } from './lib/html-to-markdown.js';

const STATIC_ASSET = /\.(css|js|mjs|md|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|webmanifest|pdf|map|txt|xml)$/i;

const AGENT_LINK_HEADER =
  '</.well-known/api-catalog>; rel="api-catalog", </.well-known/agent-card.json>; rel="service-desc"; type="application/json", </llms.txt>; rel="describedby"; type="text/plain", </auth.md>; rel="service-doc"; type="text/markdown", </sitemap.xml>; rel="sitemap"; type="application/xml"';

const SHADOW_INJECT = `
<link rel="stylesheet" href="/css/shadow-review.css">
<meta name="robots" content="noindex, nofollow, noarchive">
<script src="/js/shadow-review.js" defer></script>
`;

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

function injectShadowReview(html) {
  if (html.includes('shadow-review.js')) return html;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, SHADOW_INJECT + '</head>');
  }
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, SHADOW_INJECT + '</body>');
  }
  return html + SHADOW_INJECT;
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

async function htmlWithShadow(response) {
  const html = await response.text();
  const injected = injectShadowReview(html);
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
      return htmlWithShadow(response);
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
