/**
 * Teachers directory — static seed list + client-side filters.
 *
 * Specialty taxonomy = certificate / course credentials the Academy awards
 * or recognises (not soft skill tags). Tag teachers.specialties with exact
 * labels from SPECIALTIES only:
 *
 *   Foundation Training — 200–500 hour YA Professionals pathways
 *   CPD — continuing professional development (umbrella)
 *   Ashtanga CPD | Pregnancy CPD | Sound CPD | Anatomy CPD | Nidra CPD
 *   Trauma-informed teaching — workshop credential
 *   Breath work — CPD / workshop credential
 *   Menopause support — workshop credential
 *   Workshops — specialist short-course pathway (umbrella)
 *   Retreats — immersive programme credential
 *
 * Add further academy-connected teachers to TEACHERS as the directory grows.
 */
(function () {
  'use strict';

  /** Canonical specialty options for the Specialty filter (course / certificate). */
  const SPECIALTIES = [
    'Foundation Training',
    'CPD',
    'Ashtanga CPD',
    'Pregnancy CPD',
    'Sound CPD',
    'Anatomy CPD',
    'Nidra CPD',
    'Trauma-informed teaching',
    'Breath work',
    'Menopause support',
    'Workshops',
    'Retreats'
  ];

  const TEACHERS = [
    {
      id: 'katia-major',
      name: 'Katia Major',
      role: 'Co-founder',
      location: 'Reading, Berkshire',
      specialties: ['Foundation Training', 'Trauma-informed teaching', 'CPD'],
      bio: 'Clinical and studio practice through Yoga Reading, with a focus on professional teaching standards.',
      photo: '../assets/team/katia-major-thames-wellness-academy.jpg',
      photoFallback: '../assets/team/katia-major-thames-wellness-academy.svg',
      profileUrl: '../team/katia-major.html',
      externalUrl: 'https://www.katiamajor.com'
    },
    {
      id: 'raili-maripuu',
      name: 'Raili Maripuu',
      role: 'Co-founder',
      location: 'Tallinn / Europe',
      specialties: ['Foundation Training', 'Breath work', 'CPD'],
      bio: 'Studio leadership through Goyoga Tallinn and long-form teacher education across Europe.',
      photo: '../assets/team/raili-maripuu-thames-wellness-academy.jpg',
      photoFallback: '../assets/team/raili-maripuu-thames-wellness-academy.svg',
      profileUrl: '../team/raili-maripuu.html',
      externalUrl: 'https://railimaripuu.com'
    },
    {
      id: 'lorena-rodrigo',
      name: 'Lorena Rodrigo',
      role: 'Academy teacher',
      location: 'Berkshire',
      specialties: ['Foundation Training', 'Workshops', 'CPD'],
      bio: 'Academy teacher supporting teacher-led programmes across Berkshire.',
      photo: '../assets/team/lorena-rodrigo-thames-wellness-academy.jpg',
      photoFallback: '../assets/team/lorena-rodrigo-thames-wellness-academy.svg',
      profileUrl: '../team/lorena-rodrigo.html'
    },
    {
      id: 'yulia-wind',
      name: 'Yulia Wind',
      role: 'Academy teacher',
      location: 'Berkshire',
      specialties: ['Foundation Training', 'CPD', 'Workshops'],
      bio: 'Academy teacher supporting teacher-led programmes across Berkshire.',
      photo: '../assets/team/yulia-wind.jpg',
      photoFallback: '../assets/team/yulia-wind.svg',
      profileUrl: '../team/yulia-wind.html'
    }
  ];

  const grid = document.getElementById('teachers-directory-grid');
  const empty = document.getElementById('teachers-directory-empty');
  const countEl = document.getElementById('teachers-directory-count');
  const nameInput = document.getElementById('directory-search-name');
  const locationSelect = document.getElementById('directory-filter-location');
  const specialtySelect = document.getElementById('directory-filter-specialty');

  if (!grid || !nameInput || !locationSelect || !specialtySelect) return;

  const uniqueSorted = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en-GB'));

  const fillSelect = (select, options, allLabel) => {
    select.innerHTML = '';
    const all = document.createElement('option');
    all.value = '';
    all.textContent = allLabel;
    select.appendChild(all);
    options.forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
  };

  fillSelect(
    locationSelect,
    uniqueSorted(TEACHERS.map((t) => t.location)),
    'All locations'
  );
  fillSelect(specialtySelect, SPECIALTIES, 'All specialties');

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const cardHtml = (teacher) => {
    const specialties = (teacher.specialties || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('');
    const specialtyBlock = specialties
      ? `<div class="dir-teacher-specialty-block">
          <p class="dir-teacher-specialty-label">Specialties</p>
          <ul class="dir-teacher-specialties" aria-label="Specialties">${specialties}</ul>
        </div>`
      : '';
    const external = teacher.externalUrl
      ? `<a class="dir-teacher-external" href="${escapeHtml(teacher.externalUrl)}" rel="noopener noreferrer">Website</a>`
      : '';
    return `
      <article class="dir-teacher-card" data-name="${escapeHtml(teacher.name.toLowerCase())}" data-location="${escapeHtml((teacher.location || '').toLowerCase())}" data-specialties="${escapeHtml((teacher.specialties || []).join('|').toLowerCase())}">
        <div class="dir-teacher-photo">
          <img src="${escapeHtml(teacher.photo)}" alt="${escapeHtml(teacher.name)}" width="545" height="682" decoding="async" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(teacher.photoFallback || teacher.photo)}';">
        </div>
        <div class="dir-teacher-body">
          <h2 class="h3">${escapeHtml(teacher.name)}</h2>
          <p class="dir-teacher-role">${escapeHtml(teacher.role)}</p>
          <p class="dir-teacher-location">${escapeHtml(teacher.location)}</p>
          ${specialtyBlock}
          <p class="dir-teacher-bio">${escapeHtml(teacher.bio)}</p>
          <div class="dir-teacher-links">
            <a class="dir-teacher-profile" href="${escapeHtml(teacher.profileUrl)}">View profile</a>
            ${external}
          </div>
        </div>
      </article>
    `;
  };

  grid.innerHTML = TEACHERS.map(cardHtml).join('');

  const applyFilters = () => {
    const q = nameInput.value.trim().toLowerCase();
    const location = locationSelect.value.toLowerCase();
    const specialty = specialtySelect.value.toLowerCase();
    const cards = grid.querySelectorAll('.dir-teacher-card');
    let visible = 0;

    cards.forEach((card) => {
      const name = card.dataset.name || '';
      const loc = card.dataset.location || '';
      const specs = card.dataset.specialties || '';
      const matchName = !q || name.includes(q) || card.textContent.toLowerCase().includes(q);
      const matchLoc = !location || loc === location;
      const matchSpec = !specialty || specs.split('|').includes(specialty);
      const show = matchName && matchLoc && matchSpec;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (empty) empty.hidden = visible > 0;
    if (countEl) {
      const total = cards.length;
      countEl.textContent =
        visible === total
          ? `${total} teacher${total === 1 ? '' : 's'}`
          : `${visible} of ${total} teachers`;
    }
  };

  nameInput.addEventListener('input', applyFilters);
  locationSelect.addEventListener('change', applyFilters);
  specialtySelect.addEventListener('change', applyFilters);
  applyFilters();
})();
