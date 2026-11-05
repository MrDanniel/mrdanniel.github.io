/* Liquid scan intro — only loaded by the home pages. No external libraries. */
(() => {
  'use strict';

  const overlay = document.getElementById('intro-overlay');
  const canvas = document.getElementById('intro-canvas');
  const skip = document.getElementById('intro-skip');
  if (!overlay || !canvas || !skip) return;

  const desktop = matchMedia('(min-width: 761px) and (pointer: fine) and (hover: hover)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;
  const modestDevice = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const hasCanvas = !!canvas.getContext;

  // The intro is intentionally absent on phones, touch-first devices and modest/reduced-motion setups.
  if (!desktop || reduced || saveData || modestDevice || !hasCanvas || location.hash) {
    overlay.remove();
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) { overlay.remove(); return; }

  const duration = 4400;
  const bands = 9;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = v => { v = clamp(v); return 1 - Math.pow(1 - v, 2.4); };
  const makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  };
  const rgb = value => {
    const s = String(value || '').trim();
    let m = s.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (m) {
      let h = m[1]; if (h.length === 3) h = [...h].map(x => x + x).join('');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = s.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [211, 183, 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  const css = getComputedStyle(document.documentElement);
  const accent = rgb(css.getPropertyValue('--lav'));
  const violet = rgb(css.getPropertyValue('--v'));
  const bright = rgb(css.getPropertyValue('--vh'));
  const pageW = Math.max(1, innerWidth);
  const pageH = Math.max(1, innerHeight);
  const quality = Math.min(1, 1480 / pageW, 980 / pageH);
  const W = Math.max(1, Math.round(pageW * quality));
  const H = Math.max(1, Math.round(pageH * quality));

  let frame = 0, startedAt = 0, stopped = false;
  let source = null, sampled = null, cw = 1, ch = 1;
  const layers = {};
  canvas.width = W; canvas.height = H;
  overlay.hidden = false;
  overlay.classList.add('is-active');
  document.body.classList.add('intro-active');

  function fillBackground(g) {
    g.fillStyle = '#151515'; g.fillRect(0, 0, W, H);
    const a = g.createRadialGradient(W * .78, H * .06, 0, W * .78, H * .06, Math.max(W, H) * .78);
    a.addColorStop(0, 'rgba(112,69,153,.36)'); a.addColorStop(1, 'rgba(21,21,21,0)');
    g.fillStyle = a; g.fillRect(0, 0, W, H);
    const b = g.createRadialGradient(W * .06, H * .62, 0, W * .06, H * .62, Math.max(W, H) * .58);
    b.addColorStop(0, 'rgba(73,43,103,.22)'); b.addColorStop(1, 'rgba(21,21,21,0)');
    g.fillStyle = b; g.fillRect(0, 0, W, H);
  }

  function intersects(r) {
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < pageW && r.top < pageH;
  }

  function drawTextNode(node, g) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim() || !node.parentElement) return;
    const el = node.parentElement;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || st.fontSize === '0px') return;
    let color = st.color;
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') color = `rgb(${accent.join(' ')})`;
    const size = parseFloat(st.fontSize) || 14;
    const weight = st.fontWeight || '400';
    const family = st.fontFamily || 'sans-serif';
    const fontStyle = st.fontStyle && st.fontStyle !== 'normal' ? st.fontStyle + ' ' : '';
    const fontVariant = st.fontVariant && st.fontVariant !== 'normal' ? st.fontVariant + ' ' : '';
    g.save();
    g.font = `${fontStyle}${fontVariant}${weight} ${size}px ${family}`;
    g.fillStyle = color;
    g.textBaseline = 'alphabetic';
    g.globalAlpha = 1;
    const re = /\S+/g; let match;
    while ((match = re.exec(raw))) {
      const range = document.createRange();
      try {
        range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        if (!intersects(rect)) continue;
        let word = match[0];
        if (st.textTransform === 'uppercase') word = word.toUpperCase();
        else if (st.textTransform === 'lowercase') word = word.toLowerCase();
        const baseline = rect.bottom - Math.max(1, (rect.height - size) * .25);
        g.fillText(word, rect.left, baseline, Math.max(rect.width + 2, 2));
      } catch { /* Textos que cambian durante el recorrido se omiten. */ }
    }
    g.restore();
  }

  async function drawSvgElement(svg, g, rect) {
    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const originals = [svg, ...svg.querySelectorAll('*')];
      const copies = [clone, ...clone.querySelectorAll('*')];
      const props = ['fill','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','font-family','font-size','font-weight','font-style','text-anchor','display','visibility','transform','clip-path'];
      originals.forEach((el, i) => {
        const computed = getComputedStyle(el);
        const values = props.map(k => `${k}:${computed.getPropertyValue(k)}`).join(';');
        copies[i].setAttribute('style', (copies[i].getAttribute('style') || '') + ';' + values);
        if (copies[i].hasAttribute('href')) {
          const href = copies[i].getAttribute('href');
          if (href && !href.startsWith('data:') && !href.startsWith('#')) copies[i].setAttribute('href', new URL(href, document.baseURI).href);
        }
      });
      const xml = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const bitmap = await createImageBitmap(blob);
      g.drawImage(bitmap, rect.left, rect.top, rect.width, rect.height);
      bitmap.close?.();
      return true;
    } catch { return false; }
  }

  async function capturePage() {
    const c = makeCanvas(W, H), g = c.getContext('2d', { alpha: false });
    g.setTransform(1, 0, 0, 1, 0, 0);
    fillBackground(g);
    g.setTransform(quality, 0, 0, quality, 0, 0);

    async function drawElement(el) {
      if (el === overlay || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'META') return;
      if (el.hidden || el.getAttribute('aria-hidden') === 'true' && el.tagName !== 'SVG') return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (!intersects(rect)) return;

      if (el.tagName === 'SVG') {
        if (!await drawSvgElement(el, g, rect)) {
          g.save(); g.strokeStyle = `rgba(${accent.join(',')},.55)`; g.lineWidth = 1;
          g.beginPath(); g.ellipse(rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width * .44, rect.height * .44, 0, 0, Math.PI * 2); g.stroke(); g.restore();
        }
        return;
      }

      const bg = st.backgroundColor;
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        g.save(); g.fillStyle = bg; g.fillRect(rect.left, rect.top, rect.width, rect.height); g.restore();
      }

      const borderWidths = [st.borderTopWidth, st.borderRightWidth, st.borderBottomWidth, st.borderLeftWidth].map(v => parseFloat(v) || 0);
      const borderColors = [st.borderTopColor, st.borderRightColor, st.borderBottomColor, st.borderLeftColor];
      if (borderWidths.some(v => v > 0)) {
        g.save(); g.lineCap = 'square';
        const sides = [
          [rect.left, rect.top, rect.right, rect.top],
          [rect.right, rect.top, rect.right, rect.bottom],
          [rect.right, rect.bottom, rect.left, rect.bottom],
          [rect.left, rect.bottom, rect.left, rect.top]
        ];
        sides.forEach((p, i) => {
          if (!borderWidths[i]) return;
          g.beginPath(); g.strokeStyle = borderColors[i]; g.lineWidth = borderWidths[i];
          g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.stroke();
        });
        g.restore();
      }

      if (el.tagName === 'IMG' && el.complete && el.naturalWidth) {
        try { g.drawImage(el, rect.left, rect.top, rect.width, rect.height); } catch { /* Imagen externa o no disponible. */ }
      } else if (el.tagName === 'CANVAS') {
        try { g.drawImage(el, rect.left, rect.top, rect.width, rect.height); } catch { /* Canvas no accesible. */ }
      }

      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) drawTextNode(child, g);
        else if (child.nodeType === Node.ELEMENT_NODE) await drawElement(child);
      }
    }

    for (const child of document.body.children) await drawElement(child);
    return c;
  }

  function sample(source, cellW, cellH = cellW) {
    const cols = Math.max(1, Math.ceil(source.width / cellW));
    const rows = Math.max(1, Math.ceil(source.height / cellH));
    const small = makeCanvas(cols, rows), g = small.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, cols, rows);
    return { cols, rows, data: g.getImageData(0, 0, cols, rows).data };
  }
  const lumAt = (data, i) => clamp(((data[i] * .2126 + data[i+1] * .7152 + data[i+2] * .0722) - 20) / 220);
  const chars = ' .,:-~=+*^!iIl|/\\()[]{}rcvxtuozjfn1234567890?SXA#%@';
  const cell = Math.max(8, Math.round(W / 116));
  const colCount = 11;
  const colDelay = Array.from({length:colCount}, (_,i) => .11*Math.sin(i*2.17)+.045*Math.cos(i*1.31));
  const hash = (x,y) => { const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); };
  let lastDraw = 0;
  let audioCtx = null, audioEnabled = true, played = new Set();
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    try { audioCtx = new Audio(); } catch { audioCtx = null; }
    return audioCtx;
  }
  function tone(at, freq, endFreq, gain, length, type='sine') {
    if (!audioEnabled || !audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime + (at || 0);
    const osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq), now + length);
    amp.gain.setValueAtTime(.0001, now); amp.gain.exponentialRampToValueAtTime(gain, now + .025);
    amp.gain.exponentialRampToValueAtTime(.0001, now + length);
    osc.connect(amp); amp.connect(audioCtx.destination); osc.start(now); osc.stop(now + length + .03);
  }
  function cue(index) {
    if (!audioEnabled || !audioCtx || audioCtx.state !== 'running' || played.has(index)) return;
    played.add(index);
    if (index === 0) {
      tone(0, 174, 360, .042, .38, 'sine');
      tone(.07, 620, 900, .016, .22, 'triangle');
    } else if (index === 1) {
      tone(0, 420, 220, .035, .20, 'triangle');
      tone(.055, 880, 660, .014, .16, 'sine');
      tone(.12, 1320, 980, .009, .12, 'sine');
    } else if (index === 2) {
      tone(0, 520, 190, .038, .38, 'sine');
      tone(.08, 1040, 720, .014, .28, 'triangle');
    }
  }
  function cueForElapsed() {
    if (!startedAt || stopped) return;
    const elapsed = performance.now() - startedAt;
    cue(elapsed >= 2900 ? 2 : elapsed >= 800 ? 1 : 0);
  }
  function unlockAudio() {
    if (stopped) return;
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === 'running') { cueForElapsed(); return; }
    ac.resume().then(cueForElapsed).catch(() => {});
  }
  // Se intenta reproducir desde el inicio. Los navegadores que bloquean autoplay
  // desbloquean el mismo contexto en la primera interacción, sin mostrar otro botón.
  unlockAudio();
  const unlockOnce = () => {
    unlockAudio();
    if (audioCtx?.state === 'running') {
      removeEventListener('pointerdown', unlockOnce, true);
      removeEventListener('keydown', unlockOnce, true);
      removeEventListener('touchstart', unlockOnce, true);
    }
  };
  addEventListener('pointerdown', unlockOnce, true);
  addEventListener('keydown', unlockOnce, true);
  addEventListener('touchstart', unlockOnce, true);

  // Offscreen layer: permite disolver únicamente las formas sin borrar el fondo.
  const effectCanvas = makeCanvas(W, H);
  const effectCtx = effectCanvas.getContext('2d', { alpha: true, desynchronized: true });

  function organicForms(g, time) {
    const t=time*.001;
    // Volúmenes orgánicos construidos a partir de la luminancia de la página.
    for(let y=0;y<sampled.rows;y++) for(let x=0;x<sampled.cols;x++) {
      const i=(y*sampled.cols+x)*4, lum=lumAt(sampled.data,i);
      if(lum<.045) continue;
      const nx=x/sampled.cols, ny=y/sampled.rows;
      const wave=Math.sin(nx*12+t*1.6+Math.sin(ny*8-t))*Math.cos(ny*10-t*.9);
      const r=Math.min(cw,ch)*(.27+lum*.43+wave*.075);
      const color=mix(violet,bright,clamp(lum*.85+wave*.08));
      g.fillStyle=`rgba(${color.join(',')},${.28+lum*.68})`;
      g.beginPath();
      for(let k=0;k<9;k++) { const a=k*Math.PI*2/9; const wobble=1+.16*Math.sin(k*2.3+x*.16-y*.11+t*1.8);
        const px=(x+.5)*cw+Math.cos(a)*r*wobble*1.25, py=(y+.5)*ch+Math.sin(a)*r*wobble*.9;
        if(!k)g.moveTo(px,py);else g.lineTo(px,py); }
      g.closePath();g.fill();
    }
    g.save();g.globalCompositeOperation='screen';g.globalAlpha=.12;g.strokeStyle=`rgb(${accent.join(',')})`;g.lineWidth=1.2;
    for(let j=0;j<5;j++){const yy=H*(.12+j*.19);g.beginPath();g.moveTo(0,yy);
      g.bezierCurveTo(W*.28,yy+Math.sin(t+j)*35,W*.67,yy+Math.cos(t*1.2+j)*42,W,yy+Math.sin(t+j*2)*20);g.stroke();}
    g.restore();
  }
  function organic(g, time) {
    fillBackground(g);
    organicForms(g, time);
  }

  function transitionDelay(x, y, groupsX = 13, groupsY = 9) {
    const groupW = Math.max(1, Math.ceil(sampled.cols / groupsX));
    const groupH = Math.max(1, Math.ceil(sampled.rows / groupsY));
    const rx = Math.floor(x / groupW), ry = Math.floor(y / groupH);
    const noise = hash(rx + 37, ry + 71);
    const wave = (Math.sin(rx * .83 + ry * .37) + Math.cos(ry * .91 - rx * .22) + 2) * .25;
    return clamp(.04 + noise * .50 + wave * .20, .04, .76);
  }

  // Las formas se deshacen celda por celda y dejan aparecer los glifos en el mismo lugar.
  function organicToAscii(g, time, stageStart, stageEnd) {
    const p = clamp((time - stageStart) / (stageEnd - stageStart));
    fillBackground(g);
    effectCtx.clearRect(0, 0, W, H);
    organicForms(effectCtx, time);

    // La máscara es opaca: borra la capa de formas y conserva el fondo de la intro.
    effectCtx.save();
    effectCtx.globalCompositeOperation = 'destination-out';
    effectCtx.fillStyle = '#000';
    for (let y = 0; y < sampled.rows; y++) for (let x = 0; x < sampled.cols; x++) {
      const delay = transitionDelay(x, y);
      const local = clamp((p - delay * .72) / (1 - delay * .72));
      if (local <= 0) continue;
      const amount = ease(local);
      const pad = (1 - amount) * Math.min(cw, ch) * .48;
      const jitter = (hash(x + 91, y + 17) - .5) * Math.min(cw, ch) * .10;
      const px = x * cw + pad + jitter;
      const py = y * ch + pad - jitter;
      const rw = Math.max(.5, cw - pad * 2);
      const rh = Math.max(.5, ch - pad * 2);
      effectCtx.beginPath();
      if (effectCtx.roundRect) effectCtx.roundRect(px, py, rw, rh, Math.min(rw, rh) * .32);
      else effectCtx.rect(px, py, rw, rh);
      effectCtx.fill();
    }
    effectCtx.restore();
    g.drawImage(effectCanvas, 0, 0);

    // Los caracteres nacen a la vez que se retiran las formas orgánicas.
    for (let y = 0; y < sampled.rows; y++) for (let x = 0; x < sampled.cols; x++) {
      const i = (y * sampled.cols + x) * 4;
      const lum = lumAt(sampled.data, i);
      if (lum < .025) continue;
      const delay = transitionDelay(x, y);
      const local = clamp((p - delay * .72) / (1 - delay * .72));
      if (local <= 0) continue;
      g.save();
      g.globalAlpha = ease(local);
      drawAscii(g, x, y, i, lum, x * cw, y * ch, time);
      g.restore();
    }
  }

  function drawAsciiFrame(g, time) {
    fillBackground(g);
    for (let y = 0; y < sampled.rows; y++) for (let x = 0; x < sampled.cols; x++) {
      const i = (y * sampled.cols + x) * 4;
      const lum = lumAt(sampled.data, i);
      if (lum < .025) continue;
      drawAscii(g, x, y, i, lum, x * cw, y * ch, time);
    }
  }
  function drawAscii(g,x,y,i,lum,px,py,time){
    const idx=Math.floor(lum*(chars.length-1));if(idx<2)return;
    const wobble=Math.floor((Math.sin(time*.003+x*.21+y*.13)+1)*1.5);
    const chx=chars[clamp(idx+wobble,0,chars.length-1)];
    const color=mix(violet,bright,lum*.82);
    g.fillStyle=`rgba(${color.join(',')},${.52+lum*.48})`;
    g.font=`${Math.max(7,ch*.86)}px "JetBrains Mono",monospace`;
    g.textBaseline='middle';g.fillText(chx,px,py+ch*.52);
  }
  function dissolveAscii(g, time, stageStart, stageEnd) {
    const p = clamp((time - stageStart) / (stageEnd - stageStart));
    effectCtx.globalCompositeOperation = 'source-over';
    effectCtx.globalAlpha = 1;
    effectCtx.clearRect(0, 0, W, H);
    fillBackground(effectCtx);

    // La última fase trabaja sobre la capa ASCII (nunca vuelve a dibujar las formas).
    for (let y = 0; y < sampled.rows; y++) for (let x = 0; x < sampled.cols; x++) {
      const i = (y * sampled.cols + x) * 4;
      const lum = lumAt(sampled.data, i);
      if (lum < .025) continue;
      const rawBase = Math.floor(lum * (chars.length - 1));
      if (rawBase < 2) continue;
      const originalWobble = Math.floor((Math.sin(time * .003 + x * .21 + y * .13) + 1) * 1.5);
      const base = clamp(rawBase + originalWobble, 0, chars.length - 1);
      const sparse = 1 + Math.floor(hash(x + 19, y + 53) * 7);
      const flicker = Math.floor((Math.sin(time * .012 + hash(x + 7, y + 29) * 9) + 1) * 1.2);
      const idx = clamp(Math.round(base * .72 + sparse * .28) + flicker, 0, chars.length - 1);
      const color = mix(violet, bright, lum * .82);
      effectCtx.fillStyle = `rgb(${color.join(',')})`;
      effectCtx.globalAlpha = .52 + lum * .48;
      effectCtx.font = `${Math.max(7, ch * .86)}px "JetBrains Mono",monospace`;
      effectCtx.textBaseline = 'middle';
      effectCtx.fillText(chars[idx], x * cw, y * ch + ch * .52);
    }

    // Disolución regional con bordes redondeados; las zonas transparentes revelan el DOM real.
    effectCtx.save();
    effectCtx.globalAlpha = 1;
    effectCtx.globalCompositeOperation = 'destination-out';
    effectCtx.fillStyle = '#000';
    for (let y = 0; y < sampled.rows; y++) for (let x = 0; x < sampled.cols; x++) {
      const delay = transitionDelay(x, y, 15, 10);
      const local = clamp((p - delay * .58) / (1 - delay * .58));
      if (local <= 0) continue;
      const amount = ease(local);
      const pad = (1 - amount) * Math.min(cw, ch) * .48;
      const jitter = (hash(x + 19, y + 83) - .5) * Math.min(cw, ch) * .10;
      const px = x * cw + pad + jitter;
      const py = y * ch + pad - jitter;
      const rw = Math.max(.5, cw - pad * 2);
      const rh = Math.max(.5, ch - pad * 2);
      effectCtx.beginPath();
      if (effectCtx.roundRect) effectCtx.roundRect(px, py, rw, rh, Math.min(rw, rh) * .32);
      else effectCtx.rect(px, py, rw, rh);
      effectCtx.fill();
    }
    effectCtx.restore();
    g.clearRect(0, 0, W, H);
    g.drawImage(effectCanvas, 0, 0);
  }
  let dissolving=false;
  function beginDissolve(){
    if(dissolving)return;
    dissolving=true;
    document.documentElement.classList.remove('intro-pending');
    overlay.classList.add('is-dissolving');
  }
  function finish(skipped=false){
    if(stopped)return;stopped=true;if(frame)cancelAnimationFrame(frame);
    removeEventListener('pointerdown',unlockOnce,true);
    removeEventListener('keydown',unlockOnce,true);
    removeEventListener('touchstart',unlockOnce,true);
    document.body.classList.remove('intro-active');document.documentElement.classList.remove('intro-pending');
    overlay.classList.add('is-leaving');overlay.setAttribute('aria-hidden','true');
    if(audioCtx){audioCtx.close().catch(()=>{});audioCtx=null;}
    setTimeout(()=>overlay.remove(),skipped?140:220);
  }
  skip.addEventListener('click',()=>finish(true));
  const onKey=e=>{if(e.key==='Escape'&&!stopped){finish(true);removeEventListener('keydown',onKey);}};
  addEventListener('keydown',onKey);
  addEventListener('resize',()=>finish(true),{once:true,passive:true});
  function render(now){
    if(stopped)return;
    if(document.hidden){frame=requestAnimationFrame(render);return;}
    if(now-lastDraw<48){frame=requestAnimationFrame(render);return;} lastDraw=now;
    const t=now-startedAt;ctx.clearRect(0,0,W,H);
    if(t<800){organic(ctx,t);}
    else if(t<2200){organicToAscii(ctx,t,800,2200);}
    else if(t<2900){drawAsciiFrame(ctx,t);}
    else if(t<duration){
      beginDissolve();
      dissolveAscii(ctx,t,2900,duration);
    }else{
      // Render the exact fully-dissolved endpoint before removing the overlay.
      // The 48 ms frame throttle can otherwise skip the final p=1 frame and
      // expose the real page in one visible step.
      dissolveAscii(ctx, duration, 2900, duration);
      frame = requestAnimationFrame(() => finish(false));
      return;
    }
    if(t>140)cue(0);
    if(t>840)cue(1);
    if(t>2980)cue(2);
    frame=requestAnimationFrame(render);
  }
  const bootGuard = setTimeout(() => { if (!startedAt && !stopped) finish(true); }, 10000);
  async function start(){
    try{
      await Promise.race([document.fonts?.ready||Promise.resolve(),new Promise(r=>setTimeout(r,420))]);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      if(stopped)return;
      source=await capturePage();
      if(stopped)return;
      sampled = sample(source, cell, cell * 1.12);
      cw = W / sampled.cols; ch = H / sampled.rows;
      clearTimeout(bootGuard);
      ctx.imageSmoothingEnabled=true;startedAt=performance.now();frame=requestAnimationFrame(render);
    }catch(err){console.warn('Intro skipped:',err);finish(true);}
  }
  // The overlay was painted before this script; the site continues loading behind it.
  start();
})();
