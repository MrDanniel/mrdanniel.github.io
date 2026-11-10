/* Wordle en español — seis intentos, racha guardada */
DCArcade.define('wordle', ctx => {
  const WORDS = window.DCWords[ctx.lang === 'en' ? 'en' : 'es'].split(' ');
  const st = ctx.stats();
  let ans; do { ans = WORDS[Math.random() * WORDS.length | 0]; } while (ans === st.last);
  st.last = ans; ctx.stat('seen', 0);
  const wrap = document.createElement('div'); wrap.className = 'wd';
  const board = document.createElement('div'); board.className = 'wd-board';
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div'); row.className = 'wd-row';
    row._t = []; for (let c = 0; c < 5; c++) { const t = document.createElement('div'); t.className = 'wd-t'; row.appendChild(t); row._t.push(t); }
    board.appendChild(row); rows.push(row);
  }
  const msg = document.createElement('div'); msg.className = 'wd-msg';
  const kb = document.createElement('div'); kb.className = 'wd-kb';
  const keyEl = {};
  ['QWERTYUIOP', ctx.lang === 'en' ? 'ASDFGHJKL' : 'ASDFGHJKLÑ', '+ZXCVBNM-'].forEach(line => {
    const r = document.createElement('div'); r.className = 'wd-kr';
    [...line].forEach(ch => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wd-k';
      if (ch === '+') { b.textContent = 'ENTER'; b.dataset.k = 'ENTER'; b.classList.add('wide'); b.style.fontSize = '11px'; }
      else if (ch === '-') { b.textContent = '⌫'; b.dataset.k = 'BACK'; b.classList.add('wide'); b.setAttribute('aria-label', ctx.t('Borrar', 'Delete')); }
      else { b.textContent = ch; b.dataset.k = ch; keyEl[ch] = b; }
      r.appendChild(b);
    });
    kb.appendChild(r);
  });
  wrap.append(board, msg, kb); ctx.stage.appendChild(wrap);
  let row = 0, cur = '', busy = false, done = false;
  const say = t => { msg.textContent = t; };
  const hud = () => ctx.hud(ctx.t('racha ', 'streak ') + (st.streak || 0));
  function paint() { rows[row]._t.forEach((t, i) => { const v = cur[i] || ''; if (t.textContent !== v) { t.textContent = v; t.classList.toggle('fill', !!v); } }); }
  function press(k) {
    if (done || busy) return;
    if (k === 'BACK') cur = cur.slice(0, -1);
    else if (k === 'ENTER') return submit();
    else if (cur.length < 5) { cur += k; ctx.play('step'); }
    paint(); say('');
  }
  function submit() {
    if (cur.length < 5) { const r = rows[row]; r.classList.remove('bad'); void r.offsetWidth; r.classList.add('bad'); say(ctx.t('Faltan letras', 'Not enough letters')); ctx.play('error'); return; }
    const res = Array(5).fill('absent'), cnt = {};
    for (const ch of ans) cnt[ch] = (cnt[ch] || 0) + 1;
    for (let i = 0; i < 5; i++) if (cur[i] === ans[i]) { res[i] = 'correct'; cnt[cur[i]]--; }
    for (let i = 0; i < 5; i++) if (res[i] !== 'correct' && cnt[cur[i]] > 0) { res[i] = 'present'; cnt[cur[i]]--; }
    const r = rows[row], word = cur, me = row; busy = true;
    r._t.forEach((t, i) => {
      t.style.animationDelay = i * 110 + 'ms'; t.classList.add('flip');
      ctx.timeout(() => { t.classList.add(res[i]); ctx.play(res[i] === 'correct' ? 'perfect' : 'step'); }, i * 110 + 250);
    });
    ctx.timeout(() => {
      [...word].forEach((ch, i) => { const k = keyEl[ch]; if (!k) return; const rank = { absent: 0, present: 1, correct: 2 }; const have = ['absent', 'present', 'correct'].find(c => k.classList.contains(c)); if (!have || rank[res[i]] > rank[have]) { k.classList.remove('absent', 'present', 'correct'); k.classList.add(res[i]); } });
      busy = false;
      if (word === ans) {
        done = true; st.streak = (st.streak || 0) + 1; ctx.stat('wins'); hud();
        r._t.forEach(t => ctx.at(t, { n: 6, speed: .3, size: 3 }));
        ctx.end({ score: st.streak, win: true, title: ctx.t('¡Correcto!', 'Correct!'), text: ctx.t('Resuelta en ' + (me + 1) + (me ? ' intentos' : ' intento'), 'Solved in ' + (me + 1) + (me ? ' tries' : ' try')), delay: 500 });
      } else if (me === 5) {
        done = true; st.streak = 0; ctx.stat('losses'); hud();
        ctx.end({ score: null, record: false, title: ctx.t('Casi', 'So close'), text: ctx.t('La palabra era ', 'The word was ') + ans, delay: 500 });
      }
    }, 5 * 110 + 450);
    row++; cur = '';
  }
  ctx.on(kb, 'click', e => { const b = e.target.closest('button'); if (b) press(b.dataset.k); });
  ctx.keys(e => {
    if (e.key === 'Enter') return press('ENTER');
    if (e.key === 'Backspace') return press('BACK');
    let k = e.key; if (k.length !== 1) return;
    k = k.toUpperCase(); if (k !== 'Ñ') k = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/^[A-ZÑ]$/.test(k)) press(k);
  }, { prevent: false });
  hud(); say(ctx.t('Adivina la palabra de cinco letras', 'Guess the five-letter word'));
});
