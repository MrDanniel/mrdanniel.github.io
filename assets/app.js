/* Daniel C. Studio — núcleo compartido (todas las páginas con assets/style.css) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;
  // Dispositivos modestos: pocos núcleos/RAM, ahorro de datos o movimiento reducido.
  const lite = reduced || navigator.connection?.saveData === true ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  if (lite) root.classList.add('lite');
  const DC = window.DC = { $, $$, lite, reduced, fine, dpr: Math.min(window.devicePixelRatio || 1, lite ? 1 : 2) };
  DC.lang = (root.lang || 'es').slice(0, 2);
  DC.t = (es, en) => DC.lang === 'en' ? en : es;
  const T = DC.t;

  /* ───────── Estado local (compartido con 404.html) ───────── */
  const KEY = 'dcs-fragments-v2';
  const clean = () => ({ found: [], bugs: [], records: {}, stats: {}, accent: 'violeta' });
  const data = clean();
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && typeof j === 'object') Object.assign(data, j);
  } catch { /* Sin almacenamiento: todo sigue funcionando en memoria. */ }
  if (!Array.isArray(data.found)) data.found = [];
  if (!Array.isArray(data.bugs)) data.bugs = [];
  for (const k of ['records', 'stats']) if (!data[k] || typeof data[k] !== 'object') data[k] = {};
  DC.store = {
    data,
    save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignorar */ } },
    reset() { for (const k of Object.keys(data)) delete data[k]; Object.assign(data, clean()); this.save(); }
  };
  if (data.accent && data.accent !== 'violeta') root.dataset.accent = data.accent;
  DC.palette = () => {
    const c = getComputedStyle(root);
    return ['--lav', '--vh', '--pink', '--v'].map(v => c.getPropertyValue(v).trim());
  };

  
/* ───────── Sonido: sintetizado, sin audio externo, apagado por defecto ───────── */
  let on = false, ac = null, master = null, noiseBuf = null;
  try { on = localStorage.getItem('dcs-audio') === 'on'; } catch { /* ignorar */ }
  const ensure = () => {
    if (!on) return null;
    if (!ac) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ac = new A();
      master = ac.createGain(); master.gain.value = .75;
      const comp = ac.createDynamicsCompressor();
      master.connect(comp); comp.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  };
  const tone = (f, d = .12, type = 'sine', v = .05, slide = 0, delay = 0) => {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .03);
  };
  const noise = (d = .08, v = .04, hp = 1200, delay = 0) => {
    const c = ensure(); if (!c) return;
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * .5, c.sampleRate); const a = noiseBuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
    const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + .02);
  };
  const arp = (notes, step = .07, type = 'triangle', v = .05) => notes.forEach((n, i) => tone(n, .16, type, v, 1, i * step));
  const presets = {
    tick: () => tone(2000, .02, 'square', .008), hover: () => tone(1500, .025, 'sine', .012),
    click: () => tone(640, .05, 'triangle', .04, .7),
    toggle: () => { tone(440, .07, 'triangle', .05, 1.5); tone(660, .1, 'triangle', .05, 1.2, .07); },
    open: () => { tone(330, .18, 'sine', .05, 2); tone(495, .2, 'sine', .04, 2, .06); },
    close: () => tone(500, .14, 'sine', .04, .5),
    discover: () => arp([523.25, 659.25, 783.99, 1046.5]),
    bug: () => { noise(.09, .05, 900); tone(220, .14, 'sawtooth', .03, .4); },
    hit: f => tone(f || 660, .11, 'triangle', .06, 1.02),
    perfect: () => { tone(880, .12, 'triangle', .06, 1.5); tone(1320, .14, 'sine', .04, 1, .05); },
    good: () => tone(660, .1, 'triangle', .05, 1.2), ok: () => tone(440, .08, 'triangle', .04),
    miss: () => { tone(150, .18, 'sawtooth', .04, .5); noise(.08, .03, 300); },
    over: () => { tone(392, .18, 'triangle', .06, .8); tone(293, .2, 'triangle', .06, .8, .14); tone(196, .4, 'triangle', .06, .6, .3); },
    win: () => arp([523.25, 659.25, 783.99, 1046.5, 1318.5], .08),
    record: () => arp([784, 988, 1175, 1568], .07, 'square', .03),
    pop: () => tone(700, .06, 'sine', .05, 1.6), step: () => tone(300, .03, 'square', .01),
    kick: () => tone(120, .12, 'sine', .08, .35), flap: () => tone(420, .07, 'square', .02, 1.8),
    score: () => { tone(988, .06, 'square', .03); tone(1319, .1, 'square', .03, 1, .06); },
    count: () => tone(520, .08, 'triangle', .05), go: () => tone(880, .18, 'triangle', .06, 1.4),
    error: () => tone(160, .12, 'square', .03, .6), eat: f => tone(f || 520, .08, 'square', .03, 1.5)
  };
  DC.sound = {
    get enabled() { return on; },
    tone, noise,
    play(name, a) { if (!on) return; try { (presets[name] || presets.click)(a); } catch { /* el audio nunca es imprescindible */ } },
    set(v) {
      on = !!v;
      try { localStorage.setItem('dcs-audio', on ? 'on' : 'off'); } catch { /* ignorار */ }
      syncAudio();
      if (on) { ensure(); presets.toggle(); } else if (ac) ac.suspend().catch(() => {});
    }
  };

  /* Jingle estilo RP2A03 (NTSC): 2 canales de pulso (12,5 % y 25 %) + triangular, con periodos cuantizados como el chip */
  const NES = 1789773;
  const quant = (f, tri) => { const d = tri ? 32 : 16; return NES / (d * (Math.max(1, Math.round(NES / (d * f)) - 1) + 1)); };
  const waves = {};
  const pulseWave = d => waves[d] ||= (() => {
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * d);
    return ac.createPeriodicWave(re, im);
  })();

  const chipNote = (f, ch, t, dur, v, bendPeak = null) => {
    const o = ac.createOscillator(), g = ac.createGain();
    let baseFreq = f;

    if (ch === 'tri') { 
      o.type = 'triangle'; 
      baseFreq = quant(f, true); 
      o.frequency.setValueAtTime(baseFreq, t);
      g.gain.setValueAtTime(v * 1.4, t); 
    } else { 
      o.setPeriodicWave(pulseWave(ch === 'p1' ? .25 : .125)); 
      baseFreq = quant(f, false);
      o.frequency.setValueAtTime(baseFreq, t); 
      g.gain.setValueAtTime(v, t); 
      g.gain.setValueAtTime(v * .7, t + dur * .45); 
      g.gain.setValueAtTime(v * .42, t + dur * .75); 
    }

    // Efecto "turaruuuuuu": baja (tu-ra), vuelve rápido (ru) y se sostiene largo en la nota original (uuuuuu)
    if (bendPeak && ch !== 'tri') {
      const dropTime = t + (dur * 0.25); // El descenso ocurre rápido al inicio (tu-ra)
      const returnTime = t + (dur * 0.38); // Vuelve al A4 de golpe (ru)
      const peakFreq = quant(bendPeak, false);
      const origFreq = quant(f, false);
      
      o.frequency.exponentialRampToValueAtTime(peakFreq, dropTime);
      o.frequency.exponentialRampToValueAtTime(origFreq, returnTime);
      // El resto del tiempo (desde returnTime hasta t + dur) se queda sostenido en origFreq de forma estable
    }

    g.gain.setValueAtTime(0, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  };

  // Acordes de Contra con el tiempo marcado en segundos
  const KONAMI_SCORE = [
    { n: [174.61, 261.63, 349.23], at: 0.00, d: 0.60 }, 
    { n: [164.81, 440, 523.25],    at: 0.56, d: 0.55 }, 
    { n: [146.83, 392, 493.88],    at: 1.09, d: 0.55 }, 
    { n: [123.47, 293.66, 392],    at: 1.65, d: 0.55 },
    { 
      n: [110, 329.63, 440],       
      at: 2.20, 
      d: 0.90, 
      bend: [null, 293.66, 392] // [release de E4, y A4 haciendo el "tururuuuuuu"]
    },
    { n: [73.42, 587.33],           at: 3.05, d: 0.50 },
    { n: [110, 659.25],             at: 3.52, d: 1.15 }
  ];

  DC.sound.konami = (onChord) => {
    KONAMI_SCORE.forEach((c, i) => onChord && setTimeout(() => onChord(i, c), c.at * 1000));
    if (!ensure()) return 2300;
    const t0 = ac.currentTime + .05;
    
    KONAMI_SCORE.forEach(c => {
      c.n.forEach((f, k) => {
        const channel = k === 0 ? 'tri' : (c.n.length === 3 && k === 1 ? 'p2' : 'p1');
        const bendPeak = (c.bend && c.bend[k]) ? c.bend[k] : null;
        chipNote(f, channel, t0 + c.at, c.d, .045, bendPeak);
      });
    });
    return 2300;
  };

  const header = $('.site-header');
  if (header && !$('[data-audio-toggle]', header)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'audio-toggle'; b.dataset.audioToggle = '';
    b.innerHTML = '<span class="audio-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="audio-label">' + T('Sonido off', 'Sound off') + '</span>';
    header.appendChild(b);
  }
  function syncAudio() {
    $$('[data-audio-toggle]').forEach(b => {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? T('Desactivar efectos de sonido', 'Turn sound effects off') : T('Activar efectos de sonido', 'Turn sound effects on'));
      const l = $('.audio-label', b); if (l) l.textContent = on ? T('Sonido on', 'Sound on') : T('Sonido off', 'Sound off');
    });
  }
  syncAudio();
  document.addEventListener('visibilitychange', () => { if (ac) (document.hidden ? ac.suspend() : on && ac.resume()).catch?.(() => {}); });


  /* ───────── Partículas (un único canvas, el bucle se detiene si no hay nada) ───────── */
  const fx = (() => {
    let cv, g, W = 0, H = 0, parts = [], run = false, last = 0;
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W * DC.dpr; cv.height = H * DC.dpr; g.setTransform(DC.dpr, 0, 0, DC.dpr, 0, 0); };
    const init = () => {
      cv = document.createElement('canvas'); cv.className = 'fx'; cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv); g = cv.getContext('2d'); size();
      let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
    };
    const frame = t => {
      const dt = Math.min(40, t - last); last = t;
      g.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.gr * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalAlpha = Math.min(1, p.life / p.max * 1.4); g.fillStyle = p.c;
        g.fillRect(p.x, p.y, p.s, p.w || p.s);
      }
      g.globalAlpha = 1;
      if (parts.length) requestAnimationFrame(frame); else { run = false; g.clearRect(0, 0, W, H); }
    };
    return {
      burst(x, y, o = {}) {
        if (reduced) return;
        if (!cv) init();
        const cols = o.color ? [].concat(o.color) : DC.palette();
        const n = Math.round((o.n || 14) * (lite ? .5 : 1)), sp = o.speed || .3;
        for (let i = 0; i < n && parts.length < 200; i++) {
          const a = o.angle != null ? o.angle + (Math.random() - .5) * (o.spread || 1) : Math.random() * 6.283, v = sp * (.35 + Math.random() * .85);
          const life = (o.life || 650) * (.6 + Math.random() * .6);
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.lift || 0), gr: o.gravity ?? .0006, life, max: life, s: (o.size || 4) * (.5 + Math.random()), w: Math.random() < .3 ? 1.5 : 0, c: cols[i % cols.length] });
        }
        if (!run) { run = true; last = performance.now(); requestAnimationFrame(frame); }
      },
      at(el, o) { const r = el.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2, o); }
    };
  })();
  DC.fx = fx;

  /* ───────── Aviso temporal ───────── */
  let toastEl = $('#toast'), tt;
  DC.toast = (msg, o = {}) => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    if (o.label) { const b = document.createElement('button'); b.type = 'button'; b.textContent = o.label; b.onclick = () => { o.fn?.(); toastEl.classList.remove('is-visible'); }; toastEl.appendChild(b); }
    toastEl.classList.add('is-visible'); clearTimeout(tt);
    tt = setTimeout(() => toastEl.classList.remove('is-visible'), o.ms || 3200);
  };

  /* ───────── Cabecera: menú, sombra y progreso ───────── */
  const menu = $('.menu-toggle'), nav = $('#main-nav');
  const closeMenu = () => { if (!menu || !nav) return; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', T('Abrir menú', 'Open menu')); nav.classList.remove('is-open'); };
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? T('Cerrar menú', 'Close menu') : T('Abrir menú', 'Open menu')); nav.classList.toggle('is-open', open);
    });
    $$('a', nav).forEach(a => a.addEventListener('click', closeMenu));
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', e => { if (nav.classList.contains('is-open') && !nav.contains(e.target) && !menu.contains(e.target)) closeMenu(); });
  }
  const bar = $('.scroll-progress span');
  let sraf = 0;
  const onScroll = () => {
    if (sraf) return;
    sraf = requestAnimationFrame(() => {
      sraf = 0;
      header?.classList.toggle('is-stuck', scrollY > 8);
      if (bar) root.style.setProperty('--p', (scrollY / Math.max(1, root.scrollHeight - innerHeight)).toFixed(4));
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();


  /* ───────── Sistema «juice» automático: cualquier página con style.css + app.js lo recibe sin programar nada ─────────
     Marca con [data-juice] un contenedor para animar sus hijos, o usa las clases habituales (legal-wrap, app-*, .page). */
  const AUTO = '.legal-wrap > *, .app-hero-copy > *, .app-hero-visual, .app-detail-heading, .app-feature, .app-legal-inner > div, .app-legal-links a, .page > *, [data-juice] > *';
  $$(AUTO).forEach(el => {
    if (!el.closest('.arcade') && !el.classList.contains('reveal')) {
      el.classList.add('reveal');
      el.style.setProperty('--rd', Math.min(6, [...el.parentNode.children].indexOf(el)));
    }
  });
  $$('.app-feature,.legal-callout,.app-hero-visual,.page-card').forEach(el => {
    if ($('.cr', el)) return; el.classList.add('has-cr');
    el.insertAdjacentHTML('beforeend', '<i class="cr a"></i><i class="cr d"></i>');
  });

  /* ───────── Revelados de scroll y pausa de animaciones fuera de pantalla ───────── */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
    const po = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)));
    $$('#hero-fig,.marquee,.manifesto-art').forEach(el => po.observe(el));
    // Sección activa en la navegación (con un tic sonoro suave al cambiar)
    const links = $$('.main-nav a[href^="#"]');
    const secs = links.map(l => $(l.getAttribute('href'))).filter(Boolean);
    let cur = '';
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || cur === e.target.id) return;
      cur = e.target.id;
      links.forEach(l => l.getAttribute('href') === '#' + cur ? l.setAttribute('aria-current', 'location') : l.removeAttribute('aria-current'));
      if (scrollY > 200) DC.sound.play('tick');
    }), { rootMargin: '-35% 0px -55% 0px' });
    secs.forEach(s => so.observe(s));
  } else $$('.reveal').forEach(el => el.classList.add('in'));
  // Dibujado del hero al cargar (un solo momento orquestado)
  setTimeout(() => $$('#hero-fig .draw,#hero-fig .fade-late').forEach(el => el.classList.add('go')), 120);


  /* ───────── Cinta infinita: se clona el bloque hasta cubrir 2× el ancho y se desplaza exactamente un bloque ───────── */
  const mq = $('#marquee');
  if (mq) {
    const set = $('.mq-set', mq);
    const build = () => {
      $$('.mq-clone', mq).forEach(n => n.remove());
      const w = set.getBoundingClientRect().width; if (!w) return;
      const n = Math.ceil(innerWidth * 2 / w) + 1;
      for (let i = 0; i < n; i++) { const c = set.cloneNode(true); c.classList.add('mq-clone'); c.setAttribute('aria-hidden', 'true'); $$('[data-bug]', c).forEach(x => x.remove()); mq.appendChild(c); }
      mq.style.setProperty('--shift', w + 'px'); mq.style.setProperty('--dur', (w / 55).toFixed(1) + 's');
    };
    build(); document.fonts?.ready.then(build);
    let mt; addEventListener('resize', () => { clearTimeout(mt); mt = setTimeout(build, 200); });
  }

  /* ───────── Filtros de proyectos ───────── */
  const fbs = $$('.filter-button'), specs = $$('.spec[data-category]'), fstat = $('#filter-status');
  fbs.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.filter; let n = 0;
    fbs.forEach(x => { const s = x === b; x.classList.toggle('is-active', s); x.setAttribute('aria-pressed', String(s)); });
    specs.forEach(c => { const show = f === 'all' || c.dataset.category === f; c.hidden = !show; if (show) { n++; c.classList.add('in'); } });
    if (fstat) fstat.textContent = DC.lang === 'en' ? `${n} ${n === 1 ? 'project' : 'projects'}` : `${n} ${n === 1 ? 'proyecto' : 'proyectos'}`;
    DC.sound.play('pop');
  }));

  /* ───────── Copiar enlace ───────── */
  const cb = $('#copy-site'), cf = $('#copy-feedback');
  cb?.addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    try {
      if (navigator.clipboard && isSecureContext) await navigator.clipboard.writeText(url);
      else { const t = document.createElement('textarea'); t.value = url; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); if (!ok) throw 0; }
      if (cf) cf.textContent = T('Enlace copiado al portapapeles.', 'Link copied to clipboard.');
      DC.toast(T('Enlace copiado.', 'Link copied.')); DC.sound.play('score'); fx.at(cb, { n: 16 });
    } catch { if (cf) cf.textContent = T('No se pudo copiar. Copia la dirección desde el navegador.', 'Could not copy. Copy the address from your browser.'); DC.toast(T('No se pudo copiar el enlace.', 'Could not copy the link.')); }
  });
  const yr = $('#year'); if (yr) yr.textContent = String(new Date().getFullYear());

  /* ───────── Audio-toggle, clics con sonido y partículas ───────── */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-audio-toggle]');
    if (a) { DC.sound.set(!on); fx.at(a, { n: 10 }); return; }
    const c = e.target.closest('.button,.filter-button,.main-nav a,.text-link,.arrow-link,.spec-visual,.legal-nav a');
    if (c) { DC.sound.play('click'); if (c.matches('.button,.filter-button')) fx.burst(e.clientX, e.clientY, { n: 8, speed: .22, size: 3 }); }
  });
  if (fine) {
    let lh = 0;
    document.addEventListener('pointerover', e => {
      const t = e.target.closest?.('.button,.filter-button,.main-nav a,.spec-visual,.value,.arcade-btn');
      if (!t || t === lh) return; lh = t; DC.sound.play('hover');
    });
  }


  /* ───────── Figura del hero: el círculo interior sigue al cursor y el favicon lo «mira» sin salir del cuadro ───────── */
  const heroFig = $('#hero-fig');
  if (heroFig && !reduced) {
    let hx = 0, hy = 0, hr = 0;
    const hero = () => {
      hr = 0;
      if (heroFig.classList.contains('paused')) return;
      const r = heroFig.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const cl = v => Math.max(-1, Math.min(1, v));
      heroFig.style.setProperty('--px', cl((hx - cx) / (innerWidth * .5)).toFixed(3));
      heroFig.style.setProperty('--py', cl((hy - cy) / (innerHeight * .5)).toFixed(3));
      heroFig.style.setProperty('--ex', cl((hx - cx) / (r.width * .55)).toFixed(3));
      heroFig.style.setProperty('--ey', cl((hy - cy) / (r.height * .55)).toFixed(3));
    };
    addEventListener('pointermove', e => { hx = e.clientX; hy = e.clientY; if (!hr) hr = requestAnimationFrame(hero); }, { passive: true });
  }

  /* ───────── Retícula del cursor (solo puntero preciso) ───────── */
  if (fine && !lite) {
    const ret = document.createElement('div'); ret.className = 'reticle'; ret.setAttribute('aria-hidden', 'true'); document.body.appendChild(ret);
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * .22; cy += (ty - cy) * .22;
      ret.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > .4) ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY; ret.classList.add('on');
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('pointerleave', () => ret.classList.remove('on'));
    document.addEventListener('pointerover', e => ret.classList.toggle('big', !!e.target.closest?.('a,button,[data-game],[data-bug]')));
  }
})();
