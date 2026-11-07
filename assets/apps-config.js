/* ───────────────────────────────────────────────────────────────
   CONFIGURACIÓN DE LAS APLICACIONES  (único archivo que debes editar al publicar)

   Cuando una app esté publicada en Google Play:
     1. Cambia  live: false  →  live: true
     2. Comprueba que "package" coincide con el ID de la app en Play Console.
   El botón "Próximamente en Google Play" pasará solo a ser un enlace real a
     https://play.google.com/store/apps/details?id=<package>
   en la página de la app y en las tarjetas que usen data-play="<clave>".
   ─────────────────────────────────────────────────────────────── */
window.DCS_APPS = {
  stringtune: { name: 'StringTune', package: 'com.danielcanales.stringtune', live: false },
  ritmmo:     { name: 'Ritmmo',     package: 'com.ritmmo.dcs',     live: false }
  senador:    { name: 'Señador',    package: 'com.danielcanales.senador',    live: false }  // package SUPUESTO: confirma el real
};
