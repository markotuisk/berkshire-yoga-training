/**
 * Course catalogue for email copy, calendar events, and Sheet enrichment.
 * Paths are absolute on thameswellnessacademy.co.uk.
 */

const SITE = 'https://thameswellnessacademy.co.uk';

/** @type {Record<string, {
 *   slug: string,
 *   title: string,
 *   url: string,
 *   summary: string,
 *   details: string[],
 *   startDate?: string,
 *   endDate?: string,
 *   startTime?: string,
 *   endTime?: string,
 *   venue?: string,
 *   locationLabel?: string
 * }>} */
const BY_SLUG = {
  'foundation-200': {
    slug: 'foundation-200',
    title: 'Foundation Training 200 hours',
    url: `${SITE}/courses/foundation-yoga-training/200-hour/`,
    summary:
      '200-hour teacher training across nine in-studio weekends in Berkshire and Reading, with supervised practice and self-study modules.',
    details: [
      'Cohort: 12 February to 14 November 2027',
      'Format: nine weekend intensives · studio 09:30-17:00',
      'Fees: Early Bird £2,925 · Standard £3,250 (deposit 30%)',
      'Lead faculty: Katia Major and Raili Maripuu (co-founders)',
      'Location: Berkshire and Reading (venue in joining pack)'
    ],
    startDate: '2027-02-12',
    endDate: '2027-11-14',
    startTime: '09:30',
    endTime: '17:00',
    venue: 'Berkshire / Reading (venue confirmed in joining pack)',
    locationLabel: 'Berkshire, Reading, United Kingdom'
  },
  'open-day-foundation': {
    slug: 'open-day-foundation',
    title: 'Open Day | Foundation Training 200 hours',
    url: `${SITE}/courses/foundation-yoga-training/200-hour/open-day/`,
    summary: 'Free 2-hour Open Day introducing the 200-hour Foundation Training pathway.',
    details: [
      'Date: Saturday 7 November 2026',
      'Time: 12:00-14:00',
      'Free to attend',
      'Meet co-founders Katia Major and Raili Maripuu'
    ],
    startDate: '2026-11-07',
    endDate: '2026-11-07',
    startTime: '12:00',
    endTime: '14:00',
    venue: 'Berkshire / Reading (confirmed on registration)',
    locationLabel: 'Berkshire, Reading, United Kingdom'
  },
  'open-day-cpd': {
    slug: 'open-day-cpd',
    title: 'Open Day | CPD Courses',
    url: `${SITE}/courses/cpd/open-day/`,
    summary: 'Open Day for CPD pathways at Thames Wellness Academy.',
    details: ['See the Open Day page for the next date and programme notes.'],
    venue: 'Berkshire / Reading'
  },
  'pregnancy-yoga': {
    slug: 'pregnancy-yoga',
    title: 'Pregnancy Yoga Training (CPD)',
    url: `${SITE}/courses/cpd/pregnancy-yoga/`,
    summary: 'CPD for teaching yoga safely in pregnancy.',
    details: ['Early Bird and Standard fees published on the course page.', 'On-site delivery in Berkshire.'],
    startDate: '2027-03-06',
    venue: 'Berkshire / Reading'
  },
  'yoga-nidra': {
    slug: 'yoga-nidra',
    title: 'Yoga Nidra Training (CPD)',
    url: `${SITE}/courses/cpd/yoga-nidra/`,
    summary: 'CPD in Yoga Nidra teaching practice.',
    details: ['On-site CPD module in Berkshire.'],
    startDate: '2027-04-09',
    venue: 'Berkshire / Reading'
  },
  'functional-anatomy': {
    slug: 'functional-anatomy',
    title: 'Functional Anatomy Training (CPD)',
    url: `${SITE}/courses/cpd/functional-anatomy/`,
    summary: 'Evidence-informed anatomy for yoga teachers.',
    details: ['On-site CPD module in Berkshire.'],
    startDate: '2027-06-20',
    venue: 'Berkshire / Reading'
  },
  soundbath: {
    slug: 'soundbath',
    title: 'SoundBath Training (CPD)',
    url: `${SITE}/courses/cpd/soundbath/`,
    summary: 'CPD in sound practice for wellness teaching.',
    details: ['On-site CPD module in Berkshire.'],
    startDate: '2027-10-02',
    venue: 'Berkshire / Reading'
  },
  cpd: {
    slug: 'cpd',
    title: 'CPD courses',
    url: `${SITE}/courses/cpd/`,
    summary: 'Continuing professional development modules for qualified teachers.',
    details: ['Browse CPD pathways on the Academy site.']
  },
  workshops: {
    slug: 'workshops',
    title: 'Specialist workshops',
    url: `${SITE}/courses/workshops/`,
    summary: 'Focused studio sessions on specialist teaching themes. Completers receive a studio diploma of attendance.',
    details: ['Half-day and day intensives · in studio · enquire for dates.']
  },
  retreats: {
    slug: 'retreats',
    title: 'Retreats',
    url: `${SITE}/courses/retreats/`,
    summary: 'Immersive study away from daily teaching load.',
    details: ['See retreats page for upcoming dates.']
  }
};

// Aliases
BY_SLUG['foundation-training'] = BY_SLUG['foundation-200'];
BY_SLUG['foundation-yoga-training'] = BY_SLUG['foundation-200'];
BY_SLUG['200-hour'] = BY_SLUG['foundation-200'];
BY_SLUG.foundation = BY_SLUG['foundation-200'];
BY_SLUG['open-day-200'] = BY_SLUG['open-day-foundation'];

/**
 * @param {string} [slug]
 * @param {{ courseTitle?: string, courseStartDate?: string, venue?: string }} [overrides]
 */
export function resolveCourse(slug, overrides = {}) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  const base = (key && BY_SLUG[key]) || null;
  const title = overrides.courseTitle || (base && base.title) || '';
  const startDate = overrides.courseStartDate || (base && base.startDate) || '';
  const venue = overrides.venue || (base && base.venue) || 'Berkshire / Reading';
  const url =
    (base && base.url) ||
    (key ? `${SITE}/courses/` : `${SITE}/courses/`);

  return {
    slug: (base && base.slug) || key || '',
    title: title || 'Thames Wellness Academy programme',
    url,
    summary: (base && base.summary) || 'Teacher-led wellness education at Thames Wellness Academy.',
    details: (base && base.details) || [],
    startDate,
    endDate: (base && base.endDate) || startDate || '',
    startTime: (base && base.startTime) || '09:30',
    endTime: (base && base.endTime) || '17:00',
    venue,
    locationLabel: (base && base.locationLabel) || venue
  };
}

export const ACADEMY_CONTACTS = {
  org: 'Thames Wellness Academy',
  email: 'contact@thameswellness.com',
  site: SITE,
  addressLines: ['Berkshire and Reading', 'United Kingdom'],
  founders: [
    {
      name: 'Katia Major',
      role: 'Co-Founder and Faculty Lead Teacher',
      email: 'Katia.major@thameswellness.com',
      profile: `${SITE}/team/katia-major`
    },
    {
      name: 'Raili Maripuu',
      role: 'Co-Founder and Faculty Lead Teacher',
      email: 'raili.maripuu@thameswellness.com',
      profile: `${SITE}/team/raili-maripuu`
    }
  ]
};

export { SITE as SITE_URL, BY_SLUG as COURSE_CATALOG };
