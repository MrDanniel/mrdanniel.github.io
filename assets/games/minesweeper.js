/* Buscaminas 9×9 — primer clic seguro, bandera por pulsación larga, despeje por acorde */
DCArcade.define('minesweeper', ctx => {
  const W = 9, H = 9, M = 10, T = W * H;
  const wrap = document.createElement('div'); wrap.className = 'ms-wrap';
  const mode = document.createElement('button'); mode.type = 'button'; mode.className = 'ms-mode'; mode.setAttribute('aria-pressed', 'false'); mode.textContent = ctx.t('Modo bandera: off', 'Flag mode: off');
  const grid = document.createElement('div'); grid.className = 'ms';
  wrap.append(mode, grid); ctx.stage.appendChild(wrap);
  const cells = Array.from({ length: T }, () => ({ mine: false, adj: 0, open: false, flag: false }));
  const els = cells.map((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ms-c'; b.dataset.i = i; b.setAttribute('aria-label', ctx.t('Casilla', 'Cell')); grid.appendChild(b); return b; });
  let started = false, over = false, flags = 0, opened = 0, t0 = 0, flagMode = false;
  const nb = i => { const x = i % W, y = i / W | 0, o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const a = x + dx, b = y + dy; if (a >= 0 && a < W && b >= 0 && b < H) o.push(b * W + a); } return o; };
  const secs = () => Math.max(1, Math.round((performance.now() - t0) / 1000));
  const hud = () => ctx.hud(`${ctx.t('minas', 'mines')} ${M - flags}` + (started ? ` · ${over ? '' : Math.round((performance.now() - t0) / 1000) + ' s'}` : ''));
  function paint(i) {
    const c = cells[i], e = els[i];
    e.className = 'ms-c' + (c.open ? ' open' : '') + (c.flag ? ' flag' : '') + (c.open && c.mine ? ' mine' : '') + (c.open && c.adj && !c.mine ? ' ms-' + c.adj : '');
    e.textContent = c.open && !c.mine && c.adj ? c.adj : '';
  }
  function seed(first) {
    const ban = new Set([first, ...nb(first)]); let n = 0;
    while (n < M) { const i = Math.random() * T | 0; if (!cells[i].mine && !ban.has(i)) { cells[i].mine = true; n++; } }
    cells.forEach((c, i) => { c.adj = nb(i).filter(j => cells[j].mine).length; });
  }
  function lose(i) {
    over = true; ctx.shake(); ctx.play('miss');
    const mines = cells.map((c, k) => k).filter(k => cells[k].mine).sort((a, b) => (a === i ? -1 : b === i ? 1 : 0));
    mines.forEach((k, n) => ctx.timeout(() => { cells[k].open = true; cells[k].flag = false; paint(k); ctx.play('pop'); ctx.at(els[k], { n: 8, speed: .3, color: ['#ff7a90', '#f2c58e'] }); }, n * 70));
    ctx.end({ score: null, record: false, title: ctx.t('Mina', 'Mine'), text: ctx.t('Revisa los números con calma.', 'Take the numbers slowly.'), delay: mines.length * 70 + 500 });
  }
  function reveal(i) {
    if (over) return; const c = cells[i]; if (c.open || c.flag) return;
    if (!started) { seed(i); started = true; t0 = performance.now(); ctx.interval(hud, 500); }
    if (c.mine) { c.open = true; paint(i); return lose(i); }
    const q = [i];
    while (q.length) { const k = q.pop(), d = cells[k]; if (d.open || d.flag || d.mine) continue; d.open = true; opened++; paint(k); if (!d.adj) nb(k).forEach(j => { if (!cells[j].open) q.push(j); }); }
    ctx.play('step');
    if (opened === T - M) win();
  }
  function win() {
    over = true; const s = secs(); cells.forEach((c, k) => { if (c.mine) { c.flag = true; paint(k); } }); flags = M; hud();
    ctx.at(grid, { n: 40, speed: .5 }); ctx.end({ score: s, win: true, title: ctx.t('Campo despejado', 'Field cleared'), text: ctx.t('Sin una sola mina pisada.', 'Not a single mine stepped on.'), delay: 400 });
  }
  function flag(i) { const c = cells[i]; if (over || c.open) return; if (!c.flag && flags >= M) return; c.flag = !c.flag; flags += c.flag ? 1 : -1; paint(i); ctx.play('pop'); hud(); }
  function chord(i) {
    const c = cells[i]; if (!c.open || !c.adj) return;
    const n = nb(i); if (n.filter(j => cells[j].flag).length !== c.adj) return;
    n.forEach(j => { if (!cells[j].flag && !cells[j].open) reveal(j); });
  }
  function act(i) { const c = cells[i]; if (flagMode) return flag(i); if (c.open) chord(i); else reveal(i); }
  let lp = null, pressed = false, pi = -1, ptype = 'mouse';
  ctx.on(grid, 'pointerdown', e => {
    const b = e.target.closest('.ms-c'); if (!b || e.button === 2) return;
    ptype = e.pointerType; pi = +b.dataset.i; pressed = false;
    if (e.pointerType !== 'mouse') lp = setTimeout(() => { pressed = true; flag(pi); navigator.vibrate?.(15); }, 380);
  });
  ctx.on(grid, 'pointerup', e => {
    clearTimeout(lp); const b = e.target.closest('.ms-c');
    if (b && !pressed && e.button !== 2 && +b.dataset.i === pi) act(pi);
    pi = -1;
  });
  ctx.on(grid, 'pointerleave', () => { clearTimeout(lp); pi = -1; });
  ctx.on(grid, 'contextmenu', e => { e.preventDefault(); if (ptype !== 'mouse') return; const b = e.target.closest('.ms-c'); if (b) flag(+b.dataset.i); });
  ctx.on(mode, 'click', () => { flagMode = !flagMode; mode.setAttribute('aria-pressed', String(flagMode)); mode.textContent = ctx.t('Modo bandera: ', 'Flag mode: ') + (flagMode ? 'on' : 'off'); ctx.play('toggle'); });
  ctx.keys(() => {}, { prevent: false });
  hud();
});
