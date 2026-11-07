/* 2048 — lógica reescrita con fichas persistentes y animación por transform */
DCArcade.define('g2048', ctx => {
  const N = 4; let grid = Array.from({ length: N }, () => Array(N).fill(null)), tiles = [], score = 0, over = false, won = false;
  const wrap = document.createElement('div'); wrap.className = 'g48'; wrap.innerHTML = '<div class="g48-in"></div>'; ctx.stage.appendChild(wrap);
  const inn = wrap.firstChild;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const d = document.createElement('div'); d.className = 'g48-c'; d.style.setProperty('--r', r); d.style.setProperty('--c', c); inn.appendChild(d); }
  const coord = (d, i, j) => d === 0 ? [i, j] : d === 1 ? [j, i] : d === 2 ? [i, N - 1 - j] : [N - 1 - j, i];
  function paint(t) {
    t.el.textContent = t.v; t.el.style.setProperty('--r', t.r); t.el.style.setProperty('--c', t.c); t.el.style.setProperty('--k', Math.log2(t.v));
    t.el.classList.toggle('big', t.v >= 128 && t.v < 1024); t.el.classList.toggle('huge', t.v >= 1024); t.el.classList.toggle('hi', t.v >= 2048);
  }
  function add(r, c, v) {
    const el = document.createElement('div'); el.className = 'g48-t new';
    const t = { r, c, v, el, m: false }; paint(t); inn.appendChild(el); grid[r][c] = t; tiles.push(t);
  }
  function spawn() {
    const free = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) free.push([r, c]);
    if (!free.length) return; const [r, c] = free[Math.random() * free.length | 0]; add(r, c, Math.random() < .9 ? 2 : 4);
  }
  function canMove() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c]; if (!t) return true;
      if (c < N - 1 && grid[r][c + 1]?.v === t.v) return true;
      if (r < N - 1 && grid[r + 1][c]?.v === t.v) return true;
    }
    return false;
  }
  function move(d) {
    if (over) return;
    let moved = false, gain = 0; const dead = [], merged = [];
    for (let i = 0; i < N; i++) {
      const line = []; for (let j = 0; j < N; j++) line.push(coord(d, i, j));
      const ts = line.map(([r, c]) => grid[r][c]).filter(Boolean), out = [];
      for (const t of ts) {
        const m = out[out.length - 1];
        if (m && m.v === t.v && !m.m) { m.v *= 2; m.m = true; gain += m.v; t.into = m; dead.push(t); merged.push(m); } else out.push(t);
      }
      line.forEach(([r, c]) => { grid[r][c] = null; });
      out.forEach((t, j) => { const [r, c] = line[j]; if (t.r !== r || t.c !== c) moved = true; t.r = r; t.c = c; grid[r][c] = t; });
    }
    if (!moved && !dead.length) return;
    dead.forEach(t => { t.r = t.into.r; t.c = t.into.c; t.el.style.zIndex = 0; paint({ ...t, v: t.v, el: t.el }); setTimeout(() => t.el.remove(), 140); });
    tiles = tiles.filter(t => !dead.includes(t));
    tiles.forEach(t => { t.m = false; paint(t); });
    merged.forEach(t => { t.el.classList.remove('merge', 'new'); void t.el.offsetWidth; t.el.classList.add('merge'); });
    score += gain; ctx.hud(ctx.t('puntos ', 'points ') + score);
    if (gain) { ctx.play('score'); merged.forEach(t => ctx.at(t.el, { n: 5, speed: .25, size: 3 })); } else ctx.play('step');
    spawn();
    const max = Math.max(...tiles.map(t => t.v));
    if (!won && max >= 2048) { won = true; ctx.play('win'); DC.toast(ctx.t('2048 alcanzado. Puedes seguir jugando.', '2048 reached. You can keep playing.')); }
    if (!canMove()) {
      over = true; const st = ctx.stats(); st.maxTile = Math.max(st.maxTile || 0, max); ctx.stat('plays', 0);
      ctx.end({ score, title: ctx.t('Sin movimientos', 'No moves left'), text: ctx.t('Ficha máxima ', 'Highest tile ') + max, delay: 500 });
    }
  }
  const KEY = { ArrowLeft: 0, a: 0, A: 0, ArrowUp: 1, w: 1, W: 1, ArrowRight: 2, d: 2, D: 2, ArrowDown: 3, s: 3, S: 3 };
  ctx.keys(e => { if (e.key in KEY) move(KEY[e.key]); });
  let sx = 0, sy = 0, sd = false;
  ctx.on(wrap, 'pointerdown', e => { sx = e.clientX; sy = e.clientY; sd = true; });
  ctx.on(window, 'pointerup', e => {
    if (!sd) return; sd = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3));
  });
  spawn(); spawn(); ctx.hud(ctx.t('puntos 0', 'points 0'));
});
