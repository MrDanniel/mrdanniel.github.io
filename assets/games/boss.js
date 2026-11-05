/* Release 1.0 — jefe final en tres fases. Un solo control: arrastra la nave; dispara sola. */
DCArcade.define('boss', ctx => {
  const t = ctx.t, W = 640, H = 560, C = ctx.canvas(W, H), { g, cv } = C;
  const PHASES = [
    { name: 'Merge conflict', hp: 40, c: '#b88af1' },
    { name: 'Memory leak', hp: 45, c: '#df9de7' },
    { name: 'Production down', hp: 50, c: '#f2c58e' }
  ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let ph = 0, attempts = 1, hits = 0, dmg = 0, fightMs = 0, usedCalm = false, calm = false, ended = false, stop;
  let state = 'intro', stT = 0, T = 0;
  let P, B, bullets, foes, snakes, rings, cols, nextA, nextB, fireT;
  const calmBtn = document.createElement('button'); calmBtn.type = 'button'; calmBtn.className = 'boss-calm'; calmBtn.setAttribute('aria-pressed', 'false'); calmBtn.textContent = t('Modo tranquilo', 'Calm mode');
  ctx.stage.appendChild(calmBtn);
  ctx.on(calmBtn, 'click', e => { e.stopPropagation(); calm = !calm; if (calm) usedCalm = true; calmBtn.setAttribute('aria-pressed', String(calm)); ctx.play('toggle'); });
  const sc = () => calm ? .7 : 1;
  function resetPhase() {
    P = { x: W / 2, y: H - 70, hp: 3, inv: 0, tx: W / 2, ty: H - 70 };
    B = { x: W / 2, y: 96, hp: Math.round(PHASES[ph].hp * (calm ? .75 : 1)), max: 0, flash: 0 }; B.max = B.hp;
    bullets = []; foes = []; snakes = []; rings = []; cols = []; nextA = 900; nextB = 1500; fireT = 0; T = 0;
    state = 'intro'; stT = 1500; hud(); ctx.play('open');
  }
  const hud = () => ctx.hud(`${t('fase', 'phase')} ${ph + 1}/3 · ${'●'.repeat(Math.max(0, P.hp))}${'○'.repeat(3 - Math.max(0, P.hp))} · ${t('intento', 'try')} ${attempts}`);
  function hurt() {
    if (P.inv > 0 || state !== 'fight') return;
    P.hp--; P.inv = 1300; hits++; ctx.shake(); ctx.play('miss'); C.burst(P.x, P.y, { n: 18, speed: .4, color: ['#ff7a90', '#f2c58e'] }); hud();
    if (P.hp <= 0) { attempts++; ctx.play('over'); resetPhase(); }
  }
  function spawnPhase(dt) {
    const k = sc();
    if (ph === 0) {
      nextA -= dt; if (nextA <= 0) { nextA = 1400 / k; snakes.push({ age: 0, x0: B.x, dir: Math.random() < .5 ? 1 : -1, amp: 70 + Math.random() * 60 }); }
    } else if (ph === 1) {
      nextA -= dt; if (nextA <= 0) { nextA = 950 / k; rings.push({ x: 70 + Math.random() * (W - 140), y: H - 260 + Math.random() * 190, age: 0, r: 62 }); ctx.play('step'); }
    } else {
      nextA -= dt; if (nextA <= 0) {
        nextA = 1500 / k; const n = 2 + (B.hp < B.max * .5 ? 1 : 0), set = new Set();
        while (set.size < n) set.add(Math.random() * 8 | 0);
        set.forEach(i => cols.push({ i, age: 0 })); ctx.play('step');
      }
      nextB -= dt; if (nextB <= 0) { nextB = 1800 / k; for (const a of [-.35, 0, .35]) foes.push({ x: B.x, y: B.y + 40, vx: Math.sin(a) * .2 * k, vy: .24 * k, r: 6 }); }
    }
  }
  function update(dt) {
    T += dt;
    P.inv = Math.max(0, P.inv - dt); B.flash = Math.max(0, B.flash - dt);
    P.x += clamp(P.tx - P.x, -.8 * dt, .8 * dt); P.y += clamp(P.ty - P.y, -.8 * dt, .8 * dt);
    P.x = clamp(P.x, 16, W - 16); P.y = clamp(P.y, H - 200, H - 36);
    const sp = [180, 120, 70][ph]; B.x = W / 2 + Math.sin(T / (ph === 0 ? 1100 : 1500)) * sp;
    if (state === 'intro') { stT -= dt; if (stT <= 0) { state = 'fight'; ctx.play('go'); } return; }
    fightMs += dt;
    fireT -= dt; if (fireT <= 0) { fireT = 230; bullets.push({ x: P.x, y: P.y - 16 }); ctx.play('flap'); }
    for (const b of bullets) {
      b.y -= .9 * dt;
      if (Math.abs(b.x - B.x) < 68 && Math.abs(b.y - B.y) < 42 && !b.dead) {
        b.dead = true; B.hp--; B.flash = 70; dmg += 10; C.burst(b.x, b.y, { n: 3, speed: .25, size: 3, color: [PHASES[ph].c] }); ctx.play('hit', 500 + B.hp * 6);
      }
    }
    bullets = bullets.filter(b => !b.dead && b.y > -10);
    spawnPhase(dt);
    const k = sc();
    for (const s of snakes) {
      s.age += dt;
      for (let i = 0; i < 7; i++) {
        const x = s.x0 + Math.sin(s.age * .004 * k - i * .55) * s.amp * s.dir + 0, y = 130 + s.age * .17 * k - i * 24;
        if (Math.hypot(x - P.x, y - P.y) < 17) hurt();
      }
    }
    snakes = snakes.filter(s => 130 + s.age * .17 * k - 6 * 24 < H + 30);
    for (const r of rings) {
      r.age += dt;
      if (r.age > 900 && !r.boom) { r.boom = true; ctx.play('kick'); ctx.shake(); }
      if (r.age > 900 && r.age < 1200 && Math.hypot(r.x - P.x, r.y - P.y) < r.r + 6) hurt();
    }
    rings = rings.filter(r => r.age < 1250);
    for (const c of cols) {
      c.age += dt;
      if (c.age > 800 && !c.boom) { c.boom = true; ctx.play('kick'); }
      if (c.age > 800 && c.age < 1080 && Math.abs(P.x - (c.i + .5) * W / 8) < W / 16 - 3) hurt();
    }
    cols = cols.filter(c => c.age < 1100);
    for (const f of foes) { f.x += f.vx * dt; f.y += f.vy * dt; if (Math.hypot(f.x - P.x, f.y - P.y) < f.r + 9) { f.dead = true; hurt(); } }
    foes = foes.filter(f => !f.dead && f.y < H + 20 && f.x > -20 && f.x < W + 20);
    if (B.hp <= 0) {
      C.burst(B.x, B.y, { n: 50, speed: .6, size: 5, color: [PHASES[ph].c, '#f1e4ff'] }); ctx.shake(); ctx.play('win');
      if (ph === 2) return victory();
      ph++; attempts = attempts; resetPhase();
    }
  }
  function victory() {
    ended = true; stop(); draw();
    let s = 3000 - hits * 100 - (attempts - 1) * 400 - Math.floor(fightMs / 1000) * 4;
    s = Math.max(400, s) + dmg; if (usedCalm) s = Math.round(s * .6);
    ctx.end({ score: s, win: true, title: t('Release 1.0 desplegado', 'Release 1.0 shipped'), text: t(`${hits} golpes recibidos · ${attempts} intentos${usedCalm ? ' · modo tranquilo' : ''}`, `${hits} hits taken · ${attempts} tries${usedCalm ? ' · calm mode' : ''}`), delay: 700 });
  }
  function drawBoss() {
    const c = PHASES[ph].c, x = B.x, y = B.y, w = Math.sin(T / 140) * 5;
    g.strokeStyle = c; g.lineWidth = 3;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + s * 40, y + (i - 1) * 18); g.lineTo(x + s * (80 + w), y + (i - 1) * 28 + (i % 2 ? w : -w)); g.lineTo(x + s * (96 + w), y + (i - 1) * 28 + 22); g.stroke(); }
    g.fillStyle = B.flash > 0 ? '#fff' : '#2a1f38'; g.strokeStyle = c; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, 62, 44, 0, 0, 6.283); g.fill(); g.stroke();
    g.fillStyle = c; g.beginPath(); g.arc(x - 20, y - 6, 8, 0, 6.283); g.arc(x + 20, y - 6, 8, 0, 6.283); g.fill();
    g.fillStyle = '#151515'; g.fillRect(x - 22, y - 8, 4, 4); g.fillRect(x + 18, y - 8, 4, 4);
    g.strokeStyle = c; g.beginPath(); g.moveTo(x - 14, y + 18); g.lineTo(x - 5, y + 24); g.lineTo(x + 5, y + 18); g.lineTo(x + 14, y + 24); g.stroke();
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    const k = sc(), pc = PHASES[ph].c;
    for (const c of cols) {
      const x = c.i * W / 8, boom = c.age > 800;
      g.fillStyle = boom ? pc : 'rgba(242,197,142,.14)'; g.globalAlpha = boom ? (1 - (c.age - 800) / 300) * .9 : .4 + Math.sin(c.age / 60) * .2;
      g.fillRect(x + 2, boom ? 0 : H - 130, W / 8 - 4, boom ? H : 130); g.globalAlpha = 1;
    }
    for (const r of rings) {
      const boom = r.age > 900;
      g.strokeStyle = pc; g.lineWidth = boom ? 4 : 2; g.globalAlpha = boom ? 1 - (r.age - 900) / 350 : Math.min(.9, r.age / 500);
      g.beginPath(); g.arc(r.x, r.y, boom ? r.r : r.r * (1.5 - r.age / 1800), 0, 6.283); if (boom) { g.fillStyle = pc; g.globalAlpha *= .55; g.fill(); g.globalAlpha = 1; } g.stroke(); g.globalAlpha = 1;
    }
    for (const s of snakes) for (let i = 0; i < 7; i++) {
      const x = s.x0 + Math.sin(s.age * .004 * k - i * .55) * s.amp * s.dir, y = 130 + s.age * .17 * k - i * 24;
      g.fillStyle = i === 0 ? '#f1e4ff' : pc; g.globalAlpha = 1 - i * .09; g.fillRect(x - 9, y - 9, 18, 18);
    }
    g.globalAlpha = 1;
    drawBoss();
    g.fillStyle = '#f1e4ff'; for (const b of bullets) g.fillRect(b.x - 2, b.y - 8, 4, 12);
    g.fillStyle = '#ff7a90'; for (const f of foes) { g.beginPath(); g.arc(f.x, f.y, f.r, 0, 6.283); g.fill(); }
    if (!(P.inv > 0 && Math.floor(P.inv / 80) % 2)) {
      g.fillStyle = '#d3b7ff'; g.beginPath(); g.moveTo(P.x, P.y - 16); g.lineTo(P.x + 13, P.y + 12); g.lineTo(P.x, P.y + 5); g.lineTo(P.x - 13, P.y + 12); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(211,183,255,.15)'; g.fillRect(40, 16, W - 80, 8);
    g.fillStyle = pc; g.fillRect(40, 16, (W - 80) * Math.max(0, B.hp) / B.max, 8);
    g.font = '600 12px "JetBrains Mono",monospace'; g.textAlign = 'left'; g.fillStyle = '#a9a1b3'; g.fillText(PHASES[ph].name, 40, 42);
    if (state === 'intro') {
      g.textAlign = 'center'; g.fillStyle = 'rgba(21,21,21,.55)'; g.fillRect(0, H / 2 - 50, W, 100);
      g.fillStyle = pc; g.font = '700 30px Unbounded,sans-serif'; g.fillText(`${t('FASE', 'PHASE')} ${ph + 1}`, W / 2, H / 2 - 4);
      g.fillStyle = '#f3eff8'; g.font = '600 16px "JetBrains Mono",monospace'; g.fillText(PHASES[ph].name, W / 2, H / 2 + 26);
    }
  }
  ctx.on(cv, 'pointermove', e => { const p = C.pos(e); P.tx = p.x; P.ty = p.y - 30; });
  ctx.on(cv, 'pointerdown', e => { e.preventDefault(); const p = C.pos(e); P.tx = p.x; P.ty = p.y - 30; });
  const dirs = { ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0], ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1] };
  ctx.keys(e => { const d = dirs[e.key]; if (d) { P.tx = clamp(P.tx + d[0] * 70, 16, W - 16); P.ty = clamp(P.ty + d[1] * 70, H - 200, H - 36); } });
  resetPhase(); draw();
  ctx.countdown(() => { stop = ctx.loop(dt => { if (ended) return; update(dt); if (!ended) draw(); }); });
});
