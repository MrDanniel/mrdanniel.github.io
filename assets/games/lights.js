/* Lights Out 5×5 — tableros siempre resolubles; el récord son los movimientos mínimos */
DCArcade.define('lights', ctx => {
  const t = ctx.t, N = 5;
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:grid;justify-items:center;width:100%';
  const bar = document.createElement('div'); bar.className = 'lo-bar';
  bar.innerHTML = `<span data-m></span><button type="button" data-r>${t('Nuevo tablero', 'New board')}</button>`;
  const grid = document.createElement('div'); grid.className = 'lo';
  wrap.append(bar, grid); ctx.stage.appendChild(wrap);
  let on = Array(N * N).fill(false), moves = 0, done = false;
  const cells = on.map((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'lo-c'; b.dataset.i = i; b.setAttribute('aria-label', t('Casilla', 'Cell')); grid.appendChild(b); return b; });
  const nb = i => { const x = i % N, y = i / N | 0, o = [i]; if (x > 0) o.push(i - 1); if (x < N - 1) o.push(i + 1); if (y > 0) o.push(i - N); if (y < N - 1) o.push(i + N); return o; };
  const flip = i => nb(i).forEach(j => { on[j] = !on[j]; });
  const paint = () => cells.forEach((c, i) => c.classList.toggle('on', on[i]));
  const hud = () => { const txt = t('movimientos ', 'moves ') + moves; ctx.hud(txt); bar.firstChild.textContent = txt; };
  function scramble() {
    do {
      on.fill(false); moves = 0; done = false;
      const idx = [...Array(N * N).keys()].sort(() => Math.random() - .5).slice(0, 9);   // 9 pulsaciones distintas: óptimo ≤ 9
      idx.forEach(flip);
    } while (!on.some(Boolean));
    paint(); hud();
  }
  function press(i) {
    if (done) return;
    flip(i); moves++; paint(); hud(); ctx.play('hit', 300 + (moves % 8) * 45);
    ctx.at(cells[i], { n: 6, speed: .25, size: 3 });
    if (!on.some(Boolean)) {
      done = true; ctx.play('win'); ctx.at(grid, { n: 40, speed: .5 });
      ctx.end({ score: moves, win: true, title: t('Todo apagado', 'All lights out'), text: t('Menos movimientos, mejor récord.', 'Fewer moves, better record.'), delay: 450 });
    }
  }
  ctx.on(grid, 'pointerdown', e => { const b = e.target.closest('.lo-c'); if (b) { e.preventDefault(); press(+b.dataset.i); } });
  ctx.on(bar.querySelector('[data-r]'), 'click', () => { ctx.play('click'); scramble(); });
  ctx.keys(() => {}, { prevent: false });
  scramble();
});
