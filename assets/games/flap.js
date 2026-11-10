/* Flap — vuelo entre obstáculos con dificultad progresiva */
DCArcade.define('flap', ctx => {
  const W = 360, H = 540, C = ctx.canvas(W, H), { g, cv } = C;
  const GY = H - 48, BX = 96, BR = 13, PW = 58, GRAV = 1500, FLAP = -430;
  let by = H / 2, vy = 0, pipes = [], score = 0, off = 0, ended = false, active = false, time = 0;
  const flap = () => { if (!active || ended) return; vy = FLAP; ctx.play('flap'); };
  ctx.on(cv, 'pointerdown', e => { e.preventDefault(); flap(); });
  ctx.keys(e => { if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key) && !e.repeat) flap(); });
  let stop;
  function die() {
    ended = true; draw(); stop(); ctx.shake(); ctx.play('miss');
    C.burst(BX, by, { n: 26, speed: .45, color: ['#ff7a90', '#f2c58e', '#d3b7ff'] });
    ctx.end({ score, title: ctx.t('Colisión', 'Crash'), text: score ? '' : ctx.t('Los tubos no se apartan solos.', 'Pipes do not move aside on their own.') });
  }
  function update(dt) {
    const s = dt / 1000, spd = 170 + Math.min(90, score * 4), gap = Math.max(128, 162 - score * 1.5);
    time += dt; off = (off + spd * s) % 40;
    vy = Math.min(620, vy + GRAV * s); by += vy * s;
    if (by < BR) { by = BR; vy = 0; }
    if (by > GY - BR) return die();
    if (!pipes.length || pipes[pipes.length - 1].x < W - 230) pipes.push({ x: W + 20, top: 60 + Math.random() * (GY - gap - 120), gap, ok: false });
    for (const p of pipes) {
      p.x -= spd * s;
      if (BX + BR > p.x && BX - BR < p.x + PW && (by - BR < p.top || by + BR > p.top + p.gap)) return die();
      if (!p.ok && p.x + PW < BX - BR) { p.ok = true; score++; ctx.hud(`${ctx.t('tubos', 'pipes')} ${score}`); ctx.play('score'); }
    }
    pipes = pipes.filter(p => p.x > -PW - 10);
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(211,183,255,.08)'; g.lineWidth = 1;
    for (let y = 40; y < GY; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (const p of pipes) {
      g.fillStyle = 'rgba(140,91,196,.45)'; g.strokeStyle = '#b88af1'; g.lineWidth = 2;
      g.fillRect(p.x, 0, PW, p.top); g.strokeRect(p.x, -2, PW, p.top + 2);
      g.fillRect(p.x, p.top + p.gap, PW, GY - p.top - p.gap); g.strokeRect(p.x, p.top + p.gap, PW, GY - p.top - p.gap);
      g.fillStyle = '#d3b7ff'; g.fillRect(p.x - 4, p.top - 12, PW + 8, 12); g.fillRect(p.x - 4, p.top + p.gap, PW + 8, 12);
    }
    g.strokeStyle = '#d3b7ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, GY); g.lineTo(W, GY); g.stroke();
    g.strokeStyle = 'rgba(211,183,255,.35)'; g.lineWidth = 1;
    for (let x = -off; x < W; x += 40) { g.beginPath(); g.moveTo(x, GY); g.lineTo(x - 14, H); g.stroke(); }
    const bob = active ? 0 : Math.sin(time / 200) * 5;
    g.save(); g.translate(BX, by + bob); g.rotate(Math.max(-.5, Math.min(1, vy / 700)));
    g.fillStyle = '#f1e4ff'; g.beginPath(); g.arc(0, 0, BR, 0, 6.283); g.fill();
    g.fillStyle = '#8c5bc4'; g.beginPath(); g.ellipse(-3, 3, 7, 4, -.4, 0, 6.283); g.fill();
    g.fillStyle = '#151515'; g.fillRect(4, -5, 4, 4); g.fillStyle = '#df9de7'; g.fillRect(BR - 2, -1, 7, 4);
    g.restore();
    g.fillStyle = 'rgba(243,239,248,.9)'; g.font = '700 38px Unbounded,sans-serif'; g.textAlign = 'center'; g.fillText(String(score), W / 2, 62);
  }
  draw(); ctx.hud(ctx.t('tubos 0', 'pipes 0'));
  ctx.loop(dt => { if (!active) { time += dt; draw(); } });
  ctx.countdown(() => { active = true; vy = -300; stop = ctx.loop(dt => { if (ended) return; update(dt); if (!ended) draw(); }); });
});
