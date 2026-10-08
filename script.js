/* PW Cleaning – script.js (v3, hardened). Loaded with `defer` on every page. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = $('.site-header');

  const headerOffset = () => (header ? Math.max(header.getBoundingClientRect().height, header.offsetHeight || 0) : 0);

  // Smooth scroll for on-page anchors (safe against malformed selectors)
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      let target = null;
      try { target = document.querySelector(href); } catch (_) { return; }
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset() - 10;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  // Header shadow on scroll
  const onScroll = () => { if (header) header.classList.toggle('with-shadow', window.scrollY > 4); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Quote form (Formspree, async)
  const form = $('#contactForm');
  if (!form) return;
  const pageUrl = $('#pageUrl');
  if (pageUrl) pageUrl.value = location.href.split('#')[0];
  const status = $('#formStatus');
  const setStatus = (msg, ok) => {
    if (!status) return;
    status.textContent = msg;
    status.style.color = ok ? '#2e7d32' : '#c62828';
  };
  const OK_MSG = 'Thanks! We received your request and will contact you shortly.';

  form.addEventListener('submit', async (e) => {
    if (!/^https:\/\/formspree\.io\/f\//i.test(form.action)) return;
    e.preventDefault();

    // Honeypot: bots fill it. Pretend success, send nothing.
    const hp = $('#company', form);
    if (hp && hp.value.trim()) { form.reset(); setStatus(OK_MSG, true); return; }

    const btn = $('button[type="submit"]', form);
    const prev = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (res.ok) {
        form.reset();
        if (pageUrl) pageUrl.value = location.href.split('#')[0];
        setStatus(OK_MSG, true);
      } else {
        let err = 'Something went wrong. Please try again or text/call us at (605) 736-4171.';
        try {
          const data = await res.json();
          if (data && Array.isArray(data.errors) && data.errors.length) {
            err = data.errors.map(x => x.message).join(' ');
          }
        } catch (_) { /* keep default */ }
        setStatus(err, false);
      }
    } catch (_) {
      setStatus('Network error. Please try again or text/call us at (605) 736-4171.', false);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = prev; }
    }
  });
})();
