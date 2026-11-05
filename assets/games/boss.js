/* Release 1.0 — jefe final en tres fases. Un solo control: arrastra la nave; dispara sola. */
DCArcade.define('boss', ctx => {
  const t = ctx.t, W = 640, H = 560, C = ctx.canvas(W, H), { g, cv } = C;
  const PHASES = [
    { name: 'Merge conflict', hp: 40, c: '#b88af1' },
    { name: 'Memory leak', hp: 45, c: '#df9de7' },
    { name: 'Production down', hp: 50, c: '#f2c58e' }
  ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const rnd = n => { const q = Math.sin(n * 127.1) * 43758.5453; return q - Math.floor(q); };
  let ph = 0, attempts = 1, hits = 0, dmg = 0, fightMs = 0, usedCalm = false, calm = false, ended = false, stop;
  let state = 'intro', stT = 0, T = 0, dyingT = 0, dieBurst = 0;
  let P, B, bullets, foes, snakes, rings, cols, nextA, nextB, fireT, debris;
  const calmBtn = document.createElement('button'); calmBtn.type = 'button'; calmBtn.className = 'boss-calm'; calmBtn.setAttribute('aria-pressed', 'false'); calmBtn.textContent = t('Modo tranquilo', 'Calm mode');
  ctx.stage.appendChild(calmBtn);
  ctx.on(calmBtn, 'click', e => { e.stopPropagation(); calm = !calm; if (calm) usedCalm = true; calmBtn.setAttribute('aria-pressed', String(calm)); ctx.play('toggle'); });
  const sc = () => calm ? .7 : 1;
  function resetPhase() {
    P = { x: W / 2, y: H - 70, hp: 3, inv: 0, tx: W / 2, ty: H - 70 };
    B = { x: W / 2, y: 96, drawY: -90, hp: Math.round(PHASES[ph].hp * (calm ? .75 : 1)), max: 0, flash: 0, sx: 0, sy: 0, plates: [true, true] }; B.max = B.hp;
    bullets = []; foes = []; snakes = []; rings = []; cols = []; debris = []; nextA = 900; nextB = 1500; fireT = 0; T = 0;
    state = 'intro'; stT = 1500; hud(); ctx.play('open');
  }
  const hud = () => ctx.hud(`${t('fase', 'phase')} ${ph + 1}/3 · ${'●'.repeat(Math.max(0, P.hp))}${'○'.repeat(3 - Math.max(0, P.hp))} · ${t('intento', 'try')} ${attempts}`);
  function hurt() {
    if (P.inv > 0 || state !== 'fight') return;
    P.hp--; P.inv = 1300; hits++; ctx.shake(); ctx.play('miss'); C.burst(P.x, P.y, { n: 18, speed: .4, color: ['#ff7a90', '#f2c58e'] }); hud();
    if (P.hp <= 0) { attempts++; ctx.play('over'); resetPhase(); }
  }
  const segPos = (s, i, k) => ({ x: s.x0 + Math.sin(s.age * .004 * k - i * .55) * s.amp * s.dir, y: 130 + s.age * .17 * k - i * 24 });
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
  function scrap(n, col) {   // restos de armadura / chispas
    for (let i = 0; i < n; i++) debris.push({ x: B.x + (Math.random() - .5) * 90, y: B.y + (Math.random() - .5) * 50, vx: (Math.random() - .5) * .35, vy: -Math.random() * .3, l: 700, r: 3 + Math.random() * 4, a: Math.random() * 6, c: col });
  }
  function update(dt) {
    T += dt;
    P.inv = Math.max(0, P.inv - dt); B.flash = Math.max(0, B.flash - dt);
    P.x += clamp(P.tx - P.x, -.8 * dt, .8 * dt); P.y += clamp(P.ty - P.y, -.8 * dt, .8 * dt);
    P.x = clamp(P.x, 16, W - 16); P.y = clamp(P.y, H - 200, H - 36);
    const sp = [180, 120, 70][ph]; B.x = W / 2 + Math.sin(T / (ph === 0 ? 1100 : 1500)) * sp;
    for (const d of debris) { d.l -= dt; d.vy += .0007 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.a += dt * .01; }
    debris = debris.filter(d => d.l > 0);
    if (state === 'intro') {
      stT -= dt; const q = Math.max(0, stT / 1500); B.drawY = 96 - 190 * q * q; if (stT <= 0) { state = 'fight'; ctx.play('go'); ctx.shake(); }
      return;
    }
    B.drawY = B.y + Math.sin(T / 480) * 4; B.sx = B.sy = 0;
    if (state === 'dying') {
      dyingT -= dt; B.sx = (Math.random() - .5) * 12; B.sy = (Math.random() - .5) * 8; dieBurst -= dt;
      if (dieBurst <= 0) { dieBurst = 90; C.burst(B.x + (Math.random() - .5) * 110, B.drawY + (Math.random() - .5) * 70, { n: 14, speed: .45, size: 5, color: [PHASES[ph].c, '#f1e4ff', '#ff7a90'] }); ctx.play('pop'); }
      if (dyingT <= 0) { if (ph === 2) return victory(); ph++; resetPhase(); }
      return;
    }
    fightMs += dt;
    fireT -= dt; if (fireT <= 0) { fireT = 230; bullets.push({ x: P.x, y: P.y - 16 }); ctx.play('flap'); }
    for (const b of bullets) {
      if (!b.dead && Math.abs(b.x - B.x) < 66 && b.y > B.drawY - 62 && b.y < B.drawY + 46) {
        b.dead = true; B.hp--; B.flash = 70; dmg += 10; C.burst(b.x, b.y, { n: 3, speed: .25, size: 3, color: [PHASES[ph].c] }); ctx.play('hit', 500 + B.hp * 6);
        const r = B.hp / B.max;
        if (B.plates[0] && r < .66) { B.plates[0] = false; scrap(14, PHASES[ph].c); ctx.shake(); ctx.play('kick'); }
        if (B.plates[1] && r < .33) { B.plates[1] = false; scrap(18, '#f1e4ff'); ctx.shake(); ctx.play('kick'); }
      }
      b.y -= .9 * dt;
    }
    bullets = bullets.filter(b => !b.dead && b.y > -10);
    spawnPhase(dt);
    const k = sc();
    for (const s of snakes) {
      s.age += dt;
      for (let i = 0; i < 7; i++) { const p = segPos(s, i, k); if (Math.hypot(p.x - P.x, p.y - P.y) < 17) hurt(); }
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
      state = 'dying'; dyingT = 1000; dieBurst = 0; P.inv = 5000; snakes = []; rings = []; cols = []; foes = []; ctx.play('win'); ctx.shake();
    }
  }
  function victory() {
    ended = true; stop(); draw();
    let s = 3000 - hits * 100 - (attempts - 1) * 400 - Math.floor(fightMs / 1000) * 4;
    s = Math.max(400, s) + dmg; if (usedCalm) s = Math.round(s * .6);
    const sub = t(`${hits} golpes recibidos · ${attempts} intentos${usedCalm ? ' · modo tranquilo' : ''}`, `${hits} hits taken · ${attempts} tries${usedCalm ? ' · calm mode' : ''}`);
    const hint = t('Toma una captura de pantalla para guardar tu resultado.', 'Take a screenshot to save your result.');
    ctx.end({
      score: s, win: true, title: t('Release 1.0 desplegado', 'Release 1.0 shipped'), text: sub, delay: 700,
      html: () => `<div class="mid">${t('Release 1.0 desplegado', 'Release 1.0 shipped')}</div>
        <img class="badge-img" alt="${t('Insignia de resultado', 'Result badge')}" src="${window.DCArcade.badge ? window.DCArcade.badge() : ''}">
        <small>${hint}</small><small>${t('Toca o pulsa Enter para repetir', 'Tap or press Enter to play again')}</small>`
    });
  }

  /* ───────── Dibujo ───────── */
  function drawBoss(alpha) {
    const c = PHASES[ph].c, hpr = B.hp / B.max, x = B.x + B.sx, y = B.drawY + B.sy, flash = B.flash > 0;
    const open = state === 'fight' ? clamp(1 - nextA / 380, 0, 1) : 0, rage = hpr < .33;
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.lineCap = 'round'; g.lineJoin = 'round';
    if (ph >= 1) for (const s of [-1, 1]) {            // alas translúcidas
      g.save(); g.rotate(s * (.55 + Math.sin(T / 70) * .18)); g.fillStyle = rgba(c, .16); g.strokeStyle = rgba(c, .55); g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(s * 52, -34, 14, 58, 0, 0, 6.283); g.fill(); g.stroke(); g.restore();
    }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {   // patas articuladas
      const p = T / 240 + i * .9 + (s > 0 ? Math.PI : 0), hx = s * (28 + i * 4), hy = -8 + i * 13;
      const kx = hx + s * (34 + Math.sin(p) * 6), ky = hy - 8 + Math.cos(p) * 6, fx = kx + s * (14 + Math.sin(p + 1) * 4), fy = ky + 34 + Math.sin(p + 1) * 5;
      g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.stroke();
      g.lineWidth = 3.5; g.beginPath(); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
      g.fillStyle = '#f1e4ff'; g.beginPath(); g.arc(kx, ky, 3.4, 0, 6.283); g.fill();
    }
    g.fillStyle = flash ? '#fff' : '#241a31'; g.strokeStyle = c; g.lineWidth = 3;              // abdomen
    g.beginPath(); g.ellipse(0, 30, 40, 32, 0, 0, 6.283); g.fill(); g.stroke();
    g.strokeStyle = rgba(c, .5); g.lineWidth = 2;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(0, 30, 40 - i * 8, 32 - i * 7, 0, .25, Math.PI - .25); g.stroke(); }
    const gr = g.createLinearGradient(0, -38, 0, 38); gr.addColorStop(0, '#3a2a4f'); gr.addColorStop(1, '#201729');   // tórax
    g.fillStyle = flash ? '#fff' : gr; g.strokeStyle = c; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 58, 38, 0, 0, 6.283); g.fill(); g.stroke();
    if (B.plates[0]) { g.strokeStyle = c; g.lineWidth = 8; g.beginPath(); g.ellipse(0, -2, 52, 32, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    if (B.plates[1]) { g.strokeStyle = '#f1e4ff'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 6, 44, 26, 0, Math.PI * .15, Math.PI * .85); g.stroke(); }
    const nc = Math.floor((1 - hpr) * 7);                                                  // grietas por daño
    g.strokeStyle = '#151515'; g.lineWidth = 2.2;
    for (let i = 0; i < nc; i++) { const a = i * .9 + .3, cx = Math.cos(a), cy = Math.sin(a); g.beginPath(); g.moveTo(cx * 10, cy * 8 + 6); g.lineTo(cx * 30 + 4, cy * 22 + 6); g.lineTo(cx * 46 - 3, cy * 30 + 8); g.stroke(); }
    // cabeza, ojos que siguen a la nave, antenas y mandíbulas
    g.fillStyle = flash ? '#fff' : '#2f2340'; g.strokeStyle = c; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, -42, 30, 22, 0, 0, 6.283); g.fill(); g.stroke();
    g.lineWidth = 2.5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 12, -60); g.quadraticCurveTo(s * (26 + Math.sin(T / 200) * 4), -84, s * (40 + Math.sin(T / 160) * 5), -78); g.stroke(); }
    const ec = rage ? '#ff7a90' : c, dx = clamp((P.x - x) / W * 8, -4, 4), dy = clamp((P.y - y) / H * 6, -2, 4);
    for (const s of [-1, 1]) {
      g.fillStyle = rgba(ec, .92); g.beginPath(); g.arc(s * 14, -44, 9.5, 0, 6.283); g.fill();
      g.fillStyle = '#151515'; g.beginPath(); g.arc(s * 14 + dx, -44 + dy, 3.8, 0, 6.283); g.fill();
      g.fillStyle = '#fff'; g.fillRect(s * 14 + dx - 2, -46 + dy, 2, 2);
    }
    if (open > 0) { const mg = g.createRadialGradient(0, -26, 0, 0, -26, 26); mg.addColorStop(0, rgba(c, .9 * open)); mg.addColorStop(1, rgba(c, 0)); g.fillStyle = mg; g.fillRect(-30, -52, 60, 52); }
    g.strokeStyle = '#f1e4ff'; g.lineWidth = 4;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 8, -28); g.quadraticCurveTo(s * (18 + open * 10), -16, s * (9 + open * 16), -6 + open * 5); g.stroke(); }
    // núcleo: punto débil que late y se enciende antes de atacar
    const pr = 9 + Math.sin(T / 180) * 1.6 + open * 4, cg = g.createRadialGradient(0, 8, 0, 0, 8, 38);
    cg.addColorStop(0, rgba(c, .75 + open * .2)); cg.addColorStop(1, rgba(c, 0)); g.fillStyle = cg; g.fillRect(-40, -30, 80, 76);
    g.fillStyle = flash ? '#fff' : '#fff7ff'; g.beginPath(); g.arc(0, 8, pr, 0, 6.283); g.fill();
    g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(0, 8, pr + 4, 0, 6.283); g.stroke();
    if (ph === 2) {                                                                        // fallo de producción: aberración y luces de alarma
      if (Math.floor(T / 90) % 3 === 0) { g.lineWidth = 2; g.strokeStyle = 'rgba(255,122,144,.4)'; g.beginPath(); g.ellipse(7, -2, 58, 38, 0, 0, 6.283); g.stroke(); g.strokeStyle = 'rgba(143,240,200,.35)'; g.beginPath(); g.ellipse(-7, 2, 58, 38, 0, 0, 6.283); g.stroke(); }
      for (const s of [-1, 1]) { g.fillStyle = `rgba(255,122,144,${.35 + .65 * Math.abs(Math.sin(T / 160 + (s > 0 ? 1.6 : 0)))})`; g.beginPath(); g.arc(s * 46, -22, 5, 0, 6.283); g.fill(); }
    }
    g.restore();
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    const k = sc(), pc = PHASES[ph].c;
    for (const c of cols) {                       // columnas: aviso con franjas y rayo láser
      const x = c.i * W / 8, w = W / 8 - 4, boom = c.age > 800;
      if (!boom) {
        const a = .35 + Math.sin(c.age / 55) * .2; g.save(); g.beginPath(); g.rect(x + 2, H - 130, w, 130); g.clip();
        g.fillStyle = rgba(pc, .1 * (1 + a)); g.fillRect(x + 2, H - 130, w, 130); g.strokeStyle = rgba(pc, a + .25); g.lineWidth = 6;
        for (let i = -130; i < w + 130; i += 24) { g.beginPath(); g.moveTo(x + 2 + i, H); g.lineTo(x + 2 + i + 130, H - 130); g.stroke(); } g.restore();
        g.strokeStyle = rgba(pc, a + .3); g.lineWidth = 2; g.strokeRect(x + 2, H - 130, w, 130);
      } else {
        const f = 1 - (c.age - 800) / 300, lg = g.createLinearGradient(x, 0, x + w, 0);
        lg.addColorStop(0, rgba(pc, 0)); lg.addColorStop(.3, rgba(pc, .85 * f)); lg.addColorStop(.5, `rgba(255,255,255,${.95 * f})`); lg.addColorStop(.7, rgba(pc, .85 * f)); lg.addColorStop(1, rgba(pc, 0));
        g.fillStyle = lg; g.fillRect(x + 2, 0, w, H);
      }
    }
    for (const r of rings) {                      // anillos: radar que converge y estalla
      if (r.age <= 900) {
        const q = r.age / 900, al = Math.min(.9, r.age / 400);
        g.strokeStyle = rgba(pc, al); g.lineWidth = 2; g.setLineDash([8, 7]); g.lineDashOffset = -r.age / 18; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 6.283); g.stroke(); g.setLineDash([]);
        g.strokeStyle = rgba('#f1e4ff', al * .8); g.lineWidth = 2; g.beginPath(); g.arc(r.x, r.y, r.r * (2 - q), 0, 6.283); g.stroke();
        g.lineWidth = 2; g.strokeStyle = rgba(pc, al); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.beginPath(); g.moveTo(r.x + ax * (r.r - 6), r.y + ay * (r.r - 6)); g.lineTo(r.x + ax * (r.r + 8), r.y + ay * (r.r + 8)); g.stroke(); }
        g.fillStyle = rgba(pc, al); g.beginPath(); g.arc(r.x, r.y, 3, 0, 6.283); g.fill();
      } else {
        const f = 1 - (r.age - 900) / 350, rg = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r);
        rg.addColorStop(0, `rgba(255,255,255,${.9 * f})`); rg.addColorStop(.5, rgba(pc, .7 * f)); rg.addColorStop(1, rgba(pc, .1 * f));
        g.fillStyle = rg; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 6.283); g.fill();
        g.strokeStyle = rgba(pc, f); g.lineWidth = 4; g.beginPath(); g.arc(r.x, r.y, r.r * (1 + (1 - f) * .3), 0, 6.283); g.stroke();
      }
    }
    for (const s of snakes) {                     // serpiente: cadena de nodos con cabeza y ojos
      let prev = null;
      for (let i = 6; i >= 0; i--) {
        const p = segPos(s, i, k), rr = i === 0 ? 11 : 9 - i * .45;
        if (prev) { g.strokeStyle = rgba(pc, .45); g.lineWidth = rr * 1.2; g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(p.x, p.y); g.stroke(); }
        const sg = g.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, rr); sg.addColorStop(0, i === 0 ? '#fff' : '#f1e4ff'); sg.addColorStop(1, pc);
        g.fillStyle = sg; g.beginPath(); g.arc(p.x, p.y, rr, 0, 6.283); g.fill();
        if (i === 0) { g.fillStyle = '#151515'; g.fillRect(p.x - 5, p.y - 1, 3, 3); g.fillRect(p.x + 2, p.y - 1, 3, 3); }
        prev = p;
      }
    }
    drawBoss(state === 'dying' ? clamp(dyingT / 350, 0, 1) : 1);
    for (const d of debris) { g.save(); g.translate(d.x, d.y); g.rotate(d.a); g.globalAlpha = Math.min(1, d.l / 300); g.fillStyle = d.c; g.fillRect(-d.r, -d.r / 2, d.r * 2, d.r); g.restore(); }
    g.globalAlpha = 1;
    g.shadowColor = '#d3b7ff'; g.shadowBlur = 6; g.fillStyle = '#f1e4ff'; for (const b of bullets) g.fillRect(b.x - 2, b.y - 9, 4, 14); g.shadowBlur = 0;
    for (const f of foes) {                       // proyectiles con estela
      for (let i = 3; i >= 1; i--) { g.fillStyle = `rgba(255,122,144,${.22 / i * 1.5})`; g.beginPath(); g.arc(f.x - f.vx * i * 30, f.y - f.vy * i * 30, f.r * (1 - i * .15), 0, 6.283); g.fill(); }
      const fg = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2.2); fg.addColorStop(0, '#fff'); fg.addColorStop(.35, '#ff7a90'); fg.addColorStop(1, 'rgba(255,122,144,0)');
      g.fillStyle = fg; g.beginPath(); g.arc(f.x, f.y, f.r * 2.2, 0, 6.283); g.fill();
    }
    if (!(P.inv > 0 && Math.floor(P.inv / 80) % 2)) {   // nave con motores
      g.fillStyle = `rgba(242,197,142,${.7 + Math.random() * .3})`; g.beginPath(); g.moveTo(P.x - 4, P.y + 10); g.lineTo(P.x, P.y + 18 + Math.random() * 8); g.lineTo(P.x + 4, P.y + 10); g.fill();
      g.fillStyle = '#d3b7ff'; g.beginPath(); g.moveTo(P.x, P.y - 18); g.lineTo(P.x + 6, P.y - 4); g.lineTo(P.x + 16, P.y + 12); g.lineTo(P.x + 7, P.y + 8); g.lineTo(P.x, P.y + 12); g.lineTo(P.x - 7, P.y + 8); g.lineTo(P.x - 16, P.y + 12); g.lineTo(P.x - 6, P.y - 4); g.closePath(); g.fill();
      g.fillStyle = '#21172b'; g.beginPath(); g.ellipse(P.x, P.y - 3, 2.6, 5, 0, 0, 6.283); g.fill();
    }
    g.fillStyle = 'rgba(211,183,255,.15)'; g.fillRect(40, 16, W - 80, 8);
    g.fillStyle = pc; g.fillRect(40, 16, (W - 80) * Math.max(0, B.hp) / B.max, 8);
    for (let i = 1; i < 3; i++) { g.fillStyle = 'rgba(21,21,21,.8)'; g.fillRect(40 + (W - 80) * i / 3 - 1, 14, 2, 12); }
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
