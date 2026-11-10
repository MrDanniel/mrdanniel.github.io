/* Pong — 3 vidas, el rival mejora con cada punto */
DCArcade.define('pong', ctx => {
  const W = 640, H = 400, C = ctx.canvas(W, H), { g, cv } = C;
  const PW = 10, PH = 72, BR = 7, PX = 22;
  let py = H / 2, target = H / 2, ay = H / 2, aiErr = 0, keyDir = 0, lives = 3, pts = 0, serveT = 0, ended = false, time = 0;
  let ball; const trail = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hud = () => ctx.hud(`${ctx.t('puntos', 'points')} ${pts} · ${ctx.t('vidas', 'lives')} ${'■'.repeat(lives)}${'□'.repeat(3 - lives)}`);
  function serve() { const a = (Math.random() - .5) * .8; ball = { x: W / 2, y: H / 2, vx: -Math.cos(a) * .34, vy: Math.sin(a) * .34 }; serveT = 650; trail.length = 0; aiErr = 0; }
  serve();
  let toff = 0;   // en táctil la pala se arrastra en relativo
  ctx.on(cv, 'pointermove', e => { target = C.pos(e).y + toff; });
  ctx.on(cv, 'pointerdown', e => { const y = C.pos(e).y; toff = e.pointerType === 'touch' ? py - y : 0; target = y + toff; });
  ctx.keys(e => {
    const d = { ArrowUp: -1, w: -1, W: -1, ArrowDown: 1, s: 1, S: 1 }[e.key];
    if (d) keyDir = d;
  });
  ctx.on(window, 'keyup', e => { if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(e.key)) keyDir = 0; });
  let stop;
  function hit(dir, paddleY) {
    const sp = Math.min(.82, Math.hypot(ball.vx, ball.vy) * 1.06), a = clamp((ball.y - paddleY) / (PH / 2), -1, 1) * .95;
    ball.vx = dir * Math.cos(a) * sp; ball.vy = Math.sin(a) * sp;
    ctx.play('hit', dir > 0 ? 440 : 330);
    C.burst(ball.x, ball.y, { n: 8, speed: .25, size: 3 });
  }
  function update(dt) {
    keyDir && (target += keyDir * .7 * dt);
    target = clamp(target, PH / 2, H - PH / 2);
    py = clamp(py + clamp(target - py, -1.2 * dt, 1.2 * dt), PH / 2, H - PH / 2);
    const aiSp = Math.min(.5, .22 + pts * .014);
    const goal = ball.vx > 0 ? ball.y + aiErr : H / 2;
    ay = clamp(ay + clamp(goal - ay, -aiSp * dt, aiSp * dt), PH / 2, H - PH / 2);
    if (serveT > 0) { serveT -= dt; return; }
    const steps = Math.ceil(dt / 6), d = dt / steps;
    for (let i = 0; i < steps; i++) {
      ball.x += ball.vx * d; ball.y += ball.vy * d;
      if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy); }
      if (ball.y > H - BR) { ball.y = H - BR; ball.vy = -Math.abs(ball.vy); }
      if (ball.vx < 0 && ball.x - BR <= PX + PW && ball.x > PX && Math.abs(ball.y - py) < PH / 2 + BR) {
        ball.x = PX + PW + BR; hit(1, py);
        aiErr = (Math.random() - .5) * PH * Math.max(.25, 1.1 - pts * .05);
      }
      const rx = W - PX - PW;
      if (ball.vx > 0 && ball.x + BR >= rx && ball.x < rx + PW && Math.abs(ball.y - ay) < PH / 2 + BR) { ball.x = rx - BR; hit(-1, ay); }
      if (ball.x < -BR * 2) {
        lives--; ctx.play('miss'); ctx.shake(); hud();
        if (lives <= 0) { ended = true; draw(); stop(); ctx.end({ score: pts, title: ctx.t('Sin vidas', 'Out of lives'), text: pts ? ctx.t('El rival no dará tregua.', 'The rival will not ease up.') : ctx.t('Calentamiento completado.', 'Warm-up complete.') }); return; }
        serve(); return;
      }
      if (ball.x > W + BR * 2) { pts++; ctx.play('score'); hud(); C.burst(W - 30, ball.y, { n: 16, speed: .4 }); serve(); return; }
    }
    trail.push({ x: ball.x, y: ball.y }); if (trail.length > 8) trail.shift();
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(211,183,255,.2)'; g.setLineDash([8, 10]); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(211,183,255,.07)'; g.font = '700 120px Unbounded,sans-serif'; g.textAlign = 'center'; g.fillText(String(pts), W / 2, H / 2 + 42);
    g.fillStyle = '#d3b7ff'; g.fillRect(PX, py - PH / 2, PW, PH);
    g.fillStyle = '#8c5bc4'; g.fillRect(W - PX - PW, ay - PH / 2, PW, PH);
    trail.forEach((t, i) => { g.globalAlpha = i / trail.length * .35; g.fillStyle = '#df9de7'; g.beginPath(); g.arc(t.x, t.y, BR * i / trail.length, 0, 6.283); g.fill(); });
    g.globalAlpha = serveT > 0 && Math.floor(time / 90) % 2 ? .35 : 1;
    g.fillStyle = '#f1e4ff'; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, 6.283); g.fill(); g.globalAlpha = 1;
  }
  draw(); hud();
  ctx.countdown(() => { stop = ctx.loop(dt => { if (ended) return; time += dt; update(dt); if (!ended) draw(); }); });
});
