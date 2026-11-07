// Decodifica el contenido del enlace (https://dominio/i/1#DATOS) en el navegador.
// Formato: JSON → Deflate (zlib) → Base64 URL-safe. Nada se envía a ningún servidor.
(function () {
  "use strict";
  var MAX_PAYLOAD = 30000, MAX_RAW = 262144;
  var $ = function (id) { return document.getElementById(id); };
  var DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  var payload = (location.hash || "").slice(1);

  function fail(msg) {
    $("preview").hidden = true; $("error").hidden = false; $("error").textContent = msg;
    $("lead").textContent = "Aun así puedes instalar Ritmmo y volver a tocar el enlace desde el chat.";
  }
  function hhmm(m) { return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2); }
  function str(v) { return typeof v === "string" ? v.slice(0, 400) : ""; }
  function arr(v) { return Array.isArray(v) ? v.slice(0, 100) : []; }
  function dayNames(list) { return arr(list).map(function (d) { return DAYS[d - 1] || ""; }).join(" "); }
  function daysText(list, empty) {
    if (!Array.isArray(list)) return empty; // la app omite el valor por defecto
    if (list.length === 7) return "todos los días";
    return list.length ? dayNames(list) : empty;
  }
  function line(list, text, check) {
    if (!text) return; var li = document.createElement("li");
    if (check) li.className = "check"; li.textContent = text; list.appendChild(li);
  }
  function noteLines(list, n) {
    if (!n) return; line(list, str(n.title)); line(list, str(n.details));
    arr(n.items).forEach(function (i) { line(list, str(i), true); });
  }
  function rhythmLines(list, r) {
    if (!r) return;
    var dur = r.durationUnknown ? "sin duración" : ((typeof r.durationMinutes === "number" ? r.durationMinutes : 15) + " min");
    line(list, str(r.title) + (dur ? " · " + dur : "")); line(list, str(r.notes));
    arr(r.items).forEach(function (i) { line(list, str(i), true); });
    arr(r.linkedNotes).forEach(function (n) { noteLines(list, n); });
  }
  function render(v) {
    var list = $("lines"), kind = "", title = "";
    if (v.t === "R" && v.r) { kind = "Ritmo"; title = str(v.r.title); rhythmLines(list, v.r); }
    else if (v.t === "N" && v.n) { kind = "Nota"; title = str(v.n.title); noteLines(list, { details: v.n.details, items: v.n.items }); }
    else if (v.t === "H" && v.h) {
      kind = "Horario"; title = str(v.h.name);
      var days = daysText(v.h.days, "todos los días");
      line(list, hhmm(v.h.startMinute) + "–" + hhmm(v.h.endMinute) + (days ? " · " + days : ""));
      arr(v.h.options).forEach(function (o) { line(list, "Opción: " + str(o.title)); });
      arr(v.rs).slice(0, 30).forEach(function (r) { rhythmLines(list, r); });
      arr(v.ns).slice(0, 30).forEach(function (n) { noteLines(list, n); });
    } else if ((v.t === "A" || v.t === "T") && v.a) {
      kind = v.t === "A" ? "Alarma" : "Temporizador"; title = str(v.a.title);
      if (v.t === "A") line(list, hhmm(typeof v.a.minute === "number" ? v.a.minute : 480) + (arr(v.a.days).length ? " · " + daysText(v.a.days, "") : " · una vez"));
      else { var sec = typeof v.a.seconds === "number" ? v.a.seconds : 1200; line(list, Math.floor(sec / 60) + " min " + (sec % 60) + " s"); }
    } else throw new Error("tipo");
    $("kind").textContent = kind; $("title").textContent = title || "Sin título";
    $("heading").textContent = "Te compartieron " + ({ Ritmo: "un Ritmo", Nota: "una nota", Horario: "un horario", Alarma: "una alarma", Temporizador: "un temporizador" }[kind] || "algo");
    $("preview").hidden = false;
  }
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

  if (!payload || payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    fail("Este enlace está incompleto. Pídele a quien lo envió que lo comparta de nuevo."); return;
  }
  $("open").href = "ritmmo://import/1/" + payload; $("open").hidden = false;
  $("copy").hidden = false;
  $("copy").addEventListener("click", function () {
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { $("copy").textContent = "Enlace copiado"; }, function () {});
  });
  if (typeof DecompressionStream === "undefined") return; // sin vista previa en navegadores antiguos
  inflate(b64urlToBytes(payload)).then(function (raw) { render(JSON.parse(raw)); })
    .catch(function () { fail("No se pudo leer el contenido de este enlace."); });
})();
