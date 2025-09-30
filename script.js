/* PW Cleaning – script.js (hardened) */
/* Assumes this file is loaded with `defer` on every page. */

(function () {
  // ===== Helpers =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getHeaderOffset = () => {
    const header = $('.site-header') || $('.navbar');
    if (!header) return 0;
    const rect = header.getBoundingClientRect();
    // Use computed height in case of sticky headers
    return Math.max(rect.height, header.offsetHeight || 0);
  };

  // ===== Smooth scroll for on-page anchors =====
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      // ignore '#' or empty or links with role='button'
      if (!href || href === '#' || link.getAttribute('role') === 'button') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = getHeaderOffset() + 10; // small breathing room
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      // move focus for a11y
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  // ===== Sticky header shadow =====
  const header = $('.site-header') || $('.navbar');
  const onScroll = () => { if (header) header.classList.toggle('with-shadow', window.scrollY > 4); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // ===== Make entire service card clickable (fallback) =====
  $$('.service').forEach(card => {
    if (!card.closest('a.service-link')) {
      const inner = card.querySelector('a[href]');
      if (inner) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => { window.location.href = inner.href; });
        // Ensure keyboard accessibility
        card.tabIndex = 0;
        card.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            window.location.href = inner.href;
          }
        });
      }
    }
  });

  // ===== Formspree async submit =====
  const form = $('#contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      const isFormspree = /formspree\.io\/f\//i.test(form.action);
      if (!isFormspree) return; // allow normal post to non-Formspree
      e.preventDefault();

      // Honeypot: ignore if hidden "company" has a value
      const honeypot = form.querySelector('#company');
      if (honeypot && honeypot.value.trim()) return;

      let status = $('#formStatus') || form.querySelector('.form-message');
      if (!status) {
        status = document.createElement('p');
        status.id = 'formStatus';
        status.className = 'small muted';
        status.setAttribute('aria-live', 'polite');
        form.appendChild(status);
      }

      const btn = form.querySelector('button[type="submit"]');
      const prev = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });

        if (res.ok) {
          form.reset();
          status.textContent = 'Thanks! We received your request and will contact you shortly.';
          status.style.color = '#2e7d32';
        } else {
          // Try to parse validation errors from Formspree
          let err = 'Something went wrong. Please try again or text/call us.';
          try {
            const data = await res.json();
            if (data && data.errors && data.errors.length) {
              err = data.errors.map(e => e.message).join(' ');
            }
          } catch (_) { /* noop */ }
          status.textContent = err;
          status.style.color = '#c62828';
        }
      } catch {
        status.textContent = 'Network error. Please try again.';
        status.style.color = '#c62828';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = prev; }
      }
    });
  }

  // ===== Accessible Lightbox for .gallery-item img =====
  (function () {
    const imgs = $$('.gallery-item img');
    if (!imgs.length) return;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.display = 'none';

    const figure = document.createElement('figure');
    figure.className = 'lightbox-figure';

    const big = document.createElement('img');
    big.alt = '';

    const caption = document.createElement('figcaption');
    caption.className = 'lightbox-caption';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close image');
    closeBtn.textContent = '×';

    figure.appendChild(big);
    figure.appendChild(caption);
    overlay.appendChild(figure);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    let current = -1;
    let lastFocus = null;

    const bodyLock = (lock) => {
      document.documentElement.classList.toggle('no-scroll', lock);
      document.body.classList.toggle('no-scroll', lock);
    };

    const updateImage = (idx) => {
      const img = imgs[idx];
      // compute source on demand (support srcset/currentSrc)
      const src = img.dataset.full || img.currentSrc || img.src;
      big.src = src;
      big.alt = img.alt || '';
      caption.textContent = img.alt || '';
      current = idx;
    };

    const open = (idx) => {
      lastFocus = document.activeElement;
      updateImage(idx);
      overlay.style.display = 'flex';
      bodyLock(true);
      closeBtn.focus();
    };

    const close = () => {
      overlay.style.display = 'none';
      big.removeAttribute('src');
      bodyLock(false);
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    };

    const prev = () => { if (current > 0) updateImage(current - 1); else updateImage(imgs.length - 1); };
    const next = () => { if (current < imgs.length - 1) updateImage(current + 1); else updateImage(0); };

    imgs.forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => open(idx));
      img.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(idx); });
      // Make images focusable for keyboard users
      if (!img.hasAttribute('tabindex')) img.tabIndex = 0;
    });

    overlay.addEventListener('click', (e) => {
      // Only close when clicking the overlay/background, not the image/figure
      if (e.target === overlay) close();
    });
    closeBtn.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
      if (overlay.style.display !== 'flex') return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });
  })();

  // ===== Auto year =====
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
