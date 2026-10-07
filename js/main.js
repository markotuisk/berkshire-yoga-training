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
    'not-sure-yet': 'not-sure'
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

  const prefillCourseFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('course') || params.get('topic') || params.get('interest') || '').trim();
    if (!raw) return;

    const normalised = raw.toLowerCase().replace(/\s+/g, '-');
    const slug = COURSE_ALIASES[normalised] || normalised;

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
  };

  prefillCourseFromQuery();
})();
