/* Release 1.0 — jefe final a pantalla completa. Seis fases; cada una toma prestado uno o dos minijuegos de la web.
   La arena es el emblema del estudio (anillos, hexágono y ejes) y el jefe es el «ojo» del favicon.
   Un solo control: mueve la nave (ratón, dedo o flechas/WASD). Dispara sola. Espacio / ROLLBACK despeja los disparos. */
DCArcade.define('boss', ctx => {
  const t = ctx.t, DC = window.DC, pal = DC.palette(), stage = ctx.stage, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
  const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const adist = (a, b) => Math.abs(((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI);
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const C = { main: pal[0], light: pal[1], acc: pal[2], ok: '#8ff0c8', warn: '#f2c58e', bad: '#ff7a90', pink: '#df9de7', bg: '#100e13', white: '#f3eff8', dim: '#7a7285' };
  const PH = [
    { k: 'pulse', n: 'PULSE', sub: t('El latido', 'The heartbeat'), cmd: 'git checkout pulse', col: C.main, hp: 90 },
    { k: 'snake', n: 'SNAKE', sub: t('Serpiente de logs', 'Log serpent'), cmd: 'tail -f error.log', col: C.ok, hp: 70 },
    { k: 'breakout', n: 'BREAKOUT + PONG', sub: t('Muro y rebote', 'Wall and rebound'), cmd: 'npm run build', col: C.warn, hp: 80 },
    { k: 'g2048', n: '2048 + WORDLE', sub: t('Fusión de fichas', 'Tile merge'), cmd: 'git merge --no-ff', col: C.pink, hp: 90 },
    { k: 'mines', n: t('MINAS + LIGHTS OUT', 'MINES + LIGHTS OUT'), sub: t('Campo a oscuras', 'Dark minefield'), cmd: 'rm -rf node_modules', col: C.bad, hp: 100 },
    { k: 'release', n: 'FLAP + ECHO + COMPILE', sub: 'Release 1.0', cmd: 'npm run release', col: C.white, hp: 200 }
  ];

  /* ───── Lienzo e interfaz ───── */
  stage.innerHTML = '';
  const cv = document.createElement('canvas'); cv.className = 'boss-cv'; stage.appendChild(cv);
  const g = cv.getContext('2d');
  const ui = document.createElement('div'); ui.className = 'boss-ui';
  ui.innerHTML = `<button type="button" data-a="calm" aria-pressed="false">${t('Modo tranquilo', 'Calm mode')}</button><button type="button" data-a="pause">${t('Pausa', 'Pause')}</button><button type="button" data-a="exit">${t('Salir', 'Exit')}</button>`;
  const bombBtn = document.createElement('button'); bombBtn.type = 'button'; bombBtn.className = 'boss-bomb'; bombBtn.textContent = 'ROLLBACK';
  const relBtn = document.createElement('button'); relBtn.type = 'button'; relBtn.className = 'boss-release'; relBtn.hidden = true; relBtn.textContent = 'RELEASE';
  const pauseBox = document.createElement('div'); pauseBox.className = 'boss-pause'; pauseBox.hidden = true;
  pauseBox.innerHTML = `<strong>${t('Pausa', 'Paused')}</strong><button type="button" data-a="resume">${t('Continuar', 'Resume')}</button><button type="button" data-a="calm" aria-pressed="false">${t('Modo tranquilo', 'Calm mode')}</button><button type="button" data-a="exit">${t('Salir del combate', 'Leave the fight')}</button>`;
  stage.append(ui, bombBtn, relBtn, pauseBox);

  let W = 0, H = 0, u = 1, cx = 0, cy = 0;
  const fit = () => {
    const d = DC.dpr; W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
    u = clamp(Math.min(W, H * 1.15) / 720, .6, 1.4); cx = W / 2; cy = Math.max(clamp(H * .22, 110 * u, 190 * u), 124);
  };
  fit(); ctx.on(window, 'resize', fit);

  /* ───── Estado ───── */
  let calm = false, usedCalm = false, paused = false, ended = false, state = 'title', stT = 0, T = 0, ph = 0, deaths = 0, hits = 0, fightMs = 0, shake = 0;
  let P = null, E = null, X = {}, shots = [], foes = [], rings = [], lasers = [], pick = [], ps = [], bugs = [], waves = [], typed = '';
  const sc = () => calm ? .72 : 1;
  const keys = {};

  /* ───── Utilidades de juego ───── */
  function boom(x, y, col, n = 14, sp = 220, life = .7) { for (let i = 0; i < n; i++) { const a = rnd(TAU), v = sp * rnd(.3, 1); ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: life * rnd(.5, 1), m: life, c: col, r: rnd(1.5, 3.5) * u }); } }
  function startPhase(n, retry) {
    const first = !P, keepHp = P ? P.hp : 0, max = calm ? 7 : 5; ph = n; const d = PH[n];
    P = { x: cx, y: H * .82, tx: cx, ty: H * .82, inv: 1.2, bombs: 2, fire: 0, power: 1, powT: 0, wide: 0, max, hp: (retry || first) ? max : Math.min(max, keepHp + 1), shield: 0 };
    E = { x: cx, y: cy, hp: Math.round(d.hp * (calm ? .8 : 1)), max: 0, r: (n === 5 ? 60 : 46) * u, flash: 0, lid: 1, shield: false, pulse: 0, aim: 0, dead: false, dmg: 1 };
    E.max = E.hp; shots = []; foes = []; rings = []; lasers = []; pick = []; bugs = []; waves = []; X = {}; typed = '';
    relBtn.hidden = true; INIT[n](); state = 'intro'; stT = 2.6; ctx.play('open');
  }
  function hurt(force) {
    if (state !== 'fight') return; if (!force && (P.inv > 0 || P.shield > 0)) return;
    P.hp--; P.inv = 1.4; hits++; shake = .35; ctx.play('miss'); boom(P.x, P.y, C.bad, 22, 260);
    if (P.hp <= 0) { deaths++; state = 'dead'; stT = 1.8; ctx.play('over'); boom(P.x, P.y, C.white, 40, 320, 1); }
  }
  function hurtEye(d) {
    if (E.dead || state !== 'fight') return;
    if (E.shield) { boom(E.x + rnd(-E.r, E.r), E.y + E.r * .6, C.light, 2, 90, .25); return; }
    E.hp -= d * E.dmg; E.flash = .1;
    if (E.hp <= 0) {
      E.hp = 0; E.dead = true; E.shield = false; foes = []; rings = []; lasers = []; bugs = [];
      boom(E.x, E.y, PH[ph].col, 70, 380, 1.2); ctx.play('perfect'); shake = .5;
      if (ph === 5) { state = 'finisher'; stT = 0; typed = ''; relBtn.hidden = false; } else { state = 'clear'; stT = 2.4; }
    }
  }
  function drop(x, y, k, p = .14) { if (Math.random() < p) pick.push({ x, y, k, vy: 90 * u }); }
  function bullet(x, y, a, v, o = {}) { foes.push({ x, y, vx: Math.cos(a) * v * u, vy: Math.sin(a) * v * u, r: (o.r || 6) * u, c: o.c || PH[ph].col, ch: o.ch, life: 9 }); }
  function aimedFan(n, spread, v, o) { const a0 = angTo(E.x, E.y, P.x, P.y); for (let i = 0; i < n; i++) bullet(E.x, E.y + E.r * .4, a0 + (n === 1 ? 0 : (i / (n - 1) - .5) * spread), v, o); }
  function ring(gc, gh, v, o = {}) { rings.push({ r: E.r + 10 * u, v: v * u, gc, gh, th: (o.th || 7) * u, c: o.c || PH[ph].col }); ctx.play('step'); }
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
    () => { X = { exp: 0, shootT: 2, sn: null }; mkSnake(); },
    () => {
      const cols = 9, bw = Math.min(66 * u, (W - 70 * u) / cols), bh = 22 * u, y0 = cy + E.r + 56 * u, left = (W - cols * (bw + 4 * u)) / 2;
      X = { bricks: [], shootT: 2.5, respawn: 0, ball: null };
      for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) X.bricks.push({ x: left + c * (bw + 4 * u), y: y0 + r * (bh + 4 * u), w: bw, h: bh, hp: 2, c: [C.main, C.pink, C.warn, C.ok][r] });
      ball();
    },
    () => { const cell = Math.min(64 * u, (W - 60 * u) / 5); X = { cell, bx: (W - 5 * cell) / 2, by: cy + E.r + 50 * u, tiles: [], spawn: .6, swipe: 3.4, shootT: 2.2 }; },
    () => { const cw = Math.min(78 * u, (W - 30 * u) / 7), ch = cw * .78; X = { cw, ch, x0: (W - 7 * cw) / 2, y0: H - Math.max(74 * u, 66) - 3 * ch, st: 'wait', tm: 1.2, mines: [], nums: [], dark: 0, nextDark: 8, shootT: 2 }; },
    () => { X = { sub: 'gauntlet', tm: 0, bars: [], nextBar: .8, lz: 2.2, seq: [], round: 0, show: 0, inp: [], zl: -1, zlT: 0, last: -1, lastIdx: -1, exp: 0, fail: 0, shootT: 2 }; E.shield = true; }
  ];

  /* ───── Fase 2: serpiente ───── */
  const CELL = 38, SEGGAP = 26, STEP = 6, K = Math.round(SEGGAP / STEP);
  function mkSnake() {
    const left = Math.random() < .5, x = left ? 40 * u : W - 40 * u, y = cy + 120 * u, dir = left ? [1, 0] : [-1, 0], tr = [], len = 15 * K + 4;
    for (let i = 0; i < len; i++) tr.push({ x: x - dir[0] * (len - i) * STEP * u, y });
    X.sn = { x, y, dir, trail: tr, acc: 0, mv: 0, run: 4, segs: Array.from({ length: 14 }, (_, i) => ({ i: i + 1, hp: 4, lab: ['404', 'NaN', 'null', 'TODO', 'ERR', 'WARN', 'undef'][i % 7], f: 0 })) };
    X.sn.segs[0].head = true; E.shield = true;
  }
  const segPos = (sn, s) => sn.trail[sn.trail.length - 1 - s.i * K] || { x: sn.x, y: sn.y };

  /* ───── Fase 3: pelota ───── */
  function ball() { const sp = 340 * u * sc(); X.ball = { x: E.x, y: E.y + E.r + 20 * u, vx: rnd(-.5, .5) * sp, vy: sp * .8, r: 9 * u, sp }; }

  /* ───── Fase 4: 2048 ───── */
  function tileCell(c, r) { return { x: X.bx + c * X.cell + X.cell / 2, y: X.by + r * X.cell + X.cell / 2 }; }
  function addTile(v) {
    const free = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if (!X.tiles.some(q => q.c === c && q.r === r)) free.push([c, r]);
    if (!free.length) return false; const [c, r] = free[Math.random() * free.length | 0], p = tileCell(c, r);
    X.tiles.push({ c, r, x: p.x, y: p.y - 40 * u, v, hp: Math.max(1, Math.ceil(v / 4)), fire: rnd(1.5, 3), flash: 0 }); return true;
  }
  function swipe(dir) {
    const dx = [-1, 1, 0, 0][dir], dy = [0, 0, -1, 1][dir], order = X.tiles.slice().sort((a, b) => (a.c - b.c) * -dx + (a.r - b.r) * -dy);
    const grid = {}, key = (c, r) => c + ',' + r;
    for (const q of order) {
      let c = q.c, r = q.r;
      for (;;) {
        const nc = c + dx, nr = r + dy; if (nc < 0 || nc > 4 || nr < 0 || nr > 2) break; const o = grid[key(nc, nr)];
        if (!o) { c = nc; r = nr; continue; }
        if (o.v === q.v && !o.m && q.v < 256) { o.v *= 2; o.m = true; o.hp = Math.min(40, o.hp + q.hp); o.flash = .3; q.gone = true; boom(o.x, o.y, C.pink, 8, 160, .4); }
        break;
      }
      if (!q.gone) { q.c = c; q.r = r; grid[key(c, r)] = q; }
    }
    X.tiles = X.tiles.filter(q => !q.gone); X.tiles.forEach(q => { q.m = false; }); ctx.play('pop');
  }

  /* ───── Fase 5: minas ───── */
  function cellOf(x, y) { const c = Math.floor((x - X.x0) / X.cw), r = Math.floor((y - X.y0) / X.ch); return c >= 0 && c < 7 && r >= 0 && r < 3 ? [c, r] : null; }
  function armMines() {
    const n = (E.hp < E.max * .5 ? 6 : 4) - (calm ? 1 : 0), set = new Set(); while (set.size < n) set.add((Math.random() * 21) | 0);
    X.mines = [...set].map(i => [i % 7, i / 7 | 0]); X.nums = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { if (X.mines.some(m => m[0] === c && m[1] === r)) continue; let k = 0; for (const m of X.mines) if (Math.abs(m[0] - c) <= 1 && Math.abs(m[1] - r) <= 1) k++; X.nums.push([c, r, k]); }
  }
  function swarm() { for (let i = 0; i < 7; i++) bugs.push({ x: rnd(40 * u, W - 40 * u), y: -20 * u - i * 36 * u, o: rnd(TAU), hp: 2, v: 110 * u * sc(), a: 0, w: rnd(40, 80) * u }); }

  /* ───── Fase 6: paneles de Echo ───── */
  const PADC = [C.main, C.ok, C.warn, C.pink], PADF = [262, 330, 392, 523];
  const padRect = i => { const w = Math.min(120 * u, (W - 40 * u) / 4), x0 = (W - 4 * w) / 2; return { x: x0 + i * w, y: H - 138 * u, w, h: 70 * u }; };
  function newSeq() { const n = Math.min(5, 3 + X.round); X.seq = Array.from({ length: n }, () => (Math.random() * 4) | 0); X.inp = []; X.sub = 'echoShow'; X.tm = 0; X.show = 0; X.zl = -1; X.lastIdx = -1; E.shield = true; }
  function replay(delay) { X.sub = 'echoShow'; X.tm = -delay; X.show = 0; X.inp = []; X.zl = -1; X.lastIdx = -1; }
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
      const sn = X.sn;
      if (sn) {
        const step = 210 * u * sc() * s, ymin = cy + 90 * u, ymax = H * .72, xmin = 40 * u, xmax = W - 40 * u;
        const out = (d, k) => { const nx = sn.x + d[0] * k, ny = sn.y + d[1] * k; return nx < xmin || nx > xmax || ny < ymin || ny > ymax; };
        if (sn.mv >= CELL * u) { sn.mv = 0; sn.run--; }
        if (sn.run <= 0 || out(sn.dir, step + 2)) {   // gira tras un tramo recto, o antes de chocar con el borde
          sn.run = 3 + (Math.random() * 4 | 0); const dx = P.x - sn.x, dy = P.y - sn.y;
          const cands = Math.abs(dx) > Math.abs(dy) ? [[Math.sign(dx) || 1, 0], [0, Math.sign(dy) || 1]] : [[0, Math.sign(dy) || 1], [Math.sign(dx) || 1, 0]];
          if (Math.random() < .3) cands.reverse(); cands.push([0, -1], [0, 1], [1, 0], [-1, 0]);
          const rev = d => d[0] === -sn.dir[0] && d[1] === -sn.dir[1];
          const ok = cands.find(d => !rev(d) && !out(d, CELL * u * 1.2)) || cands.find(d => !out(d, CELL * u * .6)) || sn.dir; sn.dir = ok;
        }
        sn.x = clamp(sn.x + sn.dir[0] * step, xmin, xmax); sn.y = clamp(sn.y + sn.dir[1] * step, ymin, ymax); sn.acc += step; sn.mv += step;
        while (sn.acc >= STEP * u) { sn.acc -= STEP * u; sn.trail.push({ x: sn.x, y: sn.y }); }
        if (sn.trail.length > 16 * K + 40) sn.trail.splice(0, sn.trail.length - (16 * K + 40));
        for (const sg of sn.segs) { const p = segPos(sn, sg); sg.f = Math.max(0, sg.f - s); if (Math.hypot(p.x - P.x, p.y - P.y) < 20 * u) hurt(); }
        if (!sn.segs.length) { X.sn = null; X.exp = calm ? 10 : 8; E.shield = false; ctx.play('perfect'); }
      } else { X.exp -= s; if (X.exp <= 0) mkSnake(); }
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2 / sc(); aimedFan(5, .9, 150 * sc()); }
    },
    s => { // BREAKOUT + PONG
      const b = X.ball, pw = (74 + (P.wide > 0 ? 40 : 0)) * u;
      if (b) {
        b.x += b.vx * s; b.y += b.vy * s;
        if (b.x < 20 * u) { b.x = 20 * u; b.vx = Math.abs(b.vx); } if (b.x > W - 20 * u) { b.x = W - 20 * u; b.vx = -Math.abs(b.vx); } if (b.y < 18 * u) { b.y = 18 * u; b.vy = Math.abs(b.vy); }
        const dxe = b.x - E.x, dye = b.y - E.y, de = Math.hypot(dxe, dye);
        if (de < E.r + b.r) { const nx = dxe / de, ny = dye / de, dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; } b.x = E.x + nx * (E.r + b.r + 1); b.y = E.y + ny * (E.r + b.r + 1); hurtEye(8); ctx.play('hit', 220); }
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
          b.vx = Math.sin(off * 1.05) * sp; b.vy = -Math.abs(Math.cos(off * 1.05)) * sp; b.y = py - b.r - 4 * u; ctx.play('hit', 380); boom(b.x, py, C.warn, 6, 120, .3);
        } else if (b.y > P.y - 14 * u && Math.hypot(b.x - P.x, b.y - P.y) < b.r + 11 * u) { hurt(); b.vy = -Math.abs(b.vy); }
        if (b.y > H + 20 * u) { hurt(true); if (state === 'fight') ball(); }
      }
      if (X.bricks.every(q => q.hp <= 0)) { X.respawn += s; if (X.respawn > 3) { X.respawn = 0; X.bricks.forEach(q => { q.hp = 2; }); ctx.play('open'); } }
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2.4 / sc(); aimedFan(3, .5, 160 * sc()); }
    },
    s => { // 2048 + WORDLE
      X.spawn -= s; if (X.spawn <= 0) { X.spawn = 2.3 / sc(); if (!addTile(Math.random() < .8 ? 2 : 4)) { for (const q of X.tiles) for (let i = 0; i < 8; i++) bullet(q.x, q.y, i / 8 * TAU, 120 * sc(), { c: C.pink }); X.tiles = []; ctx.play('miss'); shake = .3; } }
      X.swipe -= s; if (X.swipe <= 0) { X.swipe = 3.6 / sc(); swipe((Math.random() * 4) | 0); }
      for (const q of X.tiles) {
        const p = tileCell(q.c, q.r); q.x = lerp(q.x, p.x, Math.min(1, s * 9)); q.y = lerp(q.y, p.y, Math.min(1, s * 9)); q.flash = Math.max(0, q.flash - s);
        if (q.v >= 8) { q.fire -= s; if (q.fire <= 0) { q.fire = 3.4 / (q.v / 8) / sc(); bullet(q.x, q.y, angTo(q.x, q.y, P.x, P.y), 170 * sc(), { c: C.warn, ch: 'DEBUG'[Math.random() * 5 | 0] }); } }
      }
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2.2 / sc(); aimedFan(3, .6, 160 * sc()); }
    },
    s => { // MINAS + LIGHTS OUT
      X.tm -= s;
      if (X.tm <= 0) {
        if (X.st === 'wait') { armMines(); X.st = 'num'; X.tm = calm ? 1.9 : 1.5; ctx.play('count'); }
        else if (X.st === 'num') { X.st = 'flag'; X.tm = .5; ctx.play('step'); }
        else if (X.st === 'flag') { X.st = 'boom'; X.tm = .45; ctx.play('miss'); shake = .25; X.mines.forEach(m => boom(X.x0 + (m[0] + .5) * X.cw, X.y0 + (m[1] + .5) * X.ch, C.bad, 14, 240, .6)); }
        else { X.st = 'wait'; X.tm = calm ? 1.4 : .9; X.mines = []; }
      }
      if (X.st === 'boom') { const c = cellOf(P.x, P.y); if (c && X.mines.some(m => m[0] === c[0] && m[1] === c[1])) hurt(); }
      X.nextDark -= s; if (X.nextDark <= 0) { X.nextDark = 13; X.dark = 4.4; swarm(); ctx.play('open'); }
      if (X.dark > 0) X.dark -= s;
      X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2 / sc(); aimedFan(E.hp < E.max * .5 ? 5 : 3, .8, 165 * sc()); }
    },
    s => { // FLAP + ECHO + COMPILE
      X.tm += s;
      if (X.sub === 'gauntlet') {
        X.nextBar -= s; if (X.nextBar <= 0) { X.nextBar = 1.35 / sc(); const gw = 170 * u * (calm ? 1.2 : 1), gx = rnd(90 * u + gw / 2, W - 90 * u - gw / 2); X.bars.push({ y: E.y + E.r, gx, gw, lab: ['404', 'NaN', 'ERR'][Math.random() * 3 | 0] }); }
        X.lz -= s; if (X.lz <= 0) { X.lz = 2.4 / sc(); lasers.push({ x: P.x, w: 34 * u, arm: .8, dur: .35 }); ctx.play('step'); }
        if (X.tm > (calm ? 10 : 12)) { X.nextBar = 99; if (!X.bars.length) newSeq(); }
      } else if (X.sub === 'echoShow') {
        if (X.tm >= 0) {
          X.show += s; const idx = Math.floor(X.show / .62);
          if (idx < X.seq.length) { if (X.lastIdx !== idx) { X.lastIdx = idx; ctx.tone(PADF[X.seq[idx]], .3, 'triangle', .06, 1); } X.zl = (X.show % .62) < .42 ? X.seq[idx] : -1; }
          else { X.zl = -1; if (X.show > X.seq.length * .62 + .4) { X.sub = 'echoIn'; X.tm = 0; X.inp = []; X.last = -1; } }
        }
        X.shootT -= s; if (X.shootT <= 0) { X.shootT = 2.2; aimedFan(3, .6, 140 * sc()); }
      } else if (X.sub === 'echoIn') {
        X.shootT -= s; if (X.shootT <= 0) { X.shootT = 1.8 / sc(); aimedFan(3, .7, 150 * sc()); }
        for (let i = 0; i < 4; i++) { const r = padRect(i), inside = P.x > r.x && P.x < r.x + r.w && P.y > r.y - 30 * u && P.y < r.y + r.h; if (inside && X.last !== i) { X.last = i; padPress(i); break; } if (!inside && X.last === i) X.last = -1; }
        if (X.sub === 'echoIn' && X.tm > 14) { X.fail++; aimedFan(5, 1.2, 170 * sc(), { c: C.bad }); replay(.6); }
      } else if (X.sub === 'exposed') {
        X.exp -= s; X.shootT -= s; if (X.shootT <= 0) { X.shootT = 1.5 / sc(); ring(angTo(E.x, E.y, P.x, P.y) + rnd(-.6, .6), .7, 190 * sc(), { c: C.white }); aimedFan(5, 1, 170 * sc()); }
        if (X.exp <= 0) { X.round++; X.sub = 'gauntlet'; X.tm = 0; X.nextBar = 1; E.shield = true; E.dmg = 1; X.bars = []; ctx.play('open'); }
      }
      for (const b of X.bars) { b.y += 150 * u * sc() * s; const inY = P.y + 9 * u > b.y && P.y - 9 * u < b.y + 22 * u; if (inY && (P.x < b.gx - b.gw / 2 + 6 * u || P.x > b.gx + b.gw / 2 - 6 * u)) hurt(); }
      X.bars = X.bars.filter(b => b.y < H + 30 * u);
      if (X.zlT > 0) { X.zlT -= s; if (X.zlT <= 0 && X.sub !== 'echoShow') X.zl = -1; }
    }
  ];

  /* ───── Bucle principal ───── */
  function update(s) {
    T += s; shake = Math.max(0, shake - s); E.flash = Math.max(0, E.flash - s); E.pulse = Math.max(0, E.pulse - s * 3);
    ps.forEach(q => { q.l -= s; q.x += q.vx * s; q.y += q.vy * s; q.vx *= .985; q.vy *= .985; }); ps = ps.filter(q => q.l > 0);
    waves.forEach(w => { w.r += 900 * u * s; }); waves = waves.filter(w => w.r < Math.max(W, H) * 1.2);
    E.aim = angTo(E.x, E.y, P.x, P.y);   // el ojo sigue a la nave
    if (state === 'intro') { stT -= s; E.lid = Math.max(0, E.lid - s * 1.6); if (stT <= 0) { state = 'fight'; E.lid = 0; ctx.play('go'); } movePlayer(s); return; }
    if (state === 'clear') { stT -= s; if (Math.random() < .5) boom(E.x + rnd(-E.r, E.r), E.y + rnd(-E.r, E.r), PH[ph].col, 5, 200, .6); E.lid = Math.min(1, E.lid + s * .5); if (stT <= 0) startPhase(ph + 1, false); return; }
    if (state === 'dead') { stT -= s; if (stT <= 0) startPhase(ph, true); return; }
    if (state === 'finisher') { stT += s; movePlayer(s); if (Math.random() < .3) boom(E.x + rnd(-E.r, E.r), E.y + rnd(-E.r, E.r), C.white, 4, 160, .6); return; }
    if (state !== 'fight') return;
    fightMs += s * 1000; P.inv = Math.max(0, P.inv - s); P.shield = Math.max(0, P.shield - s); if (P.powT > 0 && (P.powT -= s) <= 0) P.power = 1; P.wide = Math.max(0, P.wide - s);
    movePlayer(s); fireShots(s); UPD[ph](s);
    for (const sh of shots) {
      sh.x += sh.vx * s; sh.y += sh.vy * s; if (sh.y < -20 || sh.x < -20 || sh.x > W + 20) { sh.dead = true; continue; }
      if (ph === 2) for (const br of X.bricks) if (br.hp > 0 && sh.x > br.x && sh.x < br.x + br.w && sh.y > br.y && sh.y < br.y + br.h) { br.hp--; sh.dead = true; if (br.hp <= 0) { boom(br.x + br.w / 2, br.y + br.h / 2, br.c, 8, 160, .4); drop(br.x + br.w / 2, br.y, Math.random() < .5 ? 'w' : 'p', .16); } else ctx.play('hit', 700); break; }
      if (sh.dead) continue;
      if (ph === 1 && X.sn) for (const sg of X.sn.segs) { const p = segPos(X.sn, sg); if (Math.hypot(p.x - sh.x, p.y - sh.y) < 17 * u) { sg.hp--; sg.f = .12; sh.dead = true; if (sg.hp <= 0) { sg.dead = true; boom(p.x, p.y, C.ok, 12, 200, .5); drop(p.x, p.y, sg.head ? 'h' : 'p', sg.head ? 1 : .12); ctx.play('pop'); } break; } }
      if (sh.dead) continue;
      if (ph === 3) for (const q of X.tiles) if (Math.abs(sh.x - q.x) < X.cell / 2 - 3 * u && Math.abs(sh.y - q.y) < X.cell / 2 - 3 * u) {
        q.hp--; q.flash = .12; sh.dead = true;
        if (q.hp <= 0) { q.dead = true; boom(q.x, q.y, C.pink, 14, 220, .6); drop(q.x, q.y, 'p', .2); ctx.play('pop'); if (q.v >= 16) for (let i = 0; i < 5; i++) bullet(q.x + (i - 2) * 14 * u, q.y, Math.PI / 2 + (i - 2) * .08, 130 * sc(), { c: [C.main, C.warn, C.light][i % 3], ch: 'BUGGY'[i], r: 8 }); }
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
    if (ph === 1 && X.sn) X.sn.segs = X.sn.segs.filter(q => !q.dead);
    if (ph === 3) X.tiles = X.tiles.filter(q => !q.dead);
    for (const b of bugs) { b.a += s; b.y += b.v * s; b.x += Math.cos(b.a * 2 + b.o) * b.w * s; if (b.hp <= 0 && !b.dead) { b.dead = true; boom(b.x, b.y, C.ok, 10, 180, .5); drop(b.x, b.y, 'p', .15); } if (!b.dead && Math.hypot(b.x - P.x, b.y - P.y) < 15 * u) hurt(); }
    bugs = bugs.filter(b => !b.dead && b.y < H + 40 * u);
    for (const f of foes) { f.x += f.vx * s; f.y += f.vy * s; f.life -= s; if (Math.hypot(f.x - P.x, f.y - P.y) < f.r + 5 * u) { hurt(); f.life = 0; } }
    foes = foes.filter(f => f.life > 0 && f.x > -30 && f.x < W + 30 && f.y > -30 && f.y < H + 30);
    for (const r of rings) { r.r += r.v * s; const d = Math.hypot(P.x - E.x, P.y - E.y); if (Math.abs(d - r.r) < r.th / 2 + 5 * u && adist(angTo(E.x, E.y, P.x, P.y), r.gc) > r.gh) hurt(); }
    rings = rings.filter(r => r.r < Math.max(W, H) * 1.3);
    for (const l of lasers) { if (l.arm > 0) l.arm -= s; else { l.dur -= s; if (Math.abs(P.x - l.x) < l.w / 2 + 5 * u) hurt(); } }
    lasers = lasers.filter(l => l.dur > 0);
    for (const k of pick) { k.y += k.vy * s; if (Math.hypot(k.x - P.x, k.y - P.y) < 24 * u) { k.dead = true; ctx.play('good'); if (k.k === 'h') P.hp = Math.min(P.max, P.hp + 1); else if (k.k === 'w') P.wide = 10; else { P.power = Math.min(3, P.power + 1); P.powT = 14; } boom(k.x, k.y, C.ok, 10, 160, .4); } }
    pick = pick.filter(k => !k.dead && k.y < H + 20);
  }
  function movePlayer(s) {
    const sp = 520 * u;
    if (keys.arrowleft || keys.a) P.tx -= sp * s; if (keys.arrowright || keys.d) P.tx += sp * s; if (keys.arrowup || keys.w) P.ty -= sp * s; if (keys.arrowdown || keys.s) P.ty += sp * s;
    P.tx = clamp(P.tx, 18 * u, W - 18 * u); P.ty = clamp(P.ty, H * .46, H - 34 * u);
    const k = 1 - Math.pow(.0005, s); P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k;
  }

  /* ───── Dibujo ───── */
  function drawEye(x, y, r, aim, lid, flash, glow) {
    g.save(); g.translate(x, y); const k = r / 48;
    if (glow) { g.shadowColor = flash > 0 ? '#fff' : glow; g.shadowBlur = 26 * k; }
    g.fillStyle = flash > 0 ? '#ffffff' : C.white; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.arc(0, 0, 36 * k, 0, TAU, true); g.fill('evenodd');
    g.beginPath(); g.arc(Math.cos(aim) * 20.6 * k, Math.sin(aim) * 20.6 * k, 26 * k, 0, TAU); g.fill(); g.shadowBlur = 0;
    if (lid > 0) { g.beginPath(); g.arc(0, 0, r + 2, 0, TAU); g.clip(); g.fillStyle = C.bg; g.fillRect(-r - 4, -r - 4, 2 * r + 8, (r + 4) * lid); g.fillRect(-r - 4, r + 4 - (r + 4) * lid, 2 * r + 8, (r + 4) * lid); }
    g.restore();
  }
  function drawBug(x, y, r, a, col) {
    g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.6 * u;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-r * .5, i * r * .35); g.lineTo(-r * 1.1, i * r * .8 + Math.sin(a * 12 + i) * r * .2); g.moveTo(r * .5, i * r * .35); g.lineTo(r * 1.1, i * r * .8 + Math.cos(a * 12 + i) * r * .2); g.stroke(); }
    g.beginPath(); g.ellipse(0, 0, r * .62, r * .85, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-r * .2, -r * .8); g.lineTo(-r * .5, -r * 1.2); g.moveTo(r * .2, -r * .8); g.lineTo(r * .5, -r * 1.2); g.stroke();
    g.fillStyle = C.bg; g.fillRect(-r * .06, -r * .5, r * .12, r); g.restore();
  }
  function emblem() {
    const col = PH[ph].col, pulse = E ? E.pulse : 0;
    g.save(); g.translate(E.x, E.y); g.lineWidth = 1.4;
    [300, 214, 128].forEach((R, i) => { g.strokeStyle = rgba(col, .16 + pulse * .25); g.beginPath(); g.setLineDash(i === 1 ? [4 * u, 9 * u] : []); g.arc(0, 0, R * u * (1 + pulse * .02), 0, TAU); g.stroke(); });
    g.setLineDash([]); g.rotate(T * .08); g.strokeStyle = rgba(col, .2); g.lineWidth = 1.6;
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 2; g.lineTo(Math.cos(a) * 250 * u, Math.sin(a) * 250 * u); } g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(0, -300 * u); g.lineTo(0, 300 * u); g.moveTo(-300 * u, 0); g.lineTo(300 * u, 0); g.stroke(); g.restore();
  }
  function hudText(txt, x, y, col, size, align = 'left', w = 600) { g.font = `${w} ${size}px "JetBrains Mono",ui-monospace,monospace`; g.textAlign = align; g.fillStyle = col; g.fillText(txt, x, y); g.textAlign = 'left'; }
  function drawPhaseBack() {
    if (ph === 2) for (const b of X.bricks) if (b.hp > 0) { g.fillStyle = rgba(b.c, b.hp === 2 ? .85 : .45); g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = b.c; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); }
    if (ph === 3) for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { g.strokeStyle = 'rgba(223,157,231,.18)'; g.lineWidth = 1; g.strokeRect(X.bx + c * X.cell + 3, X.by + r * X.cell + 3, X.cell - 6, X.cell - 6); }
    if (ph === 4) {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
        const x = X.x0 + c * X.cw, y = X.y0 + r * X.ch, mine = X.mines.some(m => m[0] === c && m[1] === r); let fill = 'rgba(255,122,144,.06)', st = 'rgba(255,122,144,.25)';
        if (X.st === 'flag' && mine) { fill = 'rgba(255,122,144,.35)'; st = C.bad; } if (X.st === 'boom' && mine) { fill = 'rgba(255,200,120,.65)'; st = '#fff'; }
        g.fillStyle = fill; g.fillRect(x + 2, y + 2, X.cw - 4, X.ch - 4); g.strokeStyle = st; g.lineWidth = 1; g.strokeRect(x + 2.5, y + 2.5, X.cw - 5, X.ch - 5);
      }
      if (X.st === 'num') for (const [c, r, k] of X.nums) hudText(String(k), X.x0 + (c + .5) * X.cw, X.y0 + (r + .5) * X.ch + 7 * u, [C.ok, C.warn, C.pink, C.bad][Math.min(3, k)], 20 * u, 'center', 700);
      if (X.st === 'flag') X.mines.forEach(m => hudText('!', X.x0 + (m[0] + .5) * X.cw, X.y0 + (m[1] + .5) * X.ch + 8 * u, '#fff', 24 * u, 'center', 700));
    }
    if (ph === 5) {
      for (const b of X.bars) { g.fillStyle = rgba(C.light, .8); g.fillRect(0, b.y, b.gx - b.gw / 2, 22 * u); g.fillRect(b.gx + b.gw / 2, b.y, W, 22 * u); hudText(b.lab, 18, b.y + 16 * u, C.bg, 12 * u, 'left', 700); hudText(b.lab, W - 18, b.y + 16 * u, C.bg, 12 * u, 'right', 700); }
      if (state === 'fight' && (X.sub === 'echoShow' || X.sub === 'echoIn')) for (let i = 0; i < 4; i++) { const r = padRect(i), on = X.zl === i; g.fillStyle = rgba(PADC[i], on ? .75 : .13); g.fillRect(r.x + 4, r.y, r.w - 8, r.h); g.strokeStyle = PADC[i]; g.lineWidth = on ? 3 : 1.2; g.strokeRect(r.x + 4.5, r.y + .5, r.w - 9, r.h - 1); hudText(String(i + 1), r.x + r.w / 2, r.y + r.h / 2 + 8 * u, on ? C.bg : PADC[i], 24 * u, 'center', 700); }
    }
  }
  function drawEntities() {
    for (const r of rings) { g.strokeStyle = r.c; g.lineWidth = r.th; g.shadowColor = r.c; g.shadowBlur = 10; g.beginPath(); g.arc(E.x, E.y, r.r, r.gc + r.gh, r.gc - r.gh + TAU); g.stroke(); g.shadowBlur = 0; }
    for (const l of lasers) { if (l.arm > 0) { g.fillStyle = rgba(C.bad, .12 + (Math.sin(T * 30) > 0 ? .1 : 0)); g.fillRect(l.x - 2, E.y, 4, H); } else { g.fillStyle = 'rgba(255,255,255,.9)'; g.shadowColor = C.bad; g.shadowBlur = 24; g.fillRect(l.x - l.w / 2, E.y, l.w, H); g.shadowBlur = 0; } }
    if (ph === 1 && X.sn) { const sn = X.sn; for (let i = sn.segs.length - 1; i >= 0; i--) { const sg = sn.segs[i], p = segPos(sn, sg), a = sg.hp / 4; g.save(); g.translate(p.x, p.y); g.fillStyle = sg.f > 0 ? '#fff' : rgba(C.ok, .25 + a * .5); g.strokeStyle = C.ok; g.lineWidth = 1.4; g.fillRect(-17 * u, -11 * u, 34 * u, 22 * u); g.strokeRect(-16.5 * u, -10.5 * u, 33 * u, 21 * u); hudText(sg.head ? '>_' : sg.lab, 0, 4 * u, sg.f > 0 ? C.bg : C.white, 9.5 * u, 'center', 700); g.restore(); } }
    if (ph === 3) for (const q of X.tiles) { const sz = X.cell - 8 * u, k = Math.min(1, Math.log2(q.v) / 7); g.save(); g.translate(q.x, q.y); g.fillStyle = q.flash > 0 ? '#fff' : rgba(C.pink, .25 + k * .6); g.strokeStyle = C.pink; g.lineWidth = 1.5; g.fillRect(-sz / 2, -sz / 2, sz, sz); g.strokeRect(-sz / 2 + .5, -sz / 2 + .5, sz - 1, sz - 1); hudText(String(q.v), 0, 7 * u, q.flash > 0 ? C.bg : C.white, (q.v > 99 ? 16 : 21) * u, 'center', 700); g.restore(); }
    if (ph === 2) {
      const b = X.ball, pw = (74 + (P.wide > 0 ? 40 : 0)) * u;
      g.fillStyle = C.warn; g.shadowColor = C.warn; g.shadowBlur = 14; g.fillRect(P.x - pw / 2, P.y - 28 * u, pw, 6 * u); g.shadowBlur = 0;
      if (b) { g.fillStyle = '#fff'; g.shadowColor = C.warn; g.shadowBlur = 18; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.shadowBlur = 0; }
    }
    for (const b of bugs) drawBug(b.x, b.y, 13 * u, b.a, b.hp > 1 ? C.ok : C.warn);
    for (const f of foes) {
      g.fillStyle = f.c; g.shadowColor = f.c; g.shadowBlur = 8;
      if (f.ch) { g.shadowBlur = 0; g.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); hudText(f.ch, f.x, f.y + f.r * .55, C.bg, f.r * 1.5, 'center', 700); }
      else { g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(f.x, f.y, f.r * .4, 0, TAU); g.fill(); }
      g.shadowBlur = 0;
    }
    for (const k of pick) { const col = k.k === 'h' ? C.ok : k.k === 'w' ? C.warn : C.light; g.strokeStyle = col; g.fillStyle = rgba(col, .2); g.lineWidth = 1.6; g.beginPath(); g.arc(k.x, k.y, 11 * u, 0, TAU); g.fill(); g.stroke(); hudText(k.k === 'h' ? '+' : k.k === 'w' ? '↔' : '▲', k.x, k.y + 4.5 * u, col, 12 * u, 'center', 700); }
    g.fillStyle = C.light; g.shadowColor = C.main; g.shadowBlur = 8; for (const s of shots) g.fillRect(s.x - 1.8 * u, s.y - 9 * u, 3.6 * u, 14 * u); g.shadowBlur = 0;
  }
  function drawShip() {
    if (state === 'dead' || state === 'win') return; if (P.inv > 0 && Math.floor(T * 14) % 2 === 0) return;
    g.save(); g.translate(P.x, P.y); g.fillStyle = C.white; g.shadowColor = C.main; g.shadowBlur = 16; g.beginPath(); g.moveTo(0, -17 * u); g.lineTo(12 * u, 12 * u); g.lineTo(0, 6 * u); g.lineTo(-12 * u, 12 * u); g.closePath(); g.fill(); g.shadowBlur = 0;
    g.fillStyle = C.main; g.beginPath(); g.arc(0, 1 * u, 3 * u, 0, TAU); g.fill(); g.restore();
  }
  function drawHud() {
    const d = PH[ph], bw = Math.min(560 * u, W - 40);
    hudText(W < 560 ? `${ph + 1}/6 · ${d.n}` : `~/release-1.0 $ ${t('fase', 'phase')} ${ph + 1}/6 · ${d.n}`, 18, 26, C.light, Math.max(11, 12.5 * u)); hudText(d.sub, 18, 44, 'rgba(169,161,179,.9)', Math.max(10, 11.5 * u), 'left', 400);
    const x = (W - bw) / 2, y = 58; g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y + 14, bw, 8); const f = clamp(E.hp / E.max, 0, 1);
    const gr = g.createLinearGradient(x, 0, x + bw, 0); gr.addColorStop(0, d.col); gr.addColorStop(1, C.pink); g.fillStyle = gr; g.fillRect(x, y + 14, bw * f, 8); g.strokeStyle = 'rgba(255,255,255,.3)'; g.strokeRect(x + .5, y + 14.5, bw - 1, 7);
    if (E.shield) hudText(t('ESCUDO ACTIVO', 'SHIELD ACTIVE'), W / 2, y + 12, C.warn, 11, 'center', 700);
    for (let i = 0; i < 6; i++) { g.fillStyle = i < ph ? C.ok : i === ph ? d.col : 'rgba(255,255,255,.18)'; g.fillRect(W / 2 - 54 + i * 19, y + 28, 14, 3); }
    for (let i = 0; i < P.max; i++) { g.globalAlpha = i < P.hp ? 1 : .22; drawEye(26 + i * 26, H - 28, 9, -2.6, 0, 0, i < P.hp ? C.main : null); } g.globalAlpha = 1;
    if (P.power > 1) hudText(`▲${P.power}`, W - 18, H - 40, C.ok, 12, 'right', 700);
    if (calm) hudText(t('modo tranquilo', 'calm mode'), W - 18, H - 58, C.ok, 11, 'right', 400);
    const bt = `ROLLBACK ×${P.bombs}`; if (bombBtn.textContent !== bt) bombBtn.textContent = bt; bombBtn.disabled = P.bombs <= 0 || state !== 'fight';
  }
  function banner() {
    if (state !== 'intro') return; const d = PH[ph], a = clamp(Math.min((2.6 - stT) / .4, stT / .5), 0, 1); if (a <= 0) return;
    g.globalAlpha = a; g.fillStyle = 'rgba(10,9,13,.55)'; g.fillRect(0, H * .46, W, 128 * u);
    hudText(`$ ${d.cmd.slice(0, Math.floor((2.6 - stT) * 24))}${Math.floor(T * 3) % 2 ? '_' : ''}`, W / 2, H * .46 + 30 * u, C.light, 15 * u, 'center', 400);
    hudText(`${t('FASE', 'PHASE')} ${ph + 1}/6`, W / 2, H * .46 + 58 * u, d.col, 13 * u, 'center', 700);
    g.font = `700 ${Math.round(clamp(34 * u, 18, 44))}px Unbounded,sans-serif`; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText(d.n, W / 2, H * .46 + 98 * u); g.textAlign = 'left'; g.globalAlpha = 1;
  }
  function drawStateText() {
    if (state === 'clear') { g.globalAlpha = clamp((2.4 - stT) / .5, 0, 1); hudText(t('FASE SUPERADA', 'PHASE CLEARED'), W / 2, H * .55, PH[ph].col, 18 * u, 'center', 700); hudText(`$ git commit -m "${PH[ph].k}: done"`, W / 2, H * .55 + 26 * u, C.light, 12 * u, 'center', 400); g.globalAlpha = 1; }
    if (state === 'dead') { hudText(t('FALLO DE COMPILACIÓN', 'BUILD FAILED'), W / 2, H * .5, C.bad, 20 * u, 'center', 700); hudText(t('reintentando la fase…', 'retrying the phase…'), W / 2, H * .5 + 26 * u, C.light, 12 * u, 'center', 400); }
    if (state === 'fight' && ph === 5) {
      if (X.sub === 'gauntlet') hudText(t('FLAP · cruza los huecos', 'FLAP · fly through the gaps'), W / 2, H * .36 + 20, C.light, 12 * u, 'center', 600);
      if (X.sub === 'echoShow') hudText(t('ECHO · memoriza la secuencia', 'ECHO · memorise the sequence'), W / 2, H - 150 * u, C.warn, 13 * u, 'center', 700);
      if (X.sub === 'echoIn') hudText(`${t('ECHO · repite', 'ECHO · repeat')} ${X.inp.length}/${X.seq.length} · ${t('vuela a cada panel o pulsa 1–4', 'fly onto each pad or press 1–4')}`, W / 2, H - 150 * u, C.ok, 12 * u, 'center', 700);
      if (X.sub === 'exposed') hudText(`${t('ESCUDO ROTO · ¡dispara!', 'SHIELD DOWN · fire!')} ${Math.ceil(X.exp)}`, W / 2, H * .36 + 20, C.white, 14 * u, 'center', 700);
    }
    if (state === 'finisher') {
      g.fillStyle = 'rgba(10,9,13,.5)'; g.fillRect(0, H * .5, W, 150 * u);
      hudText(t('COMPILE · escribe el comando final', 'COMPILE · type the final command'), W / 2, H * .5 + 30 * u, C.light, 13 * u, 'center', 600);
      const word = 'release', size = 34 * u; g.font = `700 ${size}px "JetBrains Mono",monospace`; const cw = g.measureText('m').width, x0 = W / 2 - word.length * cw / 2;
      for (let i = 0; i < word.length; i++) { g.fillStyle = i < typed.length ? C.ok : 'rgba(255,255,255,.35)'; g.fillText(word[i], x0 + i * cw, H * .5 + 86 * u); }
      hudText(`$ npm run ${typed}${Math.floor(T * 3) % 2 ? '_' : ''}`, W / 2, H * .5 + 124 * u, C.warn, 13 * u, 'center', 400);
    }
  }
  function drawTitle() {
    g.globalAlpha = clamp(T / 1.2, 0, 1); E.x = cx; E.y = H * .36; emblem();
    drawEye(cx, H * .36, 70 * u, E.aim, Math.max(0, 1 - T * .8), 0, C.main);
    g.font = `700 ${Math.round(clamp(46 * u, 26, 64))}px Unbounded,sans-serif`; g.textAlign = 'center'; g.fillStyle = C.white; g.fillText('RELEASE 1.0', cx, H * .36 + 150 * u); g.textAlign = 'left';
    hudText(t('el último despliegue', 'the final deployment'), cx, H * .36 + 180 * u, C.light, 14 * u, 'center', 400);
    hudText(t('6 fases · cada una nace de un minijuego', '6 phases · each born from a minigame'), cx, H * .36 + 208 * u, 'rgba(169,161,179,.9)', 12 * u, 'center', 400);
    hudText(t('mueve la nave con el ratón, el dedo o las flechas · dispara sola · espacio = rollback · Esc pausa', 'move the ship with the mouse, finger or arrows · it fires by itself · space = rollback · Esc pauses'), cx, H * .36 + 232 * u, 'rgba(169,161,179,.75)', Math.max(10, 11 * u), 'center', 400);
    if (Math.floor(T * 2) % 2) hudText(t('toca o pulsa Enter para empezar', 'tap or press Enter to start'), cx, H * .36 + 266 * u, C.warn, 13 * u, 'center', 700);
    g.globalAlpha = 1;
  }
  function draw() {
    g.clearRect(0, 0, W, H); g.save();
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
    for (const q of ps) { g.globalAlpha = clamp(q.l / q.m, 0, 1); g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); } g.globalAlpha = 1;
    if (ph === 4 && X.dark > 0) { // Lights Out: solo se ve cerca de la nave
      const a = clamp(Math.min((4.4 - X.dark) / .4, X.dark / .5), 0, 1), rad = 150 * u, gr = g.createRadialGradient(P.x, P.y, rad * .4, P.x, P.y, rad);
      gr.addColorStop(0, 'rgba(8,7,10,0)'); gr.addColorStop(1, `rgba(8,7,10,${.94 * a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); drawShip(); hudText('LIGHTS OUT', W / 2, H * .36, C.bad, 14 * u, 'center', 700);
    }
    if (state !== 'win') drawHud(); banner(); drawStateText(); g.restore();
  }

  /* ───── Entradas ───── */
  const setTarget = e => { const dy = e.pointerType === 'touch' ? 80 * u : 24 * u; P.tx = e.clientX; P.ty = e.clientY - dy; };
  ctx.on(cv, 'pointermove', e => { if (state !== 'title' && !paused) setTarget(e); });
  ctx.on(cv, 'pointerdown', e => { e.preventDefault(); if (state === 'title') { begin(); return; } if (!paused) setTarget(e); });
  ctx.on(cv, 'contextmenu', e => { e.preventDefault(); bomb(); });
  ctx.on(window, 'keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) { begin(); return; }
    if (paused) return;
    if (state === 'fight') { if (e.key === ' ') bomb(); if (ph === 5 && e.key.length === 1 && '1234'.includes(e.key)) padPress(+e.key - 1); }
    if (state === 'finisher' && k.length === 1 && /[a-z]/.test(k)) { if (k === 'release'[typed.length]) { typed += k; ctx.play('hit', 500 + typed.length * 60); if (typed === 'release') finish(); } else { typed = ''; ctx.play('error'); } }
  });
  ctx.on(window, 'keyup', e => { keys[e.key.toLowerCase()] = false; });
  ctx.keys(e => { if (e.key === 'Escape' && state !== 'title' && state !== 'win') setPause(!paused); });
  ctx.on(bombBtn, 'click', e => { e.stopPropagation(); bomb(); });
  ctx.on(relBtn, 'click', e => { e.stopPropagation(); if (state === 'finisher') finish(); });
  function toggleCalm() { calm = !calm; if (calm) usedCalm = true; stage.querySelectorAll('[data-a=calm]').forEach(b => b.setAttribute('aria-pressed', String(calm))); ctx.play('toggle'); }
  function setPause(v) { paused = v; pauseBox.hidden = !v; ctx.play('toggle'); }
  ctx.on(ui, 'click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return; e.stopPropagation(); const a = b.dataset.a;
    if (a === 'calm') toggleCalm();
    if (a === 'pause' && state !== 'title') setPause(true); if (a === 'exit') ctx.exit();
  });
  ctx.on(pauseBox, 'click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'resume') setPause(false); if (a === 'calm') toggleCalm(); if (a === 'exit') ctx.exit(); });

  /* ───── Inicio y final ───── */
  function begin() { if (state !== 'title') return; ctx.play('go'); deaths = 0; hits = 0; fightMs = 0; P = null; startPhase(0, false); }
  function finish() {
    if (state !== 'finisher') return; state = 'win'; relBtn.hidden = true; ended = true; ctx.play('win'); shake = .8;
    for (let i = 0; i < 6; i++) boom(E.x + rnd(-60, 60) * u, E.y + rnd(-40, 40) * u, [C.main, C.ok, C.warn, C.pink, C.white][i % 5], 60, 420, 1.4);
    const secs = fightMs / 1000;
    let score = 50 + Math.round(20 * clamp(1 - deaths / 6, 0, 1)) + Math.round(20 * clamp(1 - hits / 20, 0, 1)) + Math.round(10 * clamp((480 - secs) / 300, 0, 1));
    if (usedCalm) score = Math.round(score * .75); score = clamp(score, 1, 100);
    const mm = Math.floor(secs / 60), ss = Math.floor(secs % 60);
    ctx.end({ score, win: true, delay: 1800, html: () => `<div class="mid">${t('RELEASE 1.0 DESPLEGADO', 'RELEASE 1.0 DEPLOYED')}</div><div class="big">${score}<span class="of"> /100</span></div>
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
  E = { x: cx, y: H * .36, hp: 1, max: 1, r: 70 * u, flash: 0, lid: 1, shield: false, pulse: 0, aim: -1.4, dead: false, dmg: 1 };
  ctx.loop(dt => {
    const s = Math.min(.05, dt / 1000);
    if (state === 'title') { T += s; E.aim = Math.sin(T * .8) * 1.2 - 1.4; }
    else if (!paused && !ended) update(s);
    else if (state === 'win') { T += s; for (const q of ps) { q.l -= s; q.x += q.vx * s; q.y += q.vy * s; } ps = ps.filter(q => q.l > 0); shake = Math.max(0, shake - s); }
    draw();
  });
});
