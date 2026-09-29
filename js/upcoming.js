/**
 * Homepage “Coming up next” panel.
 *
 * Marko: edit UPCOMING_EVENTS below (or swap to fetch upcoming-events.json later).
 * Keep dates as YYYY-MM-DD. The panel shows the soonest future startDate.
 */
(function () {
  'use strict';

  /** @typedef {'Course'|'CPD'|'Workshop'} UpcomingType */

  /**
   * @typedef {Object} UpcomingEvent
   * @property {UpcomingType} type
   * @property {string} title
   * @property {string} startDate        ISO date YYYY-MM-DD
   * @property {string} lastSignupDate   ISO date YYYY-MM-DD
   * @property {string} price            Display string, e.g. "£1,250"
   * @property {string} href             Relative or absolute URL
   * @property {string} [location]       Optional venue / area
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
      location: 'Reading'
    },
    {
      type: 'CPD',
      title: 'Breath work for teaching practice',
      startDate: '2026-11-08',
      lastSignupDate: '2026-11-01',
      price: '£185',
      href: 'services/cpd/',
      location: 'Berkshire'
    },
    {
      type: 'Course',
      title: 'Foundation Training (200-hour)',
      startDate: '2027-01-17',
      lastSignupDate: '2026-12-15',
      price: '£2,450',
      href: 'services/foundation-training/',
      location: 'Berkshire and Reading'
    }
  ];

  var MS_PER_DAY = 24 * 60 * 60 * 1000;

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

  /**
   * Prefer soonest future startDate; if none, fall back to soonest lastSignup
   * that is still in the future.
   * @param {UpcomingEvent[]} items
   * @returns {UpcomingEvent|null}
   */
  function pickNext(items) {
    var today = startOfToday();
    var byStart = items
      .filter(function (item) {
        var start = parseDate(item.startDate);
        return start && start >= today;
      })
      .sort(function (a, b) {
        return parseDate(a.startDate) - parseDate(b.startDate);
      });

    if (byStart.length) return byStart[0];

    var bySignup = items
      .filter(function (item) {
        var last = parseDate(item.lastSignupDate);
        return last && last >= today;
      })
      .sort(function (a, b) {
        return parseDate(a.lastSignupDate) - parseDate(b.lastSignupDate);
      });

    return bySignup[0] || null;
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
      linkEl.textContent = item.type === 'Course'
        ? 'View course'
        : item.type === 'CPD'
          ? 'View CPD'
          : 'View workshop';
    }

    root.hidden = false;
  }

  function init() {
    var root = document.querySelector('[data-upcoming-root]');
    if (!root) return;

    var next = pickNext(UPCOMING_EVENTS);
    if (!next) {
      root.hidden = true;
      return;
    }

    render(root, next);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
