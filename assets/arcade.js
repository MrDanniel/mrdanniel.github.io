/* Daniel C. Studio — arcade: paneles integrados en la página, registro de descubrimientos, caza de bugs,
   jefe final, insignia y modo neón. Cada juego vive en assets/games/<id>.js y se descarga al abrirlo. */
(() => {
  'use strict';
  const DC = window.DC; if (!DC) return;
  const { $, $$, store, fx, lite, reduced, t: T } = DC;
  const data = store.data, root = document.documentElement;
  const BASE = document.currentScript ? new URL('games/', document.currentScript.src).href : 'assets/games/';
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = v => Number(v).toLocaleString(DC.lang === 'en' ? 'en-US' : 'es-MX');

  const CAT = [
    { id: 'pulse', name: 'Pulse', detail: T('Ritmo y precisión', 'Rhythm and precision'), fmt: v => `${nf(v)} pts`, host: '.hero-grid', ref: 20000, help: T('Toca cada círculo cuando el anillo lo alcance. Las rachas multiplican la puntuación. También: Espacio, Z o X.', 'Tap each circle as the ring reaches it. Streaks multiply your score. Space, Z or X also work.') },
    { id: 'snake', name: 'Snake', detail: T('Arcade clásico', 'Arcade classic'), fmt: v => T(`${v} manzanas`, `${v} apples`), host: '.spec', ref: 40, help: T('Flechas o WASD. En móvil, desliza el dedo sobre el tablero.', 'Arrow keys or WASD. On mobile, swipe on the board.') },
    { id: 'pong', name: 'Pong', detail: T('Duelo de reflejos', 'Reflex duel'), fmt: v => T(`${v} puntos`, `${v} points`), host: '.toolbar', ref: 20, help: T('Mueve el ratón, arrastra o usa ↑ ↓. Tienes 3 vidas y el rival aprende.', 'Move the mouse, drag or use ↑ ↓. You have 3 lives and the rival learns.') },
    { id: 'flap', name: 'Flap', detail: T('Vuelo entre obstáculos', 'Flight through obstacles'), fmt: v => T(`${v} tubos`, `${v} pipes`), host: '.values', ref: 40, help: T('Clic, toque o Espacio para aletear.', 'Click, tap or press Space to flap.') },
    { id: 'wordle', name: 'Wordle', detail: T('Palabra de cinco letras', 'Five-letter word'), fmt: v => T(`racha de ${v}`, `${v} in a row`), host: '.spec', ref: 10, help: T('Seis intentos. Violeta: lugar correcto. Ámbar: letra en otra posición.', 'Six tries. Purple: right spot. Amber: letter in another position.') },
    { id: 'g2048', name: '2048', detail: T('Fusión de números', 'Number merging'), fmt: v => `${nf(v)} pts`, host: '.contact-inner', ref: 10000, help: T('Flechas, WASD o desliza. Combina fichas iguales.', 'Arrows, WASD or swipe. Merge equal tiles.') },
    { id: 'minesweeper', name: T('Buscaminas', 'Minesweeper'), detail: T('Campo de minas', 'Minefield'), mode: 'min', fmt: v => `${v} s`, host: '.foot-note', ref: 60, help: T('Clic para revelar, clic derecho o pulsación larga para bandera. Toca un número para despejar alrededor.', 'Click to reveal, right-click or long-press to flag. Tap a number to clear around it.') },
    { id: 'echo', name: 'Echo', detail: T('Memoria secuencial', 'Sequence memory'), fmt: v => T(`nivel ${v}`, `level ${v}`), host: '.manifesto', ref: 20, help: T('Observa la secuencia y repítela. Teclas 1–4 o toca los paneles.', 'Watch the sequence and repeat it. Keys 1–4 or tap the pads.') },
    { id: 'typing', name: 'Compile', detail: T('Velocidad de escritura', 'Typing speed'), fmt: v => `${v} ${T('ppm', 'wpm')}`, host: '.config', ref: 80, help: T('Escribe el código tal cual. El reloj arranca con la primera tecla y cada fragmento suma tiempo.', 'Type the code exactly. The clock starts on your first key and every snippet adds time.') },
    { id: 'lights', name: 'Lights Out', detail: T('Puzzle lógico', 'Logic puzzle'), mode: 'min', fmt: v => T(`${v} movimientos`, `${v} moves`), host: '.footer-bottom', ref: 10, help: T('Pulsar una casilla invierte ella y sus vecinas. Apaga todo con los menos movimientos posibles.', 'Pressing a cell flips it and its neighbours. Turn everything off in as few moves as you can.') },
    { id: 'breakout', name: 'Breakout', detail: T('Ladrillos y potenciadores', 'Bricks and power-ups'), fmt: v => `${nf(v)} pts`, host: '.sec-head', ref: 4000, help: T('Mueve el ratón, arrastra o usa ← →. Atrapa los potenciadores que caen.', 'Move the mouse, drag or use ← →. Catch the falling power-ups.') },
    { id: 'crash', name: 'Crash 404', detail: T('Ruta inexistente', 'Missing route'), fmt: v => `${v} m`, external: true, ref: 1500, hint: T('Algunas rutas no existen…', 'Some routes do not exist…') }
  ];
  const BOSS = { id: 'boss', name: 'Release 1.0', fmt: v => `${nf(v)} pts`, host: '.log-final', help: T('Arrastra la nave; dispara sola. Tres fases, con checkpoint al inicio de cada una. «Modo tranquilo» baja la dificultad.', 'Drag the ship; it fires on its own. Three phases, with a checkpoint at the start of each. “Calm mode” lowers the difficulty.') };
  const MINREF = { minesweeper: 60, lights: 10 };
  const BUGS = ['hero', 'marquee', 'project', 'note', 'manifesto', 'value', 'code', 'contact', 'footer', 'konami', 'logo', 'console'];
  const find = id => id === 'boss' ? BOSS : CAT.find(c => c.id === id);
  data.found = data.found.filter(id => CAT.some(c => c.id === id));
  data.bugs = data.bugs.filter(id => BUGS.includes(id));
  const log = $('#fragmentos');
  const isDone = () => data.found.length === CAT.length && data.bugs.length === BUGS.length;
  const total = () => {
    let s = 0;
    for (const c of CAT) { const r = data.records[c.id]; if (!r) continue; s += Math.min(100, MINREF[c.id] ? MINREF[c.id] / r * 100 : r / c.ref * 100); }
    return Math.round(s) + (data.records.boss || 0);
  };
  if (data.neon && data.complete) root.classList.add('neon');

  /* ───────── Registro ───────── */
  let freshId = '';
  function renderLog() {
    const n = data.found.length, done = isDone();
    const chip = $('#hud-chip');
    if (chip) { chip.classList.toggle('on', n > 0); $('#hud-count').textContent = `${n}/${CAT.length}`; }
    if (!log) return;
    if (n > 0 && log.hidden) { log.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => log.classList.add('open'))); }
    $('#log-count').textContent = String(n).padStart(2, '0');
    $('#log-total').textContent = String(CAT.length);
    $('#log-bar').style.setProperty('--p', n / CAT.length);
    $('#dis-grid').innerHTML = CAT.map(c => {
      const f = data.found.includes(c.id), rec = data.records[c.id], plays = data.stats[c.id]?.plays || 0;
      if (!f) return `<div class="dis"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" stroke-dasharray="2 3"/></svg><span><strong>???</strong><small>${esc(c.hint || T('sin identificar', 'unidentified'))}</small></span></div>`;
      const sub = rec != null ? T(`récord ${c.fmt(rec)}`, `best ${c.fmt(rec)}`) : c.detail;
      const pl = plays ? ` · ${plays} ${plays === 1 ? T('partida', 'game') : T('partidas', 'games')}` : '';
      return `<div class="dis found${freshId === c.id ? ' fresh' : ''}"><svg class="icon" aria-hidden="true"><use href="#g-${c.id}"/></svg><span><strong>${esc(c.name)}</strong><small>${esc(sub)}${pl}</small></span></div>`;
    }).join('');
    freshId = '';
    $('#bug-count').textContent = `${data.bugs.length}/${BUGS.length}`;
    $('#bug-pips').innerHTML = BUGS.map((_, i) => `<i class="${i < data.bugs.length ? 'on' : ''}"></i>`).join('');
    $('#swatches')?.classList.toggle('on', done);
    $('#log-caption').textContent = done ? T('Registro completo · acento y neón desbloqueados', 'Log complete · accent and neon unlocked') : T('Registro local · solo en este navegador', 'Local log · this browser only');
    $$('#swatches button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.accent === (data.accent || 'violeta'))));
    const nt = $('#neon-toggle');
    if (nt) { nt.hidden = !done; nt.setAttribute('aria-pressed', String(!!data.neon)); nt.textContent = `${T('Neón', 'Neon')}: ${data.neon ? 'on' : 'off'}`; }
    $('#log-final')?.classList.toggle('on', done);
    const bb = $('#badge-btn'); if (bb) bb.hidden = data.records.boss == null;
    const ts = $('#total-score');
    if (ts) ts.textContent = data.records.boss != null ? T(`Puntaje total ${nf(total())} · jefe ${nf(data.records.boss)}`, `Total score ${nf(total())} · boss ${nf(data.records.boss)}`) : T(`Puntaje actual de los juegos: ${nf(total())}`, `Current games score: ${nf(total())}`);
    if (done && !data.complete) { data.complete = true; store.save(); setTimeout(() => { DC.sound.play('win'); DC.toast(T('Registro completo. Neón, acento de color y un último jefe desbloqueados.', 'Log complete. Neon, accent colour and a final boss unlocked.'), { ms: 6000 }); }, 900); }
  }
  const goLog = () => log?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  function discover(id, el) {
    if (!CAT.some(c => c.id === id) || data.found.includes(id)) return;
    data.found.push(id); store.save(); freshId = id;
    DC.sound.play('discover');
    if (el) fx.at(el, { n: 28, speed: .5, size: 5 });
    renderLog();
    const chip = $('#hud-chip'); chip?.classList.remove('bump'); void chip?.offsetWidth; chip?.classList.add('bump');
    DC.toast(T(`Descubrimiento ${data.found.length}/${CAT.length} · ${find(id).name}`, `Discovery ${data.found.length}/${CAT.length} · ${find(id).name}`), { label: T('Ver registro', 'View log'), fn: goLog, ms: 4200 });
  }
  $('#reset-log')?.addEventListener('click', () => {
    if (confirm(T('¿Reiniciar el registro? Se borrarán descubrimientos, bugs y récords de este navegador.', 'Reset the log? Discoveries, bugs and records in this browser will be erased.'))) { store.reset(); location.reload(); }
  });
  $('#swatches')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-accent]'); if (!b) return;
    data.accent = b.dataset.accent; store.save();
    if (data.accent === 'violeta') delete root.dataset.accent; else root.dataset.accent = data.accent;
    DC.sound.play('toggle'); renderLog();
  });
  $('#neon-toggle')?.addEventListener('click', () => {
    data.neon = !data.neon; store.save(); root.classList.toggle('neon', data.neon); DC.sound.play('toggle'); renderLog();
  });

  /* ───────── Insignia compartible (PNG generado en el navegador) ───────── */
  async function makeBadge() {
    const ico = new Image(); ico.src = ($('link[rel="icon"]') || {}).href || ''; try { await ico.decode(); } catch { /* sin icono: se omite */ }
    const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), pal = DC.palette();
    g.fillStyle = '#151515'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(206,177,239,.13)'; g.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const gr = g.createRadialGradient(950, 120, 0, 950, 120, 520); gr.addColorStop(0, 'rgba(140,91,196,.55)'); gr.addColorStop(1, 'rgba(140,91,196,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = pal[0]; g.lineWidth = 2;
    [[60, 60, 1, 1], [W - 60, 60, -1, 1], [60, H - 60, 1, -1], [W - 60, H - 60, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + sx * 34, y); g.lineTo(x, y); g.lineTo(x, y + sy * 34); g.stroke(); });
    g.beginPath(); g.arc(930, 330, 190, 0, 6.283); g.stroke(); g.beginPath(); g.arc(930, 330, 120, 0, 6.283); g.strokeStyle = pal[2]; g.stroke();
    g.fillStyle = '#151515'; g.fillRect(872, 292, 116, 76); g.strokeStyle = pal[0]; g.strokeRect(872, 292, 116, 76);
    if (ico.complete && ico.naturalWidth) g.drawImage(ico, 912, 310, 40, 40);
    g.textAlign = 'left'; g.fillStyle = pal[0]; g.font = '400 22px "JetBrains Mono",monospace'; g.fillText('~/daniel-c-studio/release-1.0', 100, 130);
    g.fillStyle = '#f3eff8'; g.font = '700 64px Unbounded,sans-serif'; g.fillText('Release 1.0', 100, 215);
    g.fillStyle = pal[0]; g.font = '700 150px Unbounded,sans-serif'; g.fillText(nf(total()), 100, 380);
    g.fillStyle = '#a9a1b3'; g.font = '400 24px "JetBrains Mono",monospace';
    g.fillText(T('puntaje total', 'total score'), 104, 424);
    g.fillText(T(`${data.found.length}/${CAT.length} descubrimientos · ${data.bugs.length}/${BUGS.length} bugs`, `${data.found.length}/${CAT.length} discoveries · ${data.bugs.length}/${BUGS.length} bugs`), 100, 520);
    g.fillStyle = '#7a7285'; g.font = '400 20px "JetBrains Mono",monospace'; g.fillText('mrdanniel.github.io', 100, 560);
    return c;
  }
  $('#badge-btn')?.addEventListener('click', async () => {
    (await makeBadge()).toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], 'dc-release-1.0.png', { type: 'image/png' });
      try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Release 1.0' }); return; } } catch { /* cancelado: descarga normal */ }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dc-release-1.0.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      DC.sound.play('win');
    }, 'image/png');
  });

  /* ───────── Caza de bugs ───────── */
  function playKonami() {
    DC.sound.konami((i, c) => {
      fx.burst(innerWidth * (i + 1) / 8, innerHeight - 24, { n: 8 + c.n.length * 4, angle: -Math.PI / 2, spread: .7, speed: .55 + c.n.length * .08, gravity: .0012, size: 5, life: 700 });
    });
  }
  function squash(id, el) {
    if (data.bugs.includes(id)) return;
    data.bugs.push(id); store.save();
    DC.sound.play('bug');
    fx[el ? 'at' : 'burst'](...(el ? [el] : [innerWidth / 2, innerHeight / 2]), { color: ['#8ff0c8', '#df9de7', '#f2c58e'], n: 20, speed: .38 });
    if (el && el.matches('[data-bug]')) { el.classList.add('dead'); setTimeout(() => el.remove(), 520); }
    const n = data.bugs.length;
    if (id === 'konami') {
      setTimeout(() => {
        playKonami();
        if (!DC.sound.enabled) DC.toast(T('Este bug tiene banda sonora.', 'This bug has a soundtrack.'), { label: T('Activar sonido', 'Turn sound on'), fn: () => { DC.sound.set(true); setTimeout(playKonami, 250); }, ms: 5200 });
      }, 350);
    } else DC.toast(n === BUGS.length ? T('Bug aplastado · 12/12. Producción limpia (por ahora).', 'Bug squashed · 12/12. Production is clean (for now).') : T(`Bug aplastado · ${n}/${BUGS.length}`, `Bug squashed · ${n}/${BUGS.length}`), { ms: 2600 });
    renderLog();
  }
  $$('[data-bug]').forEach(el => { if (data.bugs.includes(el.dataset.bug)) el.remove(); });
  // Wordmark ×5: la señal segmentada hace visible la secuencia sin mostrar un contador.
  let logoClicks = 0, logoT;
  function clearLogoProgress(wordmark){
    logoClicks=0;
    wordmark.classList.remove('wordmark-progress','wordmark-hit','wordmark-complete');
    wordmark.removeAttribute('data-logo-step');
    wordmark.style.removeProperty('--logo-progress');
  }
  $$('.site-header .brand').forEach(b => b.addEventListener('click', () => {
    const wordmark = $('.brand-name', b); if (!wordmark) return;
    clearTimeout(logoT);
    if (data.bugs.includes('logo')) {
      wordmark.classList.remove('wordmark-hit'); void wordmark.offsetWidth; wordmark.classList.add('wordmark-hit');
      DC.sound.tone(580,.055,'triangle',.025,1.15);
      setTimeout(()=>wordmark.classList.remove('wordmark-hit'),380);
      return;
    }
    logoClicks=Math.min(5,logoClicks+1);
    wordmark.classList.add('wordmark-progress');
    wordmark.style.setProperty('--logo-progress',String(logoClicks/5));
    wordmark.dataset.logoStep=String(logoClicks);
    wordmark.classList.remove('wordmark-hit'); void wordmark.offsetWidth; wordmark.classList.add('wordmark-hit');
    DC.sound.tone(390+logoClicks*155,.075,'triangle',.034,1.22);
    if(logoClicks===4){const h=$('.site-header');h.classList.remove('flick');void h.offsetWidth;h.classList.add('flick');}
    if(logoClicks>=5){
      wordmark.classList.add('wordmark-complete');
      squash('logo',wordmark);
      setTimeout(()=>clearLogoProgress(wordmark),760);
    }else{
      logoT=setTimeout(()=>clearLogoProgress(wordmark),3000);
    }
  }));
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kpos = 0;
  window.dcs = { debug() { squash('console'); return T('bug #12 aplastado. Buen instinto.', 'bug #12 squashed. Good instincts.'); } };
  console.log('%c DC %c ' + T('¿Abriendo la consola? Buen instinto. Hay un bug escondido aquí: ejecuta dcs.debug()', 'Opening the console? Good instincts. There is a bug hiding here: run dcs.debug()'),
    'background:#8c5bc4;color:#fff;padding:2px 6px;font-weight:700', 'color:#b88af1');

  /* ───────── Paneles de juego integrados en el flujo de la página ───────── */
  const defs = {}, loaded = {};
  window.DCArcade = { define(id, fn) { defs[id] = fn; } };
  const load = id => loaded[id] ||= new Promise((res, rej) => {
    if (defs[id]) return res();
    const s = document.createElement('script'); s.src = `${BASE}${id}.js`;
    s.onload = () => defs[id] ? res() : rej(new Error('definición ausente')); s.onerror = () => { delete loaded[id]; rej(new Error('carga fallida')); };
    document.head.appendChild(s);
  });
  let cur = null;
  const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

  function openGame(id, trigger) {
    const def = find(id); if (!def || def.external) return;
    if (id === 'boss' && !isDone()) return;
    if (cur && cur.id === id) { cur.panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); mount(); return; }
    discover(id, trigger);
    closeGame(true);
    const host = trigger.closest(def.host) || trigger.closest('section') || trigger.parentElement;
    const panel = document.createElement('section');
    panel.className = 'arcade'; panel.setAttribute('aria-label', T(`Experiencia interactiva: ${def.name}`, `Interactive experience: ${def.name}`));
    panel.innerHTML = `<div class="arcade-clip"><div class="arcade-body">
      <div class="arcade-bar"><span class="arcade-name"><svg class="icon" aria-hidden="true"><use href="#g-${id}"/></svg>${esc(def.name)}</span>
        <span class="arcade-hud" data-hud></span><span class="arcade-rec" data-rec></span>
        <button class="arcade-btn" type="button" data-act="restart" aria-label="${T('Reiniciar', 'Restart')}"><svg class="icon" aria-hidden="true"><use href="#i-redo"/></svg></button>
        <button class="arcade-btn" type="button" data-act="close" aria-label="${T('Cerrar', 'Close')}"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button></div>
      <div class="arcade-stage" tabindex="-1"></div><p class="arcade-help">${esc(def.help)}</p></div></div>`;
    host.after(panel);
    cur = { id, def, panel, trigger, stage: $('.arcade-stage', panel), hudEl: $('[data-hud]', panel), recEl: $('[data-rec]', panel), cleanups: [], keyFns: [], mode: 'idle', prevent: true };
    DC.sound.play('open');
    setRec();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      panel.classList.add('open');
      panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => panel.classList.add('settled'), 650);
    }));
    cur.stage.focus({ preventScroll: true });
    const my = cur;
    load(id).then(() => { if (cur === my) mount(); }).catch(() => { if (cur === my) my.stage.innerHTML = `<p class="arcade-help">${T('No se pudo cargar esta experiencia. Revisa tu conexión e inténtalo de nuevo.', 'This experience could not be loaded. Check your connection and try again.')}</p>`; });
    panel.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'close') closeGame(); else { DC.sound.play('click'); mount(); }
    });
  }
  function teardown() { if (!cur) return; cur.cleanups.splice(0).forEach(f => { try { f(); } catch { /* ignorar */ } }); cur.keyFns = []; cur.prevent = true; }
  function closeGame(instant) {
    if (!cur) return;
    const c = cur; teardown(); cur = null;
    if (instant || reduced) { c.panel.remove(); return; }
    DC.sound.play('close');
    c.panel.classList.remove('settled', 'open');
    setTimeout(() => c.panel.remove(), 600);
    c.trigger?.focus?.({ preventScroll: true });
  }
  function setRec() {
    if (!cur) return;
    const v = data.records[cur.id];
    cur.recEl.textContent = v == null ? T('récord —', 'best —') : T(`récord ${cur.def.fmt(v)}`, `best ${cur.def.fmt(v)}`);
  }
  function mount() {
    if (!cur || !defs[cur.id]) return;
    teardown(); cur.stage.innerHTML = ''; cur.mode = 'play'; cur.hudEl.textContent = '';
    const ctx = makeCtx(cur);
    try { defs[cur.id](ctx); } catch (err) { console.error(err); cur.stage.innerHTML = `<p class="arcade-help">${T('Esta experiencia falló al iniciar.', 'This experience failed to start.')}</p>`; }
  }

  function makeCtx(c) {
    const { stage, def } = c;
    let veil = null, over = false, veilT = 0;
    const ctx = {
      id: c.id, stage, def, t: T, lang: DC.lang,
      play: (n, a) => DC.sound.play(n, a),
      tone: DC.sound.tone,
      stat(key, d = 1) { (data.stats[c.id] ||= {})[key] = (data.stats[c.id][key] || 0) + d; store.save(); },
      stats: () => (data.stats[c.id] ||= {}),
      best: () => data.records[c.id],
      hud: t => { c.hudEl.textContent = t; },
      timeout(fn, ms) { const t = setTimeout(fn, ms); c.cleanups.push(() => clearTimeout(t)); return t; },
      interval(fn, ms) { const t = setInterval(fn, ms); c.cleanups.push(() => clearInterval(t)); return t; },
      on(target, type, fn, o) { target.addEventListener(type, fn, o); c.cleanups.push(() => target.removeEventListener(type, fn, o)); },
      keys(fn, o = {}) { c.keyFns.push(fn); if (o.prevent === false) c.prevent = false; },
      shake() { if (lite || reduced) return; stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); },
      burst: (x, y, o) => fx.burst(x, y, o),
      at: (el, o) => fx.at(el, o),
      canvas(w, h) {
        const cv = document.createElement('canvas'); cv.className = 'cv';
        cv.width = w * DC.dpr; cv.height = h * DC.dpr;
        cv.style.aspectRatio = `${w} / ${h}`; cv.style.width = `min(100%, ${Math.round(w * 1.3)}px, calc(72vh * ${(w / h).toFixed(3)}))`;
        stage.appendChild(cv);
        const g = cv.getContext('2d'); g.setTransform(DC.dpr, 0, 0, DC.dpr, 0, 0);
        return {
          cv, g, w, h,
          pos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * w / r.width, y: (e.clientY - r.top) * h / r.height }; },
          burst(x, y, o) { const r = cv.getBoundingClientRect(); fx.burst(r.left + x * r.width / w, r.top + y * r.height / h, o); }
        };
      },
      loop(fn) {
        let raf = 0, last = 0, stopped = false, vis = true;
        const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf && !stopped) { last = 0; raf = requestAnimationFrame(f); } }, { threshold: .05 });
        io.observe(stage);
        function f(t) {
          raf = 0; if (stopped || !vis || document.hidden) return;
          if (!last) last = t;
          const dt = Math.min(50, t - last); last = t;
          fn(dt, t);
          if (!stopped) raf = requestAnimationFrame(f);
        }
        const onvis = () => { if (!document.hidden && !raf && !stopped && vis) { last = 0; raf = requestAnimationFrame(f); } };
        document.addEventListener('visibilitychange', onvis);
        raf = requestAnimationFrame(f);
        const stop = () => { stopped = true; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', onvis); };
        c.cleanups.push(stop); return stop;
      },
      veil(html, mode) {
        if (!veil) { veil = document.createElement('div'); veil.className = 'veil'; veil.addEventListener('click', () => { if (c.mode === 'over' && performance.now() - veilT > 450) mount(); }); stage.appendChild(veil); }
        veil.hidden = false; veil.innerHTML = html; c.mode = mode || c.mode; veilT = performance.now();
        veil.style.pointerEvents = c.mode === 'over' ? '' : 'none';
      },
      unveil() { if (veil) veil.hidden = true; c.mode = 'play'; },
      countdown(cb) {
        let n = 3;
        const step = () => {
          if (n > 0) { ctx.veil(`<div class="count">${n}</div>`, 'count'); ctx.play('count'); n--; ctx.timeout(step, 420); }
          else { ctx.unveil(); ctx.play('go'); cb(); }
        };
        step();
      },
      end(o = {}) {
        if (over) return; over = true;
        const finish = () => {
          const s = o.score, old = data.records[c.id];
          ctx.stat('plays');
          let isNew = false;
          if (s != null && o.record !== false) {
            if (def.mode === 'min' ? (old == null || s < old) : (s > 0 && (old == null || s > old))) { data.records[c.id] = s; isNew = true; store.save(); setRec(); }
          }
          ctx.play(isNew ? 'record' : (o.win ? 'win' : 'over'));
          const best = data.records[c.id];
          ctx.veil(`<div class="mid">${esc(o.title || T('Fin de la partida', 'Game over'))}</div>
            ${s != null ? `<div class="big">${esc(def.fmt(s))}</div>` : ''}
            ${isNew ? `<span class="new">${T('NUEVO RÉCORD', 'NEW RECORD')}</span>` : best != null ? `<small>${T('Récord', 'Best')} · ${esc(def.fmt(best))}</small>` : ''}
            ${o.text ? `<small>${esc(o.text)}</small>` : ''}<small>${T('Toca o pulsa Enter para repetir', 'Tap or press Enter to play again')}</small>`, 'over');
          if (isNew) fx.at(stage, { n: 36, speed: .5, size: 5 });
          renderLog();
        };
        if (o.delay) ctx.timeout(finish, o.delay); else finish();
      }
    };
    return ctx;
  }

  /* ───────── Eventos globales ───────── */
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-game]');
    if (g) { e.preventDefault(); openGame(g.dataset.game, g); return; }
    const b = e.target.closest('[data-bug]');
    if (b) { e.preventDefault(); squash(b.dataset.bug, b); }
  });
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    kpos = (k === KONAMI[kpos]) ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) { kpos = 0; squash('konami'); }
    if (!cur) return;
    if (e.key === 'Escape') { closeGame(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const inField = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (cur.mode === 'over' && (e.key === 'Enter' || e.key === ' ') && !inField) { e.preventDefault(); mount(); return; }
    cur.keyFns.forEach(fn => fn(e));
    if (cur.prevent && !inField && PREVENT.has(e.key)) e.preventDefault();
  });

  renderLog();
})();
