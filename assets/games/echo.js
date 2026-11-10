/* Echo — memoria secuencial con tonos */
DCArcade.define('echo', ctx => {
  const F = [261.63, 329.63, 392, 523.25], COL = ['var(--lav)', 'var(--pink)', 'var(--warm)', 'var(--vh)'];
  const box = document.createElement('div'); box.className = 'echo';
  const pads = F.map((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'echo-pad'; b.style.setProperty('--c', COL[i]); b.setAttribute('aria-label', ctx.t('Panel ', 'Pad ') + (i + 1)); box.appendChild(b); return b; });
  const msg = document.createElement('div'); msg.className = 'echo-msg'; ctx.stage.append(box, msg);
  let seq = [], pos = 0, level = 0, input = false, ended = false;
  const lit = (i, ms) => { pads[i].classList.add('on'); ctx.tone(F[i], ms / 1000 + .05, 'sine', .09); ctx.timeout(() => pads[i].classList.remove('on'), ms); };
  const say = t => { msg.textContent = t; };
  function next() {
    level++; seq.push(Math.random() * 4 | 0); ctx.hud(ctx.t('nivel ', 'level ') + level);
    const step = Math.max(260, 620 - level * 16); input = false; say(ctx.t('Observa…', 'Watch…'));
    seq.forEach((v, k) => ctx.timeout(() => lit(v, step * .6), 700 + k * step));
    ctx.timeout(() => { input = true; pos = 0; say(ctx.t('Tu turno', 'Your turn')); }, 700 + seq.length * step);
  }
  function press(i) {
    if (!input || ended) return; lit(i, 200);
    if (i === seq[pos]) {
      if (++pos === seq.length) { input = false; say(ctx.t('Bien', 'Nice')); ctx.play('score'); ctx.timeout(next, 800); }
    } else {
      input = false; ended = true; ctx.shake(); ctx.play('miss'); say('');
      ctx.end({ score: level - 1, title: ctx.t('Secuencia rota', 'Sequence broken'), text: ctx.t('Tenía ' + seq.length + ' pasos', 'It had ' + seq.length + ' steps'), delay: 350 });
    }
  }
  pads.forEach((p, i) => ctx.on(p, 'pointerdown', e => { e.preventDefault(); press(i); }));
  ctx.keys(e => { const k = '1234'.indexOf(e.key); if (k >= 0) press(k); });
  ctx.hud(ctx.t('nivel 0', 'level 0')); say(ctx.t('Prepárate', 'Get ready')); ctx.timeout(next, 600);
});
