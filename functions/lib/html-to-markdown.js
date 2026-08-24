/**
 * Lightweight HTML-to-Markdown for TWA static pages.
 * Extracts #main-content and converts common semantic elements.
 */

const ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '\u2019',
  lsquo: '\u2018',
  rdquo: '\u201D',
  ldquo: '\u201C',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
};

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITY_MAP[name.toLowerCase()] ?? match);
}

function stripTags(text) {
  return decodeEntities(text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

function resolveUrl(href, baseUrl) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href;
  }
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

function inlineHtmlToMarkdown(html, baseUrl) {
  let text = html;

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
    const linkText = stripTags(label);
    const url = resolveUrl(href, baseUrl);
    return linkText ? `[${linkText}](${url})` : url;
  });

  text = text.replace(/<[^>]+>/g, '');
  return decodeEntities(text).replace(/\s+\n/g, '\n').trim();
}

function listToMarkdown(html, ordered, baseUrl) {
  const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) =>
    inlineHtmlToMarkdown(match[1], baseUrl),
  );
  if (!items.length) return '';
  return items
    .map((item, index) => (ordered ? `${index + 1}. ${item}` : `- ${item}`))
    .join('\n');
}

function blockHtmlToMarkdown(html, baseUrl) {
  let text = html;

  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<(nav|header|footer|button|form)[\s\S]*?<\/\1>/gi, '');

  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
    const hashes = '#'.repeat(Number(level));
    return `\n\n${hashes} ${inlineHtmlToMarkdown(content, baseUrl)}\n\n`;
  });

  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => `\n\n${listToMarkdown(inner, false, baseUrl)}\n\n`);
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => `\n\n${listToMarkdown(inner, true, baseUrl)}\n\n`);

  text = text.replace(/<(p|div|span|section|article|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, content) => {
    const line = inlineHtmlToMarkdown(content, baseUrl);
    return line ? `\n\n${line}\n\n` : '';
  });

  text = inlineHtmlToMarkdown(text, baseUrl);
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function htmlToMarkdown(html, pageUrl) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const mainMatch =
    html.match(/<main[^>]*id=["']main-content["'][^>]*>([\s\S]*?)<\/main>/i) ||
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

  const title = titleMatch ? stripTags(titleMatch[1]) : '';
  const description = descriptionMatch ? decodeEntities(descriptionMatch[1]) : '';
  const body = mainMatch ? blockHtmlToMarkdown(mainMatch[1], pageUrl) : blockHtmlToMarkdown(html, pageUrl);

  const parts = [];
  if (title) parts.push(`# ${title}`);
  if (description) parts.push(`> ${description}`);
  if (pageUrl) parts.push(`Source: ${pageUrl}`);
  if (body) parts.push(body);

  return parts.join('\n\n').trim() + '\n';
}
