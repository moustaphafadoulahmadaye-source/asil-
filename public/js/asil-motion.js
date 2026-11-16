/**
 * ASIL Logistics - Premium Motion & Interaction Engine (asil-motion.js)
 * Lightweight (< 4KB), zero-dependency, smooth Framer/Linear feel.
 * Respects prefers-reduced-motion at all times.
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    initNavbarScrollGlass();
    initScrollReveal();
    initAnimatedMetrics();
    initHeroParallax();
    initMagneticButtons();
  });

  /**
   * 1. Navbar Glassmorphism on Scroll
   */
  function initNavbarScrollGlass() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 30) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial check
  }

  /**
   * 2. Staggered Scroll-Reveal with IntersectionObserver
   */
  function initScrollReveal() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.12
      }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  }

  /**
   * 3. Animated Number Counters (Triggered once when scrolled into view)
   */
  function initAnimatedMetrics() {
    const counterElements = document.querySelectorAll('[data-counter-target]');
    if (!counterElements.length) return;

    if (prefersReducedMotion) {
      counterElements.forEach(el => {
        el.textContent = el.getAttribute('data-counter-target') + (el.getAttribute('data-counter-suffix') || '');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateNumber(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counterElements.forEach(el => observer.observe(el));

    function animateNumber(el) {
      const target = parseInt(el.getAttribute('data-counter-target'), 10) || 0;
      const suffix = el.getAttribute('data-counter-suffix') || '';
      const duration = 1200; // ms
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quad
        const easeOut = 1 - (1 - progress) * (1 - progress);
        const current = Math.floor(easeOut * target);

        el.textContent = current + suffix;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = target + suffix;
        }
      }

      requestAnimationFrame(update);
    }
  }

  /**
   * 4. Subtle Parallax on Hero Image
   */
  function initHeroParallax() {
    if (prefersReducedMotion) return;

    const heroMedia = document.querySelector('.hero-bg-media');
    if (!heroMedia) return;

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY < window.innerHeight) {
        heroMedia.style.transform = `translate3d(0, ${scrollY * 0.22}px, 0) scale(1.04)`;
      }
    }, { passive: true });
  }

  /**
   * 5. Magnetic Hover Feel on Desktop Primary Buttons
   */
  function initMagneticButtons() {
    if (prefersReducedMotion || window.innerWidth < 1024) return;

    const buttons = document.querySelectorAll('.btn-gold, .btn-track');
    buttons.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }
})();
