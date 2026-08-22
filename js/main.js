(function () {
  'use strict';

  // Sticky header shadow
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelector('.header-cta')?.addEventListener('click', () => {
    mainNav?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
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
})();
