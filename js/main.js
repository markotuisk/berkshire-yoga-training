(function () {
  'use strict';

  // Sticky header shadow
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Mobile nav toggle + dropdown menus
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const menuItems = document.querySelectorAll('.nav-item--has-menu');
  const desktopNavQuery = window.matchMedia('(min-width: 992px)');

  const isDesktopNav = () => desktopNavQuery.matches;

  const closeAllSubmenus = () => {
    menuItems.forEach(item => {
      setSubmenuOpen(item, false);
    });
  };

  const setSubmenuOpen = (item, open) => {
    const trigger = item.querySelector(':scope > .nav-link');
    const submenu = item.querySelector(':scope > .nav-submenu');
    item.classList.toggle('is-open', open);
    trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
    submenu?.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
      if (!isOpen) closeAllSubmenus();
    });

    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        const isMenuTrigger = link.matches('.nav-item--has-menu > .nav-link');
        if (isMenuTrigger && !isDesktopNav()) return;

        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        closeAllSubmenus();
      });
    });
  }

  menuItems.forEach(item => {
    const trigger = item.querySelector(':scope > .nav-link');
    if (!trigger) return;

    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    item.querySelector(':scope > .nav-submenu')?.setAttribute('aria-hidden', 'true');

    trigger.addEventListener('click', event => {
      if (!isDesktopNav()) {
        event.preventDefault();
        const willOpen = !item.classList.contains('is-open');
        closeAllSubmenus();
        if (willOpen) setSubmenuOpen(item, true);
      }
    });

    item.addEventListener('mouseenter', () => {
      if (!isDesktopNav()) return;
      closeAllSubmenus();
      setSubmenuOpen(item, true);
    });

    item.addEventListener('mouseleave', () => {
      if (!isDesktopNav()) return;
      setSubmenuOpen(item, false);
    });

    item.addEventListener('focusin', () => {
      if (!isDesktopNav()) return;
      closeAllSubmenus();
      setSubmenuOpen(item, true);
    });
  });

  mainNav?.addEventListener('focusout', event => {
    if (!isDesktopNav()) return;
    if (!mainNav.contains(event.relatedTarget)) closeAllSubmenus();
  });

  document.addEventListener('click', event => {
    if (!mainNav || mainNav.contains(event.target)) return;
    closeAllSubmenus();
  });

  desktopNavQuery.addEventListener('change', () => {
    closeAllSubmenus();
    mainNav?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });

  document.querySelector('.header-cta')?.addEventListener('click', () => {
    mainNav?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    closeAllSubmenus();
  });

  // Foundation sub-tabs (foundation-training page)
  document.querySelectorAll('.sub-tabs').forEach(subTabGroup => {
    const tabs = subTabGroup.querySelectorAll('.sub-tab');
    const container = subTabGroup.closest('.panel-content');
    if (!container) return;

    const panels = container.querySelectorAll('.sub-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.subtab;

        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        panels.forEach(panel => {
          panel.classList.toggle('active', panel.dataset.subpanel === target);
        });
      });
    });
  });

  // Prevent form submission on draft
  document.querySelectorAll('.contact-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      alert('This is a draft form, not yet connected to a backend.');
    });
  });

  // --- Discord activity / lead beacons (verbose v1; founders will trim later) ---
  const notifySessionKey = 'twa_notify_sid';
  const getSessionId = () => {
    try {
      let id = sessionStorage.getItem(notifySessionKey) || localStorage.getItem(notifySessionKey);
      if (!id) {
        id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      }
      sessionStorage.setItem(notifySessionKey, id);
      localStorage.setItem(notifySessionKey, id);
      return id;
    } catch {
      return `s_${Date.now().toString(36)}`;
    }
  };

  const rotateSessionId = () => {
    try {
      sessionStorage.removeItem(notifySessionKey);
      localStorage.removeItem(notifySessionKey);
    } catch {
      /* ignore */
    }
    return getSessionId();
  };

  const courseSlugFromHref = (href) => {
    try {
      const u = new URL(href, window.location.href);
      const course = u.searchParams.get('course') || u.searchParams.get('topic') || u.searchParams.get('interest');
      if (course) return course.toLowerCase().replace(/\s+/g, '-');
      const path = u.pathname.toLowerCase();
      if (path.includes('soundbath')) return 'soundbath';
      if (path.includes('pregnancy')) return 'pregnancy-yoga';
      if (path.includes('yoga-nidra') || path.includes('nidra')) return 'yoga-nidra';
      if (path.includes('functional-anatomy') || path.includes('anatomy')) return 'functional-anatomy';
      if (path.includes('open-day') && path.includes('foundation')) return 'open-day-foundation';
      if (path.includes('open-day') && path.includes('/cpd')) return 'open-day-cpd';
      if (path.includes('foundation') && path.includes('200')) return 'foundation-200';
      if (path.includes('foundation')) return 'foundation-training';
      if (path.includes('/workshops')) return 'workshops';
      if (path.includes('/retreats')) return 'retreats';
      if (path.includes('/cpd')) return 'cpd';
    } catch {
      /* ignore */
    }
    return '';
  };

  const notifyBeacon = (payload) => {
    try {
      const body = {
        sessionId: getSessionId(),
        page: window.location.href,
        path: window.location.pathname + window.location.search + window.location.hash,
        referrer: document.referrer || '',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        title: document.title || '',
        timestamp: new Date().toISOString(),
        ...payload
      };
      const json = JSON.stringify(body);
      if (navigator.sendBeacon) {
        const blob = new Blob([json], { type: 'application/json' });
        const ok = navigator.sendBeacon('/api/notify/event', blob);
        if (ok) return;
      }
      fetch('/api/notify/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
        credentials: 'same-origin'
      }).catch(() => {});
    } catch {
      /* never break the page for analytics */
    }
  };

  // One visit beacon per page load (human activity channel; bots also hit middleware)
  notifyBeacon({
    type: 'visit',
    label: document.title || window.location.pathname,
    slug: courseSlugFromHref(window.location.href)
  });

  const ACADEMY_MAIL_RE =
    /(?:info@thameswellnessacademy\.co\.uk|info@berkshireyogatraining\.co\.uk)/i;
  const WHATSAPP_RE = /(?:wa\.me\/|api\.whatsapp\.com\/|whatsapp\.com\/send)/i;

  const parseMailto = (href) => {
    try {
      const raw = String(href || '');
      if (!/^mailto:/i.test(raw)) return { to: '', subject: '', body: '' };
      const withoutScheme = raw.slice(7);
      const q = withoutScheme.indexOf('?');
      const to = decodeURIComponent((q === -1 ? withoutScheme : withoutScheme.slice(0, q)).split(',')[0] || '');
      const params = new URLSearchParams(q === -1 ? '' : withoutScheme.slice(q + 1));
      return {
        to,
        subject: params.get('subject') || '',
        body: params.get('body') || ''
      };
    } catch {
      return { to: '', subject: '', body: '' };
    }
  };

  const isWhatsappHref = (href) => WHATSAPP_RE.test(String(href || ''));

  const isCallbackIntent = ({ ctaId, href, text, mailtoSubject }) => {
    if (ctaId === 'contact-call') return true;
    if (/#call\b/i.test(href || '')) return true;
    if (/callback/i.test(mailtoSubject || '')) return true;
    if (/callback/i.test(`${ctaId || ''} ${text || ''} ${href || ''}`)) return true;
    return false;
  };

  // Clicks on [data-cta], Apply header, course/join CTAs, Contact nav, mailto, WhatsApp
  document.addEventListener('click', (event) => {
    const el = event.target instanceof Element
      ? event.target.closest('a, button, [data-cta]')
      : null;
    if (!el) return;

    const ctaId = el.getAttribute('data-cta') || '';
    const href = el.getAttribute('href') || '';
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const isHeaderCta = el.classList.contains('header-cta');
    const isMailto = /^mailto:/i.test(href);
    const isWhatsapp = isWhatsappHref(href);
    const mailto = isMailto ? parseMailto(href) : { to: '', subject: '', body: '' };
    const isCallback = isCallbackIntent({
      ctaId,
      href,
      text,
      mailtoSubject: mailto.subject
    });
    const isAcademyMailto = isMailto && ACADEMY_MAIL_RE.test(mailto.to || href);
    const isJoin = /join\.html|\/join/i.test(href);
    const isContactNav = ctaId.startsWith('contact-') || /\/contact#/i.test(href);
    const isCourseCta =
      isJoin ||
      /course=/i.test(href) ||
      /\/courses\//i.test(href) && el.classList.contains('btn');

    if (
      !ctaId &&
      !isHeaderCta &&
      !isMailto &&
      !isWhatsapp &&
      !isJoin &&
      !isContactNav &&
      !isCourseCta
    ) {
      return;
    }

    let type = 'cta';
    if (isWhatsapp) type = 'whatsapp';
    else if (isCallback && (isMailto || ctaId === 'contact-call' || /#call\b/i.test(href))) {
      type = 'callback';
    } else if (isMailto) type = 'mailto';
    else if (isContactNav) type = 'contact_nav';
    else if (isHeaderCta || isJoin) type = 'apply';
    else if (isCourseCta) type = 'course_cta';
    else if (ctaId) type = 'cta';

    const leadIntent =
      type === 'whatsapp' ||
      type === 'callback' ||
      isAcademyMailto ||
      (isMailto && (ctaId.startsWith('contact-') || isCallback));

    const navItem = el.closest('.nav-submenu')
      ? (el.querySelector('.nav-product-title')?.textContent || text)
      : '';

    notifyBeacon({
      type,
      label:
        type === 'callback'
          ? 'Callback request'
          : type === 'whatsapp'
            ? text || 'WhatsApp'
            : ctaId || text || href || type,
      ctaId: ctaId || (isHeaderCta ? 'header-cta' : ''),
      href,
      text,
      tag: el.tagName.toLowerCase(),
      navItem: (navItem || '').trim(),
      slug:
        type === 'callback'
          ? 'callback'
          : courseSlugFromHref(href) || courseSlugFromHref(window.location.href),
      leadIntent: leadIntent ? '1' : '',
      mailtoTo: mailto.to || '',
      mailtoSubject: mailto.subject || '',
      intent:
        type === 'callback'
          ? 'callback'
          : type === 'whatsapp'
            ? 'whatsapp'
            : isAcademyMailto
              ? 'academy_email'
              : ''
    });
  }, true);

  // FAQ accordion opens
  document.querySelectorAll('details.faq-item').forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const summary = details.querySelector('summary');
      const question = (summary?.textContent || '').replace(/\s+/g, ' ').trim();
      notifyBeacon({
        type: 'faq',
        label: question || 'faq',
        faq: question,
        faqSection: details.closest('section')?.id || details.closest('[id]')?.id || '',
        text: question
      });
    });
  });

  // Form field engagement (Contact / Apply / open-day)
  document.querySelectorAll('form.form-stack').forEach((form) => {
    let started = false;
    const markStart = (fieldName) => {
      if (started) return;
      started = true;
      notifyBeacon({
        type: 'form_start',
        label: form.getAttribute('data-notify-form') || 'form',
        ctaId: form.getAttribute('data-notify-form') || 'form-stack',
        text: fieldName || ''
      });
    };
    form.addEventListener('focusin', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const name = t.getAttribute('name') || t.tagName.toLowerCase();
      markStart(name);
      notifyBeacon({
        type: 'form_focus',
        label: name,
        ctaId: form.getAttribute('data-notify-form') || 'form-stack',
        text: name
      });
    });
  });

  const CONTACT_CHANNEL_MSG =
    'Please leave an email or phone number so we can get back to you.';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Lead forms: email or phone (at least one). Contact/journal: email required.
   * @param {HTMLFormElement} form
   * @param {boolean} isJournalForm
   * @param {boolean} requireEmail
   * @returns {string} empty when valid, else British English error
   */
  const looksLikeEmail = (value) => EMAIL_RE.test(String(value || '').trim());
  const looksLikePhone = (value) => {
    const raw = String(value || '').trim();
    if (!raw || looksLikeEmail(raw)) return false;
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 7;
  };

  const validateLeadContactChannel = (form, isJournalForm, requireEmail) => {
    const emailEl = form.querySelector('input[name="email"]');
    const phoneEl = form.querySelector('input[name="phone"]');
    const email = emailEl instanceof HTMLInputElement ? emailEl.value.trim() : '';
    const phone = phoneEl instanceof HTMLInputElement ? phoneEl.value.trim() : '';
    const isJoin = form.getAttribute('data-notify-form') === 'join';

    if (isJournalForm || requireEmail) {
      if (!email || !looksLikeEmail(email)) {
        return 'Please enter a valid email address.';
      }
      if (phone && looksLikeEmail(phone)) {
        return 'Please put email addresses in the email field, not the phone field.';
      }
      return '';
    }

    if (!email && !phone) {
      return CONTACT_CHANNEL_MSG;
    }
    if (email && !looksLikeEmail(email)) {
      return 'Please enter a valid email address in the email field.';
    }
    if (phone && looksLikeEmail(phone)) {
      return 'Please put email addresses in the email field, not the phone field.';
    }
    if (isJoin && phone && !looksLikePhone(phone)) {
      return 'Please enter a valid phone number in the phone field.';
    }
    return '';
  };

  /**
   * Confirm details modal before sending forms with data-confirm-details.
   * @param {Record<string, string>} payload
   * @returns {Promise<boolean>} true to send, false to edit
   */
  const confirmLeadDetails = (payload) => {
    const rows = [
      ['Name', payload.name],
      ['Email', payload.email],
      ['Topic', payload.topic || payload.interest],
      ['Phone', payload.phone],
      ['Message', payload.message]
    ].filter(([, v]) => v && String(v).trim());

    return new Promise((resolve) => {
      const existing = document.getElementById('lead-confirm-dialog');
      if (existing) existing.remove();

      const dialog = document.createElement('div');
      dialog.id = 'lead-confirm-dialog';
      dialog.className = 'lead-confirm';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'lead-confirm-title');

      const listHtml = rows
        .map(
          ([label, value]) =>
            `<div class="lead-confirm__row"><dt>${label}</dt><dd>${String(value)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')}</dd></div>`
        )
        .join('');

      dialog.innerHTML = `
        <div class="lead-confirm__backdrop" data-lead-confirm="edit"></div>
        <div class="lead-confirm__panel">
          <h2 class="lead-confirm__title" id="lead-confirm-title">Are these details correct?</h2>
          <p class="lead-confirm__lede">We will email you a copy of everything below once it is sent.</p>
          <dl class="lead-confirm__list">${listHtml}</dl>
          <div class="lead-confirm__actions">
            <button type="button" class="btn btn-secondary" data-lead-confirm="edit">Edit</button>
            <button type="button" class="btn btn-primary" data-lead-confirm="send">Looks correct — send</button>
          </div>
        </div>`;

      const finish = (ok) => {
        document.removeEventListener('keydown', onKey);
        dialog.remove();
        document.body.classList.remove('lead-confirm-open');
        resolve(ok);
      };

      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      };

      dialog.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const action = t.getAttribute('data-lead-confirm');
        if (action === 'edit') finish(false);
        if (action === 'send') finish(true);
      });

      document.addEventListener('keydown', onKey);
      document.body.classList.add('lead-confirm-open');
      document.body.appendChild(dialog);
      const sendBtn = dialog.querySelector('[data-lead-confirm="send"]');
      if (sendBtn instanceof HTMLElement) sendBtn.focus();
    });
  };

  // Join form: show Foundation Training intake questions for foundation pathways
  const isFoundationApplicationInterest = (select) => {
    if (!(select instanceof HTMLSelectElement)) return false;
    const option = select.options[select.selectedIndex];
    const slug = String(option?.dataset?.slug || '').toLowerCase();
    const value = String(select.value || '').toLowerCase();
    if (slug.includes('open-day') || value.includes('open day')) return false;
    return (
      slug === 'foundation-training' ||
      slug === 'foundation-200' ||
      slug === 'foundation-300' ||
      (/foundation/.test(slug) && !/open-day/.test(slug)) ||
      (/foundation/.test(value) && !/open day/.test(value))
    );
  };

  const syncJoinContactLabels = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    const interest = form.querySelector('[data-join-interest]');
    const showFoundation =
      interest instanceof HTMLSelectElement &&
      isFoundationApplicationInterest(interest);
    const help = form.querySelector('[data-join-form-help]');
    const emailLabel = form.querySelector('[data-join-email-label]');
    const emailReq = form.querySelector('[data-join-email-req]');
    const phoneReq = form.querySelector('[data-join-phone-req]');
    const emailInput = form.querySelector('[data-join-email]');
    const phoneInput = form.querySelector('[data-join-phone]');

    if (help instanceof HTMLElement) {
      help.innerHTML = showFoundation
        ? 'Fields marked <span class="form-required">required</span> must be completed. Foundation Training needs an email for course material. Phone is optional.'
        : 'Fields marked <span class="form-required">required</span> must be completed. For contact details, leave at least an email or a phone number.';
    }

    if (emailLabel instanceof HTMLElement) {
      emailLabel.textContent = showFoundation
        ? 'Please tell us your email (the one you want course material sent to)'
        : 'Please tell us your email';
    }

    if (emailReq instanceof HTMLElement) {
      emailReq.className = 'form-required';
      emailReq.textContent = showFoundation
        ? 'required'
        : 'required if no phone';
    }

    if (phoneReq instanceof HTMLElement) {
      phoneReq.className = 'form-optional';
      phoneReq.textContent = showFoundation
        ? 'optional'
        : 'optional if you leave an email';
    }

    if (emailInput instanceof HTMLInputElement) {
      emailInput.disabled = false;
      emailInput.required = showFoundation;
    }

    if (phoneInput instanceof HTMLInputElement) {
      phoneInput.disabled = false;
      phoneInput.required = false;
    }
  };

  const DOB_MONTHS = [
    ['01', 'January'],
    ['02', 'February'],
    ['03', 'March'],
    ['04', 'April'],
    ['05', 'May'],
    ['06', 'June'],
    ['07', 'July'],
    ['08', 'August'],
    ['09', 'September'],
    ['10', 'October'],
    ['11', 'November'],
    ['12', 'December']
  ];

  const daysInMonth = (year, month) => {
    const y = Number(year);
    const m = Number(month);
    if (!y || !m) return 31;
    return new Date(y, m, 0).getDate();
  };

  const syncJoinDobValue = (form) => {
    const yearEl = form.querySelector('[data-join-dob-year]');
    const monthEl = form.querySelector('[data-join-dob-month]');
    const dayEl = form.querySelector('[data-join-dob-day]');
    const valueEl = form.querySelector('[data-join-dob-value]');
    if (
      !(yearEl instanceof HTMLSelectElement) ||
      !(monthEl instanceof HTMLSelectElement) ||
      !(dayEl instanceof HTMLSelectElement) ||
      !(valueEl instanceof HTMLInputElement)
    ) {
      return '';
    }
    const year = yearEl.value;
    const month = monthEl.value;
    const day = dayEl.value;
    if (year && month && day) {
      valueEl.value = `${year}-${month}-${day}`;
    } else {
      valueEl.value = '';
    }
    return valueEl.value;
  };

  const refreshJoinDobDays = (form, { keepDay } = {}) => {
    const yearEl = form.querySelector('[data-join-dob-year]');
    const monthEl = form.querySelector('[data-join-dob-month]');
    const dayEl = form.querySelector('[data-join-dob-day]');
    if (
      !(yearEl instanceof HTMLSelectElement) ||
      !(monthEl instanceof HTMLSelectElement) ||
      !(dayEl instanceof HTMLSelectElement)
    ) {
      return;
    }
    const previousDay = keepDay || dayEl.value;
    const maxDay = daysInMonth(yearEl.value, monthEl.value);
    dayEl.innerHTML = '<option value="">Day</option>';
    for (let d = 1; d <= maxDay; d += 1) {
      const value = String(d).padStart(2, '0');
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = String(d);
      dayEl.appendChild(opt);
    }
    if (previousDay && Number(previousDay) <= maxDay) {
      dayEl.value = previousDay;
    }
    syncJoinDobValue(form);
  };

  const setJoinDobFromIso = (form, iso) => {
    const yearEl = form.querySelector('[data-join-dob-year]');
    const monthEl = form.querySelector('[data-join-dob-month]');
    const dayEl = form.querySelector('[data-join-dob-day]');
    const valueEl = form.querySelector('[data-join-dob-value]');
    if (
      !(yearEl instanceof HTMLSelectElement) ||
      !(monthEl instanceof HTMLSelectElement) ||
      !(dayEl instanceof HTMLSelectElement)
    ) {
      return;
    }
    const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      yearEl.value = '';
      monthEl.value = '';
      refreshJoinDobDays(form);
      if (valueEl instanceof HTMLInputElement) valueEl.value = '';
      return;
    }
    yearEl.value = match[1];
    monthEl.value = match[2];
    refreshJoinDobDays(form, { keepDay: match[3] });
  };

  const initJoinDob = (form) => {
    const yearEl = form.querySelector('[data-join-dob-year]');
    const monthEl = form.querySelector('[data-join-dob-month]');
    const dayEl = form.querySelector('[data-join-dob-day]');
    if (
      !(yearEl instanceof HTMLSelectElement) ||
      !(monthEl instanceof HTMLSelectElement) ||
      !(dayEl instanceof HTMLSelectElement)
    ) {
      return;
    }
    if (!yearEl.dataset.ready) {
      const now = new Date();
      const maxYear = now.getFullYear() - 16;
      const minYear = 1925;
      yearEl.innerHTML = '<option value="">Year</option>';
      for (let y = maxYear; y >= minYear; y -= 1) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        yearEl.appendChild(opt);
      }
      monthEl.innerHTML = '<option value="">Month</option>';
      DOB_MONTHS.forEach(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        monthEl.appendChild(opt);
      });
      refreshJoinDobDays(form);
      yearEl.dataset.ready = '1';
      monthEl.dataset.ready = '1';
    }

    const onChange = () => {
      refreshJoinDobDays(form, { keepDay: dayEl.value });
    };
    yearEl.addEventListener('change', onChange);
    monthEl.addEventListener('change', onChange);
    dayEl.addEventListener('change', () => syncJoinDobValue(form));
  };

  const syncJoinFoundationFields = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    const interest = form.querySelector('[data-join-interest]');
    const foundationBlock = form.querySelector('[data-join-foundation-fields]');
    const generalBlock = form.querySelector('[data-join-general-fields]');
    const experienceInput = form.querySelector('[data-join-experience]');
    if (!foundationBlock || !(interest instanceof HTMLSelectElement)) return;

    const showFoundation = isFoundationApplicationInterest(interest);
    foundationBlock.hidden = !showFoundation;

    foundationBlock.querySelectorAll('[data-foundation-field]').forEach((field) => {
      if (
        !(
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement
        )
      ) {
        return;
      }
      field.disabled = !showFoundation;
      if (field instanceof HTMLInputElement && field.type === 'hidden') {
        field.required = false;
      } else {
        field.required = showFoundation;
      }
      if (!showFoundation) field.value = '';
    });

    if (!showFoundation) {
      refreshJoinDobDays(form);
      syncJoinDobValue(form);
    } else {
      syncJoinDobValue(form);
    }

    if (generalBlock instanceof HTMLElement) {
      generalBlock.hidden = showFoundation;
    }

    if (experienceInput instanceof HTMLTextAreaElement) {
      // Foundation applications already cover practice history; do not ask twice.
      experienceInput.disabled = showFoundation;
      experienceInput.required = !showFoundation;
      if (showFoundation) {
        experienceInput.value = '';
        experienceInput.removeAttribute('required');
      }
    }

    syncJoinContactLabels(form);
  };

  document.querySelectorAll('form[data-notify-form="join"]').forEach((form) => {
    initJoinDob(form);
    const interest = form.querySelector('[data-join-interest]');
    if (interest instanceof HTMLSelectElement) {
      interest.addEventListener('change', () => syncJoinFoundationFields(form));
    }
    syncJoinFoundationFields(form);
  });

  // Join form draft: keep answers for this browser session until Submit enquiry
  const JOIN_DRAFT_KEY = 'twa_join_draft_v1';
  const JOIN_SUBMITTED_KEY = 'twa_join_submitted_sessions_v1';
  const JOIN_DRAFT_SKIP = new Set([
    'website',
    'company_url',
    'contactChannel',
    'dobYear',
    'dobMonth',
    'dobDay'
  ]);

  const readJsonStorage = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const writeJsonStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / quota */
    }
  };

  const getSubmittedJoinSessions = () => {
    const list = readJsonStorage(JOIN_SUBMITTED_KEY, []);
    return Array.isArray(list) ? list.map(String) : [];
  };

  const markJoinSessionSubmitted = (sessionId) => {
    if (!sessionId) return;
    const next = getSubmittedJoinSessions().filter((id) => id !== sessionId);
    next.push(sessionId);
    writeJsonStorage(JOIN_SUBMITTED_KEY, next.slice(-30));
  };

  const isJoinSessionSubmitted = (sessionId) =>
    getSubmittedJoinSessions().includes(String(sessionId || ''));

  const collectJoinDraftValues = (form) => {
    syncJoinDobValue(form);
    /** @type {Record<string, string>} */
    const values = {};
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
        return;
      }
      const name = el.name;
      if (!name || JOIN_DRAFT_SKIP.has(name) || el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) values[name] = el.value;
        return;
      }
      // Keep draft values even when foundation fields are temporarily disabled
      values[name] = el.value;
    });
    return values;
  };

  const applyJoinDraftValues = (form, values) => {
    if (!values || typeof values !== 'object') return;
    Object.entries(values).forEach(([name, value]) => {
      if (name === 'dateOfBirth') return;
      const field = form.querySelector(`[name="${CSS.escape(name)}"]`);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
        return;
      }
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = field.value === value;
        return;
      }
      field.disabled = false;
      field.value = String(value == null ? '' : value);
    });
    syncJoinFoundationFields(form);
    if (values.dateOfBirth) {
      setJoinDobFromIso(form, values.dateOfBirth);
    }
  };

  const setJoinDraftStatus = (form, message, state) => {
    let status = form.querySelector('[data-join-draft-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'form-draft-status';
      status.setAttribute('data-join-draft-status', '');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) form.insertBefore(status, submitBtn);
      else form.appendChild(status);
    }
    if (!message) {
      status.hidden = true;
      status.textContent = '';
      status.removeAttribute('data-state');
      return;
    }
    status.hidden = false;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else status.removeAttribute('data-state');
  };

  const saveJoinDraft = (form, { silent } = {}) => {
    const sessionId = getSessionId();
    if (isJoinSessionSubmitted(sessionId)) {
      try {
        localStorage.removeItem(JOIN_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      return false;
    }
    const values = collectJoinDraftValues(form);
    const hasContent = Object.values(values).some((v) => String(v || '').trim());
    if (!hasContent) {
      try {
        localStorage.removeItem(JOIN_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      if (!silent) setJoinDraftStatus(form, '');
      return false;
    }
    writeJsonStorage(JOIN_DRAFT_KEY, {
      sessionId,
      savedAt: new Date().toISOString(),
      values
    });
    if (!silent) {
      setJoinDraftStatus(
        form,
        'Draft saved in this browser. You can leave and come back to edit until you submit.',
        'saved'
      );
    }
    return true;
  };

  const clearJoinDraftAfterSubmit = (form) => {
    const sessionId = getSessionId();
    markJoinSessionSubmitted(sessionId);
    try {
      localStorage.removeItem(JOIN_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    rotateSessionId();
    setJoinDraftStatus(
      form,
      'Enquiry submitted. This draft can no longer be restored.',
      'locked'
    );
  };

  const restoreJoinDraft = (form) => {
    const sessionId = getSessionId();
    if (isJoinSessionSubmitted(sessionId)) {
      try {
        localStorage.removeItem(JOIN_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setJoinDraftStatus(
        form,
        'An enquiry was already submitted in this browser session. Start a new one below if needed.',
        'locked'
      );
      return false;
    }

    const draft = readJsonStorage(JOIN_DRAFT_KEY, null);
    if (!draft || typeof draft !== 'object') return false;
    if (String(draft.sessionId || '') !== sessionId) return false;
    if (!draft.values || typeof draft.values !== 'object') return false;

    applyJoinDraftValues(form, draft.values);
    setJoinDraftStatus(
      form,
      'Draft restored. You can keep editing until you submit the enquiry.',
      'restored'
    );
    return true;
  };

  document.querySelectorAll('form[data-notify-form="join"]').forEach((form) => {
    let draftTimer = 0;
    const queueDraftSave = () => {
      window.clearTimeout(draftTimer);
      draftTimer = window.setTimeout(() => saveJoinDraft(form), 400);
    };

    restoreJoinDraft(form);

    form.addEventListener('input', queueDraftSave);
    form.addEventListener('change', queueDraftSave);
    window.addEventListener('pagehide', () => saveJoinDraft(form, { silent: true }));
  });

  // Enquiry forms → /api/notify/lead (Discord), mailto fallback if API unavailable
  document.querySelectorAll('form.form-stack[data-notify-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      const formSource = form.getAttribute('data-notify-form') || '';
      const isJournalForm = /journal[-_]?subscribe/i.test(formSource);
      const isSuggestForm = /suggest[-_]?course/i.test(formSource);
      const isContactForm = /^contact$/i.test(formSource);
      const needsConfirm = form.hasAttribute('data-confirm-details');

      const showStatus = (msg, ok) => {
        let status = form.querySelector('.form-notify-status');
        if (!status) {
          status = document.createElement('p');
          status.className = 'form-notify-status';
          status.setAttribute('role', 'status');
          status.setAttribute('aria-live', 'polite');
          form.appendChild(status);
        }
        status.hidden = false;
        status.textContent = msg;
        status.dataset.state = ok ? 'ok' : 'error';
      };

      const channelError = validateLeadContactChannel(
        form,
        isJournalForm,
        isContactForm || needsConfirm
      );
      if (channelError) {
        showStatus(channelError, false);
        const emailEl = form.querySelector('input[name="email"]');
        const phoneEl = form.querySelector('input[name="phone"]');
        const focusEl =
          !isJournalForm &&
          !isContactForm &&
          !needsConfirm &&
          phoneEl instanceof HTMLInputElement &&
          !emailEl?.value?.trim()
            ? phoneEl
            : emailEl;
        if (focusEl instanceof HTMLElement) focusEl.focus();
        return;
      }

      if (isContactForm) {
        const topicEl = form.querySelector('select[name="topic"], select[name="interest"]');
        const topicVal =
          topicEl instanceof HTMLSelectElement ? topicEl.value.trim() : '';
        if (!topicVal) {
          showStatus('Please choose a topic.', false);
          if (topicEl instanceof HTMLElement) topicEl.focus();
          return;
        }
      }

      const interestSelect = form.querySelector('select[name="interest"]');
      const isFoundationJoin =
        formSource === 'join' && isFoundationApplicationInterest(interestSelect);
      if (isFoundationJoin) {
        const emailEl = form.querySelector('input[name="email"]');
        const emailVal =
          emailEl instanceof HTMLInputElement ? emailEl.value.trim() : '';
        if (!emailVal) {
          showStatus(
            'Please leave the email you want course material sent to.',
            false
          );
          if (emailEl instanceof HTMLElement) emailEl.focus();
          return;
        }
        const dob = syncJoinDobValue(form);
        if (!dob) {
          showStatus('Please choose your date of birth: year, then month, then day.', false);
          const yearEl = form.querySelector('[data-join-dob-year]');
          if (yearEl instanceof HTMLElement) yearEl.focus();
          return;
        }
      }

      const fd = new FormData(form);
      const selected = form.querySelector('select[name="topic"], select[name="interest"]');
      const selectedOption = selected instanceof HTMLSelectElement
        ? selected.options[selected.selectedIndex]
        : null;
      const slug = selectedOption?.dataset?.slug || courseSlugFromHref(window.location.href) || '';

      /** @type {Record<string, string>} */
      const payload = {
        source: form.getAttribute('data-notify-form') || 'enquiry',
        page: window.location.href,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || '',
        slug,
        sessionId: getSessionId(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        title: document.title || ''
      };
      fd.forEach((value, key) => {
        if (typeof value === 'string') payload[key] = value;
      });

      if (needsConfirm) {
        const confirmed = await confirmLeadDetails(payload);
        if (!confirmed) {
          showStatus('Edit your details below, then review again.', false);
          const nameEl = form.querySelector('input[name="name"]');
          if (nameEl instanceof HTMLElement) nameEl.focus();
          return;
        }
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isJournalForm
          ? 'Subscribing…'
          : isSuggestForm
            ? 'Sending suggestion…'
            : 'Sending…';
      }

      const restoreBtn = () => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel || 'Submit';
        }
      };

      const openMailtoFallback = (reason) => {
        const topic = payload.topic || payload.interest || payload.source || 'website';
        const isCallback =
          /callback/i.test(String(topic)) || String(payload.slug || '') === 'callback';
        const isJournal =
          /journal[-_]?subscribe/i.test(String(payload.source || '')) ||
          /journal/i.test(String(topic));
        const isSuggest =
          /suggest[-_]?course/i.test(String(payload.source || '')) ||
          /suggest/i.test(String(topic)) ||
          String(payload.slug || '') === 'suggest-course';
        const mailtoBase = form.getAttribute('data-mailto-fallback')
          || 'mailto:contact@thameswellness.com';
        const subjectText = isCallback
          ? 'Callback request'
          : isJournal
            ? 'Journal subscribe'
            : isSuggest
              ? 'Suggest a course'
              : `TWA enquiry: ${topic}`;
        const subject = encodeURIComponent(subjectText);
        const bodyLines = Object.entries(payload)
          .filter(([k]) => !['sessionId', 'viewport', 'path'].includes(k))
          .map(([k, v]) => `${k}: ${v}`);
        const mailtoHref = `${mailtoBase}?subject=${subject}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

        // Founders still see the intent even when Discord lead webhook is down
        notifyBeacon({
          type: isCallback ? 'callback' : 'mailto',
          label: isCallback
            ? 'Callback request'
            : isJournal
              ? 'Journal subscribe mailto fallback'
              : isSuggest
                ? 'Suggest a course mailto fallback'
                : `Form mailto fallback: ${payload.source || 'enquiry'}`,
          ctaId: form.getAttribute('data-notify-form') || 'form-stack',
          href: mailtoHref,
          text: topic,
          leadIntent: '1',
          intent: isCallback ? 'callback' : 'form_mailto_fallback',
          mailtoTo: 'contact@thameswellness.com',
          mailtoSubject: subjectText,
          fallbackReason: reason || 'lead_api_failed',
          slug: isCallback ? 'callback' : (payload.slug || '')
        });

        showStatus(
          isJournal
            ? 'Opening your email app so we still receive your journal subscription…'
            : isSuggest
              ? 'Opening your email app so your course suggestion still reaches the Academy…'
              : 'Opening your email app so the message still reaches the Academy…',
          false
        );
        window.location.href = mailtoHref;
        restoreBtn();
      };

      try {
        const res = await fetch('/api/notify/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin'
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          showStatus(
            data.message ||
              'Thank you. Your enquiry has been sent. Please check your email for a confirmation.',
            true
          );
          if (formSource === 'join') {
            clearJoinDraftAfterSubmit(form);
          }
          form.reset();
          if (formSource === 'join') {
            syncJoinFoundationFields(form);
          }
          restoreBtn();
          return;
        }
        // Webhook not configured or delivery failed: fall back to mailto
        if (res.status === 503 || res.status >= 500 || data.ok === false) {
          openMailtoFallback(
            data.error || `lead_http_${res.status}`
          );
          return;
        }
        showStatus(data.error || 'Something went wrong. Please email contact@thameswellness.com.', false);
        restoreBtn();
      } catch (err) {
        openMailtoFallback(err && err.message ? err.message : 'network_error');
      }
    });
  });

  // Contact v1 slider
  document.querySelectorAll('.contact-v1-slider').forEach(slider => {
    const slides = slider.querySelectorAll('.contact-v1-slide');
    const dots = slider.querySelectorAll('.contact-v1-slider-dot');
    const prevBtn = slider.querySelector('.contact-v1-slider-btn--prev');
    const nextBtn = slider.querySelector('.contact-v1-slider-btn--next');
    if (!slides.length) return;

    let current = 0;

    const goTo = index => {
      current = (index + slides.length) % slides.length;

      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === current);
        dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
      });
    };

    prevBtn?.addEventListener('click', () => goTo(current - 1));
    nextBtn?.addEventListener('click', () => goTo(current + 1));

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = Number(dot.dataset.slide);
        if (!Number.isNaN(index)) goTo(index);
      });
    });
  });

  // Teachers page search filter
  const teacherSearch = document.getElementById('teacher-search-input');
  if (teacherSearch) {
    const cards = document.querySelectorAll('.teacher-card');
    const empty = document.querySelector('.teachers-search-empty');

    const filterTeachers = () => {
      const q = teacherSearch.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const match = !q || card.textContent.toLowerCase().includes(q);
        card.classList.toggle('is-hidden', !match);
        if (match) visible += 1;
      });
      if (empty) empty.hidden = visible > 0;
    };

    teacherSearch.addEventListener('input', filterTeachers);

    if (window.location.hash === '#teachers-search') {
      teacherSearch.focus();
    }
  }

  // Courses hub catalog filter (type chips + search) and card/list views
  const coursesCatalogRoot = document.getElementById('courses-catalog');
  const coursesCatalogGrid = document.getElementById('courses-catalog-grid');
  if (coursesCatalogRoot && coursesCatalogGrid) {
    const chips = Array.from(document.querySelectorAll('button.courses-catalog-chip[data-type]'));
    const viewButtons = Array.from(document.querySelectorAll('.courses-catalog-view-btn'));
    const countEl = document.getElementById('courses-catalog-count');
    const emptyEl = document.getElementById('courses-catalog-empty');
    const listEl = document.getElementById('courses-catalog-list');
    const cards = Array.from(coursesCatalogGrid.querySelectorAll('.course-card'));
    let activeType = 'all';
    let activeView = 'cards';

    const params = new URLSearchParams(window.location.search);
    const typeFromQuery = (params.get('type') || params.get('category') || '').toLowerCase();
    const typeFromHash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
    const requestedType = typeFromQuery || typeFromHash;
    const knownTypes = new Set(chips.map((chip) => chip.dataset.type).filter(Boolean));
    if (requestedType === 'workshops') {
      window.location.replace('workshops/');
      return;
    }
    if (requestedType === 'retreats') {
      window.location.replace('retreats/');
      return;
    }
    if (requestedType && knownTypes.has(requestedType)) {
      activeType = requestedType;
    }
    const viewFromQuery = (params.get('view') || '').toLowerCase();
    if (viewFromQuery === 'list' || viewFromQuery === 'cards') {
      activeView = viewFromQuery;
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const setActiveChip = (type) => {
      chips.forEach((chip) => {
        const isActive = chip.dataset.type === type;
        chip.classList.toggle('is-active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    const setActiveView = (view) => {
      activeView = view === 'list' ? 'list' : 'cards';
      coursesCatalogRoot.dataset.view = activeView;
      viewButtons.forEach((btn) => {
        const isActive = btn.dataset.view === activeView;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      if (listEl) listEl.hidden = activeView !== 'list';
    };

    const cardMatches = (card) => {
      const type = (card.dataset.type || '').toLowerCase();
      return activeType === 'all' || type === activeType;
    };

    const buildListView = (visibleCards) => {
      if (!listEl) return;
      listEl.innerHTML = '';
      if (!visibleCards.length) return;

      const dated = [];
      const undated = [];
      visibleCards.forEach((card) => {
        const start = (card.dataset.start || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
          dated.push(card);
        } else {
          undated.push(card);
        }
      });

      dated.sort((a, b) => String(a.dataset.start).localeCompare(String(b.dataset.start)));

      const years = new Map();
      dated.forEach((card) => {
        const start = card.dataset.start;
        const year = start.slice(0, 4);
        const month = Number(start.slice(5, 7));
        if (!years.has(year)) years.set(year, new Map());
        const months = years.get(year);
        if (!months.has(month)) months.set(month, []);
        months.get(month).push(card);
      });

      const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      const appendListItem = (ul, card) => {
        const title = (card.querySelector('h3') || {}).textContent || 'Programme';
        const summary = (card.querySelector('p') || {}).textContent || '';
        const tag = (card.querySelector('.tag') || {}).textContent || '';
        const cta = (card.querySelector('.card-link') || {}).textContent || 'Open';
        const dateLabel = card.dataset.dateLabel || 'Dates on enquiry';
        const type = (card.dataset.type || 'other').toLowerCase();
        const start = (card.dataset.start || '').trim();
        const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(start);
        const day = hasDate ? String(Number(start.slice(8, 10))) : '';
        const li = document.createElement('li');
        li.className = 'courses-catalog-list-item courses-catalog-list-item--' + type +
          (hasDate ? '' : ' courses-catalog-list-item--undated');
        li.innerHTML =
          '<a class="courses-catalog-list-link" href="' + escapeHtml(card.getAttribute('href') || '#') + '">' +
            '<span class="courses-catalog-list-date">' +
              (hasDate ? '<span class="courses-catalog-list-day">' + escapeHtml(day) + '</span>' : '') +
              '<span class="courses-catalog-list-date-full">' + escapeHtml(dateLabel) + '</span>' +
            '</span>' +
            '<span class="courses-catalog-list-main">' +
              (tag ? '<span class="courses-catalog-list-tag">' + escapeHtml(tag) + '</span>' : '') +
              '<p class="courses-catalog-list-title">' + escapeHtml(title) + '</p>' +
              (summary ? '<p class="courses-catalog-list-summary">' + escapeHtml(summary) + '</p>' : '') +
            '</span>' +
            '<span class="courses-catalog-list-cta">' + escapeHtml(cta) + '</span>' +
          '</a>';
        ul.appendChild(li);
      };

      years.forEach((months, year) => {
        const yearBlock = document.createElement('section');
        yearBlock.className = 'courses-catalog-year';
        yearBlock.innerHTML = '<h3 class="courses-catalog-year-title">' + year + '</h3>';
        const sortedMonths = Array.from(months.keys()).sort((a, b) => a - b);
        sortedMonths.forEach((month) => {
          const monthBlock = document.createElement('div');
          monthBlock.className = 'courses-catalog-month';
          monthBlock.innerHTML =
            '<h4 class="courses-catalog-month-title">' + monthNames[month - 1] + '</h4>';
          const ul = document.createElement('ul');
          ul.className = 'courses-catalog-list-items';
          months.get(month).forEach((card) => appendListItem(ul, card));
          monthBlock.appendChild(ul);
          yearBlock.appendChild(monthBlock);
        });
        listEl.appendChild(yearBlock);
      });

      if (undated.length) {
        const yearBlock = document.createElement('section');
        yearBlock.className = 'courses-catalog-year';
        yearBlock.innerHTML = '<h3 class="courses-catalog-year-title">Dates on enquiry</h3>';
        const monthBlock = document.createElement('div');
        monthBlock.className = 'courses-catalog-month';
        const ul = document.createElement('ul');
        ul.className = 'courses-catalog-list-items';
        undated.forEach((card) => appendListItem(ul, card));
        monthBlock.appendChild(ul);
        yearBlock.appendChild(monthBlock);
        listEl.appendChild(yearBlock);
      }
    };

    const filterCourses = () => {
      const visibleCards = [];

      cards.forEach((card) => {
        const match = cardMatches(card);
        card.classList.toggle('is-hidden', !match);
        if (match) visibleCards.push(card);
      });

      if (activeView === 'list') {
        buildListView(visibleCards);
      }

      if (countEl) {
        const label = activeType === 'all' ? 'programmes' : activeType;
        countEl.textContent = visibleCards.length === 1
          ? 'Showing 1 ' + label.replace(/s$/, '')
          : 'Showing ' + visibleCards.length + ' ' + label;
      }
      if (emptyEl) emptyEl.hidden = visibleCards.length > 0;
    };

    const writeUrlState = () => {
      const url = new URL(window.location.href);
      if (activeType === 'all') {
        url.searchParams.delete('type');
      } else {
        url.searchParams.set('type', activeType);
      }
      if (activeView === 'cards') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', activeView);
      }
      window.history.replaceState({}, '', url);
    };

    setActiveChip(activeType);
    setActiveView(activeView);

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        activeType = chip.dataset.type || 'all';
        setActiveChip(activeType);
        writeUrlState();
        filterCourses();
      });
    });

    viewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveView(btn.dataset.view || 'cards');
        writeUrlState();
        filterCourses();
      });
    });

    filterCourses();
  }

  // Deep-link course / topic preselection on Apply and Contact forms
  // Supports ?course=, ?topic=, or ?interest= (slug or option value)
  const COURSE_ALIASES = {
    '200-hour': 'foundation-200',
    '200hr': 'foundation-200',
    'foundation': 'foundation-training',
    'foundation-yoga': 'foundation-training',
    'foundation-yoga-training': 'foundation-training',
    'foundation-tt': 'foundation-200',
    '300-hour': 'foundation-300',
    '300hr': 'foundation-300',
    'foundation-300-hour': 'foundation-300',
    'sound-bath': 'soundbath',
    'soundbath-training': 'soundbath',
    'sound-facilitator': 'soundbath',
    'pregnancy': 'pregnancy-yoga',
    'nidra': 'yoga-nidra',
    'anatomy': 'functional-anatomy',
    'open-day-200': 'open-day-foundation',
    'open-day-foundation-training': 'open-day-foundation',
    'cpd-open-day': 'open-day-cpd',
    'open-day-cpd-courses': 'open-day-cpd',
    'ashtanga-assistant-teacher-training': 'ashtanga-assistant-tt',
    'ashtanga-120': 'ashtanga-assistant-tt',
    'assistant-teacher-training': 'ashtanga-assistant-tt',
    'ashtanga-assistant': 'ashtanga-assistant-tt',
    'not-sure-yet': 'not-sure',
    suggest: 'suggest-course',
    'suggest-a-course': 'suggest-course'
  };

  const COURSE_TEXTAREA = {
    'foundation-training': 'Foundation Training',
    'foundation-200': 'Foundation 200 hour TT',
    'foundation-300': '300-Hour Advanced Yoga Teacher Training',
    'ashtanga-assistant-tt': 'Ashtanga Assistant Teacher Training (invitation enquiry)',
    'pregnancy-yoga': 'Pregnancy Yoga Training',
    'functional-anatomy': 'Functional Anatomy Training',
    'yoga-nidra': 'Yoga Nidra Training',
    'soundbath': 'SoundBath Training',
    'open-day-foundation': 'Open Day | Foundation Training 200 hours',
    'open-day-cpd': 'Open Day | CPD Courses',
    'cpd': 'CPD',
    'workshops': 'Workshops',
    'retreats': 'Retreats'
  };

  const scrollToHashTarget = () => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    let id = '';
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch (err) {
      id = hash.slice(1);
    }
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    // Sticky header uses scroll-margin; re-run after layout settles
    const go = () => el.scrollIntoView({ block: 'start', behavior: 'auto' });
    window.requestAnimationFrame(go);
    window.setTimeout(go, 50);
  };

  const prefillCourseFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    let raw = (params.get('course') || params.get('topic') || params.get('interest') || '').trim();

    // Hash-only deep links that imply a topic (query still preferred)
    if (!raw) {
      const hashId = (window.location.hash || '').replace(/^#/, '').toLowerCase();
      if (hashId === 'suggest-course') raw = 'suggest-course';
      else if (hashId === 'callback' || hashId === 'call') raw = 'callback';
    }
    if (!raw) {
      scrollToHashTarget();
      return;
    }

    const normalised = raw.toLowerCase().replace(/\s+/g, '-');
    const slug = COURSE_ALIASES[normalised] || normalised;

    // Dedicated Suggest a course block when hash targets it (or query with no form hash)
    if (slug === 'suggest-course') {
      const hash = window.location.hash;
      const suggestSection = document.getElementById('suggest-course');
      if (suggestSection && (!hash || hash === '#suggest-course')) {
        if (hash !== '#suggest-course') {
          history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}#suggest-course`
          );
        }
      }
      // If hash is #form (or another enquiry target), keep it and preselect topic below
    }

    const select = document.querySelector('select[name="interest"], select[name="topic"]');
    if (select) {
      let matched = select.querySelector(`option[data-slug="${slug}"]`);
      if (!matched) {
        matched = Array.from(select.options).find(option => {
          const value = (option.value || option.textContent || '').trim().toLowerCase();
          const optionSlug = (option.dataset.slug || '').toLowerCase();
          return value === raw.toLowerCase()
            || value === slug
            || optionSlug === slug
            || value.replace(/\s+/g, '-') === slug;
        });
      }
      if (matched) {
        select.value = matched.value || matched.textContent;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const coursesField = document.querySelector('textarea[name="courses"]');
    const label = COURSE_TEXTAREA[slug];
    if (coursesField && label && !coursesField.value.trim()) {
      coursesField.value = label;
    }

    scrollToHashTarget();
  };

  prefillCourseFromQuery();

  // Copy address / text buttons (Contact Directions)
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = (btn.getAttribute('data-copy') || '').trim();
      if (!text) return;

      const labelDefault = btn.getAttribute('data-copy-label') || btn.textContent.trim() || 'Copy';
      const labelCopied = btn.getAttribute('data-copied-label') || 'Copied';
      const showCopied = () => {
        btn.classList.add('is-copied');
        btn.textContent = labelCopied;
        window.setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.textContent = labelDefault;
        }, 1800);
      };

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        showCopied();
      } catch (err) {
        btn.textContent = 'Copy failed';
        window.setTimeout(() => {
          btn.textContent = labelDefault;
        }, 1800);
      }
    });
  });
})();
