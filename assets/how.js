/* "Cómo funciona": flujo en vivo con escena Canvas por app. Sin bibliotecas ni audio. */
(() => {
  const roots = [...document.querySelectorAll('[data-flow]')];
  if (!roots.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cs = getComputedStyle(document.documentElement);
  const C = {};
  ['--lav','--v','--vh','--pink','--good','--warm','--bad','--muted','--dim','--text','--line2','--bg'].forEach(k => C[k.slice(2)] = cs.getPropertyValue(k).trim());
  const MONO = '12px "JetBrains Mono", ui-monospace, monospace';
  const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const alpha = (hex, a) => { const n = parseInt(hex.replace('#',''), 16); return `rgba(${n>>16},${n>>8&255},${n&255},${a})`; };

  /* ───── Escenas ───── */
  const NOTES = [['E2',82.41],['A2',110.0],['D3',146.83],['G3',196.0],['B3',246.94],['E4',329.63]];

  const stringtune = {
    state: { i: 1 },
    draw(g, w, h, s, t, p) {
      const [name, f] = NOTES[this.state.i], cy = h * .46;
      g.lineWidth = 1; g.strokeStyle = alpha(C.vh, .12);
      for (let x = 0; x <= w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      const wave = (amp, noise, col, lw) => {
        g.beginPath(); g.lineWidth = lw; g.strokeStyle = col;
        const cyc = 2.2 + this.state.i * .55;
        for (let x = 0; x <= w; x += 2) {
          const u = x / w, env = Math.sin(Math.PI * u) ** .8;
          const y = cy + Math.sin(u * cyc * Math.PI * 2 - t * 9) * amp * env + (Math.sin(x * 12.9 + t * 40) * noise);
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      };
      g.font = MONO; g.textBaseline = 'middle';
      if (s === 0) {
        const hit = clamp((t - .5) / .25), amp = h * .16 * hit * Math.exp(-Math.max(0, t - .75) * .5) + 3;
        wave(amp, 2 + (1 - hit) * 4, C.lav, 2.2);
        g.fillStyle = C.muted; g.fillText('MIC · escuchando', 18, h * .17);
        for (let i = 0; i < 12; i++) { const on = i / 12 < amp / (h * .16) * .9; g.fillStyle = on ? C.good : alpha(C.vh, .25); g.fillRect(w - 26, h * .17 + 40 - i * 7, 8, 4); }
      } else if (s === 1) {
        wave(h * .09, 0.6, alpha(C.lav, .55), 1.6);
        const n = 40, bw = (w - 60) / n, pk = 4 + this.state.i * 6.2, y0 = h * .86;
        for (let i = 0; i < n; i++) {
          const d = Math.abs(i - pk), v = (Math.exp(-d * d / 2.2) * .95 + .05 + .05 * Math.sin(t * 6 + i)) * clamp(t / .7);
          g.fillStyle = d < 1.2 ? C.vh : alpha(C.lav, .35);
          g.fillRect(30 + i * bw, y0 - v * h * .26, bw - 3, v * h * .26);
        }
        g.fillStyle = C.text; g.font = '600 ' + Math.round(h * .095) + 'px "JetBrains Mono", monospace'; g.textAlign = 'center';
        g.fillText(name, w / 2, h * .16); g.font = MONO; g.fillStyle = C.lav; g.fillText(f.toFixed(2) + ' Hz', w / 2, h * .26); g.textAlign = 'left';
      } else {
        const start = (this.state.i % 2 ? -1 : 1) * 32, cents = start * Math.exp(-t * 1.25) + Math.sin(t * 5) * 1.3 * Math.exp(-t * .5);
        const ok = Math.abs(cents) < 4, cx = w / 2, r = Math.min(w * .36, h * .5), base = h * .72;
        g.lineWidth = 2; g.strokeStyle = alpha(C.vh, .5);
        g.beginPath(); g.arc(cx, base, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        for (let k = -5; k <= 5; k++) {
          const a = -Math.PI / 2 + k * .12, r1 = r - (k % 5 ? 8 : 16);
          g.strokeStyle = k === 0 ? C.good : alpha(C.lav, .6); g.lineWidth = k === 0 ? 2.4 : 1.2;
          g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, base + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r, base + Math.sin(a) * r); g.stroke();
        }
        const a = -Math.PI / 2 + clamp(cents / 50, -1, 1) * .6;
        g.strokeStyle = ok ? C.good : C.warm; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx, base); g.lineTo(cx + Math.cos(a) * (r - 6), base + Math.sin(a) * (r - 6)); g.stroke();
        g.fillStyle = ok ? C.good : C.warm; g.beginPath(); g.arc(cx, base, 6, 0, 7); g.fill();
        g.textAlign = 'center'; g.font = '600 ' + Math.round(h * .08) + 'px "JetBrains Mono", monospace';
        g.fillText(name + '  ' + (cents > 0 ? '+' : '') + cents.toFixed(0) + '¢', cx, h * .2);
        g.font = MONO; g.fillStyle = C.muted; g.fillText(ok ? 'afinada ✓' : cents < 0 ? 'muy grave: sube la tensión' : 'muy aguda: afloja la cuerda', cx, base + 34); g.textAlign = 'left';
      }
    }
  };

  const ritmmo = {
    draw(g, w, h, s, t) {
      const cx0 = w * .5, cx = s === 2 ? cx0 + (w * .3 - cx0) * ease(t / .9) : cx0, cy = h * .5, R = Math.min(w, h) * (s === 2 ? .3 : .34);
      g.font = MONO; g.textBaseline = 'middle'; g.lineCap = 'round';
      const ring = (r, prog, col, lw) => { g.beginPath(); g.lineWidth = lw; g.strokeStyle = col; g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); g.stroke(); };
      ring(R * .55, 1, alpha(C.vh, .13), 1); ring(R * .8, 1, alpha(C.vh, .13), 1); ring(R * 1.05, 1, alpha(C.vh, .13), 1);
      ring(R * .8, s === 0 ? ease(t / 2.2) : 1, C.vh, 2.6);
      g.fillStyle = alpha(C.lav, .9); g.beginPath(); g.arc(cx, cy, 5 + Math.sin(t * 3) * 1.2, 0, 7); g.fill();
      g.textAlign = 'center'; g.fillStyle = C.muted; g.fillText('hoy', cx, cy + 20);
      const items = [['Leer', .12, .8], ['Gym', .3, .8], ['Nota', .5, 1.05], ['Entrega', .66, .55], ['Llamar', .86, 1.05]];
      if (s >= 1) items.forEach(([lb, a0, rr], i) => {
        const k = s === 1 ? ease((t - i * .45) / .5) : 1; if (k <= 0) return;
        const a = (a0 + t * .012) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R * rr, y = cy + Math.sin(a) * R * rr;
        g.fillStyle = i === 2 ? C.pink : C.lav; g.beginPath(); g.arc(x, y, 6 * k, 0, 7); g.fill();
        g.globalAlpha = k; g.fillStyle = C.text; g.textAlign = x > cx ? 'left' : 'right'; g.fillText(lb, x + (x > cx ? 12 : -12), y); g.globalAlpha = 1;
      });
      if (s === 2) {
        const mx = w * .78, my = cy, mr = Math.min(w, h) * .16, k = ease((t - 1.6) / .8);
        g.strokeStyle = alpha(C.vh, .35); g.lineWidth = 1; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.stroke();
        const sx = cx + R * 1.1, pr = clamp((t - .9) / 1.1), px = sx + (mx - mr - sx) * ease(pr), py = my - Math.sin(Math.PI * ease(pr)) * 26;
        g.setLineDash([4, 6]); g.strokeStyle = alpha(C.lav, .5); g.beginPath(); g.moveTo(sx, my); g.quadraticCurveTo((sx + mx - mr) / 2, my - 52, mx - mr, my); g.stroke(); g.setLineDash([]);
        if (pr < 1) { g.fillStyle = alpha(C.bg, .9); g.strokeStyle = C.vh; g.lineWidth = 1.2; const tw = 76; g.beginPath(); g.rect(px - tw / 2, py - 11, tw, 22, 3); g.fill(); g.stroke(); g.fillStyle = C.lav; g.textAlign = 'center'; g.fillText('enlace ↗', px, py); }
        [[0, -.6], [2.1, .6], [4.2, .6]].forEach(([a0, rr], i) => { if (k <= 0) return; const a = a0; g.fillStyle = C.pink; g.beginPath(); g.arc(mx + Math.cos(a) * mr * .7, my + Math.sin(a) * mr * .7, 5 * k, 0, 7); g.fill(); });
        g.textAlign = 'center'; g.fillStyle = C.muted; g.fillText('otro dispositivo', mx, my + mr + 22);
      }
    }
  };

  const HAND = {
    fingers: [ // base x,y · ángulo · segmentos
      [-.46, .30, -138, [.24, .19, .15]], [-.27, -.08, -101, [.30, .19, .15]], [-.05, -.13, -91, [.34, .21, .16]],
      [.17, -.09, -81, [.30, .19, .15]], [.36, .02, -70, [.23, .15, .13]]]
  };
  const senador = {
    draw(g, w, h, s, t) {
      const fx = s === 2 ? w * .3 : w * .5, fy = h * .5, S = Math.min(w, h) * .34;
      g.font = MONO; g.textBaseline = 'middle';
      // visor
      const vw = S * 1.7, vh = S * 1.9, x0 = fx - vw / 2, y0 = fy - vh / 2, L = 20;
      g.strokeStyle = C.vh; g.lineWidth = 2;
      [[x0, y0, 1, 1], [x0 + vw, y0, -1, 1], [x0, y0 + vh, 1, -1], [x0 + vw, y0 + vh, -1, -1]].forEach(([x, y, a, b]) => { g.beginPath(); g.moveTo(x + a * L, y); g.lineTo(x, y); g.lineTo(x, y + b * L); g.stroke(); });
      g.fillStyle = C.muted; g.fillText('● cámara', x0 + 4, y0 - 12);
      if (s === 0) { const sy = y0 + ((t * .45) % 1) * vh; const gr = g.createLinearGradient(0, sy - 14, 0, sy + 14); gr.addColorStop(0, 'transparent'); gr.addColorStop(.5, alpha(C.vh, .55)); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(x0, sy - 14, vw, 28); }
      // mano
      const sway = Math.sin(t * 1.6) * .07, cosr = Math.cos(sway), sinr = Math.sin(sway);
      const P = (x, y) => [fx + (x * cosr - y * sinr) * S, fy + .1 * S + (x * sinr + y * cosr) * S];
      const show = s === 0 ? .28 : 1, pts = [];
      g.globalAlpha = show; g.lineWidth = 2; g.strokeStyle = C.lav; g.fillStyle = C.pink;
      const wr = P(0, .62);
      HAND.fingers.forEach(([bx, by, ang, seg], i) => {
        let [x, y] = [bx, by], a = ang * Math.PI / 180 + Math.sin(t * 1.4 + i) * .05; const chain = [P(x, y)];
        seg.forEach((l, j) => { a += (i === 0 ? .08 : .05) * (j ? 1 : 0); x += Math.cos(a) * l; y += Math.sin(a) * l; chain.push(P(x, y)); });
        g.beginPath(); g.moveTo(...wr); g.lineTo(...chain[0]); chain.slice(1).forEach(c => g.lineTo(...c)); g.stroke(); pts.push(...chain);
      });
      const pb = HAND.fingers.map(f => P(f[0], f[1])); g.beginPath(); g.moveTo(...pb[0]); pb.slice(1).forEach(c => g.lineTo(...c)); g.stroke();
      if (s >= 1) { const k = ease(t / .8); pts.concat([wr]).forEach((p, i) => { g.beginPath(); g.arc(p[0], p[1], (i % 4 === 0 ? 4.2 : 3) * k, 0, 7); g.fill(); }); }
      g.globalAlpha = 1;
      if (s === 1) { g.fillStyle = C.lav; g.textAlign = 'center'; g.fillText('21 puntos de la mano (ilustrativo)', fx, y0 + vh + 22); g.textAlign = 'left'; }
      if (s === 2) {
        const k = ease((t - .5) / .7), cw = Math.min(w * .36, 210), cx = w * .62 + (1 - k) * 40, cy = h * .26;
        g.globalAlpha = k; g.fillStyle = alpha(C.bg, .92); g.strokeStyle = C.vh; g.lineWidth = 1.2; g.beginPath(); g.rect(cx, cy, cw, h * .46, 4); g.fill(); g.stroke();
        g.fillStyle = C.muted; g.fillText('resultado (ejemplo)', cx + 14, cy + 22);
        g.fillStyle = C.text; g.font = '700 ' + Math.round(h * .085) + 'px "JetBrains Mono", monospace'; g.fillText('HOLA', cx + 14, cy + 62);
        g.font = MONO; const conf = .87 * clamp((t - .8) / 1.2);
        g.fillStyle = alpha(C.lav, .2); g.fillRect(cx + 14, cy + 90, cw - 28, 8); g.fillStyle = C.good; g.fillRect(cx + 14, cy + 90, (cw - 28) * conf, 8);
        g.fillStyle = C.lav; g.fillText('confianza ' + Math.round(conf * 100) + ' %', cx + 14, cy + 116);
        g.fillStyle = C.warm; g.fillText('puede equivocarse:', cx + 14, cy + 148); g.fillStyle = C.muted; g.fillText('confirma la seña', cx + 14, cy + 166);
        g.globalAlpha = 1;
      }
    }
  };
  const SCENES = { stringtune, ritmmo, senador };

  /* ───── Controlador ───── */
  roots.forEach(root => {
    const scene = SCENES[root.dataset.flow]; if (!scene) return;
    const steps = [...root.querySelectorAll('.flow-step')], cv = root.querySelector('canvas'), cap = root.querySelector('.flow-cap'), g = cv.getContext('2d');
    const DUR = 5600; let cur = 0, t0 = performance.now(), vis = false, hold = false, W = 0, H = 0, raf = 0;
    const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    const set = i => { cur = (i + steps.length) % steps.length; t0 = performance.now(); steps.forEach((b, k) => { b.classList.toggle('is-active', k === cur); b.classList.toggle('is-done', k < cur); b.setAttribute('aria-selected', k === cur); b.tabIndex = k === cur ? 0 : -1; }); if (cap) cap.textContent = steps[cur].dataset.cap || ''; root.style.setProperty('--p', 0); if (reduce || !vis) frame(); };
    const frame = () => {
      const el = performance.now() - t0, t = reduce ? 2.4 : el / 1000, p = reduce ? 1 : clamp(el / DUR);
      g.clearRect(0, 0, W, H); g.save(); scene.draw(g, W, H, cur, t, p); g.restore(); root.style.setProperty('--p', p);
      if (!reduce && !hold && p >= 1) set(cur + 1);
    };
    const loop = () => { if (!vis || document.hidden) { raf = 0; return; } frame(); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && !reduce) { if (hold) t0 = performance.now() - (pausedAt || 0); raf = requestAnimationFrame(loop); } };
    let pausedAt = 0;
    const hover = on => { if (on) { pausedAt = performance.now() - t0; hold = true; } else { t0 = performance.now() - pausedAt; hold = false; } };
    steps.forEach((b, i) => { b.addEventListener('click', () => set(i)); b.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); set(cur + 1); steps[cur].focus(); } if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); set(cur - 1); steps[cur].focus(); } }); });
    root.addEventListener('pointerenter', () => hover(true)); root.addEventListener('pointerleave', () => hover(false));
    root.querySelectorAll('.flow-chips button').forEach(b => b.addEventListener('click', () => { root.querySelectorAll('.flow-chips button').forEach(x => x.setAttribute('aria-pressed', x === b)); scene.state.i = +b.dataset.i; t0 = performance.now(); pausedAt = 0; if (reduce) frame(); }));
    new ResizeObserver(() => { fit(); frame(); }).observe(cv);
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) { if (!reduce) t0 = performance.now() - (hold ? pausedAt : 0); start(); } }, { threshold: .25 }).observe(root);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    fit(); set(0); frame();
  });
})();
