// Buscador del sitio y botón de copiar enlace. No usa librerías externas.
(function () {
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var copy = document.querySelector('[data-copy]');
  if (copy && navigator.clipboard) {
    copy.hidden = false;
    copy.addEventListener('click', function () {
      navigator.clipboard.writeText(location.href.split('#')[0]).then(function () {
        copy.textContent = 'Enlace copiado';
        setTimeout(function () { copy.textContent = 'Copiar enlace'; }, 2500);
      });
    });
  }

  var box = document.getElementById('res');
  if (!box) return;
  var info = document.getElementById('res-info');
  var input = document.getElementById('q2');
  var q = new URLSearchParams(location.search).get('q') || '';
  input.value = q;
  if (!q.trim()) { info.textContent = 'Escriba un término para buscar.'; return; }
  var base = document.querySelector('link[href$="assets/style.css"]').getAttribute('href').replace(/assets\/style\.css$/, '');
  fetch(base + 'search-index.json').then(function (r) { return r.json(); }).then(function (items) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    var hits = items.map(function (it) {
      var campos = { t: 5, s: 3, a: 3, c: 2, g: 3, x: 1 }, score = 0;
      var ok = terms.every(function (t) {
        var found = false;
        for (var k in campos) if (norm(it[k]).indexOf(t) !== -1) { score += campos[k]; found = true; }
        return found;
      });
      return ok ? { it: it, score: score } : null;
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
    info.textContent = hits.length ? hits.length + (hits.length === 1 ? ' resultado' : ' resultados') + ' para "' + q + '"' : 'No hay resultados para "' + q + '". Pruebe con otra palabra o revise la ortografía.';
    box.innerHTML = hits.map(function (h) {
      var it = h.it;
      return '<article class="card">' + (it.i ? '<a class="card-img" href="' + esc(it.u) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(it.i) + '" alt="" loading="lazy"></a>' : '') +
        '<div class="card-body"><span class="cat">' + esc(it.c) + '</span><h3><a href="' + esc(it.u) + '">' + esc(it.t) + '</a></h3><p>' + esc(it.x) + '</p><p class="meta">' + (it.a ? esc(it.a) + ', ' : '') + esc(it.d) + '</p></div></article>';
    }).join('');
  }).catch(function () { info.textContent = 'No se pudo cargar el buscador. Recargue la página.'; });
})();
