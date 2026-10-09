// Flat White Coffee — site behavior
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- active tab + mobile nav ---------- */
  const page = document.body.dataset.page;
  $$('.site-nav [data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); });
  const toggle = $('.nav-toggle'), nav = $('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
  }

  /* ---------- photos/videos not uploaded yet → show labeled placeholder ---------- */
  const markEmpty = (media) => {
    const hideable = media.closest('[data-hide-until-photo]');
    if (hideable) { hideable.hidden = true; return; }
    const box = media.closest('.frame, .oval');
    if (box) box.classList.add('is-empty');
    media.remove();
  };
  $$('.frame img, .oval img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) markEmpty(img);
    else { img.addEventListener('error', () => markEmpty(img)); img.addEventListener('load', () => img.closest('.frame')?.classList.remove('is-empty')); }
  });

  /* ---------- videos: pause/play control (WCAG 2.2.2) ---------- */
  const reduceMotion = () => document.documentElement.classList.contains('a11y-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('.video-block video, .hero-bg video').forEach((video) => {
    const block = video.closest('.video-block, .hero-bg');
    video.addEventListener('error', () => markEmpty(video));
    const src = video.currentSrc || video.getAttribute('src');
    if (src) fetch(src, { method: 'HEAD' }).then((r) => { if (!r.ok) markEmpty(video); }).catch(() => {});
    const btn = document.createElement('button');
    btn.className = 'video-toggle';
    btn.type = 'button';
    const sync = () => {
      const paused = video.paused;
      btn.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
      btn.innerHTML = paused
        ? '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
    };
    btn.addEventListener('click', () => { video.paused ? video.play() : video.pause(); });
    video.addEventListener('play', sync); video.addEventListener('pause', sync);
    if (reduceMotion()) video.pause();
    block.appendChild(btn); sync();
  });

  /* ---------- menu tabs (WAI-ARIA tabs pattern) ---------- */
  const tabs = $$('[role="tab"]');
  const selectTab = (tab) => tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      const next = tabs[(map[e.key] + tabs.length) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  /* ---------- open-now status (café time zone) ---------- */
  const HOURS = { 0: [8.5, 14.5], 1: [6.5, 18], 2: [6.5, 18], 3: [6.5, 18], 4: [6.5, 18], 5: [6.5, 18], 6: [6.5, 18] };
  const fmt = (h) => { const hr = Math.floor(h), m = Math.round((h - hr) * 60); return `${hr % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${hr < 12 ? 'am' : 'pm'}`; };
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    const now = Number(p.hour) + Number(p.minute) / 60;
    const [open, close] = HOURS[day];
    $$('.status-pill').forEach((pill) => {
      if (now >= open && now < close) { pill.textContent = `open now · until ${fmt(close)}`; pill.classList.add('is-open'); }
      else { const before = now < open; pill.textContent = `closed · opens ${before ? 'today' : 'tomorrow'} at ${fmt(HOURS[before ? day : (day + 1) % 7][0])}`; }
      pill.hidden = false;
    });
    $$('.hours tr[data-days]').forEach((row) => { if (row.dataset.days.split(',').map(Number).includes(day)) row.classList.add('is-today'); });
  } catch { /* leave status hidden */ }

  $$('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* =========================================================
     Accessibility widget
     ========================================================= */
  const KEY = 'fw-a11y';
  const TOGGLES = [
    ['contrast', 'High contrast'],
    ['links', 'Highlight links'],
    ['readable', 'Readable font'],
    ['spacing', 'Text spacing'],
    ['motion', 'Stop animations'],
    ['cursor', 'Standard cursor'],
  ];
  const SCALES = [1, 1.125, 1.25, 1.5];
  let state = { scale: 0 };
  try { state = { scale: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
  const root = document.documentElement;
  const apply = () => {
    TOGGLES.forEach(([k]) => root.classList.toggle(`a11y-${k}`, !!state[k]));
    root.style.setProperty('--a11y-scale', SCALES[state.scale] || 1);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    if (state.motion) $$('.video-block video, .hero-bg video').forEach((v) => v.pause());
  };
  apply();

  const fab = document.createElement('button');
  fab.className = 'a11y-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Accessibility options');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'a11y-panel');
  fab.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="4" r="2"/><path d="M19 8.5c0 .6-.4 1-.9 1.1l-4.1.6v3.3l1.9 6.2c.2.6-.2 1.2-.7 1.3-.6.2-1.2-.1-1.3-.7L12.3 15h-.6L10 20.3c-.2.6-.8.9-1.3.7-.6-.2-.9-.8-.7-1.3l1.9-6.2v-3.3l-4.1-.6C5.4 9.5 5 9.1 5 8.5c0-.6.6-1.1 1.2-1l4.8.6h2l4.8-.6c.6-.1 1.2.4 1.2 1z"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'a11y-panel';
  panel.id = 'a11y-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-labelledby', 'a11y-title');
  panel.hidden = true;
  panel.innerHTML = `
    <h2 id="a11y-title">Accessibility</h2>
    <button type="button" class="a11y-close" aria-label="Close accessibility options">✕</button>
    <div class="a11y-grid">
      <div class="a11y-row"><span id="a11y-size-label">Text size</span>
        <span><button type="button" data-size="-1" aria-label="Decrease text size">A−</button>
        <button type="button" data-size="1" aria-label="Increase text size">A+</button></span></div>
      ${TOGGLES.map(([k, label]) => `<button type="button" data-toggle="${k}" aria-pressed="false">${label}</button>`).join('')}
      <button type="button" class="a11y-reset">Reset all</button>
    </div>
    <p style="margin:14px 0 0;font-size:.85rem">Need help? Call <a href="tel:+17146991387">(714) 699-1387</a> or read our <a href="accessibility.html">accessibility statement</a>.</p>`;

  const syncPanel = () => $$('[data-toggle]', panel).forEach((b) => b.setAttribute('aria-pressed', String(!!state[b.dataset.toggle])));
  const openPanel = (open) => {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    if (open) { syncPanel(); $('[data-toggle], button', panel).focus(); } else fab.focus();
  };
  fab.addEventListener('click', () => openPanel(panel.hidden));
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('a11y-close')) return openPanel(false);
    if (b.classList.contains('a11y-reset')) state = { scale: 0 };
    else if (b.dataset.size) state.scale = Math.max(0, Math.min(SCALES.length - 1, state.scale + Number(b.dataset.size)));
    else if (b.dataset.toggle) state[b.dataset.toggle] = !state[b.dataset.toggle];
    apply(); syncPanel();
  });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') openPanel(false); });
  document.body.append(fab, panel);
})();
