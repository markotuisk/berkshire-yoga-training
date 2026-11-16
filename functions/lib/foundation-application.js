/**
 * Foundation Training application intake (join form).
 * Column labels match the Foundation applications Google Sheet.
 */

export const FOUNDATION_APPLICATION_SHEET_ID_DEFAULT =
  '1qT4d-Rekq8MZPWyCK9BBCrok9SpGkKPukPTWuEy5IvQ';

/** @type {Array<{ key: string, label: string }>} */
export const FOUNDATION_APPLICATION_FIELDS = [
  { key: 'dateOfBirth', label: 'And your date of birth' },
  {
    key: 'yogaPracticeStart',
    label: 'When did you start practising yoga and what form of yoga?'
  },
  { key: 'mainYogaTeacher', label: 'Who is your current main yoga teacher?' },
  { key: 'professionStudies', label: 'What is your current profession/studies?' },
  {
    key: 'educationHistory',
    label: 'Education history/college/university/other'
  },
  {
    key: 'teachingExperience',
    label: 'Do you have any experience of teaching in any context?'
  },
  {
    key: 'medicalConditions',
    label:
      'Do you have any diagnosed medical conditions including mental health conditions?'
  },
  {
    key: 'injuries',
    label: 'Please list any acute or chronic injuries that may need special attention'
  },
  {
    key: 'yogaJourney',
    label:
      'Write a brief overview describing your yoga journey, including why are you practising and why you think yoga is important in people’s lives.'
  }
];

export const FOUNDATION_APPLICATION_HEADERS = [
  'Timestamp',
  'Please tell us your name',
  'Please tell us your email (the one you want course material sent to)',
  ...FOUNDATION_APPLICATION_FIELDS.map((field) => field.label)
];

/**
 * @param {string} topic
 * @param {string} slug
 * @param {string} [source]
 */
export function isFoundationApplication(topic, slug, source = '') {
  if (!/^join$/i.test(String(source || ''))) return false;
  const t = String(topic || '').toLowerCase();
  const g = String(slug || '').toLowerCase();
  if (t.includes('open day') || g.includes('open-day')) return false;
  return (
    g === 'foundation-training' ||
    g === 'foundation-200' ||
    g === 'foundation-300' ||
    (/foundation/.test(g) && !/open-day/.test(g)) ||
    (/foundation/.test(t) && !/open day/.test(t))
  );
}

/**
 * @param {Record<string, unknown>} body
 * @param {(value: unknown, max?: number) => string} clean
 */
export function extractFoundationApplication(body, clean) {
  /** @type {Record<string, string>} */
  const values = {};
  /** @type {Array<{ name: string, value: string, inline?: boolean }>} */
  const fields = [];
  let answered = 0;

  for (const field of FOUNDATION_APPLICATION_FIELDS) {
    const value = clean(body[field.key], 3500);
    values[field.key] = value;
    if (value) {
      answered += 1;
      fields.push({ name: field.label, value, inline: false });
    }
  }

  const notes = fields.map((f) => `${f.name}: ${f.value}`).join('\n\n');
  return { values, fields, notes, answered };
}
