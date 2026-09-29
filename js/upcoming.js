/**
 * Homepage “Next up” cinema rail + upcoming courses gallery.
 *
 * Marko: edit UPCOMING_EVENTS below (or swap to fetch upcoming-events.json later).
 * Keep dates as YYYY-MM-DD. The rail shows the soonest future startDate;
 * the gallery renders every future item.
 */
(function () {
  'use strict';

  /** @typedef {'Course'|'CPD'|'Workshop'} UpcomingType */
  /** @typedef {'In studio'|'Livestream'} UpcomingFormat */
  /** @typedef {'gold'|'river'|'teal'|'ink'|'mist'} UpcomingTone */

  /**
   * Abstract card themes (CSS class suffix). Assigned by course type when
   * `tone` is omitted; otherwise the explicit tone wins.
   * @typedef {UpcomingTone} UpcomingTheme
   */

  /**
   * @typedef {Object} UpcomingEvent
   * @property {UpcomingType} type
   * @property {string} title
   * @property {string} startDate        ISO date YYYY-MM-DD
   * @property {string} lastSignupDate   ISO date YYYY-MM-DD
   * @property {string} price            Display string, e.g. "£1,250"
   * @property {string} href             Relative or absolute URL
   * @property {string} [location]       Optional venue / area
   * @property {UpcomingFormat} [format] Delivery format badge
   * @property {string} [teacher]        Optional instructor name
   * @property {UpcomingTone} [tone]     Abstract theme (gold/river/teal/ink/mist)
   */

  /** @type {UpcomingEvent[]} */
  var UPCOMING_EVENTS = [
    {
      type: 'Workshop',
      title: 'Trauma-informed teaching foundations',
      startDate: '2026-10-18',
      lastSignupDate: '2026-10-11',
      price: '£95',
      href: 'services/workshops/',
      location: 'Reading',
      format: 'In studio',
      teacher: 'Katia Major',
      tone: 'gold'
    },
    {
      type: 'CPD',
      title: 'Breath work for teaching practice',
      startDate: '2026-11-08',
      lastSignupDate: '2026-11-01',
      price: '£185',
      href: 'services/cpd/',
      location: 'Berkshire',
      format: 'In studio',
      teacher: 'Raili Maripuu',
      tone: 'teal'
    },
    {
      type: 'Course',
      title: 'Foundation Training (200-hour)',
      startDate: '2027-01-17',
      lastSignupDate: '2026-12-15',
      price: '£2,450',
      href: 'services/foundation-training/',
      location: 'Berkshire and Reading',
      format: 'In studio',
      teacher: 'Academy faculty',
      tone: 'river'
    }
  ];

  var MS_PER_DAY = 24 * 60 * 60 * 1000;
  var TONES = ['gold', 'river', 'teal', 'ink', 'mist'];

  /** Default abstract theme by course type when `tone` is omitted. */
  var TYPE_THEME = {
    Course: 'river',
    CPD: 'teal',
    Workshop: 'gold'
  };

  function parseDate(iso) {
    var parts = String(iso).split('-');
    if (parts.length !== 3) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function startOfToday() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function daysBetween(from, to) {
    return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  }

  function formatBritishDate(date) {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function formatBritishDateShort(date) {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Future items by startDate; if none, fall back to open signup windows.
   * @param {UpcomingEvent[]} items
   * @returns {UpcomingEvent[]}
   */
  function listUpcoming(items) {
    var today = startOfToday();
    var byStart = items
      .filter(function (item) {
        var start = parseDate(item.startDate);
        return start && start >= today;
      })
      .sort(function (a, b) {
        return parseDate(a.startDate) - parseDate(b.startDate);
      });

    if (byStart.length) return byStart;

    return items
      .filter(function (item) {
        var last = parseDate(item.lastSignupDate);
        return last && last >= today;
      })
      .sort(function (a, b) {
        return parseDate(a.lastSignupDate) - parseDate(b.lastSignupDate);
      });
  }

  /**
   * Prefer soonest future startDate; if none, fall back to soonest lastSignup
   * that is still in the future.
   * @param {UpcomingEvent[]} items
   * @returns {UpcomingEvent|null}
   */
  function pickNext(items) {
    var list = listUpcoming(items);
    return list[0] || null;
  }

  function signupCountdownLabel(lastSignupDate) {
    var last = parseDate(lastSignupDate);
    if (!last) return '';
    var days = daysBetween(startOfToday(), last);
    if (days < 0) return 'Signup closed';
    if (days === 0) return 'Last day to sign up';
    if (days === 1) return 'Closes in 1 day';
    return 'Closes in ' + days + ' days';
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value || '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function linkLabel(type) {
    if (type === 'Course') return 'View course';
    if (type === 'CPD') return 'View CPD';
    return 'View workshop';
  }

  function toneFor(item, index) {
    if (item.tone && TONES.indexOf(item.tone) !== -1) return item.tone;
    var byType = TYPE_THEME[item.type];
    if (byType) return byType;
    return TONES[index % TONES.length];
  }

  function render(root, item) {
    var typeEl = root.querySelector('[data-upcoming="type"]');
    var titleEl = root.querySelector('[data-upcoming="title"]');
    var startEl = root.querySelector('[data-upcoming="start"]');
    var priceEl = root.querySelector('[data-upcoming="price"]');
    var countdownEl = root.querySelector('[data-upcoming="countdown"]');
    var locationEl = root.querySelector('[data-upcoming="location"]');
    var linkEl = root.querySelector('[data-upcoming="link"]');

    var start = parseDate(item.startDate);
    var days = parseDate(item.lastSignupDate)
      ? daysBetween(startOfToday(), parseDate(item.lastSignupDate))
      : null;

    setText(typeEl, item.type);
    setText(titleEl, item.title);
    setText(startEl, start ? formatBritishDate(start) : item.startDate);
    setText(priceEl, item.price);
    setText(countdownEl, signupCountdownLabel(item.lastSignupDate));

    if (countdownEl) {
      countdownEl.classList.toggle('is-urgent', days !== null && days >= 0 && days <= 7);
      countdownEl.classList.toggle('is-closed', days !== null && days < 0);
    }

    if (locationEl) {
      if (item.location) {
        setText(locationEl, item.location);
        locationEl.hidden = false;
      } else {
        setText(locationEl, '');
        locationEl.hidden = true;
      }
    }

    if (linkEl) {
      linkEl.href = item.href;
      linkEl.textContent = linkLabel(item.type);
    }

    root.hidden = false;
  }

  function buildCard(item, index) {
    var start = parseDate(item.startDate);
    var dateLabel = start ? formatBritishDateShort(start) : item.startDate;
    var format = item.format || 'In studio';
    var tone = toneFor(item, index);
    var teacherHtml = item.teacher
      ? '<p class="upcoming-card-teacher">' + escapeHtml(item.teacher) + '</p>'
      : '';

    return (
      '<a class="upcoming-card upcoming-card--' + escapeHtml(tone) + '" href="' + escapeHtml(item.href) + '">' +
        '<span class="upcoming-card-media" aria-hidden="true">' +
          '<span class="upcoming-card-orb upcoming-card-orb--a"></span>' +
          '<span class="upcoming-card-orb upcoming-card-orb--b"></span>' +
          '<span class="upcoming-card-orb upcoming-card-orb--c"></span>' +
          '<span class="upcoming-card-grain"></span>' +
        '</span>' +
        '<span class="upcoming-card-shade" aria-hidden="true"></span>' +
        '<span class="upcoming-card-body">' +
          '<span class="upcoming-card-badge">' + escapeHtml(format) + '</span>' +
          '<span class="upcoming-card-type">' + escapeHtml(item.type) + '</span>' +
          '<h3 class="upcoming-card-title">' + escapeHtml(item.title) + '</h3>' +
          teacherHtml +
          '<span class="upcoming-card-meta">' +
            '<span class="upcoming-card-date">' + escapeHtml(dateLabel) + '</span>' +
            '<span class="upcoming-card-price">' + escapeHtml(item.price) + '</span>' +
          '</span>' +
          '<span class="upcoming-card-cta">' + escapeHtml(linkLabel(item.type)) + '</span>' +
        '</span>' +
      '</a>'
    );
  }

  function bindGallery(galleryRoot, items) {
    var track = galleryRoot.querySelector('[data-upcoming-track]');
    var prevBtn = galleryRoot.querySelector('[data-upcoming-prev]');
    var nextBtn = galleryRoot.querySelector('[data-upcoming-next]');
    if (!track) return;

    track.innerHTML = items.map(buildCard).join('');

    function cardStep() {
      var card = track.querySelector('.upcoming-card');
      if (!card) return 280;
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 16;
      return card.getBoundingClientRect().width + gap;
    }

    function updateButtons() {
      var maxScroll = track.scrollWidth - track.clientWidth;
      var atStart = track.scrollLeft <= 4;
      var atEnd = track.scrollLeft >= maxScroll - 4;
      if (prevBtn) prevBtn.disabled = atStart || maxScroll <= 0;
      if (nextBtn) nextBtn.disabled = atEnd || maxScroll <= 0;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        track.scrollBy({ left: cardStep(), behavior: 'smooth' });
      });
    }

    track.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    updateButtons();
  }

  /**
   * Keep sticky `top` aligned with the measured pathways + nav bar.
   * Mobile menu is position:absolute so it does not inflate this height.
   */
  function syncHeaderOffset() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var height = Math.ceil(header.getBoundingClientRect().height);
    if (height > 0) {
      document.documentElement.style.setProperty('--header-total-h', height + 'px');
    }
  }

  function syncRailHeight(root) {
    if (!root || root.hidden) return;
    var height = Math.ceil(root.getBoundingClientRect().height);
    if (height > 0) {
      document.documentElement.style.setProperty('--hero-rail-h', height + 'px');
    }
  }

  function syncOffsets(root) {
    syncHeaderOffset();
    syncRailHeight(root);
  }

  function bindOffsets(root) {
    syncOffsets(root);
    window.addEventListener('resize', function () {
      syncOffsets(root);
    });

    if (typeof ResizeObserver === 'undefined') return;

    var observer = new ResizeObserver(function () {
      syncOffsets(root);
    });
    var header = document.querySelector('.site-header');
    if (header) observer.observe(header);
    if (root) observer.observe(root);
  }

  function init() {
    var upcoming = listUpcoming(UPCOMING_EVENTS);

    var rail = document.querySelector('[data-upcoming-root]');
    if (rail) {
      var next = upcoming[0] || pickNext(UPCOMING_EVENTS);
      if (!next) {
        rail.hidden = true;
      } else {
        render(rail, next);
        bindOffsets(rail);
        requestAnimationFrame(function () {
          syncOffsets(rail);
        });
      }
    }

    var gallery = document.querySelector('[data-upcoming-gallery]');
    if (gallery) {
      if (!upcoming.length) {
        gallery.hidden = true;
      } else {
        gallery.hidden = false;
        bindGallery(gallery, upcoming);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
