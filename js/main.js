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
      let id = sessionStorage.getItem(notifySessionKey);
      if (!id) {
        id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem(notifySessionKey, id);
      }
      return id;
    } catch {
      return `s_${Date.now().toString(36)}`;
    }
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
   * Lead forms: email or phone (at least one). Journal subscribe: email required.
   * @param {HTMLFormElement} form
   * @param {boolean} isJournalForm
   * @returns {string} empty when valid, else British English error
   */
  const validateLeadContactChannel = (form, isJournalForm) => {
    const emailEl = form.querySelector('input[name="email"]');
    const phoneEl = form.querySelector('input[name="phone"]');
    const email = emailEl instanceof HTMLInputElement ? emailEl.value.trim() : '';
    const phone = phoneEl instanceof HTMLInputElement ? phoneEl.value.trim() : '';

    if (isJournalForm) {
      if (!email || !EMAIL_RE.test(email)) {
        return 'Please enter a valid email address.';
      }
      return '';
    }

    if (!email && !phone) {
      return CONTACT_CHANNEL_MSG;
    }
    if (email && !EMAIL_RE.test(email)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  // Enquiry forms → /api/notify/lead (Discord), mailto fallback if API unavailable
  document.querySelectorAll('form.form-stack[data-notify-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      const formSource = form.getAttribute('data-notify-form') || '';
      const isJournalForm = /journal[-_]?subscribe/i.test(formSource);
      const isSuggestForm = /suggest[-_]?course/i.test(formSource);

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

      const channelError = validateLeadContactChannel(form, isJournalForm);
      if (channelError) {
        showStatus(channelError, false);
        const emailEl = form.querySelector('input[name="email"]');
        const phoneEl = form.querySelector('input[name="phone"]');
        const focusEl =
          !isJournalForm && phoneEl instanceof HTMLInputElement && !emailEl?.value?.trim()
            ? phoneEl
            : emailEl;
        if (focusEl instanceof HTMLElement) focusEl.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isJournalForm
          ? 'Subscribing…'
          : isSuggestForm
            ? 'Sending suggestion…'
            : 'Sending…';
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
          || 'mailto:info@thameswellnessacademy.co.uk';
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
          mailtoTo: 'info@thameswellnessacademy.co.uk',
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
            data.message || 'Thank you. Your enquiry has been sent to the Academy team.',
            true
          );
          form.reset();
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
        showStatus(data.error || 'Something went wrong. Please email info@thameswellnessacademy.co.uk.', false);
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

  // Deep-link course / topic preselection on Apply and Contact forms
  // Supports ?course=, ?topic=, or ?interest= (slug or option value)
  const COURSE_ALIASES = {
    '200-hour': 'foundation-200',
    '200hr': 'foundation-200',
    'foundation': 'foundation-training',
    'foundation-yoga': 'foundation-training',
    'foundation-yoga-training': 'foundation-training',
    'foundation-tt': 'foundation-200',
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
    'not-sure-yet': 'not-sure',
    suggest: 'suggest-course',
    'suggest-a-course': 'suggest-course'
  };

  const COURSE_TEXTAREA = {
    'foundation-training': 'Foundation Training',
    'foundation-200': 'Foundation 200 hour TT',
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
