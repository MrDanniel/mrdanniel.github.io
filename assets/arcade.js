/* Daniel C. Studio — arcade: paneles integrados en la página, registro de descubrimientos, caza de bugs,
   jefe final, insignia y modo neón. Cada juego vive en assets/games/<id>.js y se descarga al abrirlo. */
(() => {
  'use strict';
  const DC = window.DC; if (!DC) return;
  const { $, $$, store, fx, lite, reduced, t: T } = DC;
  const data = store.data, root = document.documentElement;
  const SITE_VERSION = '5.3.1';   // versión actual del sitio: se muestra en la insignia, en los rangos y en el jefe
  const BASE = document.currentScript ? new URL('games/', document.currentScript.src).href : 'assets/games/';
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = v => Number(v).toLocaleString(DC.lang === 'en' ? 'en-US' : 'es-MX');

  const CAT = [
    { id: 'pulse', name: 'Pulse', detail: T('Ritmo y precisión', 'Rhythm and precision'), fmt: v => `${nf(v)} pts`, host: '.hero-grid', ref: 20000, help: T('Apunta con el ratón y toca cada círculo cuando el anillo lo alcance (Espacio, Z o X hacen clic donde esté el puntero). Los toques fuera de lugar o antes de tiempo restan energía.', 'Aim with the mouse and tap each circle as the ring reaches it (Space, Z or X click wherever the pointer is). Stray or early taps cost energy.') },
    { id: 'snake', name: 'Snake', detail: T('Arcade clásico', 'Arcade classic'), fmt: v => T(`${v} manzanas`, `${v} apples`), host: '.spec', ref: 40, help: T('Flechas o WASD. En móvil, desliza el dedo sobre el tablero.', 'Arrow keys or WASD. On mobile, swipe on the board.') },
    { id: 'minesweeper', name: T('Buscaminas', 'Minesweeper'), detail: T('Campo de minas', 'Minefield'), mode: 'min', fmt: v => `${v} s`, host: '.foot-note', ref: 60, help: T('Clic para revelar, clic derecho o pulsación larga para bandera. Toca un número para despejar alrededor.', 'Click to reveal, right-click or long-press to flag. Tap a number to clear around it.') },
    { id: 'breakout', name: 'Breakout', detail: T('Ladrillos y potenciadores', 'Bricks and power-ups'), fmt: v => `${nf(v)} pts`, host: '.sec-head', ref: 4000, help: T('Mueve el ratón, arrastra o usa ← →. Atrapa los potenciadores que caen.', 'Move the mouse, drag or use ← →. Catch the falling power-ups.') },
    { id: 'flap', name: 'Flap', detail: T('Vuelo entre obstáculos', 'Flight through obstacles'), fmt: v => T(`${v} tubos`, `${v} pipes`), host: '.values', ref: 40, help: T('Clic, toque o Espacio para aletear.', 'Click, tap or press Space to flap.') },
    { id: 'wordle', name: 'Wordle', detail: T('Palabra de cinco letras', 'Five-letter word'), fmt: v => T(`racha de ${v}`, `${v} in a row`), host: '.spec', ref: 10, help: T('Seis intentos. Violeta: lugar correcto. Ámbar: letra en otra posición.', 'Six tries. Purple: right spot. Amber: letter in another position.') },
    { id: 'pong', name: 'Pong', detail: T('Duelo de reflejos', 'Reflex duel'), fmt: v => T(`${v} puntos`, `${v} points`), host: '.toolbar', ref: 20, help: T('Mueve el ratón, arrastra o usa ↑ ↓. Tienes 3 vidas y el rival aprende.', 'Move the mouse, drag or use ↑ ↓. You have 3 lives and the rival learns.') },
    { id: 'g2048', name: '2048', detail: T('Fusión de números', 'Number merging'), fmt: v => `${nf(v)} pts`, host: '.contact-inner', ref: 10000, help: T('Flechas, WASD o desliza. Combina fichas iguales.', 'Arrows, WASD or swipe. Merge equal tiles.') },
    { id: 'echo', name: 'Echo', detail: T('Memoria secuencial', 'Sequence memory'), fmt: v => T(`nivel ${v}`, `level ${v}`), host: '.manifesto', ref: 20, help: T('Observa la secuencia y repítela. Teclas 1–4 o toca los paneles.', 'Watch the sequence and repeat it. Keys 1–4 or tap the pads.') },
    { id: 'typing', name: 'Compile', detail: T('Velocidad de escritura', 'Typing speed'), fmt: v => `${v} ${T('ppm', 'wpm')}`, host: '.config', ref: 80, help: T('Escribe el código tal cual. El reloj arranca con la primera tecla y cada fragmento suma tiempo.', 'Type the code exactly. The clock starts on your first key and every snippet adds time.') },
    { id: 'lights', name: 'Lights Out', detail: T('Puzzle lógico', 'Logic puzzle'), mode: 'min', fmt: v => T(`${v} movimientos`, `${v} moves`), host: '.footer-bottom', ref: 10, help: T('Pulsar una casilla invierte ella y sus vecinas. Apaga todo con los menos movimientos posibles.', 'Pressing a cell flips it and its neighbours. Turn everything off in as few moves as you can.') },
    { id: 'crash', name: 'Crash 404', detail: T('Ruta inexistente', 'Missing route'), fmt: v => `${v} m`, external: true, ref: 1500, hint: T('Algunas rutas no existen…', 'Some routes do not exist…') }
  ];
  const BOSS = { id: 'boss', name: `Release ${SITE_VERSION}`, fmt: v => `${v}/100`, host: '.log-final', help: T('Combate a pantalla completa en seis fases. Todo con el ratón o el dedo: mueve la nave; dispara sola. Clic derecho o ROLLBACK despeja los disparos. Solo el comando final se escribe con el teclado. «Modo tranquilo» baja la dificultad.', 'Full-screen fight in six phases. Everything with the mouse or your finger: move the ship; it fires on its own. Right-click or ROLLBACK clears the bullets. Only the final command is typed on the keyboard. “Calm mode” lowers the difficulty.') };
  const MINREF = { minesweeper: 60, lights: 10 };
  const BUGS = ['hero', 'marquee', 'project', 'note', 'manifesto', 'value', 'code', 'contact', 'footer', 'konami', 'logo', 'console'];
  const find = id => id === 'boss' ? BOSS : CAT.find(c => c.id === id);
  data.found = data.found.filter(id => CAT.some(c => c.id === id));
  data.bugs = data.bugs.filter(id => BUGS.includes(id));
  const log = $('#fragmentos');
  const BOSS_BUGS = 8;   // el combate final se abre con todos los juegos descubiertos y 8 bugs aplastados
  const bossOpen = () => data.found.length === CAT.length && data.bugs.length >= BOSS_BUGS;
  const isDone = () => data.found.length === CAT.length && data.bugs.length === BUGS.length;
  /* ───────── Puntuación: promedio de maestría (habilidad + esfuerzo) ─────────
     Cada juego vale hasta 100: habilidad (0–80) mezcla tu mejor marca (65 %) con el promedio de tus últimas 5 partidas (35 %),
     y esfuerzo (0–20) premia partidas, tiempo jugado y récords superados. El total es el promedio de los 12 juegos (60 %) y el jefe (40 %). */
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const ratioOf = (id, raw) => { const m = MINREF[id]; return clamp01(m ? m / Math.max(raw, 1e-9) : raw / find(id).ref); };
  function scoreOf(id) {
    const st = data.stats[id] || {}, rec = data.records[id], runs = Array.isArray(st.runs) ? st.runs : [];
    const best = rec != null ? ratioOf(id, rec) : 0;
    const avg = runs.length ? runs.reduce((a, r) => a + ratioOf(id, r), 0) / runs.length : best;
    const skill = 80 * Math.pow(clamp01(.65 * best + .35 * avg), .7);
    const plays = st.plays || (rec != null ? 1 : 0), mins = (st.ms || 0) / 60000;
    const effort = 20 * (.5 * clamp01(plays / 6) + .3 * clamp01(mins / 6) + .2 * clamp01((st.pb || (rec != null ? 1 : 0)) / 3));
    return { skill: Math.round(skill), effort: Math.round(effort), total: Math.round(skill + effort) };
  }
  const mastery = () => Math.round(CAT.reduce((a, c) => a + scoreOf(c.id).total, 0) / CAT.length);
  const total = () => data.records.boss != null ? Math.round(.6 * mastery() + .4 * data.records.boss) : mastery();
  const RANKS = [[0, T('v0.1 · Prototipo', 'v0.1 · Prototype')], [20, T('v0.5 · Alfa', 'v0.5 · Alpha')], [40, T('v0.9 · Beta', 'v0.9 · Beta')], [60, T(`v${SITE_VERSION}-rc · Candidato`, `v${SITE_VERSION}-rc · Candidate`)], [80, T(`v${SITE_VERSION} · Estable`, `v${SITE_VERSION} · Stable`)], [92, T(`v${SITE_VERSION} LTS · Leyenda`, `v${SITE_VERSION} LTS · Legend`)]];
  const rank = v => RANKS.filter(r => v >= r[0]).pop()[1];
  if (data.bossV !== 3) { delete data.records.boss; data.bossV = 3; store.save(); } // el jefe antiguo puntuaba distinto
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
      const sc = scoreOf(c.id), sub = (rec != null ? T(`récord ${c.fmt(rec)}`, `best ${c.fmt(rec)}`) : c.detail) + (plays || rec != null ? ` · ${sc.total}/100` : '');
      const pl = plays ? ` · ${plays} ${plays === 1 ? T('partida', 'game') : T('partidas', 'games')}` : '';
      return `<div class="dis found${freshId === c.id ? ' fresh' : ''}"><svg class="icon" aria-hidden="true"><use href="#g-${c.id}"/></svg><span><strong>${esc(c.name)}</strong><small>${esc(sub)}${pl}</small></span></div>`;
    }).join('');
    freshId = '';
    let sn = $('#score-note'); if (!sn) { sn = document.createElement('p'); sn.id = 'score-note'; sn.className = 'score-note'; $('#dis-grid').after(sn); }
    sn.textContent = T('Cada juego vale hasta 100: habilidad (80, según tu mejor marca y el promedio de tus últimas 5 partidas) + esfuerzo (20, por partidas, tiempo y récords superados). El total es el promedio de los 12 juegos (60 %) y el jefe (40 %).', 'Each game is worth up to 100: skill (80, from your best result and the average of your last 5 runs) + effort (20, for plays, time and records beaten). The total is the average of the 12 games (60%) and the boss (40%).');
    $('#bug-count').textContent = `${data.bugs.length}/${BUGS.length}`;
    $('#bug-pips').innerHTML = BUGS.map((_, i) => `<i class="${i < data.bugs.length ? 'on' : ''}"></i>`).join('');
    $('#swatches')?.classList.toggle('on', done);
    $('#log-caption').textContent = done ? T('Registro completo · acento y neón desbloqueados', 'Log complete · accent and neon unlocked') : T('Registro local · solo en este navegador', 'Local log · this browser only');
    $$('#swatches button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.accent === (data.accent || 'violeta'))));
    const nt = $('#neon-toggle');
    if (nt) { nt.hidden = !done; nt.setAttribute('aria-pressed', String(!!data.neon)); nt.textContent = `${T('Neón', 'Neon')}: ${data.neon ? 'on' : 'off'}`; }
    $('#log-final')?.classList.toggle('on', bossOpen());
    if (bossOpen() && !data.bossOpened) { data.bossOpened = true; store.save(); setTimeout(() => DC.toast(T('Algo se ha desplegado en el registro.', 'Something was deployed to the log.'), { ms: 3600 }), 1200); }
    refreshBadge();
    const ts = $('#total-score');
    if (ts) ts.textContent = data.records.boss != null
      ? T(`Total ${total()}/100 · ${rank(total())} · juegos ${mastery()} · jefe ${data.records.boss}`, `Total ${total()}/100 · ${rank(total())} · games ${mastery()} · boss ${data.records.boss}`)
      : T(`Maestría de los juegos: ${mastery()}/100 (promedio de 12) · ${rank(mastery())}`, `Games mastery: ${mastery()}/100 (average of 12) · ${rank(mastery())}`);
    if (done && !data.complete) { data.complete = true; store.save(); setTimeout(() => { DC.sound.play('win'); DC.toast(T('Registro completo. Neón y acento de color desbloqueados.', 'Log complete. Neon and accent colour unlocked.'), { ms: 6000 }); }, 900); }
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

  /* ───────── Insignia de resultado: se muestra en pantalla para tomarle captura (sin descargas ni diálogos) ───────── */
  // Símbolo completo de la marca: círculos, hexágono, ejes y favicon «ojo» en la caja central (siempre blanco)
  function drawMark(g, cx, cy, R, pal) {
    const s = R / 250, lw = w => w / s;
    g.save(); g.translate(cx, cy); g.scale(s, s);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, 250); glow.addColorStop(0, 'rgba(140,91,196,.5)'); glow.addColorStop(1, 'rgba(140,91,196,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, 250, 0, 6.283); g.fill();
    const lg = g.createLinearGradient(-236, -236, 236, 236); lg.addColorStop(0, pal[0]); lg.addColorStop(1, '#623b88');
    g.strokeStyle = lg; g.lineWidth = lw(2);
    for (const r of [236, 168]) { g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.stroke(); }
    g.fillStyle = 'rgba(140,91,196,.35)'; g.beginPath(); g.arc(0, 0, 104, 0, 6.283); g.fill(); g.stroke();
    g.save(); g.strokeStyle = pal[1]; g.globalAlpha = .55; g.lineWidth = lw(1.6); g.setLineDash([lw(4), lw(9)]); g.beginPath(); g.arc(0, 0, 202, 0, 6.283); g.stroke(); g.restore();
    g.strokeStyle = pal[0]; g.globalAlpha = .7; g.lineWidth = lw(1.4); g.beginPath(); g.moveTo(0, -236); g.lineTo(0, 236); g.moveTo(-236, 0); g.lineTo(236, 0); g.stroke(); g.globalAlpha = 1;
    g.strokeStyle = pal[1]; g.lineWidth = lw(2.6); g.beginPath(); [[0, -190], [170, -95], [170, 95], [0, 190], [-170, 95], [-170, -95]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke();
    g.globalAlpha = .35; g.lineWidth = lw(1.6); g.beginPath(); g.moveTo(-170, -95); g.lineTo(170, 95); g.moveTo(170, -95); g.lineTo(-170, 95); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = pal[2]; g.beginPath(); g.arc(0, -202, 6, 0, 6.283); g.fill();
    g.fillStyle = pal[0]; g.beginPath(); g.arc(0, 202, 4, 0, 6.283); g.fill();
    g.fillStyle = '#151515'; g.strokeStyle = pal[0]; g.lineWidth = lw(2); g.fillRect(-54, -34, 108, 68); g.strokeRect(-54, -34, 108, 68);
    g.strokeStyle = pal[2]; g.lineWidth = lw(3); g.beginPath(); g.moveTo(-54, -34); g.lineTo(-44, -34); g.moveTo(-54, -34); g.lineTo(-54, -24); g.moveTo(54, 34); g.lineTo(44, 34); g.moveTo(54, 34); g.lineTo(54, 24); g.stroke();
    g.save(); g.translate(-18, -18); g.scale(.36, .36); g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(98, 50); g.arc(50, 50, 48, 0, 6.283); g.moveTo(86, 50); g.arc(50, 50, 36, 0, -6.2832, true); g.moveTo(58, 40); g.arc(32, 40, 26, 0, 6.283); g.fill(); g.restore();
    g.restore();
  }
  function makeBadge() {
    const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), pal = DC.palette();
    g.fillStyle = '#151515'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(206,177,239,.13)'; g.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const gr = g.createRadialGradient(950, 90, 0, 950, 90, 560); gr.addColorStop(0, 'rgba(140,91,196,.5)'); gr.addColorStop(1, 'rgba(140,91,196,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = pal[0]; g.lineWidth = 2;
    [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + sx * 30, y); g.lineTo(x, y); g.lineTo(x, y + sy * 30); g.stroke(); });
    drawMark(g, 925, 315, 262, pal);
    g.textAlign = 'left';
    g.fillStyle = '#7a7285'; g.font = '400 22px "JetBrains Mono",monospace'; g.fillText(`~/daniel-c-studio/release-${SITE_VERSION}`, 96, 112);
    g.fillStyle = '#f3eff8'; g.font = '700 58px Unbounded,sans-serif'; g.fillText(`Release ${SITE_VERSION}`, 96, 190);
    g.fillStyle = pal[0]; g.font = '400 24px "JetBrains Mono",monospace'; g.fillText(T('Jefe final derrotado', 'Final boss defeated'), 98, 230);
    g.fillStyle = '#a9a1b3'; g.font = '400 22px "JetBrains Mono",monospace'; g.fillText(T('puntaje total', 'total score'), 98, 292);
    const tg = g.createLinearGradient(96, 300, 600, 400); tg.addColorStop(0, '#f1e4ff'); tg.addColorStop(1, pal[1]);
    g.fillStyle = tg; g.font = '700 120px Unbounded,sans-serif'; g.fillText(String(total()), 92, 400); const tw = g.measureText(String(total())).width; g.fillStyle = '#a9a1b3'; g.font = '400 34px "JetBrains Mono",monospace'; g.fillText('/100', 100 + tw, 400); g.fillStyle = pal[1]; g.font = '600 26px "JetBrains Mono",monospace'; g.fillText(rank(total()), 98, 436);
    const chips = [[T('juegos (prom.)', 'games (avg)'), `${mastery()}/100`], ['bugs', `${data.bugs.length}/${BUGS.length}`], [T('jefe', 'boss'), `${data.records.boss || 0}/100`]];
    chips.forEach(([l, v], i) => {
      const x = 96 + i * 196, y = 468;
      g.fillStyle = 'rgba(140,91,196,.14)'; g.fillRect(x, y, 184, 78); g.strokeStyle = 'rgba(211,183,255,.4)'; g.lineWidth = 1.5; g.strokeRect(x, y, 184, 78);
      g.fillStyle = '#a9a1b3'; g.font = '400 16px "JetBrains Mono",monospace'; g.fillText(l, x + 14, y + 28);
      g.fillStyle = '#f3eff8'; g.font = '700 26px "JetBrains Mono",monospace'; g.fillText(v, x + 14, y + 61);
    });
    const date = new Date().toLocaleDateString(DC.lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    g.fillStyle = '#7a7285'; g.font = '400 20px "JetBrains Mono",monospace'; g.fillText(`mrdanniel.github.io · v${SITE_VERSION} · ${date}`, 98, 592);
    return c;
  }
  let bview = null;
  function paintBadge() { if (!bview) return; const cv = $('canvas', bview); cv.width = 1200; cv.height = 630; cv.getContext('2d').drawImage(makeBadge(), 0, 0); }
  function refreshBadge() {
    const bb = $('#badge-btn');
    if (bb) { bb.hidden = data.records.boss == null; if (bb.firstChild && bb.firstChild.nodeType === 3) bb.firstChild.nodeValue = T('Ver insignia ', 'View badge '); }
    if (bview && !bview.hidden) paintBadge();
  }
  $('#badge-btn')?.addEventListener('click', () => {
    if (!bview) {
      bview = document.createElement('div'); bview.className = 'badge-view'; bview.hidden = true;
      bview.innerHTML = `<canvas aria-label="${T('Insignia de resultado', 'Result badge')}"></canvas><p>${T('Toma una captura de pantalla para guardarla.', 'Take a screenshot to save it.')}</p>`;
      $('#log-final').appendChild(bview);
    }
    bview.hidden = !bview.hidden;
    if (!bview.hidden) { paintBadge(); DC.sound.play('open'); bview.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }
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
  window.dcs = { debug() { squash('console'); return T('bug #12 aplastado. Bien ahí.', 'bug #12 squashed. Good job.'); } };
  console.log('%c DC %c ' + T('¿Abriendo la consola? Buen instinto. Hay un bug escondido aquí: ejecuta dcs.debug()', 'Opening the console? Good instincts. There is a bug hiding here: run dcs.debug()'),
    'background:#8c5bc4;color:#fff;padding:2px 6px;font-weight:700', 'color:#b88af1');

  /* ───────── Paneles de juego integrados en el flujo de la página ───────── */
  const defs = {}, loaded = {};
  window.DCArcade = { define(id, fn) { defs[id] = fn; }, badge: () => makeBadge().toDataURL('image/png'), version: SITE_VERSION };
  const words = () => window.DCWords ? Promise.resolve() : (loaded.words ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = `${BASE}words.js`; s.onload = res; s.onerror = () => { delete loaded.words; rej(new Error('carga fallida')); }; document.head.appendChild(s);
  }));
  const load = id => loaded[id] ||= (id === 'wordle' || id === 'boss' ? words() : Promise.resolve()).then(() => new Promise((res, rej) => {
    if (defs[id]) return res();
    const s = document.createElement('script'); s.src = `${BASE}${id}.js`;
    s.onload = () => defs[id] ? res() : rej(new Error('definición ausente')); s.onerror = () => { delete loaded[id]; rej(new Error('carga fallida')); };
    document.head.appendChild(s);
  }), e => { delete loaded[id]; throw e; });
  let cur = null;
  const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

  function openGame(id, trigger) {
    const def = find(id); if (!def || def.external) return;
    if (id === 'boss' && !bossOpen()) return;
    if (cur && cur.id === id) { cur.panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); mount(); return; }
    discover(id, trigger);
    closeGame(true);
    if (id === 'boss') { openBoss(trigger, def); return; }
    const host = trigger.closest(def.host) || trigger.closest('section') || trigger.parentElement;
    const panel = document.createElement('section');
    panel.className = 'arcade'; panel.setAttribute('aria-label', T(`Experiencia interactiva: ${def.name}`, `Interactive experience: ${def.name}`));
    panel.innerHTML = `<div class="arcade-clip"><div class="arcade-body">
      <div class="arcade-bar"><span class="arcade-name"><svg class="icon" aria-hidden="true"><use href="#g-${id}"/></svg>${esc(def.name)}</span>
        <span class="arcade-hud" data-hud></span><span class="arcade-rec" data-rec></span>
        <button class="arcade-btn" type="button" data-act="restart" aria-label="${T('Reiniciar', 'Restart')}"><svg class="icon" aria-hidden="true"><use href="#i-redo"/></svg></button>
        <button class="arcade-btn" type="button" data-act="close" aria-label="${T('Cerrar', 'Close')}"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button></div>
      <div class="arcade-stage" tabindex="-1"></div></div></div>`;
    host.after(panel);
    root.classList.add('gaming'); cur = { id, def, panel, trigger, stage: $('.arcade-stage', panel), hudEl: $('[data-hud]', panel), recEl: $('[data-rec]', panel), cleanups: [], keyFns: [], mode: 'idle', prevent: true };
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
  function openBoss(trigger, def) {
    const panel = document.createElement('section');
    panel.className = 'boss-overlay'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', `Release ${SITE_VERSION}`);
    panel.innerHTML = '<div class="boss-stage" tabindex="-1"></div>';
    document.body.appendChild(panel); root.classList.add('boss-lock');
    root.classList.add('gaming'); cur = { id: 'boss', def, panel, trigger, stage: $('.boss-stage', panel), hudEl: document.createElement('span'), recEl: document.createElement('span'), cleanups: [], keyFns: [], mode: 'idle', prevent: true, full: true };
    DC.sound.play('open');
    requestAnimationFrame(() => requestAnimationFrame(() => { panel.classList.add('open'); setTimeout(() => { if (cur && cur.panel === panel) root.classList.add('boss-open'); }, 470); }));
    cur.stage.focus({ preventScroll: true });
    const my = cur;
    load('boss').then(() => { if (cur === my) mount(); }).catch(() => { if (cur === my) { my.stage.innerHTML = `<p class="arcade-help" style="padding:40px;text-align:center">${T('No se pudo cargar el jefe. Revisa tu conexión e inténtalo de nuevo.', 'The boss could not be loaded. Check your connection and try again.')} <button class="button" type="button" id="boss-x">${T('Cerrar', 'Close')}</button></p>`; $('#boss-x', my.stage)?.addEventListener('click', () => closeGame()); } });
  }
  function teardown() { if (!cur) return; cur.cleanups.splice(0).forEach(f => { try { f(); } catch { /* ignorar */ } }); cur.keyFns = []; cur.prevent = true; }
  function closeGame(instant) {
    if (!cur) return;
    const c = cur; teardown(); cur = null; root.classList.remove('gaming');
    if (c.full) { root.classList.remove('boss-lock'); root.classList.remove('boss-open'); }
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
    teardown(); cur.stage.innerHTML = ''; cur.mode = 'play'; cur.hudEl.textContent = ''; cur.t0 = performance.now();
    const ctx = makeCtx(cur);
    try { defs[cur.id](ctx); } catch (err) { console.error(err); cur.stage.innerHTML = `<p class="arcade-help">${T('Esta experiencia falló al iniciar.', 'This experience failed to start.')}</p>`; }
  }

  function makeCtx(c) {
    const { stage, def } = c;
    let veil = null, over = false, veilT = 0;
    const ctx = {
      id: c.id, stage, def, t: T, lang: DC.lang, exit: () => closeGame(), fullscreen: !!c.full,
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
        const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        cv.style.aspectRatio = `${w} / ${h}`; cv.style.width = `min(100%, ${Math.round(w * 1.3)}px, calc(72vh * ${(w / h).toFixed(3)}))`;
        stage.appendChild(cv);
        const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
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
          const s = o.score, old = data.records[c.id], before = c.id === 'boss' ? 0 : scoreOf(c.id).total;
          ctx.stat('plays');
          const st = (data.stats[c.id] ||= {});
          st.ms = (st.ms || 0) + (c.t0 ? Math.min(300000, performance.now() - c.t0) : 0);
          if (s != null && s > 0 && o.record !== false) { (st.runs ||= []).push(s); if (st.runs.length > 5) st.runs.shift(); }
          let isNew = false;
          if (s != null && o.record !== false) {
            if (def.mode === 'min' ? (old == null || s < old) : (s > 0 && (old == null || s > old))) { data.records[c.id] = s; isNew = true; st.pb = (st.pb || 0) + 1; }
            store.save(); setRec();
          }
          ctx.play(isNew ? 'record' : (o.win ? 'win' : 'over'));
          const best = data.records[c.id];
          ctx.veil(o.html ? o.html() : `<div class="mid">${esc(o.title || T('Fin de la partida', 'Game over'))}</div>
            ${s != null ? `<div class="big">${esc(def.fmt(s))}</div>` : ''}
            ${isNew ? `<span class="new">${T('NUEVO RÉCORD', 'NEW RECORD')}</span>` : best != null ? `<small>${T('Récord', 'Best')} · ${esc(def.fmt(best))}</small>` : ''}
            ${c.id !== 'boss' ? (() => { const a = scoreOf(c.id), d = a.total - before; return `<small>${T('Maestría', 'Mastery')} ${a.total}/100 · ${T('habilidad', 'skill')} ${a.skill} + ${T('esfuerzo', 'effort')} ${a.effort}${d > 0 ? ` · +${d}` : ''}</small>`; })() : ''}
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
    if (e.key === 'Escape') { if (cur.full) cur.keyFns.forEach(fn => fn(e)); else closeGame(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const inField = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (cur.mode === 'over' && (e.key === 'Enter' || e.key === ' ') && !inField) { e.preventDefault(); mount(); return; }
    cur.keyFns.forEach(fn => fn(e));
    if (cur.prevent && !inField && PREVENT.has(e.key)) e.preventDefault();
  });

  renderLog();
})();
