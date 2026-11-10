/* Breakout — ladrillos como bloques de código, potenciadores (ancho, lento, vida), niveles crecientes */
DCArcade.define('breakout', ctx => {
  const t = ctx.t, W = 640, H = 480, C = ctx.canvas(W, H), { g, cv } = C;
  const COLS = 10, BW = 56, BH = 20, GAP = 4, OX = (W - (COLS * (BW + GAP) - GAP)) / 2, OY = 60, BR = 7, PH = 12;
  const COL = ['#d3b7ff', '#b88af1', '#df9de7', '#8c5bc4', '#a96fd8'];
  let bricks = [], balls = [], drops = [], pw = 96, px = W / 2, tx = W / 2, lives = 3, score = 0, level = 1, slow = 0, wide = 0, stuck = true, ended = false, keyDir = 0, stop;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const speedBase = () => .36 + level * .03;
  function build() {
    bricks = []; const rows = Math.min(7, 4 + level);
    for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
      if (level > 1 && (r + c + level) % 7 === 0) continue;
      bricks.push({ x: OX + c * (BW + GAP), y: OY + r * (BH + GAP), hp: r < Math.floor(level / 2) + 1 ? 2 : 1, col: COL[r % 5], a: 1 });
    }
  }
  function launch() { balls = [{ x: px, y: H - 40, vx: (Math.random() - .5) * .25, vy: -speedBase() }]; stuck = true; }
  const hud = () => ctx.hud(`${score.toLocaleString()} · ${t('vidas', 'lives')} ${lives} · ${t('nivel', 'level')} ${level}`);
  function hitBrick(b, ball) {
    b.hp--; ball.last = b;
    score += 10 * level; ctx.play('hit', 300 + (b.y / 6)); C.burst(b.x + BW / 2, b.y + BH / 2, { n: 6, speed: .25, size: 3, color: [b.col] });
    if (b.hp <= 0) {
      b.dead = true; score += 20 * level; ctx.play('pop');
      if (Math.random() < .17) drops.push({ x: b.x + BW / 2, y: b.y, k: ['W', 'S', 'L'][Math.random() * 3 | 0] });
    }
    hud();
  }
  function update(dt) {
    pw = wide > 0 ? 150 : 96; wide = Math.max(0, wide - dt); slow = Math.max(0, slow - dt);
    keyDir && (tx += keyDir * .6 * dt);
    tx = clamp(tx, pw / 2, W - pw / 2); px += clamp(tx - px, -1.3 * dt, 1.3 * dt);
    const sp = slow > 0 ? .7 : 1;
    for (const ball of balls) {
      if (stuck) { ball.x = px; ball.y = H - 40; continue; }
      const steps = Math.ceil(dt / 5), d = dt / steps;
      for (let s = 0; s < steps; s++) {
        ball.x += ball.vx * d * sp; ball.y += ball.vy * d * sp;
        if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx); } if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy); }
        if (ball.vy > 0 && ball.y + BR >= H - 28 && ball.y + BR <= H - 28 + PH + 8 && Math.abs(ball.x - px) < pw / 2 + BR) {
          const a = clamp((ball.x - px) / (pw / 2), -1, 1) * 1.05, v = Math.min(.85, Math.hypot(ball.vx, ball.vy) + .008);
          ball.vx = Math.sin(a) * v; ball.vy = -Math.cos(a) * v; ball.y = H - 28 - BR; ctx.play('hit', 220);
        }
        for (const b of bricks) {
          if (b.dead) continue;
          const cx = clamp(ball.x, b.x, b.x + BW), cy = clamp(ball.y, b.y, b.y + BH), dx = ball.x - cx, dy = ball.y - cy;
          if (dx * dx + dy * dy < BR * BR) {
            if (Math.abs(dx) > Math.abs(dy)) ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx); else ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
            hitBrick(b, ball); break;
          }
        }
      }
    }
    bricks = bricks.filter(b => !b.dead);
    balls = balls.filter(b => b.y < H + BR * 2);
    if (!balls.length && !stuck) {
      lives--; ctx.play('miss'); ctx.shake(); hud();
      if (lives <= 0) { ended = true; draw(); stop(); return ctx.end({ score, title: t('Sin vidas', 'Out of lives'), text: t(`Nivel ${level}`, `Level ${level}`) }); }
      launch();
    }
    for (const dr of drops) {
      dr.y += .17 * dt;
      if (dr.y > H - 34 && dr.y < H - 14 && Math.abs(dr.x - px) < pw / 2 + 10) {
        dr.got = true; ctx.play('score');
        if (dr.k === 'W') wide = 12000; else if (dr.k === 'S') slow = 9000; else { lives = Math.min(5, lives + 1); hud(); }
        C.burst(dr.x, dr.y, { n: 14, speed: .35 });
      }
    }
    drops = drops.filter(d => !d.got && d.y < H + 20);
    if (!bricks.length) { level++; score += 200 * level; ctx.play('win'); ctx.shake(); build(); launch(); hud(); }
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    for (const b of bricks) {
      g.fillStyle = b.col; g.globalAlpha = b.hp > 1 ? 1 : .8; g.fillRect(b.x, b.y, BW, BH);
      g.fillStyle = 'rgba(21,21,21,.45)'; g.fillRect(b.x + 6, b.y + 6, BW * .5, 3); g.fillRect(b.x + 6, b.y + 12, BW * .28, 3);
      if (b.hp > 1) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(b.x + 1, b.y + 1, BW - 2, BH - 2); }
    }
    g.globalAlpha = 1;
    g.fillStyle = '#d3b7ff'; g.fillRect(px - pw / 2, H - 28, pw, PH);
    g.fillStyle = '#8c5bc4'; g.fillRect(px - pw / 2, H - 28, 6, PH); g.fillRect(px + pw / 2 - 6, H - 28, 6, PH);
    for (const ball of balls) { g.fillStyle = '#f1e4ff'; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, 6.283); g.fill(); }
    g.font = '700 14px "JetBrains Mono",monospace'; g.textAlign = 'center';
    for (const d of drops) { g.fillStyle = d.k === 'L' ? '#8ff0c8' : d.k === 'W' ? '#f2c58e' : '#df9de7'; g.fillRect(d.x - 11, d.y - 9, 22, 18); g.fillStyle = '#151515'; g.fillText(d.k, d.x, d.y + 5); }
    if (stuck && !ended) { g.fillStyle = 'rgba(211,183,255,.75)'; g.font = '600 13px "JetBrains Mono",monospace'; g.fillText(t('Toca o pulsa Espacio para lanzar', 'Tap or press Space to launch'), W / 2, H / 2 + 40); }
  }
  const release = () => { if (stuck && !ended) { stuck = false; ctx.play('go'); } };
  let toff = 0;   // en táctil la pala se arrastra en relativo: el dedo no la tapa ni la hace saltar
  ctx.on(cv, 'pointermove', e => { tx = C.pos(e).x + toff; });
  ctx.on(cv, 'pointerdown', e => { e.preventDefault(); const x = C.pos(e).x; toff = e.pointerType === 'touch' ? px - x : 0; tx = x + toff; release(); });
  ctx.keys(e => { if (e.key === ' ') release(); const d = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 }[e.key]; if (d) keyDir = d; });
  ctx.on(window, 'keyup', e => { if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) keyDir = 0; });
  build(); launch(); hud(); draw();
  ctx.countdown(() => { stop = ctx.loop(dt => { if (ended) return; update(dt); if (!ended) draw(); }); });
});
