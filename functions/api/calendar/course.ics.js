/**
 * GET /api/calendar/course.ics?slug=&start=&title=
 * Returns a downloadable ICS for Apple Calendar / calendar apps / QR scans.
 */

import { resolveCourse } from '../../lib/course-catalog.js';
import { buildIcs } from '../../lib/calendar-links.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const slug = url.searchParams.get('slug') || '';
  const start = url.searchParams.get('start') || '';
  const titleOverride = url.searchParams.get('title') || '';

  const course = resolveCourse(slug, {
    courseTitle: titleOverride,
    courseStartDate: start
  });

  if (!course.startDate) {
    return new Response('Course start date required for calendar export.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const ics = buildIcs({
    title: course.title,
    startDate: course.startDate,
    endDate: course.endDate || course.startDate,
    startTime: course.startTime,
    endTime: course.endTime,
    description: course.summary,
    location: course.locationLabel || course.venue,
    url: course.url,
    slug: course.slug
  });

  const filename = `twa-${(course.slug || 'course').replace(/[^a-z0-9-]/gi, '')}.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300'
    }
  });
}
