/* Release (versión del sitio) — jefe final a pantalla completa. Seis fases; cada una toma prestado uno o dos minijuegos de la web.
   La arena es el emblema del estudio (anillos, hexágono y ejes) y el jefe es el «ojo» del favicon (una sola figura).
   Control 100 % con el ratón o el dedo: mueve la nave; dispara sola. Clic derecho / botón ROLLBACK despeja los disparos.
   Solo el comando final («release») se escribe con el teclado.
   Rendimiento: resolución adaptativa, sin shadowBlur (halos precalculados), emblema en caché y fondo del propio sitio. */
DCArcade.define('boss', ctx => {
  const t = ctx.t, DC = window.DC, pal = DC.palette(), stage = ctx.stage, TAU = Math.PI * 2;
  const V = (window.DCArcade && window.DCArcade.version) || '5.3.1';   // versión actual del sitio
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
  const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const adist = (a, b) => Math.abs(((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI);
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const C = { main: pal[0], light: pal[1], acc: pal[2], ok: '#8ff0c8', warn: '#f2c58e', bad: '#ff7a90', pink: '#df9de7', bg: '#151515', white: '#f3eff8', dim: '#7a7285' };
  const PH = [
    { k: 'pulse', n: 'PULSE', sub: t('El latido', 'The heartbeat'), cmd: 'git checkout pulse', col: C.main, hp: 270 },
    { k: 'snake', n: 'SNAKE', sub: t('Serpientes de logs', 'Log serpents'), cmd: 'tail -f error.log', col: C.ok, hp: 210 },
    { k: 'breakout', n: 'BREAKOUT + PONG', sub: t('Muro y rebote', 'Wall and rebound'), cmd: 'npm run build', col: C.warn, hp: 80 },
    { k: 'wordle', n: 'WORDLE + 2048', sub: t('Adivina el escudo', 'Guess the shield'), cmd: 'grep -rn ERROR .', col: C.pink, hp: 400 },
    { k: 'mines', n: t('MINAS + LIGHTS OUT', 'MINES + LIGHTS OUT'), sub: t('Campo minado', 'Minefield'), cmd: 'rm -rf node_modules', col: C.bad, hp: 300 },
    { k: 'release', n: 'FLAP + ECHO', sub: t('Hueco y eco', 'Gap and echo'), cmd: 'npm run release', col: C.white, hp: 300 }
  ];
  // Movimiento del jefe por fase: amplitud (px), frecuencias (rad/s) en x e y
  const ORDER = [0, 1, 4, 2, 5, 3];   // orden del combate: Pulse, Snake, Minas, Breakout+Pong, Flap+Echo, Wordle+2048 (y luego COMPILE)
  const PHRASES = ['npm run release', 'git push origin main', 'docker compose up -d', 'chmod +x deploy.sh', 'rm -rf node_modules', 'git commit -m fix', 'ssh root@prod', 'kubectl rollout restart', 'curl -s api/health', 'tail -f error.log', 'cd dist && ls -la', 'yarn build --prod', 'pip install -r reqs.txt', 'make clean all', 'git rebase -i head~3', 'sudo systemctl restart app'];
  const MOVE = [{ ax: 150, ay: 20, fx: .55, fy: .9 }, { ax: 100, ay: 12, fx: .42, fy: .7 }, { ax: 280, ay: 14, fx: .95, fy: 1.3 }, { ax: 130, ay: 10, fx: .5, fy: .8 }, { ax: 190, ay: 18, fx: .62, fy: 1 }, { ax: 210, ay: 30, fx: .72, fy: 1.1 }];

  /* ───── Lienzo e interfaz ───── */
  stage.innerHTML = '';
  const cv = document.createElement('canvas'); cv.className = 'boss-cv'; stage.appendChild(cv);
  const g = cv.getContext('2d');
  const ui = document.createElement('div'); ui.className = 'boss-ui';
  ui.innerHTML = `<button type="button" data-a="calm" aria-pressed="false">${t('Modo tranquilo', 'Calm mode')}</button><button type="button" data-a="pause">${t('Pausa', 'Pause')}</button><button type="button" data-a="exit">${t('Salir', 'Exit')}</button>`;
  const bombBtn = document.createElement('button'); bombBtn.type = 'button'; bombBtn.className = 'boss-bomb'; bombBtn.textContent = 'ROLLBACK';
  const relBtn = document.createElement('button'); relBtn.type = 'button'; relBtn.className = 'boss-release'; relBtn.hidden = true; relBtn.textContent = 'RELEASE';
  const pauseBox = document.createElement('div'); pauseBox.className = 'boss-pause'; pauseBox.hidden = true;
  pauseBox.innerHTML = `<strong>${t('Pausa', 'Paused')}</strong><button type="button" data-a="resume">${t('Continuar', 'Resume')}</button><button type="button" data-a="exit">${t('Salir del combate', 'Leave the fight')}</button>`;
  stage.append(ui, bombBtn, relBtn, pauseBox);

  // Resolución adaptativa: si la máquina no da el ancho, baja la escala interna y, en último caso, los efectos.
  let W = 0, H = 0, u = 1, cx = 0, cy = 0, rs = DC.lite ? .75 : 1, fxLow = false, emb = null;
  const dprBase = Math.min(DC.dpr, 1.25);
  const fit = () => {
    const d = dprBase * rs; W = innerWidth; H = innerHeight;
    cv.width = Math.max(1, Math.round(W * d)); cv.height = Math.max(1, Math.round(H * d)); g.setTransform(d, 0, 0, d, 0, 0);
    u = clamp(Math.min(W, H * 1.15) / 720, .6, 1.4); cx = W / 2; cy = Math.max(clamp(H * .22, 110 * u, 190 * u), 124); emb = null;
  };
  fit(); ctx.on(window, 'resize', fit);
  let ema = 16, bad = 0, good = 0, lastAdj = 0;
  function adapt(ms) {
    ema = ema * .9 + ms * .1; const now = performance.now();
    if (ema > 24) { bad++; good = 0; } else if (ema < 15) { good++; bad = 0; } else { bad = good = 0; }
    if (bad > 25 && now - lastAdj > 1200) { bad = 0; lastAdj = now; if (rs > .56) { rs = Math.max(.55, rs - .12); fit(); } else fxLow = true; }
    else if (good > 420 && rs < 1 && now - lastAdj > 8000) { good = 0; lastAdj = now; rs = Math.min(1, rs + .06); fit(); }
  }

  /* Halos precalculados (sustituyen a shadowBlur, que es muy caro con muchos elementos) */
  const glows = {};
  const glowSpr = col => glows[col] || (glows[col] = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(col, .9)); gr.addColorStop(.35, rgba(col, .32)); gr.addColorStop(1, rgba(col, 0)); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return c;
  })());
  const halo = (x, y, r, col, a = 1) => { if (fxLow) return; const pa = g.globalAlpha; g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * pa; g.drawImage(glowSpr(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = pa; g.globalCompositeOperation = 'source-over'; };

  /* ───── Estado ───── */
  let slot = 0, extra = false, cmpFails = 0, cmp = null, lastKeyT = 0, lastRnd = -1, calm = false, usedCalm = false, paused = false, ended = false, state = 'title', stT = 0, T = 0, ph = 0, deaths = 0, hits = 0, fightMs = 0, shake = 0, pausedDrawn = false;
  let P = null, E = null, X = {}, shots = [], foes = [], rings = [], lasers = [], pick = [], ps = [], bugs = [], waves = [], typed = '';
  const sc = () => calm ? .72 : 1;
  const phNum = () => extra ? t('REINTENTO', 'RETRY') : `${slot + 1}/6`;

  /* ───── Utilidades de juego ───── */
  function boom(x, y, col, n = 14, sp = 220, life = .7) {
    if (ps.length > 150) return; if (fxLow) n = Math.ceil(n * .4);
    for (let i = 0; i < n; i++) { const a = rnd(TAU), v = sp * rnd(.3, 1); ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: life * rnd(.5, 1), m: life, c: col, r: rnd(1.5, 3.5) * u }); }
  }
  function startPhase(n, retry) {
    const first = !P, keepHp = P ? P.hp : 0, max = calm ? 7 : 5, prev = E; slot = n; ph = ORDER[n]; const d = PH[ph], intro = first ? 2.2 : .9;
    const old = P;
    P = { x: old ? old.x : cx, y: old ? old.y : H * .82, tx: old ? old.tx : cx, ty: old ? old.ty : H * .82, inv: 1.2, bombs: 2, fire: 0, power: 1, powT: 0, wide: 0, max, hp: (retry || first) ? max : Math.min(max, keepHp + 1), shield: 0 };
    E = { x: prev ? prev.x : cx, y: prev ? prev.y : cy, x0: prev && !first ? prev.x : cx, y0: prev && !first ? prev.y : cy, hp: Math.round(d.hp * (calm ? .8 : 1) * (extra ? .6 : 1)), max: 0, dhp: 0, r: (n === 5 ? 60 : 46) * u, flash: 0, lid: first ? 1 : .7, shield: false, shieldTxt: null, pulse: 0, aim: 0, dead: false, dmg: 1, age: 0, introT: intro };
    E.max = E.hp; E.dhp = E.hp; shots = []; foes = []; rings = []; lasers = []; pick = []; bugs = []; waves = []; X = {}; typed = ''; emb = null;
    relBtn.hidden = true; INIT[ph](); state = 'intro'; stT = intro; ctx.play(first ? 'open' : 'step');
  }
  function hurt(force) {
    if (state !== 'fight') return; if (!force && (P.inv > 0 || P.shield > 0)) return;
    P.hp--; P.inv = 1.4; hits++; shake = .35; ctx.play('miss'); boom(P.x, P.y, C.bad, 22, 260);
    if (P.hp <= 0) { deaths++; state = 'dead'; stT = 1.4; ctx.play('over'); boom(P.x, P.y, C.white, 40, 320, 1); }
  }
  function hurtEye(d, bypass) {
    if (E.dead || state !== 'fight') return;
    if (E.shield && !bypass) { boom(E.x + rnd(-E.r, E.r), E.y + E.r * .6, C.light, 2, 90, .25); return; }
    E.hp -= d * E.dmg; E.flash = .1;
    if (E.hp <= 0) {
      E.hp = 0; E.dead = true; E.shield = false; foes = []; rings = []; lasers = []; bugs = []; shots = [];
      boom(E.x, E.y, PH[ph].col, 70, 380, 1.2); ctx.play('perfect'); shake = .5;
      if (slot === 5 || extra) enterCompile(); else { state = 'clear'; stT = .8; }
    }
  }
  function drop(x, y, k, p = .14) { if (Math.random() < p) pick.push({ x, y, k, vy: 90 * u }); }
  function bullet(x, y, a, v, o = {}) { foes.push({ x, y, vx: Math.cos(a) * v * u, vy: Math.sin(a) * v * u, r: (o.r || 6) * u, c: o.c || PH[ph].col, ch: o.ch, life: 9 }); }
  function aimedFan(n, spread, v, o) { const a0 = angTo(E.x, E.y, P.x, P.y); for (let i = 0; i < n; i++) bullet(E.x, E.y + E.r * .4, a0 + (n === 1 ? 0 : (i / (n - 1) - .5) * spread), v, o); }
  function ring(gc, gh, v, o = {}) { rings.push({ ox: E.x, oy: E.y, r: E.r + 10 * u, v: v * u, gc, gh, th: (o.th || 7) * u, c: o.c || PH[ph].col }); ctx.play('step'); }
  function fireLaser(l) {
    shake = Math.max(shake, .3); ctx.tone(70, .35, 'sawtooth', .07, .4); ctx.tone(900, .12, 'square', .03, .3);
    for (let k = 0; k < 8; k++) boom(l.x + rnd(-l.w / 2, l.w / 2), E.y + (H - E.y) * k / 7, C.bad, 5, 160, .5);
  }
  function bomb() {
    if (state !== 'fight' || P.bombs <= 0) return; P.bombs--; P.inv = 1.6; foes = []; rings = []; lasers = []; waves.push({ x: P.x, y: P.y, r: 0 });
    bugs.forEach(b => { b.hp -= 3; }); if (!E.shield) hurtEye(6); ctx.play('perfect'); shake = .3; boom(P.x, P.y, C.light, 40, 380);
  }
  function fireShots(s) {
    P.fire -= s; if (P.fire > 0) return; P.fire = .15; const y = P.y - 14 * u, v = -900 * u;
    const add = (dx, vx) => shots.push({ x: P.x + dx * u, y, vx: vx * u, vy: v, d: 1 });
    add(-7, 0); add(7, 0); if (P.power >= 2) add(0, 0); if (P.power >= 3) { add(-12, -90); add(12, 90); }
  }

  /* ───── Fases: inicialización ───── */
  const INIT = [
    () => { X = { beat: 1, n: 0, bpm: 96 }; },
    () => { X = { exp: 0, shootT: 2, sns: [] }; spawnSnakes(); },
    () => {
      const cols = 9, bw = Math.min(66 * u, (W - 70 * u) / cols), bh = 22 * u, y0 = cy + E.r + 56 * u, left = (W - cols * (bw + 4 * u)) / 2;
      X = { bricks: [], shootT: 2.5, respawn: 0, ball: null };
      for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) X.bricks.push({ x: left + c * (bw + 4 * u), y: y0 + r * (bh + 4 * u), w: bw, h: bh, hp: 2, c: [C.main, C.pink, C.warn, C.ok][r] });
      ball(); E.shield = true; E.shieldTxt = null;   // los disparos no lo dañan: hay que golpearlo con la pelota
    },
    () => {   // WORDLE + 2048: el tablero 2048 ocupa toda la zona del jugador
      const cols = W < 620 ? 5 : 8, rows = 3, top = H * .46;
      X = { cols, rows, cw: W / cols, ch: (H - top) / rows, y0: top, tsz: Math.min(W / cols, (H - top) / rows) * .64, tiles: [], mark: [], spawn: 1.2, swipe: 4.6, swDir: -1, shootT: 2.4,
        word: '', slots: [], tokens: [], tokT: .8, hist: [], attempt: 0, st: 'collect', tm: 0, exp: 0, last: null, known: {}, newWord: 0 };
      X.word = pickWord(); E.shield = true;
    },
    () => {   // MINAS + LIGHTS OUT: el tablero cubre toda la arena; hay que estar en una celda con número
      const cols = W < 620 ? 6 : 10, rows = 4, top = H * .46;
      X = { cols, rows, cw: W / cols, ch: (H - top) / rows, y0: top, mines: new Set(), nums: [], moves: [], round: 0, flash: 0, tk: 0, st: 'rest', tm: .9, dark: 0, nextDark: 9, shootT: 2.2 };
    },
    () => { X = { sub: 'gauntlet', tm: 0, bars: [], nextBar: .8, lz: 2.2, seq: [], round: 0, show: 0, inp: [], zl: -1, zlT: 0, last: -1, lastIdx: -1, exp: 0, fail: 0, shootT: 2 }; E.shield = true; }
  ];

  /* ───── Fase 2: serpientes (más serpientes al 50 % y al 25 % de vida) ───── */
  const CELL = 38, SEGGAP = 26, STEP = 6, K = Math.round(SEGGAP / STEP), LABS = ['404', 'NaN', 'null', 'TODO', 'ERR', 'WARN', 'undef'];
  function mkSnake(i, n) {
    const left = Math.random() < .5, nseg = n === 1 ? 14 : n === 2 ? 12 : 10, x = left ? 40 * u : W - 40 * u, y = Math.min(H * .7, cy + (120 + i * 80) * u), dir = left ? [1, 0] : [-1, 0], tr = [], len = (nseg + 1) * K + 4;
    for (let j = 0; j < len; j++) tr.push({ x: x - dir[0] * (len - j) * STEP * u, y });
    const sn = { x, y, dir, trail: tr, acc: 0, mv: 0, run: 4, maxTrail: (nseg + 2) * K + 40, segs: Array.from({ length: nseg }, (_, j) => ({ i: j + 1, hp: 4, lab: LABS[j % 7], f: 0 })) };
    sn.segs[0].head = true; return sn;
  }
  function spawnSnakes() { const n = E.hp < E.max * .25 ? 3 : E.hp < E.max * .5 ? 2 : 1; X.sns = Array.from({ length: n }, (_, i) => mkSnake(i, n)); E.shield = true; }
  const segPos = (sn, s) => sn.trail[sn.trail.length - 1 - s.i * K] || { x: sn.x, y: sn.y };
  function moveSnake(sn, s) {
    const step = 210 * u * sc() * s, ymin = cy + 90 * u, ymax = H * .72, xmin = 40 * u, xmax = W - 40 * u;
    const out = (d, k) => { const nx = sn.x + d[0] * k, ny = sn.y + d[1] * k; return nx < xmin || nx > xmax || ny < ymin || ny > ymax; };
    if (sn.mv >= CELL * u) { sn.mv = 0; sn.run--; }
    if (sn.run <= 0 || out(sn.dir, step + 2)) {
      sn.run = 3 + (Math.random() * 4 | 0); const dx = P.x - sn.x, dy = P.y - sn.y;
      const cands = Math.abs(dx) > Math.abs(dy) ? [[Math.sign(dx) || 1, 0], [0, Math.sign(dy) || 1]] : [[0, Math.sign(dy) || 1], [Math.sign(dx) || 1, 0]];
      if (Math.random() < .3) cands.reverse(); cands.push([0, -1], [0, 1], [1, 0], [-1, 0]);
      const rev = d => d[0] === -sn.dir[0] && d[1] === -sn.dir[1];
      sn.dir = cands.find(d => !rev(d) && !out(d, CELL * u * 1.2)) || cands.find(d => !out(d, CELL * u * .6)) || sn.dir;
    }
    sn.x = clamp(sn.x + sn.dir[0] * step, xmin, xmax); sn.y = clamp(sn.y + sn.dir[1] * step, ymin, ymax); sn.acc += step; sn.mv += step;
    while (sn.acc >= STEP * u) { sn.acc -= STEP * u; sn.trail.push({ x: sn.x, y: sn.y }); }
    if (sn.trail.length > sn.maxTrail) sn.trail.splice(0, sn.trail.length - sn.maxTrail);
    for (const sg of sn.segs) { const p = segPos(sn, sg); sg.f = Math.max(0, sg.f - s); if (Math.hypot(p.x - P.x, p.y - P.y) < 20 * u) hurt(); }
  }

  /* ───── Fase 3: pelota (carga de 0 a 3 con cada golpe de la nave) ───── */
  function ball() { const sp = 340 * u * sc(); X.ball = { x: E.x, y: E.y + E.r + 20 * u, vx: rnd(-.5, .5) * sp, vy: sp * .8, r: 9 * u, sp, charge: 0 }; }

  /* ───── Fase 4: WORDLE + 2048 ───── */
  const WORDS = window.DCWords[ctx.lang === 'en' ? 'en' : 'es'].split(' ').filter(w => /^[A-Z]{5}$/.test(w));   // la misma lista del minijuego (assets/games/words.js)
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', WCOL = { correct: C.ok, present: C.warn, absent: '#5b5466' };
  const tileCell = (c, r) => ({ x: c * X.cw + X.cw / 2, y: X.y0 + r * X.ch + X.ch / 2 });
  const tileHp = v => Math.round(6 + Math.log2(v) * 2);
  function pickWord() { let w; do { w = WORDS[Math.random() * WORDS.length | 0]; } while (w === X.word); return w; }
  function wordleEval(guess, word) {
    const res = Array(5).fill('absent'), cnt = {};
    for (const ch of word) cnt[ch] = (cnt[ch] || 0) + 1;
    for (let i = 0; i < 5; i++) if (guess[i] === word[i]) { res[i] = 'correct'; cnt[guess[i]]--; }
    for (let i = 0; i < 5; i++) if (res[i] !== 'correct' && cnt[guess[i]] > 0) { res[i] = 'present'; cnt[guess[i]]--; }
    return res;
  }
  // 2048: cada ficha se anuncia antes de aparecer (nunca cae sobre ti), es resistente, hace daño al tocarla y se vuelve ×2,2 más resistente al fusionarse
  function addTileMark() {
    if (X.tiles.length + X.mark.length >= (calm ? 5 : 7)) return;
    const free = [];
    for (let r = 0; r < X.rows; r++) for (let c = 0; c < X.cols; c++) {
      if (X.tiles.some(q => q.c === c && q.r === r) || X.mark.some(m => m.c === c && m.r === r)) continue;
      const p = tileCell(c, r); if (Math.hypot(p.x - P.x, p.y - P.y) < X.tsz * 1.15) continue; free.push([c, r]);
    }
    if (!free.length) return; const [c, r] = free[Math.random() * free.length | 0]; X.mark.push({ c, r, t: .9 / sc(), v: Math.random() < .8 ? 2 : 4 });
  }
  function spawnTile(m) { const p = tileCell(m.c, m.r), hp = tileHp(m.v); X.tiles.push({ c: m.c, r: m.r, x: p.x, y: p.y, v: m.v, hp, maxhp: hp, fire: rnd(2, 3.5), flash: 0, age: 0 }); boom(p.x, p.y, C.pink, 8, 150, .4); ctx.play('pop'); }
  function swipe(dir) {
    const dx = [-1, 1, 0, 0][dir], dy = [0, 0, -1, 1][dir], order = X.tiles.slice().sort((a, b) => (a.c - b.c) * -dx + (a.r - b.r) * -dy);
    const grid = {}, key = (c, r) => c + ',' + r;
    for (const q of order) {
      let c = q.c, r = q.r;
      for (;;) {
        const nc = c + dx, nr = r + dy; if (nc < 0 || nc >= X.cols || nr < 0 || nr >= X.rows) break; const o = grid[key(nc, nr)];
        if (!o) { c = nc; r = nr; continue; }
        if (o.v === q.v && !o.m && q.v < 256) { o.v *= 2; o.m = true; o.hp = Math.min(90, Math.round(Math.max(o.hp, q.hp) * 2.2)); o.maxhp = o.hp; o.flash = .3; q.gone = true; boom(o.x, o.y, C.pink, 10, 170, .45); }
        break;
      }
      if (!q.gone) { q.c = c; q.r = r; grid[key(c, r)] = q; }
    }
    X.tiles = X.tiles.filter(q => !q.gone); X.tiles.forEach(q => { q.m = false; }); ctx.play('pop'); ctx.tone(95, .18, 'sawtooth', .06, .5);
  }
  function tileCollide() { const half = X.tsz / 2 + 4 * u; for (const q of X.tiles) if (Math.abs(P.x - q.x) < half && Math.abs(P.y - q.y) < half) { hurt(); break; } }
  // Wordle: las letras caen; al volar sobre ellas rellenas 5 casillas. Verde = bien colocada, ámbar = otra posición, gris = no está (y esas disparan)
  function spawnToken() {
    if (X.tokens.length >= 14) return; const r = Math.random(); let ch, heal = false;
    if (r < .07 && P.hp < P.max) { ch = '+'; heal = true; }
    else if (r < .12 && X.slots.length) ch = '<';
    else if (Math.random() < .5) ch = X.word[Math.random() * 5 | 0];
    else { const pool = [...ALPHA].filter(l => X.known[l] !== 'absent'); ch = pool[Math.random() * pool.length | 0]; }
    X.tokens.push({ x: rnd(40 * u, W - 40 * u), y: -20 * u, ch, heal, vy: (74 + rnd(0, 18)) * u * sc(), a: rnd(TAU) });
  }
  function collect(k) {
    if (k.heal) { P.hp = Math.min(P.max, P.hp + 1); ctx.play('perfect'); boom(k.x, k.y, C.ok, 16, 220, .6); return; }
    ctx.play('hit', 440 + X.slots.length * 80); boom(k.x, k.y, C.pink, 6, 140, .3);
    if (k.ch === '<') { X.slots.pop(); return; }
    if (X.slots.length < 5) { X.slots.push(k.ch); if (X.slots.length === 5) submitGuess(); }
  }
  function submitGuess() {
    const guess = X.slots.join(''), res = wordleEval(guess, X.word), rank = { absent: 0, present: 1, correct: 2 };
    X.last = { guess, res }; X.st = 'eval'; X.tm = 1.2; X.tokens = [];
    res.forEach((st, i) => { const l = guess[i]; if (!X.known[l] || rank[st] > rank[X.known[l]]) X.known[l] = st; });
    X.hist.push({ guess, res }); if (X.hist.length > 6) X.hist.shift(); ctx.play(guess === X.word ? 'win' : 'step');
  }
  function resolveGuess() {
    const { guess, res } = X.last;
    if (guess === X.word) { X.st = 'open'; X.exp = calm ? 11 : 9; E.shield = false; E.dmg = 1.5; shake = .4; boom(E.x, E.y, C.white, 50, 320, .9); ctx.play('perfect'); return; }
    const bad = res.filter(st => st === 'absent').length; if (bad) aimedFan(Math.min(5, bad + 1), 1.1, 170 * sc(), { c: C.bad });
    X.attempt++; X.slots = []; X.st = 'collect'; X.tokT = .3;
    if (X.attempt >= 6) { X.word = pickWord(); X.attempt = 0; X.known = {}; X.hist = []; X.newWord = 1.8; ring(angTo(E.x, E.y, P.x, P.y), .7, 190 * sc(), { c: C.bad }); ctx.play('miss'); }
  }

  /* ───── Fase 5: campo minado (todo el tablero) ───── */
  function armMines() {
    const n = X.cols * X.rows, count = Math.round(n * (E.hp < E.max * .5 ? .36 : .30));
    X.mines = new Set(); while (X.mines.size < count) X.mines.add(Math.random() * n | 0);
    calcNums();
  }
  function calcNums() {
    const n = X.cols * X.rows;
    X.nums = Array.from({ length: n }, (_, i) => {
      if (X.mines.has(i)) return -1; const c = i % X.cols, r = (i / X.cols) | 0; let k = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const nc = c + dc, nr = r + dr; if (nc >= 0 && nc < X.cols && nr >= 0 && nr < X.rows && X.mines.has(nr * X.cols + nc)) k++; }
      return k;
    });
  }
  // A partir de la 2.ª ronda, algunas minas cambian de sitio justo antes de explotar. Se avisa un instante antes: la casilla vacía de origen pasa a ser segura y la numerada de destino pasa a ser mina.
  function planShift() {
    const n = X.cols * X.rows, mines = [...X.mines], safe = []; for (let i = 0; i < n; i++) if (!X.mines.has(i)) safe.push(i);
    const k = clamp(Math.round(mines.length * (.2 + .05 * Math.min(X.round, 4))), 1, 8); X.moves = [];
    for (let j = 0; j < k && mines.length && safe.length; j++) { const a = mines.splice(Math.random() * mines.length | 0, 1)[0], b = safe.splice(Math.random() * safe.length | 0, 1)[0]; X.moves.push({ a, b }); }
    return X.moves.length > 0;
  }
  function applyShift() { for (const m of X.moves) { X.mines.delete(m.a); X.mines.add(m.b); } calcNums(); X.flash = .6; }
  const playerCell = () => { const c = Math.floor(P.x / X.cw), r = Math.floor((P.y - X.y0) / X.ch); return (c < 0 || c >= X.cols || r < 0 || r >= X.rows) ? -1 : r * X.cols + c; };
  function swarm() { for (let i = 0; i < 7; i++) bugs.push({ x: rnd(40 * u, W - 40 * u), y: -20 * u - i * 36 * u, o: rnd(TAU), hp: 2, v: 110 * u * sc(), a: 0, w: rnd(40, 80) * u }); }

  /* ───── Fase 6: paneles de Echo ───── */
  const PADC = [C.main, C.ok, C.warn, C.pink], PADF = [262, 330, 392, 523];
  const padBase = i => { const w = Math.min(120 * u, (W - 40 * u) / 4), x0 = (W - 4 * w) / 2; return { x: x0 + i * w, y: H - 138 * u, w, h: 70 * u }; };
  const padRect = i => X.pads ? X.pads[i] : padBase(i);
  function padsHome() { if (!X.pads) X.pads = [0, 1, 2, 3].map(i => { const b = padBase(i); return { ...b, tx: b.x, ty: b.y }; }); X.pads.forEach((p, i) => { const b = padBase(i); p.tx = b.x; p.ty = b.y; p.w = b.w; p.h = b.h; }); }
  function padsScramble() {   // cada panel viaja a un sitio al azar (sin solaparse) y durante un instante no se puede pulsar
    padsHome(); const w = X.pads[0].w, h = X.pads[0].h, spots = [];
    for (let i = 0; i < 4; i++) {
      let best = null;
      for (let n = 0; n < 60; n++) { const c = { x: rnd(14 * u, W - w - 14 * u), y: rnd(H * .45, H - 120 * u - h) }; if (spots.every(q => Math.abs(q.x - c.x) > w + 14 * u || Math.abs(q.y - c.y) > h + 14 * u)) { best = c; break; } }
      spots.push(best || { x: padBase(i).x, y: padBase(i).y - i * (h + 14 * u) });
    }
    X.pads.forEach((p, i) => { p.tx = spots[i].x; p.ty = spots[i].y; }); X.settle = .8; ctx.tone(260, .3, 'triangle', .04, 2.2);
  }
  function newSeq() { padsHome(); const n = Math.min(5, 3 + X.round); X.seq = Array.from({ length: n }, () => (Math.random() * 4) | 0); X.inp = []; X.sub = 'echoShow'; X.tm = 0; X.show = 0; X.zl = -1; X.lastIdx = -1; E.shield = true; }
  function replay(delay) { padsHome(); X.sub = 'echoShow'; X.tm = -delay; X.show = 0; X.inp = []; X.zl = -1; X.lastIdx = -1; }
  function padPress(i) {
    if (X.sub !== 'echoIn') return; ctx.tone(PADF[i], .18, 'triangle', .06, 1); X.zl = i; X.zlT = .25; X.inp.push(i);
    if (X.seq[X.inp.length - 1] !== i) { X.fail++; ctx.play('error'); aimedFan(7, 1.4, 190 * sc(), { c: C.bad }); boom(P.x, P.y, C.bad, 14, 200); replay(.6); return; }
    if (X.inp.length === X.seq.length) { X.sub = 'exposed'; X.exp = calm ? 11 : 9; E.shield = false; E.dmg = 1.6; shake = .4; boom(E.x, E.y, C.white, 50, 320, .9); ctx.play('win'); }
  }

  /* ───── Actualización por fase ───── */
  const UPD = [
    s => { // PULSE
      const bp = 60 / (X.bpm * (calm ? .85 : 1)); X.beat -= s;
      if (X.beat <= 0) {
        X.beat += bp; X.n++; E.pulse = 1; ctx.play('kick'); const fast = E.hp < E.max * .5;
        if (fast || X.n % 2 === 0) ring(angTo(E.x, E.y, P.x, P.y) + rnd(-.5, .5), calm ? .72 : .55, 170 * sc() + (fast ? 28 : 0));
        if (X.n % 4 === 3) aimedFan(7, .9, 150 * sc());
        if (E.hp < E.max * .3 && X.n % 4 === 1) for (let i = 0; i < 12; i++) bullet(E.x, E.y, i / 12 * TAU + X.n, 120 * sc(), { c: C.light });
      }
    },
    s => { // SNAKE
      if (X.sns.length) {
        for (const sn of X.sns) moveSnake(sn, s);
        X.sns = X.sns.filter(sn => sn.segs.length);
        if (!X.sns.length) { X.exp = calm ? 10 : 8; E.shield = false; ctx.play('perfect'); }
      } else { X.exp -= s; if (X.exp <= 0) spawnSnakes(); }
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2 / sc(); aimedFan(5, .9, 150 * sc()); }
    },
    s => { // BREAKOUT + PONG: cada golpe de la nave carga la pelota (máx. ×3) y esa carga es el daño al ojo
      const b = X.ball, pw = (74 + (P.wide > 0 ? 40 : 0)) * u; if (X.hitTxt) X.hitTxt.t -= s;
      if (b) {
        b.x += b.vx * s; b.y += b.vy * s;
        if (b.x < 20 * u) { b.x = 20 * u; b.vx = Math.abs(b.vx); } if (b.x > W - 20 * u) { b.x = W - 20 * u; b.vx = -Math.abs(b.vx); } if (b.y < 18 * u) { b.y = 18 * u; b.vy = Math.abs(b.vy); }
        const dxe = b.x - E.x, dye = b.y - E.y, de = Math.hypot(dxe, dye);
        if (de < E.r + b.r) {
          const nx = dxe / de, ny = dye / de, dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; } b.x = E.x + nx * (E.r + b.r + 1); b.y = E.y + ny * (E.r + b.r + 1);
          if (b.charge > 0) { const c = b.charge; hurtEye(8 * c, true); X.hitTxt = { v: c, t: .9, x: E.x, y: E.y - E.r - 12 * u }; boom(b.x, b.y, c === 3 ? C.white : C.warn, 8 + c * 8, 200 + c * 50, .5); ctx.play('hit', 220 + c * 90); if (c === 3) shake = .3; b.charge = 0; }
          else { boom(b.x, b.y, C.dim, 4, 100, .3); ctx.play('step'); }
        }
        for (const br of X.bricks) {
          if (br.hp <= 0) continue; const nx = clamp(b.x, br.x, br.x + br.w), ny = clamp(b.y, br.y, br.y + br.h);
          if (Math.hypot(b.x - nx, b.y - ny) < b.r) {
            if (Math.abs(b.x - (br.x + br.w / 2)) / br.w > Math.abs(b.y - (br.y + br.h / 2)) / br.h) b.vx *= -1; else b.vy *= -1;
            br.hp--; ctx.play('hit', 520 + br.hp * 90);
            if (br.hp <= 0) { boom(br.x + br.w / 2, br.y + br.h / 2, br.c, 10, 180, .5); drop(br.x + br.w / 2, br.y, Math.random() < .5 ? 'w' : 'p', .16); } break;
          }
        }
        const py = P.y - 26 * u;
        if (b.vy > 0 && b.y + b.r >= py - 4 * u && b.y - b.r <= py + 8 * u && Math.abs(b.x - P.x) < pw / 2 + b.r) {
          const off = clamp((b.x - P.x) / (pw / 2), -1, 1), sp = Math.min(b.sp * 1.5, Math.hypot(b.vx, b.vy) * 1.03);
          b.vx = Math.sin(off * 1.05) * sp; b.vy = -Math.abs(Math.cos(off * 1.05)) * sp; b.y = py - b.r - 4 * u; b.charge = Math.min(3, b.charge + 1);
          ctx.play('hit', 380 + b.charge * 70); boom(b.x, py, C.warn, 6 + b.charge * 3, 150, .35);
        } else if (b.y > P.y - 14 * u && Math.hypot(b.x - P.x, b.y - P.y) < b.r + 11 * u) { hurt(); b.vy = -Math.abs(b.vy); }
        if (b.y > H + 20 * u) { hurt(true); if (state === 'fight') ball(); }
      }
      if (X.bricks.every(q => q.hp <= 0)) { X.respawn += s; if (X.respawn > 3) { X.respawn = 0; X.bricks.forEach(q => { q.hp = 2; }); ctx.play('open'); } }
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2.4 / sc(); aimedFan(3, .5, 160 * sc()); }
    },
    s => { // WORDLE + 2048
      X.spawn -= s; if (X.spawn <= 0) { X.spawn = 2.8 / sc(); addTileMark(); }
      for (const m of X.mark) m.t -= s;
      for (const m of X.mark.filter(m => m.t <= 0)) spawnTile(m);
      X.mark = X.mark.filter(m => m.t > 0);
      X.swipe -= s; if (X.swipe < 1 && X.swDir < 0 && X.tiles.length) X.swDir = (Math.random() * 4) | 0;
      if (X.swDir >= 0) { X.tickT = (X.tickT || 0) - s; if (X.tickT <= 0) { X.tickT = .17; ctx.tone(150 + (1 - clamp(X.swipe, 0, 1)) * 520, .07, 'square', .03, 1); } }     // el desplazamiento se avisa 1 s antes
      if (X.swipe <= 0) { if (X.swDir >= 0) swipe(X.swDir); X.swDir = -1; X.swipe = 4.8 / sc(); }
      for (const q of X.tiles) {
        const p = tileCell(q.c, q.r); q.x = lerp(q.x, p.x, Math.min(1, s * 8)); q.y = lerp(q.y, p.y, Math.min(1, s * 8)); q.flash = Math.max(0, q.flash - s); q.age += s;
        if (q.v >= 8) { q.fire -= s; if (q.fire <= 0) { q.fire = 4.2 / (q.v / 8) / sc(); bullet(q.x, q.y, angTo(q.x, q.y, P.x, P.y), 160 * sc(), { c: C.warn, ch: 'DEBUG'[Math.random() * 5 | 0] }); } }
      }
      X.newWord = Math.max(0, X.newWord - s);
      if (X.st === 'collect') {
        X.tokT -= s; if (X.tokT <= 0) { X.tokT = .5 / sc(); spawnToken(); }
        for (const k of X.tokens) { k.y += k.vy * s; k.a += s * 3; if (Math.hypot(k.x - P.x, k.y - P.y) < 20 * u) { k.dead = true; collect(k); } }
        X.tokens = X.tokens.filter(k => !k.dead && k.y < H + 30 * u);
      } else if (X.st === 'eval') { X.tm -= s; if (X.tm <= 0) resolveGuess(); }
      else if (X.st === 'open') {
        X.exp -= s;
        if (X.exp <= 0) { X.word = pickWord(); X.attempt = 0; X.known = {}; X.hist = []; X.slots = []; X.st = 'collect'; X.tokT = .5; E.shield = true; E.dmg = 1; ctx.play('open'); }
      }
      E.shieldTxt = t(`ESCUDO · ${Math.min(6, X.attempt + 1)}/6`, `SHIELD · ${Math.min(6, X.attempt + 1)}/6`);
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2.6 / sc(); aimedFan(3, .6, 150 * sc()); }
    },
    s => { // CAMPO MINADO + LIGHTS OUT: quédate en una celda con número; las vacías explotan
      X.tm -= s;
      X.flash = Math.max(0, X.flash - s);
      const tArm = Math.max(1, 1.8 - .12 * X.round), tFlag = Math.max(.55, .8 - .05 * X.round);   // cada ronda se acorta el margen
      if (X.st === 'rest') { if (X.tm <= 0) { X.moves = []; armMines(); X.st = 'arm'; X.tm = tArm / sc(); ctx.play('count'); } }
      else if (X.st === 'arm') { if (X.tm <= 0) { if (X.round >= 1 && planShift()) { X.st = 'shift'; X.tm = 1 / sc(); X.tk = 0; ctx.play('count'); } else { X.st = 'flag'; X.tm = tFlag / sc(); ctx.play('step'); } } }
      else if (X.st === 'shift') {
        X.tk -= s; if (X.tk <= 0) { X.tk = .14; ctx.tone(330 + (1 - clamp(X.tm, 0, 1)) * 500, .05, 'triangle', .03, 1); }
        if (X.tm <= 0) { applyShift(); X.st = 'flag'; X.tm = tFlag / sc(); shake = Math.max(shake, .15); ctx.play('step'); ctx.tone(180, .15, 'sawtooth', .04, .6); for (const m of X.moves) boom((m.b % X.cols + .5) * X.cw, X.y0 + (((m.b / X.cols) | 0) + .5) * X.ch, C.warn, 8, 160, .4); }
      }
      else if (X.st === 'flag') {
        if (X.tm <= 0) { X.st = 'boom'; X.tm = .45; ctx.play('miss'); shake = .28; X.mines.forEach(i => boom((i % X.cols + .5) * X.cw, X.y0 + (((i / X.cols) | 0) + .5) * X.ch, C.bad, 12, 280, .6)); }
      } else if (X.st === 'boom') { if (X.mines.has(playerCell())) hurt(); if (X.tm <= 0) { X.st = 'rest'; X.tm = 1.2; X.mines = new Set(); X.moves = []; X.round++; } }
      X.nextDark -= s; if (X.nextDark <= 0) { X.nextDark = 14; X.dark = 4.4; swarm(); ctx.play('open'); }
      if (X.dark > 0) X.dark -= s;
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2.2 / sc(); aimedFan(E.hp < E.max * .5 ? 4 : 3, .8, 160 * sc()); }
    },
    s => { // FLAP + ECHO + COMPILE
      X.tm += s;
      if (X.sub === 'gauntlet') {
        X.nextBar -= s; if (X.nextBar <= 0) { X.nextBar = 1.35 / sc(); const gw = 170 * u * (calm ? 1.2 : 1), gx = rnd(90 * u + gw / 2, W - 90 * u - gw / 2); X.bars.push({ y: E.y + E.r, gx, gw, lab: ['404', 'NaN', 'ERR'][Math.random() * 3 | 0] }); }
        X.lz -= s; if (X.lz <= 0) { X.lz = 2.4 / sc(); lasers.push({ x: P.x, w: 34 * u, arm: .8, a0: .8, dur: .35, tk: 0 }); ctx.play('step'); }
        if (X.tm > (calm ? 10 : 12)) { X.nextBar = 99; if (!X.bars.length) newSeq(); }
      } else if (X.sub === 'echoShow') {
        if (X.tm >= 0) {
          X.show += s; const idx = Math.floor(X.show / .62);
          if (idx < X.seq.length) { if (X.lastIdx !== idx) { X.lastIdx = idx; ctx.tone(PADF[X.seq[idx]], .3, 'triangle', .06, 1); } X.zl = (X.show % .62) < .42 ? X.seq[idx] : -1; }
          else { X.zl = -1; if (X.show > X.seq.length * .62 + .4) { X.sub = 'echoIn'; X.tm = 0; X.inp = []; X.last = -1; padsScramble(); } }
        }
        X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2.2; aimedFan(3, .6, 140 * sc()); }
      } else if (X.sub === 'echoIn') {
        X.shootT -= s; if (X.shootT <= 0) { X.shootT = 1.8 / sc(); aimedFan(3, .7, 150 * sc()); }
        if (!(X.settle > 0)) for (let i = 0; i < 4; i++) { const r = padRect(i), inside = P.x > r.x && P.x < r.x + r.w && P.y > r.y - 30 * u && P.y < r.y + r.h; if (inside && X.last !== i) { X.last = i; padPress(i); break; } if (!inside && X.last === i) X.last = -1; }
        if (X.sub === 'echoIn' && X.tm > 14) { X.fail++; aimedFan(5, 1.2, 170 * sc(), { c: C.bad }); replay(.6); }
      } else if (X.sub === 'exposed') {
        X.exp -= s; X.shootT -= s; if (X.shootT <= 0) { X.shootT = 1.5 / sc(); ring(angTo(E.x, E.y, P.x, P.y) + rnd(-.6, .6), .7, 190 * sc(), { c: C.white }); aimedFan(5, 1, 170 * sc()); }
        if (X.exp <= 0) { X.round++; X.sub = 'gauntlet'; X.tm = 0; X.nextBar = 1; E.shield = true; E.dmg = 1; X.bars = []; ctx.play('open'); }
      }
      for (const b of X.bars) { b.y += 150 * u * sc() * s; const inY = P.y + 9 * u > b.y && P.y - 9 * u < b.y + 22 * u; if (inY && (P.x < b.gx - b.gw / 2 + 6 * u || P.x > b.gx + b.gw / 2 - 6 * u)) hurt(); }
      X.bars = X.bars.filter(b => b.y < H + 30 * u);
      if (X.pads) { X.settle = Math.max(0, (X.settle || 0) - s); for (const p of X.pads) { p.x = lerp(p.x, p.tx, Math.min(1, s * 7)); p.y = lerp(p.y, p.ty, Math.min(1, s * 7)); } }
      if (X.zlT > 0) { X.zlT -= s; if (X.zlT <= 0 && X.sub !== 'echoShow') X.zl = -1; }
    }
  ];

  /* ───── Bucle principal ───── */
  function moveBoss(s) {
    E.age += s; if (E.dead) return;
    const m = MOVE[ph], k = clamp(E.age / 1.2, 0, 1), kk = k * k * (3 - 2 * k), ax = Math.min(m.ax * u, W * .3);
    const tx = cx + Math.sin(E.age * m.fx) * ax * kk, ty = cy + Math.sin(E.age * m.fy + 1) * m.ay * u * kk;
    E.x = lerp(E.x0, tx, kk); E.y = lerp(E.y0, ty, kk);   // sale suavemente de donde estaba la fase anterior
  }
  function update(s) {
    T += s; shake = Math.max(0, shake - s); E.flash = Math.max(0, E.flash - s); E.pulse = Math.max(0, E.pulse - s * 3);
    ps.forEach(q => { q.l -= s; q.x += q.vx * s; q.y += q.vy * s; q.vx *= .985; q.vy *= .985; }); ps = ps.filter(q => q.l > 0);
    waves.forEach(w => { w.r += 900 * u * s; }); waves = waves.filter(w => w.r < Math.max(W, H) * 1.2);
    moveBoss(s); E.dhp = Math.max(E.hp, E.dhp - E.max * .6 * s * (E.dhp - E.hp > 0 ? 1 : 0));
    E.aim = angTo(E.x, E.y, P.x, P.y);   // el ojo sigue a la nave
    if (state === 'intro') { stT -= s; E.lid = Math.max(0, E.lid - s * 3); if (stT <= 0) { state = 'fight'; E.lid = 0; ctx.play('go'); } movePlayer(s); return; }
    if (state === 'clear') { stT -= s; movePlayer(s); if (Math.random() < .6) boom(E.x + rnd(-E.r, E.r), E.y + rnd(-E.r, E.r), PH[ph].col, 5, 200, .6); E.lid = Math.min(1, E.lid + s * 1.6); if (stT <= 0) startPhase(slot + 1, false); return; }
    if (state === 'dead') { stT -= s; if (stT <= 0 && calm) { startPhase(slot, true); return; } if (stT <= 0 && !ended) { ended = true; DC.toast(t(`Derrota en la fase ${phNum()}. Vuelves a empezar desde la fase 1.`, `Defeated in phase ${phNum()}. You start over from phase 1.`), { ms: 4200 }); ctx.exit(); } return; }
    if (state === 'finisher') { stT += s; movePlayer(s); if (cmp) { cmp.t -= s; cmp.bad = Math.max(0, cmp.bad - s); if (cmp.t <= 0) { compileFail(); return; } } if (Math.random() < .3) boom(E.x + rnd(-E.r, E.r), E.y + rnd(-E.r, E.r), C.white, 4, 160, .6); return; }
    if (state !== 'fight') return;
    fightMs += s * 1000; P.inv = Math.max(0, P.inv - s); P.shield = Math.max(0, P.shield - s); if (P.powT > 0 && (P.powT -= s) <= 0) P.power = 1; P.wide = Math.max(0, P.wide - s);
    movePlayer(s); fireShots(s); UPD[ph](s); if (ph === 3) tileCollide();
    for (const sh of shots) {
      sh.x += sh.vx * s; sh.y += sh.vy * s; if (sh.y < -20 || sh.x < -20 || sh.x > W + 20) { sh.dead = true; continue; }
      if (ph === 2) for (const br of X.bricks) if (br.hp > 0 && sh.x > br.x && sh.x < br.x + br.w && sh.y > br.y && sh.y < br.y + br.h) { br.hp--; sh.dead = true; if (br.hp <= 0) { boom(br.x + br.w / 2, br.y + br.h / 2, br.c, 8, 160, .4); drop(br.x + br.w / 2, br.y, Math.random() < .5 ? 'w' : 'p', .16); } else ctx.play('hit', 700); break; }
      if (sh.dead) continue;
      if (ph === 1) snk: for (const sn of X.sns) for (const sg of sn.segs) { const p = segPos(sn, sg); if (Math.hypot(p.x - sh.x, p.y - sh.y) < 17 * u) { sg.hp--; sg.f = .12; sh.dead = true; if (sg.hp <= 0) { sg.dead = true; boom(p.x, p.y, C.ok, 12, 200, .5); drop(p.x, p.y, sg.head ? 'h' : 'p', sg.head ? .7 : .12); ctx.play('pop'); } break snk; } }
      if (sh.dead) continue;
      if (ph === 3) for (const q of X.tiles) if (Math.abs(sh.x - q.x) < X.tsz / 2 && Math.abs(sh.y - q.y) < X.tsz / 2) {
        q.hp--; q.flash = .1; sh.dead = true; ctx.play('hit', 640);
        if (q.hp <= 0) { q.dead = true; boom(q.x, q.y, C.pink, 14, 220, .6); drop(q.x, q.y, 'p', .2); ctx.play('pop'); if (q.v >= 16) for (let i = 0; i < 3; i++) bullet(q.x + (i - 1) * 16 * u, q.y, Math.PI / 2 + (i - 1) * .1, 130 * sc(), { c: [C.main, C.warn, C.light][i % 3], ch: 'BUG'[i], r: 8 }); }
        break;
      }
      if (sh.dead) continue;
      for (const b of bugs) if (b.hp > 0 && Math.hypot(b.x - sh.x, b.y - sh.y) < 16 * u) { b.hp--; sh.dead = true; break; }
      if (sh.dead) continue;
      if (ph === 5) for (const b of X.bars) if (sh.y > b.y && sh.y < b.y + 22 * u && (sh.x < b.gx - b.gw / 2 || sh.x > b.gx + b.gw / 2)) { sh.dead = true; boom(sh.x, sh.y, C.light, 2, 90, .2); break; }
      if (sh.dead) continue;
      if (Math.hypot(sh.x - E.x, sh.y - E.y) < E.r * .95) { sh.dead = true; hurtEye(sh.d); if (!E.shield) boom(sh.x, sh.y, C.light, 2, 120, .25); }
    }
    shots = shots.filter(q => !q.dead);
    if (ph === 1) for (const sn of X.sns) sn.segs = sn.segs.filter(q => !q.dead);
    if (ph === 3) X.tiles = X.tiles.filter(q => !q.dead);
    for (const b of bugs) { b.a += s; b.y += b.v * s; b.x += Math.cos(b.a * 2 + b.o) * b.w * s; if (b.hp <= 0 && !b.dead) { b.dead = true; boom(b.x, b.y, C.ok, 10, 180, .5); drop(b.x, b.y, 'p', .15); } if (!b.dead && Math.hypot(b.x - P.x, b.y - P.y) < 15 * u) hurt(); }
    bugs = bugs.filter(b => !b.dead && b.y < H + 40 * u);
    for (const f of foes) { f.x += f.vx * s; f.y += f.vy * s; f.life -= s; if (Math.hypot(f.x - P.x, f.y - P.y) < f.r + 5 * u) { hurt(); f.life = 0; } }
    foes = foes.filter(f => f.life > 0 && f.x > -30 && f.x < W + 30 && f.y > -30 && f.y < H + 30);
    for (const r of rings) { r.r += r.v * s; const d = Math.hypot(P.x - r.ox, P.y - r.oy); if (Math.abs(d - r.r) < r.th / 2 + 5 * u && adist(angTo(r.ox, r.oy, P.x, P.y), r.gc) > r.gh) hurt(); }
    rings = rings.filter(r => r.r < Math.max(W, H) * 1.3);
    for (const l of lasers) { if (l.arm > 0) { l.arm -= s; l.tk -= s; if (l.tk <= 0) { l.tk = .09; ctx.tone(200 + (1 - clamp(l.arm / l.a0, 0, 1)) * 800, .05, 'square', .02, 1); } if (l.arm <= 0) fireLaser(l); } else { l.dur -= s; if (Math.abs(P.x - l.x) < l.w / 2 + 5 * u) hurt(); } }
    lasers = lasers.filter(l => l.dur > 0);
    for (const k of pick) { k.y += k.vy * s; if (Math.hypot(k.x - P.x, k.y - P.y) < 24 * u) { k.dead = true; ctx.play('good'); if (k.k === 'h') P.hp = Math.min(P.max, P.hp + 1); else if (k.k === 'w') P.wide = 10; else { P.power = Math.min(3, P.power + 1); P.powT = 14; } boom(k.x, k.y, C.ok, 10, 160, .4); } }
    pick = pick.filter(k => !k.dead && k.y < H + 20);
  }
  // Los ladrillos del Breakout son sólidos para la nave: no se pueden atravesar y hacen daño al tocarlos
  function brickCollide() {
    const rad = 11 * u; let touched = false;
    for (const br of X.bricks) {
      if (br.hp <= 0) continue;
      const nx = clamp(P.x, br.x, br.x + br.w), ny = clamp(P.y, br.y, br.y + br.h), dx = P.x - nx, dy = P.y - ny, d = Math.hypot(dx, dy);
      if (d >= rad) continue; touched = true;
      if (d > .001) { P.x = nx + dx / d * rad; P.y = ny + dy / d * rad; }
      else { const l = P.x - br.x, r = br.x + br.w - P.x, tp = P.y - br.y, bt = br.y + br.h - P.y, m = Math.min(l, r, tp, bt); if (m === tp) P.y = br.y - rad; else if (m === bt) P.y = br.y + br.h + rad; else if (m === l) P.x = br.x - rad; else P.x = br.x + br.w + rad; }
    }
    if (touched) hurt();
  }
  function movePlayer(s) {   // solo ratón / dedo: la nave persigue el puntero
    const solid = ph === 2 && state === 'fight' && X.bricks, top = ph === 2 ? cy + E.r + 24 * u : H * .46;
    P.tx = clamp(P.tx, 18 * u, W - 18 * u); P.ty = clamp(P.ty, top, H - 34 * u);
    const k = 1 - Math.pow(.0005, s), mx = (P.tx - P.x) * k, my = (P.ty - P.y) * k, n = solid ? Math.max(1, Math.ceil(Math.hypot(mx, my) / (7 * u))) : 1;   // subpasos: no se atraviesan los ladrillos
    for (let i = 0; i < n; i++) { P.x += mx / n; P.y += my / n; if (solid) brickCollide(); }
  }

  /* ───── Dibujo ───── */
  function drawEye(x, y, r, aim, lid, flash, glowCol) {
    g.save(); g.translate(x, y); const k = r / 48;
    if (glowCol) halo(0, 0, r * 2.1, glowCol, flash > 0 ? 1 : .55);
    if (lid > 0) { const h = r + 4; g.beginPath(); g.rect(-h, -h + h * lid, 2 * h, 2 * h * (1 - lid)); g.clip(); }   // párpado: recorta, no pinta encima
    g.fillStyle = flash > 0 ? '#ffffff' : C.white;
    // Una sola figura (anillo + «pupila» unidos en un único trazado, igual que el favicon): sin costuras ni halos entre piezas
    g.beginPath();
    g.moveTo(r, 0); g.arc(0, 0, r, 0, TAU);
    g.moveTo(36 * k, 0); g.arc(0, 0, 36 * k, 0, TAU, true);
    const px = Math.cos(aim) * 20.6 * k, py = Math.sin(aim) * 20.6 * k; g.moveTo(px + 26 * k, py); g.arc(px, py, 26 * k, 0, TAU);
    g.fill(); g.restore();
  }
  function drawBug(x, y, r, a, col) {
    g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.6 * u;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-r * .5, i * r * .35); g.lineTo(-r * 1.1, i * r * .8 + Math.sin(a * 12 + i) * r * .2); g.moveTo(r * .5, i * r * .35); g.lineTo(r * 1.1, i * r * .8 + Math.cos(a * 12 + i) * r * .2); g.stroke(); }
    g.beginPath(); g.ellipse(0, 0, r * .62, r * .85, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-r * .2, -r * .8); g.lineTo(-r * .5, -r * 1.2); g.moveTo(r * .2, -r * .8); g.lineTo(r * .5, -r * 1.2); g.stroke();
    g.fillStyle = C.bg; g.fillRect(-r * .06, -r * .5, r * .12, r); g.restore();
  }
  // Emblema (anillos, hexágono, ejes) precalculado: el redibujo por fotograma es un par de drawImage
  function buildEmb(col) {
    const R = Math.ceil(300 * u + 6), sz = R * 2, mk = () => { const c = document.createElement('canvas'); c.width = c.height = sz; const q = c.getContext('2d'); q.translate(R, R); q.strokeStyle = col; return [c, q]; };
    const [a, qa] = mk(); qa.lineWidth = 1.4;
    [300, 214, 128].forEach((r, i) => { qa.beginPath(); qa.setLineDash(i === 1 ? [4 * u, 9 * u] : []); qa.arc(0, 0, r * u, 0, TAU); qa.stroke(); });
    const [b, qb] = mk(); qb.lineWidth = 1.6; qb.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU - Math.PI / 2; qb.lineTo(Math.cos(an) * 250 * u, Math.sin(an) * 250 * u); } qb.closePath(); qb.stroke();
    qb.beginPath(); qb.moveTo(0, -300 * u); qb.lineTo(0, 300 * u); qb.moveTo(-300 * u, 0); qb.lineTo(300 * u, 0); qb.stroke();
    emb = { a, b, R, col };
  }
  function emblem() {
    const col = PH[ph].col; if (!emb || emb.col !== col) buildEmb(col);
    const ay = state === 'title' ? H * .36 : cy;
    const ga = g.globalAlpha; g.save(); g.translate(cx, ay); g.globalAlpha = ga * (.16 + (E ? E.pulse : 0) * .25); g.drawImage(emb.a, -emb.R, -emb.R);
    g.rotate(T * .08); g.globalAlpha = ga * .2; g.drawImage(emb.b, -emb.R, -emb.R); g.restore();
  }
  function hudText(txt, x, y, col, size, align = 'left', w = 600) { g.font = `${w} ${size}px "JetBrains Mono",ui-monospace,monospace`; g.textAlign = align; g.fillStyle = col; g.fillText(txt, x, y); g.textAlign = 'left'; }
  function drawPhaseBack() {
    if (ph === 2) for (const b of X.bricks) if (b.hp > 0) { g.fillStyle = rgba(b.c, b.hp === 2 ? .85 : .45); g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = b.c; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); }
    if (ph === 3) {
      g.strokeStyle = 'rgba(223,157,231,.16)'; g.lineWidth = 1; g.beginPath();
      for (let c = 0; c <= X.cols; c++) { g.moveTo(c * X.cw + .5, X.y0); g.lineTo(c * X.cw + .5, H); }
      for (let r = 0; r <= X.rows; r++) { g.moveTo(0, X.y0 + r * X.ch + .5); g.lineTo(W, X.y0 + r * X.ch + .5); } g.stroke();
      for (const m of X.mark) { const p = tileCell(m.c, m.r), a = clamp(1 - m.t / .9, 0, 1), h2 = X.tsz / 2; g.strokeStyle = rgba(C.pink, .35 + a * .55); g.lineWidth = 2; g.setLineDash([8 * u, 6 * u]); g.strokeRect(p.x - h2, p.y - h2, X.tsz, X.tsz); g.setLineDash([]); hudText(String(m.v), p.x, p.y + 8 * u, rgba(C.pink, .25 + a * .5), 24 * u, 'center', 700); }
      if (X.swDir >= 0 && X.tiles.length) {   // aviso del desplazamiento: franjas con flechas en las filas/columnas que se van a mover
        const horiz = X.swDir < 2, sign = (X.swDir === 0 || X.swDir === 2) ? -1 : 1, pulse = .5 + Math.sin(T * 14) * .3, lanes = new Set(X.tiles.map(q => horiz ? q.r : q.c));
        for (const ln of lanes) {
          const bx = horiz ? 0 : ln * X.cw + (X.cw - X.tsz) / 2, by = horiz ? X.y0 + ln * X.ch + (X.ch - X.tsz) / 2 : X.y0, bw = horiz ? W : X.tsz, bh = horiz ? X.tsz : H - X.y0;
          g.fillStyle = rgba(C.pink, .05 + pulse * .07); g.fillRect(bx, by, bw, bh); g.strokeStyle = rgba(C.pink, .35 + pulse * .3); g.lineWidth = 2;
          const n = Math.ceil((horiz ? W : bh) / (120 * u));
          for (let i = 0; i < n; i++) {
            const a = horiz ? i * 120 * u + 60 * u : bx + bw / 2, b = horiz ? by + bh / 2 : by + i * 120 * u + 60 * u, d = 12 * u * sign;
            g.beginPath(); if (horiz) { g.moveTo(a - d, b - 12 * u); g.lineTo(a + d, b); g.lineTo(a - d, b + 12 * u); } else { g.moveTo(a - 12 * u, b - d); g.lineTo(a, b + d); g.lineTo(a + 12 * u, b - d); } g.stroke();
          }
        }
      }
      const sz = 40 * u, gp = 8 * u, x0 = cx - (5 * sz + 4 * gp) / 2, y = cy + E.r + 46 * u;   // las 5 casillas del escudo, bajo el ojo
      for (let i = 0; i < 5; i++) {
        const ev = X.st === 'eval' && X.last, chr = ev ? X.last.guess[i] : X.slots[i], st = ev ? X.last.res[i] : null, x = x0 + i * (sz + gp);
        g.fillStyle = st ? rgba(WCOL[st], .85) : chr ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.05)'; g.fillRect(x, y, sz, sz);
        g.strokeStyle = st ? WCOL[st] : (X.st === 'collect' && i === X.slots.length ? C.warn : 'rgba(255,255,255,.3)'); g.lineWidth = 2; g.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
        if (chr) hudText(chr, x + sz / 2, y + sz * .68, st ? '#151515' : C.white, 22 * u, 'center', 700);
      }
      const rowH = clamp((X.y0 - 146 * u) / 6, 16, W < 620 ? 22 * u : 36 * u), hs = rowH - 4 * u;   // historial: grande, en el lateral izquierdo
      X.hist.forEach((h, r) => { for (let i = 0; i < 5; i++) { const hx = 14 + i * rowH, hy = 138 * u + r * rowH; g.fillStyle = rgba(WCOL[h.res[i]], .88); g.fillRect(hx, hy, hs, hs); hudText(h.guess[i], hx + hs / 2, hy + hs * .7, '#151515', hs * .58, 'center', 700); } });
    }
    if (ph === 4) {
      g.strokeStyle = 'rgba(255,122,144,.22)'; g.lineWidth = 1; g.beginPath();
      for (let c = 0; c <= X.cols; c++) { g.moveTo(c * X.cw + .5, X.y0); g.lineTo(c * X.cw + .5, H); }
      for (let r = 0; r <= X.rows; r++) { g.moveTo(0, X.y0 + r * X.ch + .5); g.lineTo(W, X.y0 + r * X.ch + .5); } g.stroke();
      if (X.st !== 'rest') {
        const nn = X.cols * X.rows, blink = Math.sin(T * 18) > 0, fs = Math.min(X.cw, X.ch) * .36;
        for (let i = 0; i < nn; i++) {
          const x = (i % X.cols) * X.cw, y = X.y0 + ((i / X.cols) | 0) * X.ch, mine = X.mines.has(i), cxm = x + X.cw / 2, cym = y + X.ch / 2;
          if (X.st === 'arm' || X.st === 'shift') { if (!mine) { g.fillStyle = rgba(C.ok, .07); g.fillRect(x + 3, y + 3, X.cw - 6, X.ch - 6); hudText(String(X.nums[i]), cxm, cym + fs * .35, rgba(C.ok, .85), fs, 'center', 700); } }
          else if (X.st === 'flag') {
            if (mine) { g.fillStyle = rgba(C.bad, .2 + (blink ? .18 : 0)); g.fillRect(x + 3, y + 3, X.cw - 6, X.ch - 6); g.strokeStyle = C.bad; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, X.cw - 6, X.ch - 6);
              g.fillStyle = C.bad; g.beginPath(); g.moveTo(cxm - 6 * u, cym + 18 * u); g.lineTo(cxm - 6 * u, cym - 18 * u); g.lineTo(cxm - 4 * u, cym - 18 * u); g.lineTo(cxm + 18 * u, cym - 8 * u); g.lineTo(cxm - 4 * u, cym + 2 * u); g.lineTo(cxm - 4 * u, cym + 18 * u); g.closePath(); g.fill(); }
            else hudText(String(X.nums[i]), cxm, cym + fs * .35, rgba(C.ok, .4), fs, 'center', 700);
          } else if (mine) { const a = clamp(X.tm / .45, 0, 1); g.fillStyle = `rgba(255,200,120,${.8 * a})`; g.fillRect(x + 3, y + 3, X.cw - 6, X.ch - 6); g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, X.cw - 6, X.ch - 6); }
        }
        if (X.st === 'shift') {   // aviso del cambio: origen (pasa a ser seguro) y destino (pasa a ser mina) unidos por una flecha discontinua
          const k = 1 - clamp(X.tm, 0, 1), cx2 = i => (i % X.cols + .5) * X.cw, cy2 = i => X.y0 + (((i / X.cols) | 0) + .5) * X.ch;
          for (const m of X.moves) {
            const ax = cx2(m.a), ay = cy2(m.a), bx = cx2(m.b), by = cy2(m.b), an = Math.atan2(by - ay, bx - ax);
            g.strokeStyle = rgba(C.warn, .5 + k * .4); g.lineWidth = 2; g.setLineDash([8 * u, 6 * u]); g.lineDashOffset = -T * 60; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
            g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - Math.cos(an - .45) * 14 * u, by - Math.sin(an - .45) * 14 * u); g.lineTo(bx - Math.cos(an + .45) * 14 * u, by - Math.sin(an + .45) * 14 * u); g.closePath(); g.fillStyle = rgba(C.warn, .9); g.fill();
            g.strokeStyle = rgba(C.ok, .8); g.lineWidth = 2; g.strokeRect((m.a % X.cols) * X.cw + 5, X.y0 + ((m.a / X.cols) | 0) * X.ch + 5, X.cw - 10, X.ch - 10);
            if (Math.sin(T * 16) > 0) { g.fillStyle = rgba(C.bad, .3); g.fillRect((m.b % X.cols) * X.cw + 4, X.y0 + ((m.b / X.cols) | 0) * X.ch + 4, X.cw - 8, X.ch - 8); }
            g.strokeStyle = C.bad; g.strokeRect((m.b % X.cols) * X.cw + 4, X.y0 + ((m.b / X.cols) | 0) * X.ch + 4, X.cw - 8, X.ch - 8);
          }
        }
        if (X.flash > 0 && X.st === 'flag') for (const m of X.moves) { g.strokeStyle = `rgba(255,255,255,${X.flash / .6})`; g.lineWidth = 4; g.strokeRect((m.b % X.cols) * X.cw + 2, X.y0 + ((m.b / X.cols) | 0) * X.ch + 2, X.cw - 4, X.ch - 4); }
        const pc = playerCell();
        if (pc >= 0 && (X.st === 'arm' || X.st === 'shift' || X.st === 'flag')) { const x = (pc % X.cols) * X.cw, y = X.y0 + ((pc / X.cols) | 0) * X.ch; g.strokeStyle = X.mines.has(pc) ? C.bad : C.ok; g.lineWidth = 3; g.strokeRect(x + 6, y + 6, X.cw - 12, X.ch - 12); }
      }
    }
    if (ph === 5) {
      for (const b of X.bars) { g.fillStyle = rgba(C.light, .8); g.fillRect(0, b.y, b.gx - b.gw / 2, 22 * u); g.fillRect(b.gx + b.gw / 2, b.y, W, 22 * u); hudText(b.lab, 18, b.y + 16 * u, C.bg, 12 * u, 'left', 700); hudText(b.lab, W - 18, b.y + 16 * u, C.bg, 12 * u, 'right', 700); }
      if (state === 'fight' && (X.sub === 'echoShow' || X.sub === 'echoIn')) for (let i = 0; i < 4; i++) { const r = padRect(i), on = X.zl === i; g.fillStyle = rgba(PADC[i], on ? .75 : .13); g.fillRect(r.x + 4, r.y, r.w - 8, r.h); g.strokeStyle = PADC[i]; g.lineWidth = on ? 3 : 1.2; g.strokeRect(r.x + 4.5, r.y + .5, r.w - 9, r.h - 1); hudText(String(i + 1), r.x + r.w / 2, r.y + r.h / 2 + 8 * u, on ? C.bg : PADC[i], 24 * u, 'center', 700); }
    }
  }
  function drawEntities() {
    for (const r of rings) {   // anillos con hueco: trazo ancho translúcido + trazo fino (sin shadowBlur)
      g.strokeStyle = r.c; g.lineWidth = r.th * 2.4; g.globalAlpha = .2; g.beginPath(); g.arc(r.ox, r.oy, r.r, r.gc + r.gh, r.gc - r.gh + TAU); g.stroke();
      g.globalAlpha = 1; g.lineWidth = r.th; g.stroke();
    }
    for (const l of lasers) {
      const top = E.y, hw = l.w / 2;
      if (l.arm > 0) {   // carga: zona de peligro con bordes que avanzan, núcleo parpadeante y el ojo acumulando energía
        const k = 1 - l.arm / l.a0, bl = Math.sin(T * (20 + k * 40)) > 0;
        g.fillStyle = rgba(C.bad, .05 + k * .14); g.fillRect(l.x - hw, top, l.w, H - top);
        g.strokeStyle = rgba(C.bad, .4 + k * .5); g.lineWidth = 2; g.setLineDash([10 * u, 8 * u]); g.lineDashOffset = -T * 90; g.beginPath(); g.moveTo(l.x - hw, top); g.lineTo(l.x - hw, H); g.moveTo(l.x + hw, top); g.lineTo(l.x + hw, H); g.stroke(); g.setLineDash([]);
        g.fillStyle = rgba(C.bad, bl ? .55 : .25); g.fillRect(l.x - 2 - k * 3, top, 4 + k * 6, H - top);
        halo(E.x, E.y + E.r * .3, (26 + k * 80) * u, C.bad, .5 + k * .5); halo(l.x, H - 16 * u, (20 + k * 40) * u, C.bad, .4 + k * .5);
      } else {   // disparo: destello blanco que se apaga, con impacto en el suelo
        const f = clamp(l.dur / .35, 0, 1);
        g.fillStyle = rgba(C.bad, .22 + .2 * f); g.fillRect(l.x - hw, top, l.w, H - top); g.fillStyle = rgba(C.bad, .45 + .3 * f); g.fillRect(l.x - hw * .62, top, hw * 1.24, H - top);
        g.fillStyle = `rgba(255,255,255,${.5 + f * .45})`; g.fillRect(l.x - hw * .28, top, hw * .56, H - top);
        halo(E.x, E.y + E.r * .3, (50 + f * 50) * u, C.white, f); halo(l.x, H - 16 * u, (40 + f * 70) * u, C.bad, .6 + f * .4);
      }
    }
    if (ph === 1) for (const sn of X.sns) for (let i = sn.segs.length - 1; i >= 0; i--) { const sg = sn.segs[i], p = segPos(sn, sg), a = sg.hp / 4; g.save(); g.translate(p.x, p.y); g.fillStyle = sg.f > 0 ? '#fff' : rgba(C.ok, .25 + a * .5); g.strokeStyle = C.ok; g.lineWidth = 1.4; g.fillRect(-17 * u, -11 * u, 34 * u, 22 * u); g.strokeRect(-16.5 * u, -10.5 * u, 33 * u, 21 * u); hudText(sg.head ? '>_' : sg.lab, 0, 4 * u, sg.f > 0 ? C.bg : C.white, 9.5 * u, 'center', 700); g.restore(); }
    if (ph === 3) {
      for (const q of X.tiles) {
        const sz = X.tsz * Math.min(1, .55 + q.age * 3), k = Math.min(1, Math.log2(q.v) / 7); g.save(); g.translate(q.x, q.y);
        g.fillStyle = q.flash > 0 ? '#fff' : rgba(C.pink, .25 + k * .6); g.strokeStyle = C.pink; g.lineWidth = 2; g.fillRect(-sz / 2, -sz / 2, sz, sz); g.strokeRect(-sz / 2 + 1, -sz / 2 + 1, sz - 2, sz - 2);
        hudText(String(q.v), 0, 8 * u, q.flash > 0 ? C.bg : C.white, (q.v > 99 ? 22 : 28) * u, 'center', 700);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-sz / 2 + 6 * u, sz / 2 - 12 * u, sz - 12 * u, 5 * u); g.fillStyle = C.warn; g.fillRect(-sz / 2 + 6 * u, sz / 2 - 12 * u, (sz - 12 * u) * clamp(q.hp / q.maxhp, 0, 1), 5 * u);
        g.restore();
      }
      for (const k of X.tokens) { const st = X.known[k.ch], del = k.ch === '<', col = k.heal ? C.ok : del ? C.bad : st ? WCOL[st] : C.light; g.save(); g.translate(k.x, k.y + Math.sin(k.a) * 3 * u); g.fillStyle = rgba(col, st === 'absent' ? .22 : .35); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 16 * u, 0, TAU); g.fill(); g.stroke(); hudText(del ? 'DEL' : k.ch, 0, (k.heal ? 8 : 6) * u, del ? C.bad : k.heal ? C.ok : C.white, del ? 11 * u : (k.heal ? 28 : 18) * u, 'center', 700); g.restore(); }
    }
    if (ph === 2) {
      const b = X.ball, pw = (74 + (P.wide > 0 ? 40 : 0)) * u;
      halo(P.x, P.y - 25 * u, pw * .7, C.warn, .5); g.fillStyle = C.warn; g.fillRect(P.x - pw / 2, P.y - 28 * u, pw, 6 * u);
      if (b) { const ch = b.charge, col = ch === 0 ? C.dim : ch === 1 ? C.warn : ch === 2 ? C.pink : C.white; halo(b.x, b.y, b.r * (2.4 + ch * 1.2), col, ch ? 1 : .6); g.fillStyle = ch === 0 ? '#a9a1b3' : ch === 3 ? '#ffffff' : col; g.beginPath(); g.arc(b.x, b.y, b.r * (1 + ch * .12), 0, TAU); g.fill(); if (ch) hudText('×' + ch, b.x, b.y - b.r * 2, col, 12 * u, 'center', 700); }
      if (X.hitTxt && X.hitTxt.t > 0) hudText(`-${8 * X.hitTxt.v}`, X.hitTxt.x, X.hitTxt.y - (1 - X.hitTxt.t / .9) * 30 * u, C.white, 18 * u, 'center', 700);
    }
    for (const b of bugs) drawBug(b.x, b.y, 13 * u, b.a, b.hp > 1 ? C.ok : C.warn);
    for (const f of foes) {
      if (f.ch) { g.fillStyle = f.c; g.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); hudText(f.ch, f.x, f.y + f.r * .55, C.bg, f.r * 1.5, 'center', 700); }
      else { halo(f.x, f.y, f.r * 3, f.c, .8); g.fillStyle = f.c; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(f.x, f.y, f.r * .4, 0, TAU); g.fill(); }
    }
    for (const k of pick) { const col = k.k === 'h' ? C.ok : k.k === 'w' ? C.warn : C.light; g.strokeStyle = col; g.fillStyle = rgba(col, .2); g.lineWidth = 1.6; g.beginPath(); g.arc(k.x, k.y, 11 * u, 0, TAU); g.fill(); g.stroke(); hudText(k.k === 'h' ? '+' : k.k === 'w' ? '↔' : '▲', k.x, k.y + 4.5 * u, col, 12 * u, 'center', 700); }
    g.fillStyle = C.light; for (const s of shots) g.fillRect(s.x - 1.8 * u, s.y - 9 * u, 3.6 * u, 14 * u);
  }
  function drawShip() {
    if (state === 'dead' || state === 'win') return; if (P.inv > 0 && Math.floor(T * 14) % 2 === 0) return;
    halo(P.x, P.y, 30 * u, C.main, .6);
    g.save(); g.translate(P.x, P.y); g.fillStyle = C.white; g.beginPath(); g.moveTo(0, -17 * u); g.lineTo(12 * u, 12 * u); g.lineTo(0, 6 * u); g.lineTo(-12 * u, 12 * u); g.closePath(); g.fill();
    g.fillStyle = C.main; g.beginPath(); g.arc(0, 1 * u, 3 * u, 0, TAU); g.fill(); g.restore();
  }
  function drawHud() {
    const d = PH[ph];
    hudText(W < 560 ? `${phNum()} · ${d.n}` : `~/release-${V} $ ${extra ? '' : t('fase', 'phase') + ' '}${phNum()} · ${d.n}`, 18, 26, C.light, Math.max(11, 12.5 * u)); hudText(d.sub, 18, 44, 'rgba(169,161,179,.9)', Math.max(10, 11.5 * u), 'left', 400);
    // Una sola barra larga dividida en las 6 fases. La fase 1 está a la derecha: la barra se «recoge» hacia la izquierda, sección a sección.
    const bw = Math.min(W - 36, 980 * u), x = (W - bw) / 2, y = 58, seg = bw / 6, bh = 10;
    for (let i = 0; i < 6; i++) {
      const cur = i === slot, sx = x + (5 - i) * seg, w = seg - 4, col = PH[ORDER[i]].col, f = cur ? clamp(E.hp / E.max, 0, 1) : (extra || i < slot) ? 0 : 1, gf = cur ? clamp(E.dhp / E.max, 0, 1) : f;
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(sx, y + 14, w, bh);
      if (gf > f) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(sx, y + 14, w * gf, bh); }
      if (f > 0) { g.fillStyle = cur ? col : rgba(col, .5); g.fillRect(sx, y + 14, w * f, bh); }
      g.strokeStyle = cur ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)'; g.lineWidth = 1; g.strokeRect(sx + .5, y + 14.5, w - 1, bh - 1);
    }
    if (E.shield) hudText(E.shieldTxt || t('ESCUDO ACTIVO', 'SHIELD ACTIVE'), W / 2, y + 10, C.warn, 11, 'center', 700);
    for (let i = 0; i < P.max; i++) { g.globalAlpha = i < P.hp ? 1 : .22; drawEye(26 + i * 26, H - 28, 9, -2.6, 0, 0, i < P.hp ? C.main : null); } g.globalAlpha = 1;
    if (P.power > 1) hudText(`▲${P.power}`, W - 18, H - 40, C.ok, 12, 'right', 700);
    if (calm) hudText(t('modo tranquilo', 'calm mode'), W - 18, H - 58, C.ok, 11, 'right', 400);
    const bt = `ROLLBACK ×${P.bombs}`; if (bombBtn.textContent !== bt) bombBtn.textContent = bt; bombBtn.disabled = P.bombs <= 0 || state !== 'fight';
  }
  function banner() {
    if (state !== 'intro') return; const d = PH[ph], dur = E.introT, a = clamp(Math.min((dur - stT) / .25, stT / .3), 0, 1); if (a <= 0) return;
    g.globalAlpha = a; const cmd = d.cmd.slice(0, Math.floor((dur - stT) * (ph === 0 ? 24 : 60)));
    if (ph === 0) {   // solo la primera fase lleva el cartel grande
      g.fillStyle = 'rgba(21,21,21,.6)'; g.fillRect(0, H * .46, W, 128 * u);
      hudText(`$ ${cmd}${Math.floor(T * 3) % 2 ? '_' : ''}`, W / 2, H * .46 + 30 * u, C.light, 15 * u, 'center', 400);
      hudText(`${extra ? '' : t('FASE', 'PHASE') + ' '}${phNum()}`, W / 2, H * .46 + 58 * u, d.col, 13 * u, 'center', 700);
      g.font = `700 ${Math.round(clamp(34 * u, 18, 44))}px Unbounded,sans-serif`; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText(d.n, W / 2, H * .46 + 98 * u); g.textAlign = 'left';
    } else {          // el resto: una línea discreta bajo la barra, sin tapar la acción
      hudText(`$ ${cmd}`, W / 2, 112, C.light, 13 * u, 'center', 400); hudText(`${phNum()} · ${d.n}`, W / 2, 132, d.col, 12 * u, 'center', 700);
    }
    g.globalAlpha = 1;
  }
  function drawStateText() {
    if (state === 'clear') { g.globalAlpha = clamp(stT / .4, 0, 1); hudText(`✓ ${PH[ph].k}`, W / 2, 112, PH[ph].col, 13 * u, 'center', 700); g.globalAlpha = 1; }
    if (state === 'dead') { hudText(t('FALLO DE COMPILACIÓN', 'BUILD FAILED'), W / 2, H * .5, C.bad, 20 * u, 'center', 700); hudText(calm ? t('reiniciando la fase…', 'restarting the phase…') : t('saliendo de la batalla…', 'leaving the battle…'), W / 2, H * .5 + 26 * u, C.light, 12 * u, 'center', 400); }
    if (state === 'fight' && ph === 3) {
      if (X.newWord > 0) hudText(t('NUEVA PALABRA', 'NEW WORD'), W / 2, H * .46 - 14 * u, C.bad, 14 * u, 'center', 700);
      else if (X.st === 'open') hudText(`${t('ESCUDO ROTO · ¡dispara!', 'SHIELD DOWN · fire!')} ${Math.ceil(X.exp)}`, W / 2, H * .46 - 14 * u, C.white, 14 * u, 'center', 700);
    }
    if (state === 'fight' && ph === 5) {
      if (X.sub === 'exposed') hudText(`${t('ESCUDO ROTO · ¡dispara!', 'SHIELD DOWN · fire!')} ${Math.ceil(X.exp)}`, W / 2, H * .36 + 20, C.white, 14 * u, 'center', 700);
    }
    if (state === 'finisher' && cmp) {
      g.fillStyle = 'rgba(21,21,21,.55)'; g.fillRect(0, H * .5, W, 150 * u);
      const p = cmp.p, size = clamp(W * .92 / (p.length * .62), 13, 34 * u); g.font = `700 ${size}px "JetBrains Mono",monospace`; const cw = g.measureText('m').width, x0 = W / 2 - p.length * cw / 2, by = H * .5 + 62 * u;
      for (let i = 0; i < p.length; i++) { g.fillStyle = i < typed.length ? C.ok : (i === typed.length && cmp.bad > 0 ? C.bad : 'rgba(255,255,255,.4)'); g.fillText(p[i], x0 + i * cw + (cmp.bad > 0 ? Math.sin(T * 90) * 2 : 0), by); }
      g.fillStyle = Math.floor(T * 3) % 2 ? C.warn : 'rgba(242,197,142,.3)'; g.fillRect(x0 + typed.length * cw, by + 6 * u, cw, 3 * u);
      const k = clamp(cmp.t / cmp.max, 0, 1), bw = Math.min(W * .7, 560 * u), bx = W / 2 - bw / 2, bY = H * .5 + 104 * u;
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(bx, bY, bw, 8 * u); g.fillStyle = k > .3 ? C.ok : (Math.floor(T * 8) % 2 ? C.bad : C.warn); g.fillRect(bx, bY, bw * k, 8 * u);
      hudText(`COMPILE · ${Math.ceil(cmp.t)}s`, W / 2, H * .5 + 30 * u, C.light, 12 * u, 'center', 700);
    }
  }
  function drawTitle() {
    g.globalAlpha = clamp(T / 1.2, 0, 1); E.x = cx; E.y = H * .36; emblem();
    drawEye(cx, H * .36, 70 * u, E.aim, Math.max(0, 1 - T * .8), 0, C.main);
    g.font = `700 ${Math.round(clamp(46 * u, 26, 64))}px Unbounded,sans-serif`; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText('RELEASE ' + V, cx, H * .36 + 150 * u); g.textAlign = 'left';
    hudText(t('el último despliegue', 'the final deployment'), cx, H * .36 + 180 * u, C.light, 14 * u, 'center', 400);
    if (Math.floor(T * 2) % 2) hudText(t('haz clic o toca para empezar', 'click or tap to start'), cx, H * .36 + 236 * u, C.warn, 13 * u, 'center', 700);
    g.globalAlpha = 1;
  }
  function draw() {
    g.clearRect(0, 0, W, H); g.save();   // el fondo es el del propio sitio (cuadrícula y degradados), no se pinta aquí
    if (shake > 0 && !DC.reduced) g.translate(rnd(-1, 1) * shake * 22 * u, rnd(-1, 1) * shake * 22 * u);
    if (state === 'title') { drawTitle(); g.restore(); return; }
    emblem(); drawPhaseBack(); drawEntities();
    for (const w of waves) { g.strokeStyle = rgba(C.light, clamp(1 - w.r / (W * .9), 0, 1) * .8); g.lineWidth = 3; g.beginPath(); g.arc(w.x, w.y, w.r, 0, TAU); g.stroke(); }
    if (!(E.dead && state === 'finisher' && Math.floor(T * 20) % 2)) {
      const sc2 = 1 + E.pulse * .08; g.save(); g.translate(E.x, E.y); g.scale(sc2, sc2); g.translate(-E.x, -E.y);
      drawEye(E.x, E.y, E.r, E.aim, E.lid, E.flash, PH[ph].col);
      if (E.shield) { g.strokeStyle = rgba(C.warn, .55 + Math.sin(T * 8) * .2); g.lineWidth = 3; g.setLineDash([10 * u, 8 * u]); g.beginPath(); g.arc(E.x, E.y, E.r + 16 * u, T, T + TAU); g.stroke(); g.setLineDash([]); }
      g.restore();
    }
    drawShip();
    for (const q of ps) { g.globalAlpha = clamp(q.l / q.m, 0, 1); g.fillStyle = q.c; g.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); } g.globalAlpha = 1;
    if (ph === 4 && X.dark > 0) { // Lights Out: solo se ve cerca de la nave
      const a = clamp(Math.min((4.4 - X.dark) / .4, X.dark / .5), 0, 1), rad = 150 * u, gr = g.createRadialGradient(P.x, P.y, rad * .4, P.x, P.y, rad);
      gr.addColorStop(0, 'rgba(8,7,10,0)'); gr.addColorStop(1, `rgba(8,7,10,${.94 * a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); drawShip(); hudText('LIGHTS OUT', W / 2, H * .36, C.bad, 14 * u, 'center', 700);
    }
    if (state !== 'win') drawHud(); banner(); drawStateText(); g.restore();
  }

  /* ───── Entradas: solo ratón / dedo (el teclado se usa únicamente para el comando final) ───── */
  const setTarget = e => { const dy = e.pointerType === 'touch' ? 80 * u : 24 * u; P.tx = e.clientX; P.ty = e.clientY - dy; };
  ctx.on(cv, 'pointermove', e => { if (state !== 'title' && !paused) setTarget(e); });
  ctx.on(cv, 'pointerdown', e => { e.preventDefault(); if (state === 'title') { begin(); return; } if (state === 'finisher') { try { kbd.focus({ preventScroll: true }); } catch (x) { /* nada */ } } if (!paused) setTarget(e); });
  ctx.on(cv, 'contextmenu', e => { e.preventDefault(); bomb(); });
  const kbd = document.createElement('input'); kbd.type = 'text'; kbd.autocomplete = 'off'; kbd.autocapitalize = 'off'; kbd.spellcheck = false; kbd.setAttribute('aria-label', 'compile');
  kbd.style.cssText = 'position:absolute;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px'; stage.appendChild(kbd);
  ctx.on(kbd, 'input', e => { const d = e.data; kbd.value = ''; if (d && performance.now() - lastKeyT > 60) for (const ch of d) typeKey(ch); });
  ctx.on(window, 'keydown', e => {
    if (paused || state !== 'finisher' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1) { lastKeyT = performance.now(); typeKey(e.key); }
  });
  ctx.keys(e => { if (e.key === 'Escape' && state !== 'title' && state !== 'win') setPause(!paused); });
  ctx.on(bombBtn, 'click', e => { e.stopPropagation(); bomb(); });
  ctx.on(relBtn, 'click', e => { e.stopPropagation(); if (state === 'finisher') finish(); });
  function toggleCalm() { if (state !== 'title') return; calm = !calm; if (calm) usedCalm = true; stage.querySelectorAll('[data-a=calm]').forEach(b => b.setAttribute('aria-pressed', String(calm))); ctx.play('toggle'); }
  function setPause(v) { paused = v; pausedDrawn = false; pauseBox.hidden = !v; ctx.play('toggle'); }
  ctx.on(ui, 'click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return; e.stopPropagation(); const a = b.dataset.a;
    if (a === 'calm') toggleCalm();
    if (a === 'pause' && state !== 'title') setPause(true); if (a === 'exit') ctx.exit();
  });
  ctx.on(pauseBox, 'click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'resume') setPause(false); if (a === 'calm') toggleCalm(); if (a === 'exit') ctx.exit(); });

  /* ───── Inicio y final ───── */
  function begin() { if (state !== 'title') return; slot = 0; extra = false; cmpFails = 0; cmp = null; lastRnd = -1; ui.querySelector('[data-a=calm]').hidden = true; ctx.play('go'); deaths = 0; hits = 0; fightMs = 0; P = null; E = null; startPhase(0, false); }
  function enterCompile() {
    state = 'finisher'; stT = 0; typed = ''; extra = false; let k; do { k = Math.random() * PHRASES.length | 0; } while (cmp && k === cmp.k);
    const p = PHRASES[k], tm = (3.5 + p.length * .42) * (calm ? 1.4 : 1); cmp = { k, p, t: tm, max: tm, bad: 0 };
    relBtn.hidden = cmpFails < 3; ctx.play('open'); try { kbd.value = ''; kbd.focus({ preventScroll: true }); } catch (e) { /* sin teclado virtual */ }
  }
  function typeKey(k) {
    if (state !== 'finisher' || paused || !cmp) return;
    if (k.toLowerCase() === cmp.p[typed.length]) { typed += cmp.p[typed.length]; ctx.play('hit', 500 + typed.length * 35); boom(W / 2 + (typed.length / cmp.p.length - .5) * W * .5, H * .5 + 60 * u, C.ok, 3, 120, .3); if (typed.length === cmp.p.length) finish(); }
    else { cmp.t = Math.max(.1, cmp.t - .6); cmp.bad = .3; shake = Math.max(shake, .12); ctx.play('error'); }
  }
  function compileFail() {
    cmpFails++; extra = true; let r; do { r = Math.random() * 6 | 0; } while (r === lastRnd); lastRnd = r; cmp.t = 0; ctx.play('over'); shake = .5;
    DC.toast(t('COMPILACIÓN FALLIDA · otra fase antes del siguiente intento', 'BUILD FAILED · another phase before the next try'), { ms: 3200 }); startPhase(r, false);
  }
  function finish() {
    if (state !== 'finisher') return; state = 'win'; relBtn.hidden = true; ended = true; ctx.play('win'); shake = .8;
    for (let i = 0; i < 6; i++) boom(E.x + rnd(-60, 60) * u, E.y + rnd(-40, 40) * u, [C.main, C.ok, C.warn, C.pink, C.white][i % 5], 60, 420, 1.4);
    const secs = fightMs / 1000;
    let score = 50 + Math.round(20 * clamp(1 - deaths / 6, 0, 1)) + Math.round(20 * clamp(1 - hits / 20, 0, 1)) + Math.round(10 * clamp((480 - secs) / 300, 0, 1));
    if (usedCalm) score = Math.round(score * .75); score = clamp(score, 1, 100);
    const mm = Math.floor(secs / 60), ss = Math.floor(secs % 60);
    ctx.end({ score, win: true, delay: 1800, html: () => `<div class="mid">${t('RELEASE ' + V + ' DESPLEGADO', 'RELEASE ' + V + ' DEPLOYED')}</div><div class="big">${score}<span class="of"> /100</span></div>
      <small>${t('muertes', 'deaths')} ${deaths} · ${t('golpes', 'hits')} ${hits} · ${t('tiempo', 'time')} ${mm}:${String(ss).padStart(2, '0')}${usedCalm ? ' · ' + t('modo tranquilo −25 %', 'calm mode −25 %') : ''}</small>
      <div class="boss-end"><button type="button" class="button button-primary" data-e="badge">${t('Ver insignia', 'View badge')}</button><button type="button" class="button" data-e="again">${t('Volver a combatir', 'Fight again')}</button><button type="button" class="button" data-e="exit">${t('Salir', 'Exit')}</button></div>` });
  }
  ctx.on(stage, 'click', e => {
    const b = e.target.closest('[data-e]'); if (!b) return; e.stopPropagation(); e.preventDefault(); const a = b.dataset.e;
    if (a === 'exit') ctx.exit(); if (a === 'badge') { ctx.exit(); setTimeout(() => document.getElementById('badge-btn')?.click(), 700); }
    if (a === 'again') stage.querySelector('.veil')?.click();
  }, true);

  /* ───── Arranque ───── */
  P = { x: cx, y: H * .82, tx: cx, ty: H * .82, hp: 5, max: 5, inv: 0, bombs: 2, fire: 0, power: 1, powT: 0, wide: 0, shield: 0 };
  E = { x: cx, y: H * .36, hp: 1, max: 1, dhp: 1, r: 70 * u, flash: 0, lid: 1, shield: false, pulse: 0, aim: -1.4, dead: false, dmg: 1, age: 0 };
  ctx.loop(dt => {
    const s = Math.min(.05, dt / 1000);
    if (state === 'title') { T += s; E.aim = Math.sin(T * .8) * 1.2 - 1.4; }
    else if (paused) { if (pausedDrawn) return; pausedDrawn = true; }
    else if (!ended) { update(s); adapt(dt); }
    else if (state === 'win') { T += s; for (const q of ps) { q.l -= s; q.x += q.vx * s; q.y += q.vy * s; } ps = ps.filter(q => q.l > 0); shake = Math.max(0, shake - s); }
    draw();
  });
});
