/* Pulse — círculos con anillo de aproximación, rachas, multiplicador y velocidad progresiva */
DCArcade.define('pulse', ctx => {
  const C = ctx.canvas(800, 500), { g, cv, w, h } = C;
  const R = 46, WIN = 200;
  // Melodía de 16 notas (A4 C5 E5 E5 F5 E5 D5 C5 G5 E5 F5 G5 A5 G5 E5 C5): suena la que corresponde a cada círculo; si fallas uno, queda un hueco en la melodía
  const TUNE = [440, 523.25, 659.25, 659.25, 698.46, 659.25, 587.33, 523.25, 783.99, 659.25, 698.46, 783.99, 880, 783.99, 659.25, 523.25];
  let ptr = null;   // última posición del puntero (en coordenadas del lienzo): el teclado solo «hace clic» ahí, no acierta solo
  let now = 0, wall = performance.now(), spawnT = 1500, spawned = 0;
  let hp = 100, score = 0, combo = 0, maxCombo = 0, hits = 0, ended = false, last = { x: w / 2, y: h / 2 };
  const notes = [], pops = [];
  const bpmAt = n => Math.min(172, 92 + n * 1.5);
  const apAt = n => Math.max(480, 1150 - n * 10);
  const mult = () => 1 + Math.min(7, Math.floor(combo / 8));
  const hud = () => ctx.hud(`x${mult()} · ${ctx.t('racha', 'combo')} ${combo} · ${score.toLocaleString('es-MX')}`);

  function spawn() {
    while (spawnT < now + 2800) {
      const beat = 60000 / bpmAt(spawned);
      let x, y, k = 0;
      do { x = R + 40 + Math.random() * (w - 2 * (R + 40)); y = R + 50 + Math.random() * (h - 2 * (R + 50)); k++; }
      while (k < 12 && Math.hypot(x - last.x, y - last.y) < 190);
      last = { x, y };
      notes.push({ x, y, t: spawnT, ap: apAt(spawned), n: spawned + 1, s: 0, tk: false, at: 0 });
      spawned++;
      spawnT += (spawned > 10 && spawned % 8 === 0) ? beat / 2 : beat;
    }
  }
  const gameNow = () => now + (performance.now() - wall);
  // Un toque que no acierta (fuera del círculo o antes de tiempo) rompe la racha y resta energía: spamear ya no funciona
  function stray(px, py, txt) {
    combo = 0; hp -= 5; pops.push({ x: px, y: py, t: now, txt, c: '#ff7a90' }); ctx.play('error'); hud();
    if (hp <= 0) finish();
  }
  function tap(px, py, touch) {
    if (ended || px == null) return;
    const n = notes.find(k => k.s === 0); if (!n) return;
    const dt = gameNow() - n.t, inside = Math.hypot(px - n.x, py - n.y) <= R * (touch ? 1.9 : 1.35);
    if (!inside) return stray(px, py - 26, 'AIM');
    if (dt < -WIN) return stray(n.x, n.y - R - 10, 'EARLY');
    const a = Math.abs(dt);
    const kind = a <= 50 ? 0 : a <= 110 ? 1 : 2;
    n.s = 1; n.at = now; combo++; hits++; maxCombo = Math.max(maxCombo, combo);
    score += [300, 150, 50][kind] * mult();
    hp = Math.min(100, hp + [3, 1.5, 0][kind]);
    pops.push({ x: n.x, y: n.y, t: now, txt: ['PERFECT', 'GOOD', 'OK'][kind], c: ['#f1e4ff', '#df9de7', '#b88af1'][kind] });
    const f = TUNE[(n.n - 1) % TUNE.length];
    ctx.play('hit', f); if (kind === 0) ctx.tone(f * 2, .1, 'sine', .03);
    C.burst(n.x, n.y, { n: kind === 0 ? 18 : 10, speed: .35 });
    if (combo % 25 === 0) { ctx.shake(); ctx.play('win'); }
    hud();
  }
  function miss(n) {
    n.s = 2; n.at = now; combo = 0; hp -= 20;
    pops.push({ x: n.x, y: n.y, t: now, txt: 'MISS', c: '#ff7a90' });
    ctx.play('miss'); ctx.shake(); hud();
    if (hp <= 0) finish();
  }
  let stop = () => {};
  function finish() {
    if (ended) return; ended = true; draw(); stop();
    ctx.stat('hits', hits);
    ctx.end({ score, title: ctx.t('Sin energía', 'Out of energy'), text: ctx.t(`Mejor racha ${maxCombo} · ${hits} aciertos · ${Math.round(bpmAt(spawned))} bpm`, `Best streak ${maxCombo} · ${hits} hits · ${Math.round(bpmAt(spawned))} bpm`) });
  }
  function draw() {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(211,183,255,.14)'; g.fillRect(0, 0, w, 5);
    g.fillStyle = hp > 35 ? '#b88af1' : '#ff7a90'; g.fillRect(0, 0, w * Math.max(0, hp) / 100, 5);
    g.font = '600 12px "JetBrains Mono",monospace'; g.fillStyle = 'rgba(211,183,255,.5)'; g.textAlign = 'left';
    g.fillText(`${Math.round(bpmAt(spawned))} bpm`, 14, h - 14);
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i], age = now - (n.t - n.ap);
      if (age < 0) continue;
      if (n.s === 0) {
        const p = Math.max(0, Math.min(1, (n.t - now) / n.ap)), al = Math.min(1, age / 180);
        g.globalAlpha = al;
        g.fillStyle = 'rgba(140,91,196,.4)'; g.beginPath(); g.arc(n.x, n.y, R, 0, 6.283); g.fill();
        g.lineWidth = i === notes.findIndex(k => k.s === 0) ? 4 : 2.5; g.strokeStyle = '#d3b7ff'; g.stroke();
        g.lineWidth = 2; g.strokeStyle = '#df9de7'; g.beginPath(); g.arc(n.x, n.y, R + p * R * 2.6, 0, 6.283); g.stroke();
        g.fillStyle = '#f3eff8'; g.font = '700 22px Unbounded,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String((n.n - 1) % 4 + 1), n.x, n.y + 1);
        g.globalAlpha = 1;
      } else {
        const a = (now - n.at) / 320; if (a > 1) continue;
        g.globalAlpha = 1 - a; g.lineWidth = 3; g.strokeStyle = n.s === 1 ? '#d3b7ff' : '#ff7a90';
        g.beginPath(); g.arc(n.x, n.y, R + a * 40, 0, 6.283); g.stroke(); g.globalAlpha = 1;
      }
    }
    g.textBaseline = 'alphabetic'; g.textAlign = 'center';
    for (const p of pops) {
      const a = (now - p.t) / 650; if (a > 1) continue;
      g.globalAlpha = 1 - a; g.fillStyle = p.c; g.font = '700 16px Unbounded,sans-serif';
      g.fillText(p.txt, p.x, p.y - R - 10 - a * 30);
    }
    g.globalAlpha = 1;
  }
  ctx.on(cv, 'pointermove', e => { ptr = C.pos(e); });
  ctx.on(cv, 'pointerdown', e => { e.preventDefault(); ptr = C.pos(e); tap(ptr.x, ptr.y, e.pointerType === 'touch'); });
  ctx.keys(e => { if (!e.repeat && [' ', 'z', 'x', 'Z', 'X'].includes(e.key) && ptr) tap(ptr.x, ptr.y); });   // teclas = clic donde está el puntero
  draw(); hud();
  ctx.countdown(() => {
    wall = performance.now();
    stop = ctx.loop(dt => {
      if (ended) return;
      now += dt; wall = performance.now(); spawn();
      for (const n of notes) {
        if (n.s === 0 && !n.tk && now >= n.t) { n.tk = true; ctx.play('kick'); }
        if (n.s === 0 && now - n.t > WIN) miss(n);
        if (ended) return;
      }
      while (notes.length && notes[0].s !== 0 && now - notes[0].at > 700) notes.shift();
      while (pops.length && now - pops[0].t > 700) pops.shift();
      draw();
    });
  });
});
