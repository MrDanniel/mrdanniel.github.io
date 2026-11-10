/* Páginas de aplicaciones: botón de Google Play y galería */
(() => {
  const cfg = window.DCS_APPS || {};
  document.querySelectorAll('[data-play]').forEach(el => {
    const app = cfg[el.dataset.play];
    if (!app || !app.live || !app.package) return;
    const a = document.createElement('a');
    a.className = el.className.replace(/\bis-off\b/, '').trim();
    a.href = 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(app.package);
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Descargar ' + app.name + ' en Google Play');
    a.innerHTML = el.innerHTML.replace(/Próximamente en/i, 'Disponible en');
    el.replaceWith(a);
  });
  document.querySelectorAll('[data-live-text]').forEach(el => {
    const app = cfg[el.dataset.liveText]; if (!app || !app.live) return;
    el.textContent = el.dataset.liveTo || el.textContent; el.classList.add('is-live');
  });
  document.querySelectorAll('.gal').forEach(g => {
    const tr = g.querySelector('.gal-track'); if (!tr) return;
    g.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => {
      tr.scrollBy({ left: (+b.dataset.dir) * Math.min(tr.clientWidth * .8, 520), behavior: 'smooth' });
    }));
  });
})();
