/**
 * GET /api/contacts/academy
 * vCard download for Academy contact QR / save-to-phone.
 */

import { buildAcademyVcard } from '../../lib/calendar-links.js';

export async function onRequestGet() {
  const vcf = buildAcademyVcard();
  return new Response(vcf, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': 'attachment; filename="thames-wellness-academy.vcf"',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
