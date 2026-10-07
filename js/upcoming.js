/**
 * Homepage “Next up” cinema rail + upcoming courses gallery.
 *
 * Marko: edit UPCOMING_EVENTS below (or swap to fetch upcoming-events.json later).
 * Keep dates as YYYY-MM-DD. The rail shows the soonest future startDate;
 * the gallery renders every future item.
 */
(function () {
  'use strict';

  /** @typedef {'Course'|'CPD'|'Workshop'|'Retreat'|'Open day'} UpcomingType */
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
   * @property {string} startDate          ISO date YYYY-MM-DD
   * @property {string} [endDate]          ISO date YYYY-MM-DD (multi-day / programme span)
   * @property {string} lastSignupDate     ISO date YYYY-MM-DD
   * @property {string} [price]            Single-price display, e.g. "Free"; omit when dual
   * @property {string} [earlyBird]        Early Bird amount, e.g. "£2,450"; omit → Enquire
   * @property {string} [standard]         Standard amount, e.g. "£2,900"; omit → Enquire
   * @property {boolean} [free]            When true, displays as Free (single price)
   * @property {number} [hours]            Training length in hours
   * @property {string} [hoursLabel]       Override hours line, e.g. "200 hours"
   * @property {string} [startTime]        24h HH:MM
   * @property {string} [endTime]          24h HH:MM
   * @property {string} href               Relative or absolute URL
   * @property {string} [location]         Optional venue / area
   * @property {UpcomingFormat} [format]   Delivery format (not shown on cards)
   * @property {string} [teacher]          Optional instructor name
   * @property {UpcomingTone} [tone]       Abstract theme (gold/river/teal/ink/mist)
   */

  /** @type {UpcomingEvent[]} */
  var UPCOMING_EVENTS = [
    {
      type: 'Open day',
      title: 'Open Day | Foundation Training 200 hours',
      startDate: '2026-11-07',
      lastSignupDate: '2026-11-05',
      free: true,
      hours: 2,
      hoursLabel: '2 hours',
      href: 'services/foundation-training/200-hour/open-day/',
      location: 'Berkshire and Reading',
      format: 'In studio',
      teacher: 'Raili Maripuu and Katia Major',
      tone: 'gold'
    },
    {
      type: 'Open day',
      title: 'Open Day | CPD Courses',
      startDate: '2027-01-29',
      lastSignupDate: '2027-01-27',
      free: true,
      hours: 2,
      hoursLabel: '2 hours',
      href: 'services/cpd/open-day/',
      location: 'Berkshire and Reading',
      format: 'In studio',
      tone: 'gold'
    },
    {
      type: 'Course',
      title: 'Foundation 200 Teacher Training',
      startDate: '2027-02-12',
      endDate: '2027-11-14',
      lastSignupDate: '2027-01-29',
      earlyBird: '£2,925',
      standard: '£3,250',
      hours: 200,
      startTime: '09:30',
      endTime: '17:00',
      href: 'services/foundation-training/200-hour/',
      location: 'Berkshire and Reading',
      format: 'In studio',
      teacher: 'Katia Major and Raili Maripuu',
      tone: 'ink'
    },
    {
      type: 'CPD',
      title: 'Pregnancy Yoga Training',
      startDate: '2027-03-06',
      endDate: '2027-03-14',
      lastSignupDate: '2027-02-27',
      earlyBird: '£555',
      standard: '£610',
      hours: 50,
      startTime: '09:30',
      endTime: '17:30',
      href: 'services/cpd/pregnancy-yoga/',
      location: 'Berkshire and Reading',
      format: 'Studio days plus self-study',
      tone: 'mist'
    },
    {
      type: 'CPD',
      title: 'Yoga Nidra Training',
      startDate: '2027-04-09',
      endDate: '2027-04-18',
      lastSignupDate: '2027-04-02',
      earlyBird: '£250',
      standard: '£325',
      hours: 30,
      href: 'services/cpd/yoga-nidra/',
      location: 'Berkshire and Reading',
      format: 'Studio days plus self-study',
      tone: 'river'
    },
    {
      type: 'CPD',
      title: 'Functional Anatomy Training',
      startDate: '2027-06-20',
      endDate: '2027-07-04',
      lastSignupDate: '2027-06-13',
      earlyBird: '£430',
      standard: '£480',
      hours: 25,
      startTime: '11:30',
      endTime: '17:00',
      href: 'services/cpd/functional-anatomy/',
      location: 'Berkshire and Reading',
      format: 'In studio',
      tone: 'teal'
    },
    {
      type: 'CPD',
      title: 'SoundBath Training',
      startDate: '2027-10-02',
      endDate: '2027-11-07',
      lastSignupDate: '2027-09-25',
      earlyBird: '£375',
      standard: '£425',
      hours: 30,
      startTime: '10:00',
      endTime: '17:00',
      href: 'services/cpd/soundbath/',
      location: 'Berkshire and Reading',
      format: 'In studio',
      tone: 'mist'
    }
  ];

  var MS_PER_DAY = 24 * 60 * 60 * 1000;
  var TONES = ['gold', 'river', 'teal', 'ink', 'mist'];

  /** Default abstract theme by course type when `tone` is omitted. */
  var TYPE_THEME = {
    Course: 'ink',
    CPD: 'mist',
    Workshop: 'gold',
    Retreat: 'river',
    'Open day': 'gold'
  };

  /** Pathway tag shown on cards (decision filter). */
  function pathwayLabel(type) {
    if (type === 'Course') return 'Foundation';
    if (type === 'CPD') return 'CPD';
    if (type === 'Retreat') return 'Retreat';
    if (type === 'Open day') return 'Open day';
    return 'Workshop';
  }

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
   * Compact British range: "7 Nov 2026", "12–14 Feb 2027", "12 Feb – 14 Nov 2027".
   * @param {Date} start
   * @param {Date|null} end
   * @returns {string}
   */
  function formatBritishDateRangeShort(start, end) {
    if (!end || daysBetween(start, end) === 0) {
      return formatBritishDateShort(start);
    }

    var sameYear = start.getFullYear() === end.getFullYear();
    var sameMonth = sameYear && start.getMonth() === end.getMonth();
    var startDay = start.getDate();
    var endDay = end.getDate();
    var monthShort = start.toLocaleDateString('en-GB', { month: 'short' });
    var endMonthShort = end.toLocaleDateString('en-GB', { month: 'short' });
    var year = end.getFullYear();

    if (sameMonth) {
      return startDay + '–' + endDay + ' ' + monthShort + ' ' + year;
    }

    if (sameYear) {
      return (
        startDay +
        ' ' +
        monthShort +
        ' – ' +
        endDay +
        ' ' +
        endMonthShort +
        ' ' +
        year
      );
    }

    return formatBritishDateShort(start) + ' – ' + formatBritishDateShort(end);
  }

  /**
   * Full British range for the hero rail.
   * @param {Date} start
   * @param {Date|null} end
   * @returns {string}
   */
  function formatBritishDateRangeLong(start, end) {
    if (!end || daysBetween(start, end) === 0) {
      return formatBritishDate(start);
    }

    var sameYear = start.getFullYear() === end.getFullYear();
    var sameMonth = sameYear && start.getMonth() === end.getMonth();

    if (sameMonth) {
      return (
        start.getDate() +
        '–' +
        end.getDate() +
        ' ' +
        start.toLocaleDateString('en-GB', { month: 'long' }) +
        ' ' +
        end.getFullYear()
      );
    }

    if (sameYear) {
      return (
        start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) +
        ' – ' +
        end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) +
        ' ' +
        end.getFullYear()
      );
    }

    return formatBritishDate(start) + ' – ' + formatBritishDate(end);
  }

  /**
   * Open Days and explicitly free items stay single-price.
   * Courses, CPD, workshops and retreats use Early Bird + Standard.
   * @param {UpcomingEvent} item
   * @returns {boolean}
   */
  function usesDualPricing(item) {
    if (item.free === true || item.type === 'Open day') return false;
    if (item.earlyBird != null || item.standard != null) return true;
    return (
      item.type === 'Course' ||
      item.type === 'CPD' ||
      item.type === 'Workshop' ||
      item.type === 'Retreat'
    );
  }

  /**
   * Tier amount: published figure, or Enquire when unknown.
   * @param {string|number|null|undefined} value
   * @returns {string}
   */
  function tierAmount(value) {
    if (value == null || String(value).trim() === '') return 'Enquire';
    return String(value);
  }

  function displayPrice(item) {
    if (item.free === true || item.price === 0 || item.price === '0' || item.price === '£0') {
      return 'Free';
    }
    if (item.price != null && String(item.price).trim() !== '') {
      return String(item.price);
    }
    return 'Enquire';
  }

  /**
   * Plain-text summary for the hero rail (and any single-slot price UI).
   * @param {UpcomingEvent} item
   * @returns {string}
   */
  function displayPriceSummary(item) {
    if (!usesDualPricing(item)) return displayPrice(item);
    return (
      'Early Bird ' +
      tierAmount(item.earlyBird) +
      ' · Standard ' +
      tierAmount(item.standard)
    );
  }

  /**
   * Card markup: dual Early Bird / Standard, or a single Free / price line.
   * @param {UpcomingEvent} item
   * @returns {string}
   */
  function buildPriceHtml(item) {
    if (!usesDualPricing(item)) {
      return (
        '<span class="upcoming-card-price">' +
        escapeHtml(displayPrice(item)) +
        '</span>'
      );
    }

    return (
      '<span class="upcoming-card-prices" aria-label="Fees">' +
        '<span class="upcoming-card-price-tier">' +
          '<span class="upcoming-card-price-label">Early Bird</span>' +
          '<span class="upcoming-card-price-amount">' +
            escapeHtml(tierAmount(item.earlyBird)) +
          '</span>' +
        '</span>' +
        '<span class="upcoming-card-price-tier">' +
          '<span class="upcoming-card-price-label">Standard</span>' +
          '<span class="upcoming-card-price-amount">' +
            escapeHtml(tierAmount(item.standard)) +
          '</span>' +
        '</span>' +
      '</span>'
    );
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
    if (type === 'Course') return 'Explore Foundation';
    if (type === 'CPD') return 'Explore CPD';
    if (type === 'Retreat') return 'Explore retreat';
    if (type === 'Open day') return 'Find out more';
    return 'Explore workshop';
  }

  function formatHours(item) {
    if (item.hoursLabel) return item.hoursLabel;
    var n = Number(item.hours);
    if (!n || n < 0) return '';
    return n === 1 ? '1 hour' : n + ' hours';
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
    var startDt = startEl && startEl.parentElement
      ? startEl.parentElement.querySelector('dt')
      : null;

    var start = parseDate(item.startDate);
    var end = item.endDate ? parseDate(item.endDate) : null;
    var days = parseDate(item.lastSignupDate)
      ? daysBetween(startOfToday(), parseDate(item.lastSignupDate))
      : null;
    var dateLabel = start
      ? formatBritishDateRangeLong(start, end)
      : item.startDate;

    setText(typeEl, pathwayLabel(item.type));
    setText(titleEl, item.title);
    setText(startEl, dateLabel);
    setText(priceEl, displayPriceSummary(item));
    setText(countdownEl, signupCountdownLabel(item.lastSignupDate));

    var priceBlock = priceEl && priceEl.closest
      ? priceEl.closest('.hero-upcoming-price')
      : null;
    if (priceBlock) {
      var priceDt = priceBlock.querySelector('dt');
      setText(priceDt, usesDualPricing(item) ? 'Fees' : 'Price');
    }

    if (startDt) {
      setText(startDt, end && start && daysBetween(start, end) > 0 ? 'Dates' : 'Starts');
    }

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
    // Cards show start day only; endDate remains in data for rail / elsewhere.
    var dateLabel = start ? formatBritishDateShort(start) : item.startDate;
    var pathway = pathwayLabel(item.type);
    var tone = toneFor(item, index);
    var teacherHtml = item.teacher
      ? '<p class="upcoming-card-teacher">' + escapeHtml(item.teacher) + '</p>'
      : '';
    var hoursLabel = formatHours(item);
    var hoursHtml = hoursLabel
      ? '<span class="upcoming-card-hours">' + escapeHtml(hoursLabel) + '</span>'
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
          '<span class="upcoming-card-badge">' + escapeHtml(pathway) + '</span>' +
          '<h3 class="upcoming-card-title">' + escapeHtml(item.title) + '</h3>' +
          teacherHtml +
          buildPriceHtml(item) +
          '<span class="upcoming-card-foot">' +
            '<span class="upcoming-card-meta">' +
              '<span class="upcoming-card-date">' + escapeHtml(dateLabel) + '</span>' +
              hoursHtml +
            '</span>' +
            '<span class="upcoming-card-cta">' + escapeHtml(linkLabel(item.type)) + '</span>' +
          '</span>' +
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

    function maxScrollLeft() {
      return track.scrollWidth - track.clientWidth;
    }

    function updateButtons() {
      var maxScroll = maxScrollLeft();
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

    track.addEventListener(
      'scroll',
      function () {
        updateButtons();
      },
      { passive: true }
    );

    window.addEventListener('resize', updateButtons);

    updateButtons();
  }

  /**
   * Keep sticky header height in sync (home: Next up + nav; other pages: nav).
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
        bindOffsets(rail);
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
