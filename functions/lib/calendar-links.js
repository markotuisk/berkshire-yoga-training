/**
 * Calendar and QR helpers for branded emails.
 */

import { ACADEMY_CONTACTS, SITE_URL } from './course-catalog.js';

/**
 * @param {string} date YYYY-MM-DD
 * @param {string} time HH:MM local UK
 */
export function toGoogleUtcStamp(date, time) {
  // Treat as Europe/London wall time approximated as Z for Google template when no TZ API;
  // prefer floating local form in ICS with TZID Europe/London.
  const [y, m, d] = String(date).split('-').map(Number);
  const [hh, mm] = String(time || '09:30').split(':').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

/**
 * @param {{ title: string, startDate: string, endDate?: string, startTime?: string, endTime?: string, description?: string, location?: string, url?: string }} event
 */
/** Prefer same-day end for multi-month cohorts (calendar = first session day). */
function calendarEndDate(event) {
  if (!event.startDate) return '';
  if (!event.endDate || event.endDate === event.startDate) return event.startDate;
  // If end is more than 14 days after start, treat as programme window: calendar first day only
  try {
    const a = new Date(event.startDate + 'T00:00:00Z').getTime();
    const b = new Date(event.endDate + 'T00:00:00Z').getTime();
    if (b - a > 14 * 86400000) return event.startDate;
  } catch {
    /* ignore */
  }
  return event.endDate;
}

export function googleCalendarUrl(event) {
  if (!event.startDate) return '';
  const start = toGoogleUtcStamp(event.startDate, event.startTime || '09:30');
  const endDate = calendarEndDate(event);
  const end = toGoogleUtcStamp(endDate, event.endTime || '17:00');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Thames Wellness Academy',
    dates: `${start}/${end}`,
    details: event.description || '',
    location: event.location || '',
    ctz: 'Europe/London'
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Absolute ICS download URL on our site (works for Apple Calendar / many Android apps).
 * @param {{ slug?: string, startDate?: string, title?: string }} event
 */
export function icsDownloadUrl(event) {
  const u = new URL(`${SITE_URL}/api/calendar/course`);
  if (event.slug) u.searchParams.set('slug', event.slug);
  if (event.startDate) u.searchParams.set('start', event.startDate);
  if (event.title) u.searchParams.set('title', event.title);
  return u.toString();
}

/**
 * Apple Calendar prefers webcal or direct .ics https link.
 * @param {string} icsUrl
 */
export function appleCalendarUrl(icsUrl) {
  return icsUrl.replace(/^https:/i, 'webcal:');
}

/**
 * QR image URL (HTTPS) encoding arbitrary text/URL.
 * @param {string} data
 * @param {number} [size]
 */
export function qrImageUrl(data, size = 140) {
  const q = new URL('https://api.qrserver.com/v1/create-qr-code/');
  q.searchParams.set('size', `${size}x${size}`);
  q.searchParams.set('margin', '8');
  q.searchParams.set('data', data);
  return q.toString();
}

/** Public vCard URL for academy contact QR. */
export function academyVcardUrl() {
  return `${SITE_URL}/api/contacts/academy`;
}

/**
 * Build ICS body (Europe/London floating times).
 * @param {{ title: string, startDate: string, endDate?: string, startTime?: string, endTime?: string, description?: string, location?: string, url?: string, slug?: string }} event
 */
export function buildIcs(event) {
  const stamp = (date, time) => {
    const [y, m, d] = String(date).split('-');
    const [hh, mm] = String(time || '09:30').split(':');
    return `${y}${m}${d}T${hh}${mm}00`;
  };
  const uid = `twa-${String(event.slug || 'course').replace(/[^a-z0-9-]/gi, '')}-${event.startDate || 'date'}@thameswellnessacademy.co.uk`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const desc = [event.description, event.url].filter(Boolean).join('\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Thames Wellness Academy//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/London:${stamp(event.startDate, event.startTime || '09:30')}`,
    `DTEND;TZID=Europe/London:${stamp(calendarEndDate(event), event.endTime || '17:00')}`,
    `SUMMARY:${escapeIcs(event.title || 'Thames Wellness Academy')}`,
    `DESCRIPTION:${escapeIcs(desc)}`,
    `LOCATION:${escapeIcs(event.location || '')}`,
    event.url ? `URL:${event.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n') + '\r\n';
}

function escapeIcs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Academy org vCard (phone-scannable). */
export function buildAcademyVcard() {
  const c = ACADEMY_CONTACTS;
  const founders = c.founders
    .map((f) => `${f.name} (${f.role}) <${f.email}>`)
    .join('\\n');
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${c.org}`,
    `ORG:${c.org}`,
    `EMAIL;TYPE=INTERNET,WORK:${c.email}`,
    `URL:${c.site}`,
    'ADR;TYPE=WORK:;;Berkshire and Reading;Reading;Berkshire;;United Kingdom',
    `NOTE:Founders:\\n${founders}\\nGeneric: ${c.email}`,
    'END:VCARD'
  ].join('\r\n') + '\r\n';
}
