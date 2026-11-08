// Página de recepción de enlaces de Ritmmo (https://dominio/ritmmo/i/1#DATOS).
// Formato: JSON → Deflate (zlib) → Base64 URL-safe. Todo se lee en el navegador: no se envía nada.
// La app omite al codificar los valores por defecto (encodeDefaults=false); aquí se reponen.
(function () {
  "use strict";
  var MAX_PAYLOAD = 30000, MAX_RAW = 262144, MAX_LINES = 14;
  var PKG = "com.ritmmo.dcs";
  var $ = function (id) { return document.getElementById(id); };
  var DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var KINDS = { TASK: "Tarea", SHOPPING: "Compras", HABIT: "Hábito", ROUTINE: "Rutina", EVENT: "Evento", NOTE: "Nota" };
  var ICONS = {
    R: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="3.5" r="1" fill="currentColor"/></svg>',
    N: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/></svg>',
    H: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    A: '<svg viewBox="0 0 24 24"><path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/></svg>',
    T: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/></svg>'
  };
  var payload = (location.hash || "").slice(1);
  var android = /Android/i.test(navigator.userAgent);
  var cfg = (window.DCS_APPS && window.DCS_APPS.ritmmo) || null;
  var shownLines = 0, hiddenLines = 0;

  /* ── utilidades de texto ── */
  function str(v, n) { return typeof v === "string" ? v.slice(0, n || 400) : ""; }
  function arr(v) { return Array.isArray(v) ? v.slice(0, 100) : []; }
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function pad(n) { return ("0" + n).slice(-2); }
  function hhmm(m) { m = num(m, 0); return pad(Math.floor(m / 60) % 24) + ":" + pad(m % 60); }
  function dayDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(s, 40)); if (!m) return "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (isNaN(d)) return "";
    return DAYS[(d.getUTCDay() + 6) % 7].toLowerCase() + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pill(text, cls) { if (text) $("pills").appendChild(el("span", "pill" + (cls ? " " + cls : ""), text)); }
  function line(text, cls) {
    if (!text) return;
    if (shownLines >= MAX_LINES) { hiddenLines++; return; }
    shownLines++; $("lines").appendChild(el("li", cls || "", text));
  }
  function daysPills(list) {
    var set = Array.isArray(list) ? list : [1, 2, 3, 4, 5, 6, 7];
    DAYS.forEach(function (d, i) { pill(d, set.indexOf(i + 1) >= 0 ? "on" : "off"); });
  }
  function argb(v) {
    if (typeof v !== "number" || !isFinite(v)) return "";
    var n = v >>> 0; return "#" + ("000000" + (n & 0xffffff).toString(16)).slice(-6);
  }

  /* ── contenido ── */
  function noteLines(n, nested) {
    if (!n) return;
    if (nested) line("Nota · " + str(n.title), "head");
    else line(str(n.title), "head");
    if (str(n.details)) line(str(n.details), "note" + (nested ? " subitem" : ""));
    arr(n.items).forEach(function (i) { line(str(i), "check" + (nested ? " subitem" : "")); });
  }
  function rhythmLines(r) {
    if (!r) return;
    if (str(r.notes)) line(str(r.notes), "note");
    arr(r.items).forEach(function (i) { line(str(i), "check"); });
    arr(r.linkedNotes).forEach(function (n) { noteLines(n, true); });
  }
  function rhythmPills(r) {
    if (r.durationUnknown) pill("Sin duración fija"); else pill(num(r.durationMinutes, 15) + " min");
    var t = r.timing || {};
    pill(dayDate(t.day)); if (/^\d{2}:\d{2}/.test(str(t.time, 10))) pill(str(t.time, 5));
    if (str(t.deadline)) { var dl = dayDate(t.deadline); if (dl) pill("Límite " + dl); }
    var k = KINDS[r.kind]; if (k && r.kind !== "TASK") pill(k);
  }
  function setKind(code, label, sub) {
    var card = $("preview"); card.className = "card t-" + code;
    $("ico").innerHTML = ICONS[code]; $("kind").textContent = label; $("sub").textContent = sub || "";
    $("chip").textContent = label;
  }
  function render(v) {
    var t = v.t, plural, title;
    if (t === "R" && v.r) {
      title = str(v.r.title); setKind("R", "Ritmo", "Tarea con calma"); plural = "un Ritmo";
      var c = argb(v.r.colorArgb); if (c) $("preview").style.setProperty("--c", c);
      rhythmPills(v.r); rhythmLines(v.r);
    } else if (t === "N" && v.n) {
      title = str(v.n.title); setKind("N", "Nota", "Para recordar"); plural = "una nota";
      var cn = argb(v.n.colorArgb); if (cn) $("preview").style.setProperty("--c", cn);
      if (str(v.n.details)) line(str(v.n.details), "note");
      arr(v.n.items).forEach(function (i) { line(str(i), "check"); });
    } else if (t === "H" && v.h) {
      title = str(v.h.name); setKind("H", "Horario", "Bloque semanal"); plural = "un horario";
      var ch = argb(v.h.colorArgb); if (ch) $("preview").style.setProperty("--c", ch);
      var big = $("big"); big.hidden = false; big.textContent = hhmm(v.h.startMinute) + " – " + hhmm(v.h.endMinute);
      daysPills(v.h.days);
      var opts = arr(v.h.options);
      if (opts.length) { line("Opciones para elegir", "head"); opts.forEach(function (o) { line(str(o.title)); }); }
      var rs = arr(v.rs).slice(0, 30), ns = arr(v.ns).slice(0, 30);
      if (rs.length) { line(rs.length + (rs.length === 1 ? " Ritmo incluido" : " Ritmos incluidos"), "head"); rs.forEach(function (r) { line(str(r.title)); }); }
      if (ns.length) { line(ns.length + (ns.length === 1 ? " nota incluida" : " notas incluidas"), "head"); ns.forEach(function (n) { line(str(n.title)); }); }
    } else if ((t === "A" || t === "T") && v.a) {
      title = str(v.a.title);
      if (t === "A") {
        setKind("A", "Alarma", "Se recibe desactivada"); plural = "una alarma";
        var ba = $("big"); ba.hidden = false; ba.textContent = hhmm(num(v.a.minute, 480));
        if (arr(v.a.days).length) daysPills(v.a.days); else pill("Una vez", "on");
      } else {
        setKind("T", "Temporizador", "Se recibe desactivado"); plural = "un temporizador";
        var sec = num(v.a.seconds, 1200), bt = $("big"); bt.hidden = false;
        bt.textContent = pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); var u = el("small", "", "min"); bt.appendChild(u);
      }
    } else throw new Error("tipo");
    $("title").textContent = title || "Sin título";
    $("heading").textContent = "Te compartieron " + plural;
    $("eyebrow").textContent = "Compartido contigo";
    if (hiddenLines) { $("more").hidden = false; $("more").textContent = "y " + hiddenLines + " elemento" + (hiddenLines === 1 ? "" : "s") + " más. Verás todo en la app."; }
    $("preview").hidden = false;
  }

  /* ── decodificación ── */
  function b64urlToBytes(s) {
    var b = s.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "=";
    var bin = atob(b), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function inflate(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    var reader = stream.getReader(), chunks = [], total = 0;
    for (;;) {
      var r = await reader.read(); if (r.done) break;
      total += r.value.length; if (total > MAX_RAW) throw new Error("grande");
      chunks.push(r.value);
    }
    var all = new Uint8Array(total), off = 0;
    chunks.forEach(function (c) { all.set(c, off); off += c.length; });
    return new TextDecoder("utf-8", { fatal: true }).decode(all);
  }

  /* ── botones y plataforma ── */
  function setupStore() {
    var play = $("play"), live = cfg ? !!cfg.live : true, pkg = (cfg && cfg.package) || PKG;
    play.href = "https://play.google.com/store/apps/details?id=" + encodeURIComponent(pkg);
    if (!live) { play.setAttribute("aria-disabled", "true"); play.removeAttribute("href"); $("play-small").textContent = "Próximamente en"; }
  }
  function setupActions() {
    setupStore();
    $("copy").hidden = false;
    $("copy").addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { $("copy").textContent = "Enlace copiado ✓"; }, function () {});
    });
    if (android) { $("open").href = "ritmmo://import/1/" + payload; $("open").hidden = false; }
    else {
      var p = $("platform"); p.hidden = false;
      p.textContent = "Ritmmo es una app de Android. Abre este enlace desde tu teléfono Android, o cópialo y envíatelo.";
    }
  }
  function fail(msg) {
    $("preview").hidden = true; $("error").hidden = false; $("error").textContent = msg;
    $("heading").textContent = "No pudimos leer este enlace";
    $("lead").textContent = "Puedes instalar Ritmmo y pedirle a quien lo envió que lo comparta de nuevo.";
  }

  if (!payload || payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    setupStore(); fail("Este enlace está incompleto. Pídele a quien lo envió que lo comparta de nuevo."); return;
  }
  setupActions();
  if (typeof DecompressionStream === "undefined") return; // sin vista previa en navegadores antiguos
  inflate(b64urlToBytes(payload)).then(function (raw) { render(JSON.parse(raw)); })
    .catch(function () { fail("No se pudo leer el contenido de este enlace."); });
})();
