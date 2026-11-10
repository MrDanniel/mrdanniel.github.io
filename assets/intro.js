/* Liquid scan intro — only loaded by the home pages. No external libraries. */
(() => {
  'use strict';

  const overlay = document.getElementById('intro-overlay');
  const canvas = document.getElementById('intro-canvas');
  const skip = document.getElementById('intro-skip');
  if (!overlay || !canvas || !skip) return;

  const desktop = matchMedia('(min-width: 761px) and (pointer: fine) and (hover: hover)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;
  const modestDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const hasCanvas = !!canvas.getContext;

  // The intro is intentionally absent on phones, touch-first devices and modest/reduced-motion setups.
  if (!desktop || reduced || saveData || modestDevice || !hasCanvas || location.hash) {
    overlay.remove();
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) { overlay.remove(); return; }

  const duration = 4000;
  const bands = 9;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = v => { v = clamp(v); return 1 - Math.pow(1 - v, 2.4); };
  const makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  };
  const rgb = value => {
    const s = String(value || '').trim();
    let m = s.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (m) {
      let h = m[1]; if (h.length === 3) h = [...h].map(x => x + x).join('');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = s.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [211, 183, 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  const css = getComputedStyle(document.documentElement);
  const accent = rgb(css.getPropertyValue('--lav'));
  const violet = rgb(css.getPropertyValue('--v'));
  const bright = rgb(css.getPropertyValue('--vh'));
  const pageW = Math.max(1, innerWidth);
  const pageH = Math.max(1, innerHeight);
  const quality = Math.min(1, 1480 / pageW, 980 / pageH);
  const W = Math.max(1, Math.round(pageW * quality));
  const H = Math.max(1, Math.round(pageH * quality));

  let frame = 0, startedAt = 0, stopped = false;
  let source = null, sampled = null, cw = 1, ch = 1;
  const layers = {};
  canvas.width = W; canvas.height = H;
  overlay.hidden = false;
  overlay.classList.add('is-active');
  document.body.classList.add('intro-active');

  function fillBackground(g) {
    g.fillStyle = '#151515'; g.fillRect(0, 0, W, H);
    const a = g.createRadialGradient(W * .78, H * .06, 0, W * .78, H * .06, Math.max(W, H) * .78);
    a.addColorStop(0, 'rgba(112,69,153,.36)'); a.addColorStop(1, 'rgba(21,21,21,0)');
    g.fillStyle = a; g.fillRect(0, 0, W, H);
    const b = g.createRadialGradient(W * .06, H * .62, 0, W * .06, H * .62, Math.max(W, H) * .58);
    b.addColorStop(0, 'rgba(73,43,103,.22)'); b.addColorStop(1, 'rgba(21,21,21,0)');
    g.fillStyle = b; g.fillRect(0, 0, W, H);
  }

  function intersects(r) {
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < pageW && r.top < pageH;
  }

  function drawTextNode(node, g) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim() || !node.parentElement) return;
    const el = node.parentElement;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || st.fontSize === '0px') return;
    let color = st.color;
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') color = `rgb(${accent.join(' ')})`;
    const size = parseFloat(st.fontSize) || 14;
    const weight = st.fontWeight || '400';
    const family = st.fontFamily || 'sans-serif';
    const fontStyle = st.fontStyle && st.fontStyle !== 'normal' ? st.fontStyle + ' ' : '';
    const fontVariant = st.fontVariant && st.fontVariant !== 'normal' ? st.fontVariant + ' ' : '';
    g.save();
    g.font = `${fontStyle}${fontVariant}${weight} ${size}px ${family}`;
    g.fillStyle = color;
    g.textBaseline = 'alphabetic';
    g.globalAlpha = 1;
    const re = /\S+/g; let match;
    while ((match = re.exec(raw))) {
      const range = document.createRange();
      try {
        range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        if (!intersects(rect)) continue;
        let word = match[0];
        if (st.textTransform === 'uppercase') word = word.toUpperCase();
        else if (st.textTransform === 'lowercase') word = word.toLowerCase();
        const baseline = rect.bottom - Math.max(1, (rect.height - size) * .25);
        g.fillText(word, rect.left, baseline, Math.max(rect.width + 2, 2));
      } catch { /* Textos que cambian durante el recorrido se omiten. */ }
    }
    g.restore();
  }

  async function drawSvgElement(svg, g, rect) {
    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const originals = [svg, ...svg.querySelectorAll('*')];
      const copies = [clone, ...clone.querySelectorAll('*')];
      const props = ['fill','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','font-family','font-size','font-weight','font-style','text-anchor','display','visibility','transform','clip-path'];
      originals.forEach((el, i) => {
        const computed = getComputedStyle(el);
        const values = props.map(k => `${k}:${computed.getPropertyValue(k)}`).join(';');
        copies[i].setAttribute('style', (copies[i].getAttribute('style') || '') + ';' + values);
        if (copies[i].hasAttribute('href')) {
          const href = copies[i].getAttribute('href');
          if (href && !href.startsWith('data:') && !href.startsWith('#')) copies[i].setAttribute('href', new URL(href, document.baseURI).href);
        }
      });
      const xml = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const bitmap = await createImageBitmap(blob);
      g.drawImage(bitmap, rect.left, rect.top, rect.width, rect.height);
      bitmap.close?.();
      return true;
    } catch { return false; }
  }

  async function capturePage() {
    const c = makeCanvas(W, H), g = c.getContext('2d', { alpha: false });
    g.setTransform(1, 0, 0, 1, 0, 0);
    fillBackground(g);
    g.setTransform(quality, 0, 0, quality, 0, 0);

    async function drawElement(el) {
      if (el === overlay || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'META') return;
      if (el.hidden || el.getAttribute('aria-hidden') === 'true' && el.tagName !== 'SVG') return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (!intersects(rect)) return;

      if (el.tagName === 'SVG') {
        if (!await drawSvgElement(el, g, rect)) {
          g.save(); g.strokeStyle = `rgba(${accent.join(',')},.55)`; g.lineWidth = 1;
          g.beginPath(); g.ellipse(rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width * .44, rect.height * .44, 0, 0, Math.PI * 2); g.stroke(); g.restore();
        }
        return;
      }

      const bg = st.backgroundColor;
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        g.save(); g.fillStyle = bg; g.fillRect(rect.left, rect.top, rect.width, rect.height); g.restore();
      }

      const borderWidths = [st.borderTopWidth, st.borderRightWidth, st.borderBottomWidth, st.borderLeftWidth].map(v => parseFloat(v) || 0);
      const borderColors = [st.borderTopColor, st.borderRightColor, st.borderBottomColor, st.borderLeftColor];
      if (borderWidths.some(v => v > 0)) {
        g.save(); g.lineCap = 'square';
        const sides = [
          [rect.left, rect.top, rect.right, rect.top],
          [rect.right, rect.top, rect.right, rect.bottom],
          [rect.right, rect.bottom, rect.left, rect.bottom],
          [rect.left, rect.bottom, rect.left, rect.top]
        ];
        sides.forEach((p, i) => {
          if (!borderWidths[i]) return;
          g.beginPath(); g.strokeStyle = borderColors[i]; g.lineWidth = borderWidths[i];
          g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.stroke();
        });
        g.restore();
      }

      if (el.tagName === 'IMG' && el.complete && el.naturalWidth) {
        try { g.drawImage(el, rect.left, rect.top, rect.width, rect.height); } catch { /* Imagen externa o no disponible. */ }
      } else if (el.tagName === 'CANVAS') {
        try { g.drawImage(el, rect.left, rect.top, rect.width, rect.height); } catch { /* Canvas no accesible. */ }
      }

      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) drawTextNode(child, g);
        else if (child.nodeType === Node.ELEMENT_NODE) await drawElement(child);
      }
    }

    for (const child of document.body.children) await drawElement(child);
    return c;
  }

  function sample(source, cellW, cellH = cellW) {
    const cols = Math.max(1, Math.ceil(source.width / cellW));
    const rows = Math.max(1, Math.ceil(source.height / cellH));
    const small = makeCanvas(cols, rows), g = small.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, cols, rows);
    return { cols, rows, data: g.getImageData(0, 0, cols, rows).data };
  }
  const lumAt = (data, i) => clamp(((data[i] * .2126 + data[i+1] * .7152 + data[i+2] * .0722) - 20) / 220);
  /* ───────── v2: decodificación ASCII → revelado radial sin costuras ─────────
     0–1100 ms  decodifica: ruido que se resuelve en la página hecha de glifos (barrido de izquierda a derecha)
     1100–2500  la página-ASCII «vive»: respira, una línea de escaneo la recorre y el cursor la perturba
     2500–4000  una onda radial nace en el símbolo del hero; detrás de su frente se borra la capa y aparece la página real.
     La máscara es un único degradado radial (sin bloques), así el último fotograma es exactamente la página real. */
  const chars = ' .,:-~=+*^!iIl|/\\()[]{}rcvxtuozjfn1234567890?SXA#%@';
  const HEAVY = chars.length - 9;                       // índice a partir del cual los glifos son «pesados»
  const DECODE_END = 1100, RESOLVE_START = 2500, LEVELS = 7;
  const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const cell = Math.max(8, Math.round(W / 116));
  let lastDraw = 0, audioCtx = null, audioEnabled = true, played = new Set();
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    try { audioCtx = new Audio(); } catch { audioCtx = null; }
    return audioCtx;
  }
  function tone(at, freq, endFreq, gain, length, type = 'sine') {
    if (!audioEnabled || !audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime + (at || 0);
    const osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + length);
    amp.gain.setValueAtTime(.0001, now); amp.gain.exponentialRampToValueAtTime(gain, now + .025);
    amp.gain.exponentialRampToValueAtTime(.0001, now + length);
    osc.connect(amp); amp.connect(audioCtx.destination); osc.start(now); osc.stop(now + length + .03);
  }
  function cue(index) {
    if (!audioEnabled || !audioCtx || audioCtx.state !== 'running' || played.has(index)) return;
    played.add(index);
    if (index === 0) { tone(0, 174, 360, .042, .38, 'sine'); tone(.07, 620, 900, .016, .22, 'triangle'); }
    else if (index === 1) { tone(0, 420, 220, .035, .20, 'triangle'); tone(.055, 880, 660, .014, .16, 'sine'); tone(.12, 1320, 980, .009, .12, 'sine'); }
    else if (index === 2) { tone(0, 520, 190, .038, .38, 'sine'); tone(.08, 1040, 720, .014, .28, 'triangle'); }
  }
  function cueForElapsed() {
    if (!startedAt || stopped) return;
    const elapsed = performance.now() - startedAt;
    cue(elapsed >= RESOLVE_START ? 2 : elapsed >= DECODE_END ? 1 : 0);
  }
  function unlockAudio() {
    if (stopped) return;
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === 'running') { cueForElapsed(); return; }
    ac.resume().then(cueForElapsed).catch(() => {});
  }
  unlockAudio();
  const unlockOnce = () => {
    unlockAudio();
    if (audioCtx?.state === 'running') { removeEventListener('pointerdown', unlockOnce, true); removeEventListener('keydown', unlockOnce, true); removeEventListener('touchstart', unlockOnce, true); }
  };
  addEventListener('pointerdown', unlockOnce, true); addEventListener('keydown', unlockOnce, true); addEventListener('touchstart', unlockOnce, true);

  // Atlas de glifos: cada carácter se pinta una sola vez por nivel de color; después todo es drawImage (60 fps estables).
  let atlas = null, aw = 1, ah = 1, cells = null, mx = -999, my = -999, ox = 0, oy = 0, maxD = 1;
  function buildAtlas() {
    aw = Math.ceil(cw) + 1; ah = Math.ceil(ch) + 1;
    atlas = makeCanvas(aw * chars.length, ah * LEVELS);
    const g = atlas.getContext('2d');
    g.font = `${Math.max(7, ch * .86)}px "JetBrains Mono",monospace`; g.textBaseline = 'middle';
    for (let l = 0; l < LEVELS; l++) {
      const col = l === LEVELS - 1 ? [255, 247, 255] : mix(violet, bright, l / (LEVELS - 2));
      g.fillStyle = `rgb(${col.join(',')})`;
      for (let i = 0; i < chars.length; i++) g.fillText(chars[i], i * aw, l * ah + ah * .52);
    }
  }
  function buildCells() {
    const n = sampled.cols * sampled.rows;
    cells = { lum: new Float32Array(n), base: new Uint8Array(n), lvl: new Uint8Array(n), on: new Uint8Array(n), dist: new Float32Array(n), order: new Float32Array(n), rnd: new Float32Array(n) };
    const hf = document.getElementById('hero-fig');
    if (hf) { const r = hf.getBoundingClientRect(); ox = (r.left + r.width / 2) * quality; oy = (r.top + r.height / 2) * quality; }
    if (!hf || ox < 0 || ox > W || oy < 0 || oy > H) { ox = W * .5; oy = H * .5; }
    maxD = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
    for (let y = 0; y < sampled.rows; y++) for (let x = 0; x < sampled.cols; x++) {
      const k = y * sampled.cols + x, raw = lumAt(sampled.data, k * 4), lum = Math.pow(raw, .6), b = Math.floor(lum * (chars.length - 1));   // gamma: los textos finos se leen mejor
      cells.lum[k] = lum; cells.base[k] = b; cells.on[k] = raw >= .025 && b >= 2 ? 1 : 0;
      cells.lvl[k] = Math.min(LEVELS - 2, Math.floor(lum * (LEVELS - 1)));
      cells.dist[k] = Math.hypot((x + .5) * cw - ox, (y + .5) * ch - oy);
      cells.order[k] = x / sampled.cols * .62 + hash(x + 3, y + 9) * .30;
      cells.rnd[k] = hash(x + 41, y + 17);
    }
  }
  const glyph = (g, ci, lvl, x, y, a) => { g.globalAlpha = a; g.drawImage(atlas, ci * aw, lvl * ah, aw, ah, x * cw, y * ch, aw, ah); };

  function drawBase(g, t, skipD = -1) {
    g.clearRect(0, 0, W, H); fillBackground(g);
    const cols = sampled.cols, rows = sampled.rows, dp = clamp(t / DECODE_END), tick = Math.floor(t / 70);
    const scanRow = t > 700 ? ((t - 700) / 1500 % 1) * (rows + 8) - 4 : -99;
    const mr = 80 * quality;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x; if (skipD > 0 && cells.dist[k] < skipD) continue;
      const on = cells.on[k], dec = clamp((dp - cells.order[k]) / .12);
      if (!on) { if (dp < 1 && dec <= 0 && hash(x + tick, y) > .94) glyph(g, 3 + ((x + y + tick) % 12), 0, x, y, .35); continue; }
      if (dec <= 0) { if (hash(x * 3 + tick, y) < .55) glyph(g, 2 + Math.floor(hash(x + tick * 3, y * 5) * (chars.length - 2)), 1, x, y, .5); continue; }
      if (dec < 1) { glyph(g, cells.base[k], LEVELS - 1, x, y, 1); continue; }
      let ci = cells.base[k] + Math.floor((Math.sin(t * .003 + x * .21 + y * .13) + 1) * 1.5), lvl = cells.lvl[k];
      if (Math.abs(y - scanRow) < 2.2) lvl = Math.min(LEVELS - 1, lvl + 2);
      if (mx > 0) { const d = Math.hypot((x + .5) * cw - mx, (y + .5) * ch - my); if (d < mr) { lvl = Math.min(LEVELS - 1, lvl + 2); if (cells.rnd[k] < .35) ci = 4 + Math.floor(hash(x + tick, y + 5) * (chars.length - 5)); } }
      glyph(g, Math.min(chars.length - 1, ci), lvl, x, y, .55 + cells.lum[k] * .45);
    }
    g.globalAlpha = 1;
    // Línea de arranque, a modo de terminal
    const p = clamp(t / RESOLVE_START), n = Math.round(p * 24), fs = Math.max(11, 13 * quality);
    g.font = `${fs}px "JetBrains Mono",monospace`; g.textBaseline = 'alphabetic'; g.fillStyle = `rgba(${accent.join(',')},${.85 - p * .2})`;
    g.fillText('> daniel-c.studio --render', 36 * quality, H - 62 * quality);
    g.fillText(`[${'#'.repeat(n)}${'-'.repeat(24 - n)}] ${String(Math.round(p * 100)).padStart(3, ' ')}%`, 36 * quality, H - 40 * quality);
  }
  function resolve(g, t) {
    const p = clamp((t - RESOLVE_START) / (duration - RESOLVE_START)), e = p * p * (3 - 2 * p);
    const front = Math.max(1, e * maxD * 1.25), band = maxD * .16, done = front >= maxD + band + 2;
    drawBase(g, t, front - band * 1.05);
    // 1) Se borra la capa con un degradado radial: el borde es suave y detrás aparece la página real.
    g.save(); g.globalCompositeOperation = 'destination-out';
    const rg = g.createRadialGradient(ox, oy, 0, ox, oy, front);
    rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(Math.max(0, (front - band) / front), 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H); g.restore();
    // 2) En el frente de la onda, los glifos se encienden, se vuelven pesados y parpadean
    if (p < .985) {
      const cols = sampled.cols, rows = sampled.rows, tick = Math.floor(t / 110);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const k = y * cols + x, d = cells.dist[k], rel = (front - d) / band;       // 0 = justo en el frente, 1 = band por detrás
        if (rel < -.15 || rel > 1.05) continue;
        const w = 1 - Math.abs(rel - .45) / .62; if (w <= 0) continue;
        if (!cells.on[k] && cells.rnd[k] > .12) continue;
        glyph(g, HEAVY + Math.floor(hash(x + tick, y * 2) * 9), LEVELS - 1, x, y, clamp(w * (1 - p * .5)) * .95);
      }
      g.globalAlpha = 1;
      g.strokeStyle = `rgba(${accent.join(',')},${.55 * (1 - p)})`; g.lineWidth = Math.max(1, 2 * quality);
      g.beginPath(); g.arc(ox, oy, Math.max(1, front - band * .45), 0, Math.PI * 2); g.stroke();
    }
    return done;
  }

  // Los .reveal visibles se «congelan» en su estado final ANTES de quitar el bloqueo (`intro-active` los forzaba visibles);
  // así no hay un parpadeo de ocultar-y-volver-a-mostrar al terminar.
  function lockReveals() {
    document.querySelectorAll('.reveal,.mask').forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) el.classList.add('in'); });
  }
  const keepTop = () => { if (!stopped && (scrollY || document.documentElement.scrollTop)) scrollTo({ top: 0, behavior: 'instant' }); };
  const lockKeys = e => { if (!stopped && [' ', 'PageDown', 'PageUp', 'End', 'Home', 'ArrowDown', 'ArrowUp'].includes(e.key)) e.preventDefault(); };
  const lockWheel = e => { if (!stopped) e.preventDefault(); };
  addEventListener('wheel', lockWheel, { passive: false }); addEventListener('touchmove', lockWheel, { passive: false }); addEventListener('keydown', lockKeys, true); addEventListener('scroll', keepTop, { passive: true });
  let dissolving = false, warmed = false;
  function beginDissolve() {
    if (dissolving) return; dissolving = true; lockReveals();
    document.documentElement.classList.remove('intro-pending');   // la página real ya está debajo, tapada por la capa opaca
    overlay.classList.add('is-dissolving');
  }
  function finish(skipped = false) {
    if (stopped) return; stopped = true; if (frame) cancelAnimationFrame(frame);
    removeEventListener('pointerdown', unlockOnce, true); removeEventListener('keydown', unlockOnce, true); removeEventListener('touchstart', unlockOnce, true);
    removeEventListener('pointermove', onMove);
    removeEventListener('wheel', lockWheel); removeEventListener('touchmove', lockWheel); removeEventListener('keydown', lockKeys, true); removeEventListener('scroll', keepTop);
    lockReveals();
    document.body.classList.remove('intro-active'); document.documentElement.classList.remove('intro-pending');
    overlay.setAttribute('aria-hidden', 'true');
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    // Fin de la intro: la capa ya es transparente, se oculta y se retira al instante (sin fundido de opacidad que provoque un repintado)
    if (skipped) { overlay.classList.add('is-leaving'); setTimeout(() => overlay.remove(), 140); }
    else { overlay.style.display = 'none'; overlay.remove(); }
  }
  const onMove = e => { mx = e.clientX * quality; my = e.clientY * quality; };
  addEventListener('pointermove', onMove, { passive: true });
  skip.addEventListener('click', () => finish(true));
  const onKey = e => { if (e.key === 'Escape' && !stopped) { finish(true); removeEventListener('keydown', onKey); } };
  addEventListener('keydown', onKey);
  addEventListener('resize', () => finish(true), { once: true, passive: true });
  function render(now) {
    if (stopped) return;
    if (document.hidden) { frame = requestAnimationFrame(render); return; }
    const t = now - startedAt;
    if (t >= DECODE_END && !warmed) { warmed = true; document.documentElement.classList.remove('intro-pending'); }   // la página se pinta/rasteriza ahora, tapada por la capa opaca
    if (t < RESOLVE_START) drawBase(ctx, t);
    else if (t < duration) { beginDissolve(); if (resolve(ctx, t)) { ctx.clearRect(0, 0, W, H); finish(false); return; } }
    else { ctx.clearRect(0, 0, W, H); finish(false); return; }        // último fotograma: capa totalmente transparente = página real
    if (t > 140) cue(0);
    if (t > DECODE_END + 40) cue(1);
    if (t > RESOLVE_START + 80) cue(2);
    frame = requestAnimationFrame(render);
  }
  const bootGuard = setTimeout(() => { if (!startedAt && !stopped) finish(true); }, 5000);
  async function start() {
    try {
      await Promise.race([document.fonts?.ready || Promise.resolve(), new Promise(r => setTimeout(r, 420))]);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (stopped) return;
      source = await capturePage();
      if (stopped) return;
      sampled = sample(source, cell, cell * 1.12);
      cw = W / sampled.cols; ch = H / sampled.rows;
      buildAtlas(); buildCells();
      clearTimeout(bootGuard);
      ctx.imageSmoothingEnabled = true; startedAt = performance.now(); frame = requestAnimationFrame(render);
    } catch (err) { console.warn('Intro skipped:', err); finish(true); }
  }
  // La capa ya estaba pintada antes de este script; el sitio sigue cargando por debajo.
  start();
})();
