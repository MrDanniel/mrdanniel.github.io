/* Compile — fragmentos de código por niveles, +1 s por fragmento limpio (tope 45 s); el reloj arranca con la primera tecla */
DCArcade.define('typing', ctx => {
  const t = ctx.t;
  const TIERS = [
    ['const ok = true;', 'let x = 1;', 'git add .', 'npm test', 'return null;', 'if (ok) go();'],
    ['if (bug) fix(); else ship();', 'git commit -m arreglo-final', 'npm run build && npm test', 'export const VERSION = 1;', 'while (!listo) { esperar(); }'],
    ['for (let i = 0; i < 9; i++) log(i);', 'const total = items.map(x => x.price);', 'function sum(a, b) { return a + b; }', 'await fetch(url).then(r => r.json());', 'const suerte = Math.random() > 0.5;', 'try { deploy(); } catch (e) { rezar(); }', 'git push origin main --force-with-lease'],
    ['const byId = new Map(items.map(i => [i.id, i]));', 'if (!user?.ok) throw new Error(msg);', 'items.filter(x => x.ok).reduce((a, b) => a + b.n, 0);', 'export async function load(id) { return db.get(id); }']
  ];
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const queue = [...shuf(TIERS[0]).slice(0, 3), ...shuf(TIERS[1]).slice(0, 3), ...shuf(TIERS[2]).slice(0, 4), ...shuf(TIERS[3])];
  let pool = [];
  const nextText = () => { if (queue.length) return queue.shift(); if (!pool.length) pool = shuf(TIERS[2].concat(TIERS[3])); return pool.pop(); };
  const esc = c => c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c;
  const box = document.createElement('div'); box.className = 'tp';
  box.innerHTML = `<div class="tp-text" style="white-space:pre-wrap"></div><div class="bar" style="margin:0"><i></i></div><div class="tp-meta"><span data-t>${t('Empieza a escribir', 'Start typing')}</span><span data-w>0 ${t('ppm', 'wpm')}</span></div><input class="tp-in" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${t('Escribe el código mostrado', 'Type the code shown')}">`;
  ctx.stage.appendChild(box);
  const text = box.querySelector('.tp-text'), inp = box.querySelector('input'), barI = box.querySelector('.bar i'), tEl = box.querySelector('[data-t]'), wEl = box.querySelector('[data-w]');
  let target = nextText(), started = false, t0 = 0, ok = 0, bad = 0, prev = 0, ended = false, done = 0, snipBad = 0;
  const limit = () => Math.min(45000, 30000 + done * 1000);
  const elapsed = () => performance.now() - t0;
  const wpm = () => Math.round(ok / 5 / Math.max(.05, elapsed() / 60000));
  function render() {
    const v = inp.value; let h = '';
    for (let i = 0; i < target.length; i++) { const c = target[i], cls = i < v.length ? (v[i] === c ? 'ok' : 'bad') : i === v.length ? 'cur' : ''; h += `<span class="${cls}">${esc(c)}</span>`; }
    text.innerHTML = h;
  }
  function setTarget() { target = nextText(); inp.maxLength = target.length; inp.value = ''; prev = 0; snipBad = 0; render(); text.animate([{ opacity: .25, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200 }); }
  inp.maxLength = target.length;
  ctx.on(inp, 'input', () => {
    if (ended) return;
    const v = inp.value;
    if (!started) { started = true; t0 = performance.now(); ctx.interval(tick, 100); }
    for (let k = prev; k < v.length; k++) { if (v[k] === target[k]) { ok++; ctx.play('step'); } else { bad++; snipBad++; ctx.play('error'); } }
    prev = v.length;
    if (v.length >= target.length) {            // fin del texto: pasa al siguiente aunque haya errores; solo el limpio suma tiempo
      const clean = v === target; done += clean ? 1 : 0;
      ctx.play(clean ? 'score' : 'pop'); ctx.at(text, { n: clean ? 12 : 4, speed: .3 });
      setTarget(); return;
    }
    render();
  });
  function tick() {
    const L = limit(), left = L - elapsed();
    barI.style.setProperty('--p', Math.max(0, left / L));
    tEl.textContent = Math.max(0, Math.ceil(left / 1000)) + ' s'; wEl.textContent = wpm() + ' ' + t('ppm', 'wpm');
    ctx.hud(wpm() + ' ' + t('ppm', 'wpm') + ' · ' + done + ' ✓');
    if (left <= 0) {
      ended = true; inp.blur(); const s = Math.round(ok / 5 / (L / 60000)), acc = ok + bad ? Math.round(ok / (ok + bad) * 100) : 0;
      ctx.stat('chars', ok); ctx.end({ score: s, title: t('Tiempo', 'Time'), text: t(`Precisión ${acc}% · ${done} fragmentos limpios`, `Accuracy ${acc}% · ${done} clean snippets`) });
    }
  }
  barI.style.setProperty('--p', 1);
  ctx.on(box, 'pointerdown', () => setTimeout(() => inp.focus(), 0));
  ctx.keys(() => {}, { prevent: false });
  render(); inp.focus({ preventScroll: true });
});
