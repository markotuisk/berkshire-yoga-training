/**
 * Cloudflare Pages middleware: Markdown for Agents content negotiation.
 * GET requests with Accept: text/markdown receive text/markdown for HTML pages.
 */

import { htmlToMarkdown } from './lib/html-to-markdown.js';

const STATIC_ASSET = /\.(css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|webmanifest|pdf|map|txt|xml)$/i;

function prefersMarkdown(accept) {
  return !!accept && /\btext\/markdown\b/i.test(accept);
}

function isHtmlPagePath(pathname) {
  if (pathname === '/' || pathname === '/index.html') return true;
  if (/\.html$/i.test(pathname)) return true;
  if (pathname.endsWith('/') && !pathname.startsWith('/assets/') && !pathname.startsWith('/css/') && !pathname.startsWith('/js/')) {
    return true;
  }
  return false;
}

function estimateTokens(text) {
  return String(Math.ceil(text.length / 4));
}

function markdownResponse(body, sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  headers.set('Vary', 'Accept');
  headers.set('x-markdown-tokens', estimateTokens(body));
  headers.set('Content-Signal', 'ai-train=yes, search=yes, ai-input=yes');
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  return new Response(body, { status: 200, headers });
}

export async function onRequest(context) {
  const { request, next } = context;
  const accept = request.headers.get('Accept') || '';

  if (!['GET', 'HEAD'].includes(request.method) || !prefersMarkdown(accept)) {
    return next();
  }

  const url = new URL(request.url);
  const { pathname } = url;

  if (STATIC_ASSET.test(pathname) || pathname.startsWith('/.well-known/')) {
    return next();
  }

  if (!isHtmlPagePath(pathname)) {
    return next();
  }

  const response = await next();
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
