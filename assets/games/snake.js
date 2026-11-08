/* Snake — cuadrícula 20×20, velocidad progresiva, teclado o deslizamiento */
DCArcade.define('snake', ctx => {
  const N = 20, S = 21, C = ctx.canvas(N * S, N * S), { g, cv } = C;
  let snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }], dir = { x: 1, y: 0 }, queue = [], food, apples = 0, acc = 0, time = 0, ended = false;
  const speed = () => Math.max(66, 150 - apples * 2.6);
  const place = () => { let p; do { p = { x: Math.random() * N | 0, y: Math.random() * N | 0 }; } while (snake.some(s => s.x === p.x && s.y === p.y)); food = p; };
  place();
  const turn = (dx, dy) => {
    const l = queue.length ? queue[queue.length - 1] : dir;
    if ((l.x === -dx && l.y === -dy) || (l.x === dx && l.y === dy)) return;
    if (queue.length < 2) queue.push({ x: dx, y: dy });
  };
  const KEY = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
  ctx.keys(e => { const k = KEY[e.key]; if (k) turn(k[0], k[1]); });
  let sx = 0, sy = 0, sw = false;
  ctx.on(cv, 'pointerdown', e => { sx = e.clientX; sy = e.clientY; sw = true; });
  ctx.on(cv, 'pointermove', e => {
    if (!sw) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.hypot(dx, dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
    sx = e.clientX; sy = e.clientY;
  });
  ctx.on(window, 'pointerup', () => { sw = false; });
  const hud = () => ctx.hud(ctx.t(`manzanas ${apples}`, `apples ${apples}`));
  function step() {
    if (queue.length) dir = queue.shift();
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const eat = h.x === food.x && h.y === food.y;
    const body = eat ? snake : snake.slice(0, -1);
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || body.some(s => s.x === h.x && s.y === h.y)) return die();
    snake.unshift(h);
    if (eat) {
      apples++; ctx.play('eat', 420 + Math.min(apples, 20) * 22); hud();
      C.burst(h.x * S + S / 2, h.y * S + S / 2, { n: 14, speed: .3 }); place();
    } else snake.pop();
  }
  let stop;
  function die() {
    ended = true; draw(); stop();
    C.burst(snake[0].x * S + S / 2, snake[0].y * S + S / 2, { n: 30, speed: .5, color: ['#ff7a90', '#f2c58e', '#d3b7ff'] });
    ctx.shake(); ctx.end({ score: apples, title: ctx.t('Colisión', 'Crash'), text: apples ? ctx.t(`Longitud final ${snake.length}`, `Final length ${snake.length}`) : ctx.t('Un comienzo discreto.', 'A modest start.') });
  }
  function draw() {
    g.clearRect(0, 0, N * S, N * S);
    g.fillStyle = 'rgba(211,183,255,.1)';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g.fillRect(x * S + S / 2 - 1, y * S + S / 2 - 1, 2, 2);
    const pulse = 5 + Math.sin(time / 160) * 1.5;
    g.fillStyle = '#df9de7'; g.beginPath(); g.arc(food.x * S + S / 2, food.y * S + S / 2, pulse, 0, 6.283); g.fill();
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i], t = i / snake.length;
      g.fillStyle = i === 0 ? '#f1e4ff' : `rgb(${Math.round(184 - t * 70)},${Math.round(138 - t * 60)},${Math.round(241 - t * 70)})`;
      g.fillRect(s.x * S + 2, s.y * S + 2, S - 4, S - 4);
    }
    const hd = snake[0]; g.fillStyle = '#151515';
    g.fillRect(hd.x * S + S / 2 + dir.x * 4 - 1.5 + dir.y * 4, hd.y * S + S / 2 + dir.y * 4 - 1.5 + dir.x * 4, 3, 3);
    g.fillRect(hd.x * S + S / 2 + dir.x * 4 - 1.5 - dir.y * 4, hd.y * S + S / 2 + dir.y * 4 - 1.5 - dir.x * 4, 3, 3);
  }
  draw(); hud();
  ctx.countdown(() => {
    stop = ctx.loop(dt => {
      if (ended) return;
      time += dt; acc += dt;
      while (acc >= speed() && !ended) { acc -= speed(); step(); }
      if (!ended) draw();
    });
  });
});
