(function () {
  'use strict';

  // ── Reveal: fadein-scroll → visible ───────────────────────
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      });
    },
    { threshold: 0.08 }
  );

  document.querySelectorAll('.fadein-scroll').forEach((el) => revealObs.observe(el));

  // ── iOS Safari video autoplay ──────────────────────────────
  // iOS blocks autoplay even with muted+playsinline in Low Power Mode.
  // Strategy: capture first frame as poster (visible when paused),
  // then retry play on user interaction.
  function initVideo() {
    const video = document.getElementById('steps-video');
    if (!video) return;

    // Capture first decoded frame as poster via canvas
    function captureFrame() {
      if (!video.videoWidth) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        video.poster = canvas.toDataURL('image/jpeg', 0.8);
      } catch (_) {
        // Security/CORS restriction — poster stays empty, background covers it
      }
    }

    video.addEventListener('loadeddata', captureFrame, { once: true });

    const p = video.play();
    if (p !== undefined) {
      p.catch(() => {
        // Autoplay blocked — wait for first user touch then retry
        const retry = () => { video.play().catch(() => {}); };
        document.addEventListener('touchstart', retry, { once: true, passive: true });
        document.addEventListener('click',      retry, { once: true });
      });
    }
  }

  initVideo();

  // ── Параллакс строк шагов ([data-parallax]) ───────────────
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!parallaxEls.length) return;

  let ticking = false;

  function applyParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > vh + 300) return;
      const progress = 1 - (rect.top + rect.height * 0.5) / vh;
      const offset   = progress * 24;
      el.style.transform = `translateY(${offset.toFixed(2)}px)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });

  applyParallax();
})();
