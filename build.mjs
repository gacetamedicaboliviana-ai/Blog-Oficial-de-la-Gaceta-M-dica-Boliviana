// Generador del sitio de la Gaceta Médica Boliviana (editoriales y opinión).
// Lee content/*.md y site.json y escribe el sitio estático en _site/.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { marked } from 'marked';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '_site');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const BASE = SITE_URL ? new URL(SITE_URL).pathname.replace(/\/$/, '') : '';
const DRAFTS = process.argv.includes('--drafts');

// ---------- utilidades ----------
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const dstr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10));
const refKey = (v) => { v = Array.isArray(v) ? v[0] : v; return v ? slugify(path.basename(String(v)).replace(/\.md$/, '')) : ''; };
const u = (p) => BASE + p;
const abs = (p) => (SITE_URL ? SITE_URL.replace(BASE, '') + BASE + p : p);
const img = (p) => (!p ? '' : String(p).startsWith('/') ? BASE + p : p);
const warn = (m) => console.warn('AVISO: ' + m);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const fmtLong = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fecha = (s) => fmtLong.format(new Date(s + 'T00:00:00Z'));
const plain = (md) => String(md ?? '').replace(/<[^>]*>/g, ' ').replace(/^\s*([-*+]|\d+\.)\s+/gm, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`~]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (t, n) => { const w = t.split(' '); return w.length > n ? w.slice(0, n).join(' ') + '…' : t; };
const iniciales = (n) => String(n || '').replace(/\b(Dr|Dra|Lic|Msc|MSc|PhD)\.?\s/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');

// ---------- Markdown seguro ----------
marked.use({
  gfm: true,
  renderer: {
    html(t) { return esc(t.text ?? t); }, // el HTML crudo se muestra como texto, no se ejecuta
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (/^\s*(javascript|data):/i.test(href)) return text;
      const ext = /^https?:\/\//i.test(href);
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    },
    image({ href, title, text }) {
      return `<img src="${esc(img(href))}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy">`;
    },
  },
});
const md = (s) => marked.parse(String(s ?? ''));

// ---------- lectura de contenido ----------
function front(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: yaml.load(m[1]) || {}, body: m[2] };
}
function loadDir(dir) {
  const d = path.join(ROOT, 'content', dir);
  if (!exists(d)) return [];
  const out = [];
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.md'))) {
    try {
      const { data, body } = front(read(path.join(d, f)));
      out.push({ ...data, body, slug: slugify(f.replace(/\.md$/, '')), archivo: f });
    } catch (e) { warn(`No se pudo leer content/${dir}/${f}: ${e.message}. Se omite.`); }
  }
  return out;
}

const site = JSON.parse(read(path.join(ROOT, 'site.json')));
const OJS = site.ojs?.url || '';
const autores = loadDir('autores').filter((a) => a.nombre);
const categorias = loadDir('categorias').filter((c) => c.titulo);
categorias.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99) || a.titulo.localeCompare(b.titulo, 'es'));

let editoriales = loadDir('editoriales').filter((e) => e.titulo).filter((e) => {
  if (DRAFTS) return true;
  return e.estado === 'publicada' && (dstr(e.fecha) || today) <= today;
});
for (const e of editoriales) {
  e.fechaISO = dstr(e.fecha) || today;
  e.url = `/editoriales/${e.slug}/`;
  const ck = refKey(e.categoria);
  let c = categorias.find((x) => x.slug === ck || slugify(x.titulo) === ck);
  if (!c) { c = { titulo: e.categoria ? String(e.categoria) : 'Editoriales', slug: ck || 'editoriales', virtual: true }; categorias.push(c); }
  e.cat = c;
  const ak = refKey(e.autor);
  e.aut = autores.find((x) => x.slug === ak || slugify(x.nombre) === ak) || (e.autor ? { nombre: String(e.autor), slug: '', virtual: true } : null);
  e.html = md(e.body);
  e.refsHtml = e.referencias ? md(e.referencias) : '';
  e.extracto = e.resumen ? String(e.resumen) : words(plain(e.body), 38);
  e.minutos = Math.max(1, Math.round(plain(e.body).split(' ').length / 200));
  e.etiq = Array.isArray(e.etiquetas) ? e.etiquetas : e.etiquetas ? String(e.etiquetas).split(',').map((x) => x.trim()) : [];
}
editoriales.sort((a, b) => b.fechaISO.localeCompare(a.fechaISO) || a.titulo.localeCompare(b.titulo, 'es'));
for (const c of categorias) { c.url = `/categorias/${c.slug}/`; c.items = editoriales.filter((e) => e.cat === c); }
for (const a of autores) { a.url = `/autores/${a.slug}/`; a.items = editoriales.filter((e) => e.aut === a); }
const catsUsadas = categorias.filter((c) => c.items.length);

// ---------- plantillas ----------
const logoOk = (p) => p && exists(path.join(ROOT, p.replace(/^\//, '')));
const logo = (k, alt, cls) => (logoOk(site.logos?.[k]) ? `<img class="${cls}" src="${img(site.logos[k])}" alt="${esc(alt)}">` : '');
const ext = (href, txt, cls = '') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;

function layout({ titulo, desc, ruta, main, imagen, tipo = 'website', ld, noindex }) {
  const full = titulo === site.nombre ? `${site.nombre}: ${site.plataforma}` : `${titulo} | ${site.nombre}`;
  const d = desc || site.descripcion;
  const og = imagen || site.imagenCompartir;
  const canon = SITE_URL ? `<link rel="canonical" href="${esc(abs(ruta))}">` : '';
  const nav = [['/', 'Inicio'], ['/editoriales/', 'Editoriales'], ['/autores/', 'Autores']]
    .map(([h, t]) => `<a href="${u(h)}"${ruta === h ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(d)}">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'">
<meta name="referrer" content="strict-origin-when-cross-origin">
${noindex ? '<meta name="robots" content="noindex">' : ''}${canon}
<meta property="og:site_name" content="${esc(site.nombre)}"><meta property="og:type" content="${tipo}">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(d)}"><meta property="og:locale" content="es_BO">
${SITE_URL ? `<meta property="og:url" content="${esc(abs(ruta))}">` : ''}${og ? `<meta property="og:image" content="${esc(og.startsWith('http') ? og : SITE_URL.replace(BASE, '') + img(og))}">` : ''}
<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Public+Sans:wght@400;600;700&display=swap">
<link rel="stylesheet" href="${u('/assets/style.css')}">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}
</head><body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<div class="ojs-bar"><div class="wrap">${OJS ? ext(OJS, 'Visitar la revista oficial (OJS)') : ''}</div></div>
<header class="masthead"><div class="wrap masthead-in">
  <a class="brand" href="${u('/')}">${logo('gaceta', site.nombre, 'brand-logo')}<span class="brand-txt"><strong>${esc(site.nombre)}</strong><span>${esc(site.plataforma)}</span></span></a>
  <nav aria-label="Principal">${nav}${OJS ? ext(OJS, 'Revista científica', 'nav-ojs') : ''}</nav>
  <form class="search" role="search" action="${u('/buscar/')}"><label class="sr" for="q">Buscar en la plataforma</label><input id="q" name="q" type="search" placeholder="Buscar editoriales y autores" autocomplete="off"><button type="submit">Buscar</button></form>
</div></header>
<main id="contenido">${main}</main>
${footer()}
<script src="${u('/assets/app.js')}" defer></script>
</body></html>`;
}

function footer() {
  const l = site.enlaces || {};
  const o = site.ojs || {};
  const inst = [[o.url, 'Revista oficial (OJS)'], [o.archivo, 'Archivo de números'], [o.instrucciones, 'Instrucciones para autores'], [l.facultad, site.facultad], [l.umss, site.universidad]].filter(([h]) => h);
  const redes = (site.redes || []).filter((r) => r.url && r.nombre);
  return `<footer class="foot"><div class="wrap foot-grid">
  <div><div class="foot-logos">${logo('gaceta', site.nombre, 'foot-logo')}${logo('facultad', site.facultad, 'foot-logo')}${logo('umss', site.universidad, 'foot-logo')}</div>
  <p class="foot-name">${esc(site.nombre)}</p><p>${esc(site.facultad)}<br>${esc(site.universidad)}</p></div>
  <div><h2>Enlaces institucionales</h2><ul>${inst.map(([h, t]) => `<li>${ext(h, esc(t))}</li>`).join('')}</ul></div>
  <div><h2>Contacto editorial</h2>${site.contacto?.email ? `<p><a href="mailto:${esc(site.contacto.email)}">${esc(site.contacto.email)}</a></p>` : ''}${site.contacto?.direccion ? `<p>${esc(site.contacto.direccion)}</p>` : ''}${redes.length ? `<ul>${redes.map((r) => `<li>${ext(r.url, esc(r.nombre))}</li>`).join('')}</ul>` : ''}
  <p><a href="https://app.pagescms.org" target="_blank" rel="noopener noreferrer">Acceso editorial</a></p></div>
  </div><div class="wrap foot-base"><p>© ${new Date().getFullYear()} ${esc(site.nombre)}. ${esc(site.derechos)}</p><p><a href="${u('/privacidad/')}">Aviso de privacidad</a></p></div></footer>`;
}

const card = (e) => `<article class="card">${e.imagen ? `<a class="card-img" href="${u(e.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(img(e.imagen))}" alt="" loading="lazy"></a>` : ''}<div class="card-body"><a class="cat" href="${u(e.cat.url)}">${esc(e.cat.titulo)}</a><h3><a href="${u(e.url)}">${esc(e.titulo)}</a></h3><p>${esc(words(e.extracto, 30))}</p><p class="meta">${e.aut ? esc(e.aut.nombre) + ', ' : ''}<time datetime="${e.fechaISO}">${fecha(e.fechaISO)}</time></p><a class="more" href="${u(e.url)}">Leer más<span class="sr"> sobre ${esc(e.titulo)}</span></a></div></article>`;
const avatar = (a, cls = 'av') => (a?.foto ? `<img class="${cls}" src="${esc(img(a.foto))}" alt="" loading="lazy">` : `<span class="${cls} av-ini" aria-hidden="true">${esc(iniciales(a?.nombre))}</span>`);
const grado = (a) => [a.grado, a.afiliacion].filter(Boolean).map(esc).join('. ');
const vacio = (t) => `<p class="empty">${t}</p>`;

// ---------- páginas ----------
const pages = [];
const add = (ruta, html) => pages.push([ruta, html]);

// Inicio
{
  const dest = editoriales.find((e) => e.destacada) || editoriales[0];
  const resto = editoriales.filter((e) => e !== dest).slice(0, 6);
  const hero = dest ? `<section class="hero"><div class="wrap hero-grid${dest.imagen ? '' : ' solo'}"><div class="hero-text">
    <a class="cat" href="${u(dest.cat.url)}">${esc(dest.cat.titulo)}</a>
    <h1><a href="${u(dest.url)}">${esc(dest.titulo)}</a></h1>${dest.subtitulo ? `<p class="sub">${esc(dest.subtitulo)}</p>` : ''}
    <p class="lede">${esc(words(dest.extracto, 55))}</p>
    <p class="meta">${dest.aut ? esc(dest.aut.nombre) + ', ' : ''}<time datetime="${dest.fechaISO}">${fecha(dest.fechaISO)}</time></p>
    <a class="btn" href="${u(dest.url)}">Leer la editorial completa</a></div>
    ${dest.imagen ? `<a class="hero-img" href="${u(dest.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(img(dest.imagen))}" alt=""></a>` : ''}</div></section>`
    : `<section class="hero"><div class="wrap"><h1 class="empty-h">${esc(site.nombre)}</h1>${vacio('Aún no hay editoriales publicadas.')}</div></section>`;
  const ultimas = resto.length ? `<section class="block"><div class="wrap"><div class="block-h"><h2>Últimas publicaciones</h2><a href="${u('/editoriales/')}">Ver todas</a></div><div class="grid">${resto.map(card).join('')}</div></div></section>` : '';
  const cats = catsUsadas.length ? `<section class="block alt"><div class="wrap two"><div><h2>Explorar por categorías</h2><p class="muted">Cada categoría reúne las editoriales y textos de opinión de un mismo tema.</p></div><ul class="catlist">${catsUsadas.map((c) => `<li><a href="${u(c.url)}"><span>${esc(c.titulo)}</span><span class="count">${c.items.length}</span></a>${c.descripcion ? `<small>${esc(c.descripcion)}</small>` : ''}</li>`).join('')}</ul></div></section>` : '';
  const aut = autores.filter((a) => a.items.length).slice(0, 8);
  const autHtml = aut.length ? `<section class="block"><div class="wrap"><div class="block-h"><h2>Autores y colaboradores</h2><a href="${u('/autores/')}">Ver todos</a></div><ul class="authors">${aut.map((a) => `<li><a href="${u(a.url)}">${avatar(a)}<span><strong>${esc(a.nombre)}</strong><small>${grado(a)}</small></span></a></li>`).join('')}</ul></div></section>` : '';
  const o = site.ojs || {}, l = site.enlaces || {};
  const bt = [[o.url, 'Ir a la revista oficial', 'btn light'], [o.archivo, 'Archivo de números', 'btn ghost'], [o.instrucciones, 'Instrucciones para autores', 'btn ghost'], [l.facultad, site.facultad, 'btn ghost'], [l.umss, site.universidad, 'btn ghost']].filter(([h]) => h);
  const vinc = `<section class="band"><div class="wrap two"><div><h2>Revista científica oficial</h2><p>Los artículos científicos originales de la Gaceta Médica Boliviana se publican y se consultan en su plataforma oficial. Esta plataforma reúne los textos editoriales y de opinión que los acompañan.</p></div><div class="band-btns">${bt.map(([h, t, c]) => ext(h, esc(t), c)).join('')}</div></div></section>`;
  add('/', layout({ titulo: site.nombre, ruta: '/', main: hero + ultimas + cats + autHtml + vinc }));
}

// Listado de editoriales
add('/editoriales/', layout({ titulo: 'Editoriales', ruta: '/editoriales/', desc: 'Todas las editoriales y textos de opinión publicados.', main: `<section class="block"><div class="wrap"><h1 class="page-h">Editoriales y opinión</h1>${editoriales.length ? `<div class="grid">${editoriales.map(card).join('')}</div>` : vacio('Aún no hay editoriales publicadas.')}</div></section>` }));

// Categorías
for (const c of categorias.filter((x) => x.items.length || !x.virtual)) {
  add(c.url, layout({ titulo: c.titulo, ruta: c.url, desc: c.descripcion, main: `<section class="block"><div class="wrap"><p class="crumb"><a href="${u('/editoriales/')}">Editoriales</a></p><h1 class="page-h">${esc(c.titulo)}</h1>${c.descripcion ? `<p class="lede">${esc(c.descripcion)}</p>` : ''}${c.items.length ? `<div class="grid">${c.items.map(card).join('')}</div>` : vacio('Aún no hay publicaciones en esta categoría.')}</div></section>` }));
}

// Autores
add('/autores/', layout({ titulo: 'Autores y colaboradores', ruta: '/autores/', main: `<section class="block"><div class="wrap"><h1 class="page-h">Autores y colaboradores</h1>${autores.length ? `<ul class="authors big">${autores.map((a) => `<li><a href="${u(a.url)}">${avatar(a)}<span><strong>${esc(a.nombre)}</strong><small>${grado(a)}</small><small>${a.items.length} ${a.items.length === 1 ? 'publicación' : 'publicaciones'}</small></span></a></li>`).join('')}</ul>` : vacio('Aún no hay autores registrados.')}</div></section>` }));
for (const a of autores) {
  add(a.url, layout({ titulo: a.nombre, ruta: a.url, desc: a.biografia, tipo: 'profile', main: `<section class="block"><div class="wrap"><p class="crumb"><a href="${u('/autores/')}">Autores</a></p><div class="author-head">${avatar(a, 'av xl')}<div><h1 class="page-h tight">${esc(a.nombre)}</h1><p class="muted">${grado(a)}</p>${a.orcid ? `<p>${ext(String(a.orcid).startsWith('http') ? a.orcid : 'https://orcid.org/' + a.orcid, 'ORCID')}</p>` : ''}</div></div>${a.biografia ? `<p class="lede narrow">${esc(a.biografia)}</p>` : ''}<h2>Publicaciones</h2>${a.items.length ? `<div class="grid">${a.items.map(card).join('')}</div>` : vacio('Este autor aún no tiene publicaciones.')}</div></section>` }));
}

// Publicaciones individuales
for (const e of editoriales) {
  const rel = [...editoriales.filter((x) => x !== e && x.cat === e.cat), ...editoriales.filter((x) => x !== e && x.cat !== e.cat)].slice(0, 3);
  const link = abs(e.url);
  const q = encodeURIComponent(link), t = encodeURIComponent(e.titulo);
  const share = `<div class="share"><span>Compartir</span>${ext(`https://wa.me/?text=${t}%20${q}`, 'WhatsApp')}${ext(`https://www.facebook.com/sharer/sharer.php?u=${q}`, 'Facebook')}${ext(`https://www.linkedin.com/sharing/share-offsite/?url=${q}`, 'LinkedIn')}${ext(`https://twitter.com/intent/tweet?text=${t}&url=${q}`, 'X')}<button type="button" data-copy hidden>Copiar enlace</button></div>`;
  const a = e.aut;
  const main = `<article class="art"><header class="art-head wrap-n">
    <a class="cat" href="${u(e.cat.url)}">${esc(e.cat.titulo)}</a><h1>${esc(e.titulo)}</h1>${e.subtitulo ? `<p class="sub">${esc(e.subtitulo)}</p>` : ''}
    <div class="byline">${a ? avatar(a) : ''}<div>${a ? `<p><strong>${a.slug ? `<a href="${u(a.url)}">${esc(a.nombre)}</a>` : esc(a.nombre)}</strong></p>${a.grado || a.afiliacion ? `<p class="muted">${grado(a)}</p>` : ''}` : ''}<p class="muted"><time datetime="${e.fechaISO}">${fecha(e.fechaISO)}</time>. Lectura de ${e.minutos} min</p></div></div></header>
    ${e.imagen ? `<figure class="art-img wrap-w"><img src="${esc(img(e.imagen))}" alt="${esc(e.imagenAlt || '')}">${e.imagenCredito ? `<figcaption>${esc(e.imagenCredito)}</figcaption>` : ''}</figure>` : ''}
    <div class="prose wrap-n">${e.html}</div>
    ${e.refsHtml ? `<section class="refs wrap-n"><h2>Referencias bibliográficas</h2>${e.refsHtml}</section>` : ''}
    ${e.enlaceOjs ? `<aside class="ojs-rel wrap-n"><p>Artículo relacionado en la revista oficial</p>${ext(e.enlaceOjs, 'Leer el artículo en el OJS', 'btn')}</aside>` : ''}
    ${e.etiq.length ? `<p class="tags wrap-n">${e.etiq.map((x) => `<a href="${u('/buscar/?q=' + encodeURIComponent(x))}">${esc(x)}</a>`).join('')}</p>` : ''}
    ${a && (a.biografia || a.orcid || a.email) ? `<aside class="about wrap-n">${avatar(a, 'av lg')}<div><h2>Sobre ${esc(a.nombre)}</h2>${a.biografia ? `<p>${esc(a.biografia)}</p>` : ''}${a.orcid ? `<p>${ext(String(a.orcid).startsWith('http') ? a.orcid : 'https://orcid.org/' + a.orcid, 'ORCID')}</p>` : ''}${a.email ? `<p><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></p>` : ''}</div></aside>` : ''}
    <div class="wrap-n">${share}</div></article>
    ${rel.length ? `<section class="block alt"><div class="wrap"><h2>Otras publicaciones</h2><div class="grid">${rel.map(card).join('')}</div></div></section>` : ''}
    <p class="back wrap"><a href="${u('/')}">Volver al inicio</a></p>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: e.titulo, description: e.extracto, datePublished: e.fechaISO, dateModified: e.fechaISO, inLanguage: 'es', mainEntityOfPage: abs(e.url), articleSection: e.cat.titulo, keywords: e.etiq.join(', ') || undefined, image: e.imagen ? [e.imagen.startsWith('http') ? e.imagen : SITE_URL.replace(BASE, '') + img(e.imagen)] : undefined, author: a ? { '@type': 'Person', name: a.nombre, jobTitle: a.grado || undefined, affiliation: a.afiliacion ? { '@type': 'Organization', name: a.afiliacion } : undefined } : undefined, publisher: { '@type': 'Organization', name: site.nombre, url: OJS || undefined } };
  add(e.url, layout({ titulo: e.titulo, desc: e.extracto, ruta: e.url, main, imagen: e.imagen, tipo: 'article', ld, noindex: DRAFTS && e.estado !== 'publicada' }));
}

// Buscador y páginas fijas
add('/buscar/', layout({ titulo: 'Buscar', ruta: '/buscar/', noindex: true, main: `<section class="block"><div class="wrap"><h1 class="page-h">Buscar</h1><form class="search big" role="search" action="${u('/buscar/')}"><label class="sr" for="q2">Término de búsqueda</label><input id="q2" name="q" type="search" placeholder="Título, autor, categoría o tema" autocomplete="off"><button type="submit">Buscar</button></form><p id="res-info" class="muted" aria-live="polite"></p><div id="res" class="grid"></div><noscript><p class="empty">El buscador necesita JavaScript. Puede ver todas las publicaciones en <a href="${u('/editoriales/')}">Editoriales</a>.</p></noscript></div></section>` }));
add('/privacidad/', layout({ titulo: 'Aviso de privacidad', ruta: '/privacidad/', main: `<section class="block"><div class="wrap-n"><h1 class="page-h">Aviso de privacidad</h1><div class="prose">${md(site.privacidad)}</div></div></section>` }));
add('/404.html', layout({ titulo: 'Página no encontrada', ruta: '/404.html', noindex: true, main: `<section class="block"><div class="wrap"><h1 class="page-h">No encontramos esa página</h1><p>Es posible que la publicación haya sido movida o despublicada.</p><p><a class="btn" href="${u('/')}">Volver al inicio</a></p></div></section>` }));

// ---------- escritura ----------
fs.rmSync(OUT, { recursive: true, force: true });
for (const [ruta, html] of pages) {
  const f = ruta.endsWith('.html') ? path.join(OUT, ruta) : path.join(OUT, ruta, 'index.html');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}
for (const d of ['assets', 'media']) if (exists(path.join(ROOT, d))) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
if (exists(path.join(ROOT, 'CNAME'))) fs.copyFileSync(path.join(ROOT, 'CNAME'), path.join(OUT, 'CNAME'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'search-index.json'), JSON.stringify(editoriales.map((e) => ({ t: e.titulo, s: e.subtitulo || '', a: e.aut?.nombre || '', c: e.cat.titulo, g: e.etiq.join(' '), x: words(e.extracto, 30), d: fecha(e.fechaISO), i: e.imagen ? img(e.imagen) : '', u: u(e.url) }))));
const urls = pages.filter(([r]) => !r.endsWith('.html') && r !== '/buscar/' && r !== '/privacidad/').map(([r]) => r);
if (SITE_URL) {
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((r) => { const e = editoriales.find((x) => x.url === r); return `<url><loc>${esc(abs(r))}</loc>${e ? `<lastmod>${e.fechaISO}</lastmod>` : ''}</url>`; }).join('\n')}\n</urlset>\n`);
}
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n${SITE_URL ? `Sitemap: ${abs('/sitemap.xml')}\n` : ''}`);

// Avisos útiles para el equipo editorial
const mediaDir = path.join(ROOT, 'media');
const walk = (d) => (exists(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)])) : []);
for (const f of walk(mediaDir)) if (fs.statSync(f).size > 1.5 * 1024 * 1024) warn(`La imagen ${path.relative(ROOT, f)} pesa más de 1,5 MB; conviene reducirla para que la página cargue rápido.`);
for (const e of editoriales) { if (e.imagen && !e.imagenAlt) warn(`La editorial "${e.titulo}" tiene imagen sin texto alternativo (accesibilidad).`); if (!e.aut) warn(`La editorial "${e.titulo}" no tiene autor.`); }
console.log(`Sitio generado en _site/: ${pages.length} páginas, ${editoriales.length} publicaciones${DRAFTS ? ' (incluye borradores)' : ''}.`);
