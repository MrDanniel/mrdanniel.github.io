/* "Cómo funciona": flujo en vivo con escena Canvas por app. Sin bibliotecas ni audio.
   Avanza solo (no se detiene al pasar el cursor); solo se pausa fuera de pantalla o con la pestaña oculta. */
(() => {
  const roots = [...document.querySelectorAll('[data-flow]')];
  if (!roots.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cs = getComputedStyle(document.documentElement), C = {};
  ['--lav','--v','--vh','--pink','--good','--warm','--bad','--muted','--dim','--text','--line2','--bg'].forEach(k => C[k.slice(2)] = cs.getPropertyValue(k).trim());
  const MONO = '12px "JetBrains Mono", ui-monospace, monospace';
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const out = x => 1 - Math.pow(1 - clamp(x), 3);
  const back = x => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const alpha = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  const pill = (g, x, y, w, h, fill, stroke) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.2; g.stroke(); } };
  const grid = (g, w, h) => { g.lineWidth = 1; g.strokeStyle = alpha(C.vh, .1); for (let x = 0; x <= w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } };

  /* ───── Efectos (partículas y ondas) ───── */
  function makeFx() {
    const parts = [], rings = [];
    return {
      burst(x, y, col, n = 18, sp = 140, life = .9) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (.35 + Math.random() * .75); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life, max: life * (.6 + Math.random() * .6), col, s: 2 + Math.random() * 2.4 }); } },
      spark(x, y, col) { parts.push({ x, y, vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 30, life: .5, max: .5, col, s: 1.6 + Math.random() * 1.6 }); },
      glyph(x, y, txt, col) { parts.push({ x, y, vx: (Math.random() - .5) * 26, vy: -48 - Math.random() * 24, life: 1.6, max: 1.6, col, txt, s: 15 }); },
      ring(x, y, col, r = 70, life = .9) { rings.push({ x, y, col, r, life, max: life }); },
      step(dt) { for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.txt ? 0 : 160) * dt; p.vx *= .985; } for (const r of rings) r.life -= dt; for (let i = parts.length; i--;) if (parts[i].life <= 0) parts.splice(i, 1); for (let i = rings.length; i--;) if (rings[i].life <= 0) rings.splice(i, 1); },
      draw(g) {
        for (const r of rings) { const k = 1 - r.life / r.max; g.globalAlpha = (1 - k) * .8; g.strokeStyle = r.col; g.lineWidth = 2 * (1 - k) + .5; g.beginPath(); g.arc(r.x, r.y, r.r * out(k), 0, TAU); g.stroke(); }
        for (const p of parts) { g.globalAlpha = clamp(p.life / p.max); g.fillStyle = p.col; if (p.txt) { g.font = '600 ' + p.s + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(p.txt, p.x, p.y); } else { g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill(); } }
        g.globalAlpha = 1; g.textAlign = 'left';
      },
      clear() { parts.length = 0; rings.length = 0; }
    };
  }

  /* ───── Escenas ───── */
  const NOTES = [['E2', 82.41], ['A2', 110.0], ['D3', 146.83], ['G3', 196.0], ['B3', 246.94], ['E4', 329.63]];

  const stringtune = {
    state: { i: 1 },
    draw(g, w, h, s, t, E) {
      const [name, f] = NOTES[this.state.i], cy = h * .5, I = this.state.i;
      grid(g, w, h); g.font = MONO; g.textBaseline = 'middle';
      const wave = (amp, noise, col, lw, glow) => {
        g.beginPath(); g.lineWidth = lw; g.strokeStyle = col; g.lineJoin = 'round'; g.shadowColor = C.vh; g.shadowBlur = glow || 0;
        const cyc = 2.2 + I * .55;
        for (let x = 0; x <= w; x += 2) { const u = x / w, env = Math.sin(Math.PI * u) ** .8, y = cy + Math.sin(u * cyc * TAU - t * 9) * amp * env + Math.sin(x * 12.9 + t * 40) * noise; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke(); g.shadowBlur = 0;
      };
      if (s === 0) {
        const hit = clamp((t - .5) / .2), amp = h * .17 * hit * Math.exp(-Math.max(0, t - .7) * .45) + 3;
        E.once('pluck', t > .5, () => { E.fx.ring(w * .5, cy, C.lav, w * .42, 1.1); E.fx.ring(w * .5, cy, C.vh, w * .3, .8); for (let i = 0; i < 4; i++) E.fx.glyph(w * (.3 + i * .14), cy - 10, i % 2 ? '♪' : '♫', C.lav); });
        wave(amp, 2 + (1 - hit) * 4, C.lav, 2.4, 14);
        g.fillStyle = C.muted; g.fillText('MIC · ' + (t < .5 ? 'esperando sonido…' : 'escuchando'), 18, h * .2);
        if (t < .5 && Math.floor(t * 4) % 2 === 0) { g.fillStyle = C.warm; g.font = '600 13px system-ui, sans-serif'; g.fillText('toca una cuerda', 18, h * .28); g.font = MONO; }
        for (let k = 0; k < 12; k++) { const on = k / 12 < amp / (h * .17) * .9; g.fillStyle = on ? (k > 9 ? C.warm : C.good) : alpha(C.vh, .25); g.fillRect(w - 28, h * .2 + 44 - k * 7, 9, 4); }
      } else if (s === 1) {
        wave(h * .08, .6, alpha(C.lav, .45), 1.4, 0);
        const n = 40, bw = (w - 60) / n, pk = 4 + I * 6.2, y0 = h * .86;
        for (let k = 0; k < n; k++) {
          const d = Math.abs(k - pk), grow = out((t - k * .012) / .6), v = (Math.exp(-d * d / 2.2) * .95 + .05 + .05 * Math.sin(t * 6 + k)) * grow;
          g.fillStyle = d < 1.2 ? C.vh : alpha(C.lav, .33); g.shadowColor = C.vh; g.shadowBlur = d < 1.2 ? 12 : 0;
          g.fillRect(30 + k * bw, y0 - v * h * .27, bw - 3, v * h * .27);
        }
        g.shadowBlur = 0;
        const px = 30 + pk * bw + bw / 2, py = y0 - h * .27 - 12;
        E.once('lock', t > .8, () => { E.fx.ring(px, py + 6, C.vh, 46, .8); E.fx.burst(px, py, C.lav, 12, 90, .7); });
        const lk = back((t - .8) / .4); if (lk > 0) { g.strokeStyle = C.vh; g.lineWidth = 2; g.beginPath(); g.arc(px, py + 6, Math.max(0, 15 * lk + Math.sin(t * 6) * 1.2), 0, TAU); g.stroke(); }
        const sc = back((t - .35) / .5); g.textAlign = 'center'; g.fillStyle = C.text; g.font = '700 ' + Math.round(h * .12 * clamp(sc, 0, 1.15)) + 'px "JetBrains Mono", monospace';
        g.fillText(name, w / 2, h * .17); g.font = MONO; g.fillStyle = C.lav; g.fillText(f.toFixed(2) + ' Hz  ·  nota detectada', w / 2, h * .29); g.textAlign = 'left';
      } else {
        const start = (I % 2 ? -1 : 1) * 34, cents = start * Math.exp(-t * 1.5) * Math.cos(t * 6.5) + Math.sin(t * 5) * .8 * Math.exp(-t * .4);
        const ok = Math.abs(cents) < 4 && t > 1.4, cx = w / 2, r = Math.min(w * .36, h * .5), base = h * .74;
        E.once('ok', ok, () => { E.fx.ring(cx, base, C.good, r * 1.1, 1); E.fx.burst(cx, base - r * .55, C.good, 30, 190, 1.1); });
        g.lineWidth = 2.5; g.strokeStyle = ok ? alpha(C.good, .8) : alpha(C.vh, .5); g.shadowColor = ok ? C.good : C.vh; g.shadowBlur = ok ? 16 : 0;
        g.beginPath(); g.arc(cx, base, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.shadowBlur = 0;
        for (let k = -5; k <= 5; k++) { const a = -Math.PI / 2 + k * .12, r1 = r - (k % 5 ? 8 : 16); g.strokeStyle = k === 0 ? C.good : alpha(C.lav, .6); g.lineWidth = k === 0 ? 2.6 : 1.2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, base + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r, base + Math.sin(a) * r); g.stroke(); }
        g.fillStyle = alpha(C.lav, .8); g.font = '11px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText('grave', cx - r * .78, base - r * .2); g.fillText('aguda', cx + r * .78, base - r * .2);
        const a = -Math.PI / 2 + clamp(cents / 50, -1, 1) * .6; g.strokeStyle = ok ? C.good : C.warm; g.lineWidth = 3.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx, base); g.lineTo(cx + Math.cos(a) * (r - 6), base + Math.sin(a) * (r - 6)); g.stroke();
        g.fillStyle = ok ? C.good : C.warm; g.beginPath(); g.arc(cx, base, 6, 0, TAU); g.fill();
        g.font = '700 ' + Math.round(h * .085) + 'px "JetBrains Mono", monospace'; g.fillText(name + '  ' + (cents > 0 ? '+' : '') + cents.toFixed(0) + '¢', cx, h * .2);
        const pk = ok ? back((t - 1.4) / .4) : 0, label = ok ? '✓  AFINADA' : Math.abs(cents) < 4 ? '• casi afinada…' : cents < 0 ? '▲ sube un poco la tensión' : '▼ afloja un poco';
        if (ok) { pill(g, cx - 62 * pk, base + 18, 124 * pk, 28, alpha(C.good, .18), C.good); g.fillStyle = C.good; } else g.fillStyle = C.muted;
        g.font = '600 12px "JetBrains Mono", monospace'; g.fillText(label, cx, base + 33); g.textAlign = 'left';
      }
    }
  };

  const ritmmo = {
    draw(g, w, h, s, t, E) {
      const cx0 = w * .5, cx = s === 2 ? lerp(cx0, w * .3, out(t / .9)) : cx0, cy = h * .5, R = Math.min(w, h) * (s === 2 ? .3 : .34);
      g.font = MONO; g.textBaseline = 'middle'; g.lineCap = 'round';
      const ring = (r, prog, col, lw, glow) => { g.beginPath(); g.lineWidth = lw; g.strokeStyle = col; g.shadowColor = C.vh; g.shadowBlur = glow || 0; g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * prog); g.stroke(); g.shadowBlur = 0; };
      [.55, .8, 1.05].forEach(k => ring(R * k, 1, alpha(C.vh, .13), 1));
      const draw0 = s === 0 ? out(t / 2) : 1; ring(R * .8, draw0, C.vh, 2.8, 12);
      if (s === 0 && draw0 < 1) { const a = -Math.PI / 2 + TAU * draw0; g.fillStyle = '#fff'; g.shadowColor = C.vh; g.shadowBlur = 18; g.beginPath(); g.arc(cx + Math.cos(a) * R * .8, cy + Math.sin(a) * R * .8, 5, 0, TAU); g.fill(); g.shadowBlur = 0; }
      E.once('done', s === 0 && t > 2, () => { E.fx.ring(cx, cy, C.vh, R * .95, 1); E.fx.burst(cx, cy - R * .8, C.lav, 14, 100, .8); });
      g.fillStyle = alpha(C.lav, .9); g.beginPath(); g.arc(cx, cy, 5 + Math.sin(t * 3) * 1.2, 0, TAU); g.fill();
      g.textAlign = 'center'; g.fillStyle = C.muted; g.fillText('hoy', cx, cy + 20);
      if (s === 0) { const k = out((t - 1.7) / .5); if (k > 0) { g.globalAlpha = k; pill(g, cx - 56, cy - R * .8 - 38 - (1 - k) * 8, 112, 26, alpha(C.bg, .9), C.vh); g.fillStyle = C.text; g.font = '600 12px system-ui, sans-serif'; g.fillText('Rutina de estudio', cx, cy - R * .8 - 25 - (1 - k) * 8); g.globalAlpha = 1; g.font = MONO; } }
      const items = [['Leer', .12, .8], ['Gym', .3, .8], ['Nota', .5, 1.05], ['Entrega', .66, .55], ['Llamar', .86, 1.05]];
      if (s >= 1) items.forEach(([lb, a0, rr], i) => {
        const tt = s === 1 ? (t - .15 - i * .5) / .55 : 9, k = back(tt); if (tt <= 0) return;
        const a = (a0 + t * .012) * TAU - Math.PI / 2, x = cx + Math.cos(a) * R * rr, y = cy + Math.sin(a) * R * rr;
        E.once('pop' + i, s === 1 && tt > .15, () => E.fx.ring(x, y, i === 2 ? C.pink : C.lav, 26, .7));
        g.fillStyle = i === 2 ? C.pink : C.lav; g.shadowColor = g.fillStyle; g.shadowBlur = 10; g.beginPath(); g.arc(x, y, 6.5 * Math.max(0, k), 0, TAU); g.fill(); g.shadowBlur = 0;
        g.globalAlpha = clamp(tt); g.fillStyle = C.text; g.textAlign = x > cx ? 'left' : 'right'; g.fillText(lb, x + (x > cx ? 13 : -13) + (1 - clamp(tt)) * (x > cx ? -8 : 8), y); g.globalAlpha = 1;
      });
      if (s === 2) {
        const mx = w * .78, my = cy, mr = Math.min(w, h) * .16, sx = cx + R * 1.1, ex = mx - mr, pr = clamp((t - .9) / 1.2), e = out(pr);
        const bx = lerp(sx, ex, e), by = my - Math.sin(Math.PI * e) * 42;
        g.setLineDash([4, 6]); g.strokeStyle = alpha(C.lav, .45); g.lineWidth = 1.2; g.beginPath(); g.moveTo(sx, my); g.quadraticCurveTo((sx + ex) / 2, my - 84, ex, my); g.stroke(); g.setLineDash([]);
        g.strokeStyle = alpha(C.vh, .35); g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.stroke();
        if (pr > 0 && pr < 1) { E.spark(bx, by, C.lav); E.spark(bx, by, C.pink); pill(g, bx - 38, by - 12, 76, 24, alpha(C.bg, .92), C.vh); g.fillStyle = C.lav; g.textAlign = 'center'; g.font = '600 11.5px "JetBrains Mono", monospace'; g.fillText('enlace ↗', bx, by); }
        E.once('arrive', pr >= 1, () => { E.fx.ring(ex, my, C.lav, 60, .9); E.fx.burst(ex, my, C.lav, 16, 120, .8); });
        const k = back((t - 2.1) / .6);
        [[0, -.6], [2.1, .6], [4.2, .6]].forEach(([a0]) => { if (k <= 0) return; g.fillStyle = C.pink; g.beginPath(); g.arc(mx + Math.cos(a0) * mr * .7, my + Math.sin(a0) * mr * .7, 5 * Math.max(0, k), 0, TAU); g.fill(); });
        g.textAlign = 'center'; g.fillStyle = C.muted; g.font = MONO; g.fillText('otro dispositivo', mx, my + mr + 20);
        const bw = 92, bh = 30, byy = my + mr + 38, bk = back((t - 2.5) / .45); if (bk > 0) {
          const pressed = t > 3.5, sc = pressed ? lerp(.9, 1, clamp((t - 3.5) / .25)) : bk;
          E.once('press', pressed, () => { E.fx.ring(mx, byy + bh / 2, C.good, 44, .7); E.fx.burst(mx, byy + bh / 2, C.good, 16, 130, .8); });
          g.save(); g.translate(mx, byy + bh / 2); g.scale(sc, sc); pill(g, -bw / 2, -bh / 2, bw, bh, pressed ? alpha(C.good, .22) : alpha(C.vh, .3), pressed ? C.good : C.vh);
          g.fillStyle = pressed ? C.good : C.text; g.font = '600 12px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(pressed ? '✓ Añadido' : 'Añadir', 0, 1); g.restore();
          if (!pressed && t > 3) { const q = (t - 3) / .5; g.strokeStyle = alpha(C.lav, .8 * (1 - q)); g.lineWidth = 2; g.beginPath(); g.arc(mx + 26, byy + 36, 10 + q * 12, 0, TAU); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(mx + 26, byy + 36, 4, 0, TAU); g.fill(); }
        }
        if (t > 3.5) { g.fillStyle = C.warm; g.font = '11px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText('tú apruebas antes de guardar', mx, byy + bh + 20); }
      }
      g.textAlign = 'left';
    }
  };

  const HAND = [[-.46, .30, -138, [.24, .19, .15]], [-.27, -.08, -101, [.30, .19, .15]], [-.05, -.13, -91, [.34, .21, .16]], [.17, -.09, -81, [.30, .19, .15]], [.36, .02, -70, [.23, .15, .13]]];
  const senador = {
    draw(g, w, h, s, t, E) {
      const fx = s === 2 ? lerp(w * .5, w * .3, out(t / .8)) : w * .5, fy = h * .5, S = Math.min(w, h) * .34;
      g.font = MONO; g.textBaseline = 'middle';
      const vw = S * 1.7, vh = S * 1.9, x0 = fx - vw / 2, y0 = fy - vh / 2, L = 20 + (s === 0 ? Math.sin(t * 5) * 3 : 0);
      g.strokeStyle = s === 2 ? C.good : C.vh; g.lineWidth = 2; g.shadowColor = g.strokeStyle; g.shadowBlur = 8;
      [[x0, y0, 1, 1], [x0 + vw, y0, -1, 1], [x0, y0 + vh, 1, -1], [x0 + vw, y0 + vh, -1, -1]].forEach(([x, y, a, b]) => { g.beginPath(); g.moveTo(x + a * L, y); g.lineTo(x, y); g.lineTo(x, y + b * L); g.stroke(); }); g.shadowBlur = 0;
      g.fillStyle = C.muted; g.fillText((s === 0 && Math.floor(t * 3) % 2 ? '○' : '●') + ' cámara', x0 + 4, y0 - 12);
      if (s === 0) { const sy = y0 + ((t * .42) % 1) * vh, gr = g.createLinearGradient(0, sy - 16, 0, sy + 16); gr.addColorStop(0, 'transparent'); gr.addColorStop(.5, alpha(C.vh, .6)); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(x0, sy - 16, vw, 32); }
      const sway = Math.sin(t * 1.6) * .07, cr = Math.cos(sway), sr = Math.sin(sway);
      const P = (x, y) => [fx + (x * cr - y * sr) * S, fy + .1 * S + (x * sr + y * cr) * S];
      const show = s === 0 ? .25 + .2 * out(t / 1.5) : 1, wr = P(0, .62), chains = [], pts = [];
      HAND.forEach(([bx, by, ang, seg], i) => { let x = bx, y = by, a = ang * Math.PI / 180 + Math.sin(t * 1.4 + i) * .05; const ch = [P(x, y)]; seg.forEach((l, j) => { a += (i === 0 ? .08 : .05) * (j ? 1 : 0); x += Math.cos(a) * l; y += Math.sin(a) * l; ch.push(P(x, y)); }); chains.push(ch); pts.push(...ch); });
      g.globalAlpha = show; g.lineWidth = 2; g.strokeStyle = C.lav; g.lineCap = 'round';
      const lineK = s === 0 ? 1 : out(t / 1.1);
      chains.forEach(ch => { g.beginPath(); g.moveTo(...wr); g.lineTo(...ch[0]); ch.slice(1).forEach(c => g.lineTo(lerp(ch[0][0], c[0], lineK), lerp(ch[0][1], c[1], lineK))); g.stroke(); });
      const pb = chains.map(c => c[0]); g.beginPath(); g.moveTo(...pb[0]); pb.slice(1).forEach(c => g.lineTo(...c)); g.stroke();
      if (s >= 1) pts.concat([wr]).forEach((p, i) => { const k = s === 1 ? back((t - .15 - i * .045) / .3) : 1; if (k <= 0) return; E.once('lm' + i, s === 1 && k > .6 && i % 5 === 4, () => E.fx.ring(p[0], p[1], C.pink, 16, .6)); g.fillStyle = (i % 4 === 0 && i < 20) ? C.pink : C.lav; g.shadowColor = g.fillStyle; g.shadowBlur = 8; g.beginPath(); g.arc(p[0], p[1], (i % 4 === 0 ? 4.4 : 3.1) * Math.max(0, k), 0, TAU); g.fill(); g.shadowBlur = 0; });
      g.globalAlpha = 1;
      if (s === 0) { g.fillStyle = C.warm; g.textAlign = 'center'; g.fillText('coloca tus manos con buena luz', fx, y0 + vh + 22); g.textAlign = 'left'; }
      if (s === 1) { g.fillStyle = C.lav; g.textAlign = 'center'; g.fillText('21 puntos de la mano (ilustrativo)', fx, y0 + vh + 22); g.textAlign = 'left'; }
      if (s === 2) {
        const k = back((t - .5) / .6), cw = Math.min(w * .38, 214), cx = w * .62 + (1 - clamp(k)) * 50, cy = h * .2, ch = h * .6;
        g.globalAlpha = clamp(k); g.fillStyle = alpha(C.bg, .93); g.strokeStyle = C.vh; g.lineWidth = 1.3; g.shadowColor = C.vh; g.shadowBlur = 14; g.beginPath(); g.rect(cx, cy, cw, ch); g.fill(); g.stroke(); g.shadowBlur = 0;
        g.fillStyle = C.muted; g.fillText('resultado (ejemplo)', cx + 14, cy + 22);
        g.fillStyle = C.text; g.font = '700 ' + Math.round(h * .085) + 'px "JetBrains Mono", monospace'; g.fillText('HOLA', cx + 14, cy + 60);
        g.font = MONO; const cf = .87 * out((t - .9) / 1.2);
        g.fillStyle = alpha(C.lav, .2); g.fillRect(cx + 14, cy + 86, cw - 28, 8); g.fillStyle = C.good; g.fillRect(cx + 14, cy + 86, (cw - 28) * cf, 8);
        g.fillStyle = C.lav; g.fillText('confianza ' + Math.round(cf * 100) + ' %', cx + 14, cy + 112);
        g.fillStyle = C.warm; g.fillText('puede equivocarse', cx + 14, cy + 140);
        const bk = back((t - 2.2) / .45), pressed = t > 3.5;
        if (bk > 0) { E.once('conf', pressed, () => { E.fx.ring(cx + cw / 2, cy + ch - 28, C.good, 50, .8); E.fx.burst(cx + cw / 2, cy + ch - 28, C.good, 18, 140, .9); });
          g.save(); g.translate(cx + cw / 2, cy + ch - 28); const sc = pressed ? lerp(.92, 1, clamp((t - 3.5) / .25)) : clamp(bk, 0, 1.1); g.scale(sc, sc);
          pill(g, -64, -15, 128, 30, pressed ? alpha(C.good, .22) : alpha(C.vh, .3), pressed ? C.good : C.vh); g.fillStyle = pressed ? C.good : C.text; g.font = '600 12px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(pressed ? '✓ Confirmada' : 'Confirmar seña', 0, 1); g.restore(); }
        g.globalAlpha = 1;
      }
      g.textAlign = 'left';
    }
  };
  const SCENES = { stringtune, ritmmo, senador };

  /* ───── Controlador ───── */
  roots.forEach(root => {
    const scene = SCENES[root.dataset.flow]; if (!scene) return;
    const steps = [...root.querySelectorAll('.flow-step')], stage = root.querySelector('.flow-stage'), cv = root.querySelector('canvas'), cap = root.querySelector('.flow-cap'), tag = root.querySelector('.flow-tag'), g = cv.getContext('2d');
    const fx = makeFx(), DUR = 5200; let cur = 0, el = 0, vis = false, W = 0, H = 0, raf = 0, last = 0, fired = new Set();
    const E = { fx, once(key, cond, fn) { if (reduce || !cond || fired.has(key)) return; fired.add(key); fn(); }, spark(x, y, c) { if (!reduce && Math.random() < .7) fx.spark(x, y, c); } };
    const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    const label = () => { if (tag) tag.textContent = 'PASO ' + (cur + 1) + '/' + steps.length + ' · ' + steps[cur].querySelector('.h').textContent; if (cap) cap.textContent = steps[cur].dataset.cap || ''; };
    const set = i => {
      cur = (i + steps.length) % steps.length; el = 0; fired = new Set(); fx.clear();
      steps.forEach((b, k) => { b.classList.toggle('is-active', k === cur); b.classList.toggle('is-done', k < cur); b.setAttribute('aria-selected', k === cur); b.tabIndex = k === cur ? 0 : -1; });
      label(); root.style.setProperty('--p', 0); if (reduce || !vis) draw(0);
    };
    const draw = dt => {
      const t = reduce ? 2.6 : el / 1000, enter = reduce ? 1 : out(t / .45);
      g.clearRect(0, 0, W, H); g.save(); g.globalAlpha = enter; g.translate(0, (1 - enter) * 14); scene.draw(g, W, H, cur, t, E); g.restore();
      if (!reduce) { fx.step(dt); fx.draw(g); }
    };
    const loop = now => {
      raf = 0; if (!vis || document.hidden) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; el += dt * 1000;
      draw(dt); root.style.setProperty('--p', clamp(el / DUR).toFixed(4));
      if (el >= DUR) set(cur + 1);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !reduce && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    steps.forEach((b, i) => {
      b.addEventListener('click', () => set(i));
      b.addEventListener('keydown', e => { const n = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0; if (n) { e.preventDefault(); set(cur + n); steps[cur].focus(); } });
    });
    stage.addEventListener('click', e => { if (!e.target.closest('.flow-chips')) set(cur + 1); });
    root.querySelectorAll('.flow-chips button').forEach(b => b.addEventListener('click', () => { root.querySelectorAll('.flow-chips button').forEach(x => x.setAttribute('aria-pressed', x === b)); scene.state.i = +b.dataset.i; el = 0; fired = new Set(); fx.clear(); if (reduce) draw(0); }));
    new ResizeObserver(() => { fit(); draw(0); }).observe(cv);
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) start(); }, { threshold: .2 }).observe(root);
    document.addEventListener('visibilitychange', start);
    root.classList.add('ready'); fit(); set(0); draw(0);
  });
})();
