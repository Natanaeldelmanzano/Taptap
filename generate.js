#!/usr/bin/env node
'use strict';
/**
 * Generador de Taptap Inmobiliaria.
 *   node generate.js            -> genera las páginas con estado "listo" (raíz + /pages/)
 *   node generate.js --todo     -> además genera los borradores en /preview/pages/ (noindex, para revisarlos)
 *   node generate.js --strict   -> termina con error si hay avisos o enlaces rotos
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const ARGS = new Set(process.argv.slice(2));
const TODO = ARGS.has('--todo');
const STRICT = ARGS.has('--strict');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const js = (f) => JSON.parse(rd(f));

const site = js('site.json');
const doc = js('pages.json');
let reviews = { resenas: [] };
try { reviews = js('reviews.json'); } catch (e) { /* sin reseñas */ }
const tpl = rd('templates/base.html').replace(/<!--[\s\S]*?-->/g, '');

const warns = [];
const warn = (m) => { if (!warns.includes(m)) warns.push(m); };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);
const base = site.dominio.url_base.replace(/\/+$/, '');
const assetExists = (url) => typeof url === 'string' && url.startsWith('/') && fs.existsSync(path.join(ROOT, url.slice(1)));
if (/\[/.test(base)) warn('site.json: dominio.url_base conserva el marcador [DOMINIO].');
['telefono_visible', 'telefono_enlace', 'whatsapp_numero', 'email'].forEach((k) => {
  if (/\[/.test(site.contacto[k])) warn('site.json: contacto.' + k + ' conserva un marcador [..].');
});
[
  ['marca.logo.ruta', site.marca.logo.ruta],
  ['marca.logo_footer.ruta', site.marca.logo_footer.ruta],
  ['marca.favicon', site.marca.favicon],
  ['seo.og_imagen', site.seo.og_imagen],
  ['hero.poster', site.hero.poster],
  ['hero.video', site.hero.video]
].forEach(([k, url]) => {
  if (!assetExists(url)) warn('Falta el recurso site.json: ' + k + ' (' + url + ').');
});
if (assetExists(site.hero.video) && site.hero.peso_recomendado_max_mb) {
  const pesoMb = fs.statSync(path.join(ROOT, site.hero.video.slice(1))).size / (1024 * 1024);
  if (pesoMb > site.hero.peso_recomendado_max_mb) {
    warn('El vídeo del hero pesa ' + pesoMb.toFixed(1) + ' MB; se recomiendan menos de ' + site.hero.peso_recomendado_max_mb + ' MB.');
  }
}

/* ---------- Datos ---------- */
const terr = {};
site.territorio.forEach((c) => { terr[c.id] = c; c.zmap = {}; c.zonas.forEach((z) => (c.zmap[z.id] = z)); });
const nombreServ = {};
doc.paginas.filter((p) => p.tipo === 'servicio').forEach((p) => (nombreServ[p.id] = p.etiqueta));

const publicar = doc.paginas.filter((p) => p.estado === 'listo' || TODO);
const P = {};
publicar.forEach((p) => { P[p.id] = Object.assign({}, p, { ruta: p.estado === 'listo' ? p.ruta : '/preview' + p.ruta }); });
const lista = Object.values(P);
const ofType = (t, f) => lista.filter((p) => p.tipo === t && (!f || f(p)));
const link = (p) => '<li><a href="' + p.ruta + '">' + esc(p.etiqueta) + '</a></li>';
const abs = (u) => (/^https?:/.test(u) ? u : base + u);

/* ---------- Fragmentos ---------- */
function navHtml(cur) {
  let n = 0;
  return site.navegacion.principal.map((it) => {
    const cl = (id) => (cur.id === id ? ' aria-current="page"' : '');
    if (it.submenu) {
      const id = 'sub-' + (++n);
      const items = it.submenu.filter((i) => P[i]).map((i) => '<li><a href="' + P[i].ruta + '"' + cl(i) + '>' + esc(P[i].etiqueta) + '</a></li>').join('');
      return '<li class="tiene-sub"><button type="button" aria-expanded="false" aria-controls="' + id + '">' + esc(it.etiqueta) + '</button><ul id="' + id + '" hidden>' + items + '</ul></li>';
    }
    if (!P[it.id]) return '';
    return '<li><a href="' + P[it.id].ruta + '"' + cl(it.id) + '>' + esc(it.etiqueta) + '</a></li>';
  }).join('');
}

function cadena(p) {
  const out = []; let c = p; const vistos = new Set();
  while (c && !vistos.has(c.id)) { vistos.add(c.id); out.unshift(c); c = c.padre ? P[c.padre] : null; }
  if (out[0].id !== 'index' && P.index) out.unshift(P.index);
  return out;
}
function migasHtml(p) {
  const c = cadena(p);
  return c.map((x, i) => i === c.length - 1 ? '<li aria-current="page">' + esc(x.etiqueta) + '</li>' : '<li><a href="' + x.ruta + '">' + esc(x.etiqueta) + '</a></li>').join('');
}

const redes = Object.entries(site.redes).filter(([, v]) => v && typeof v === 'object');
function redesHtml() {
  return '<div class="redes">' + redes.map(([, r]) => {
    const ic = '<svg width="22" height="22" aria-hidden="true"><use href="#i-' + esc(r.icono) + '"/></svg>';
    return r.url
      ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer me" aria-label="' + esc(r.aria_label) + '">' + ic + '</a>'
      : '<span class="red--sin-enlace" role="img" aria-label="' + esc(r.aria_label) + ' (próximamente)">' + ic + '</span>';
  }).join('') + '</div>';
}
function pieHtml() {
  return site.pie.columnas.map((col) => {
    if (col.tipo === 'marca') {
      const marcaHtml = assetExists(site.marca.logo_footer.ruta)
        ? '<img class="pie__logo" src="' + esc(site.marca.logo_footer.ruta) + '" width="' + site.marca.logo_footer.ancho + '" height="' + site.marca.logo_footer.alto + '" alt="' + esc(site.marca.logo_footer.alt) + '">'
        : '<h2>' + esc(col.titulo) + '</h2>';
      return '<div class="pie__marca">' + marcaHtml + '<p>' + esc(site.marca.descripcion_corta) + '</p><ul><li><a href="tel:' + esc(site.contacto.telefono_enlace) + '">' + esc(site.contacto.telefono_visible) + '</a></li><li><a href="mailto:' + esc(site.contacto.email) + '">' + esc(site.contacto.email) + '</a></li></ul>' + redesHtml() + '</div>';
    }
    return '<div><h2>' + esc(col.titulo) + '</h2><ul>' + col.ids.filter((i) => P[i]).map((i) => link(P[i])).join('') + '</ul></div>';
  }).join('');
}

const primera = (t) => {
  const m = (t || '').match(/^[^.]+\./); const s = m ? m[0] : (t || '');
  return s.length > 170 ? s.slice(0, 167).replace(/\s+\S*$/, '') + '…' : s;
};
function tituloLista(p) {
  const c = terr[p.ciudad]; const z = c && p.zona ? c.zmap[p.zona] : null;
  if (p.tipo === 'home') return 'Por qué elegir Taptap';
  if (p.tipo === 'servicio') return 'Qué incluye';
  if (p.tipo === 'ciudad') return 'Qué hacemos en ' + c.nombre;
  if (p.tipo === 'barrio') return 'Qué conviene saber al vender en ' + (z.centro ? 'el centro de ' + c.nombre : z.nombre);
  if (p.tipo === 'servicio-ciudad') return 'Qué incluye en ' + c.nombre;
  return p.id === 'contacto' ? 'Atención' : 'Cómo trabajamos';
}
const ul = (arr) => '<ul class="lista-marca">' + arr.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>';

function contenidoHtml(p) {
  if (p.tipo === 'legal') return legalHtml(p);
  let h = '<section>';
  if (p.estado !== 'listo') h += '<p><strong>BORRADOR (no se publica):</strong> ' + esc(p.datos_pendientes || 'Falta contenido local.') + '</p>';
  if (p.intro) h += '<p>' + esc(p.intro) + '</p>';
  const items = p.incluye || p.puntos;
  if (items && items.length) h += '<h2>' + esc(tituloLista(p)) + '</h2>' + ul(items);
  h += '</section>';
  (p.bloques || []).forEach((b) => { h += '<section><h2>' + esc(b.titulo) + '</h2>' + ul(b.items) + '</section>'; });
  if (p.tipo === 'home') {
    h += '<section><h2>Nuestros servicios</h2><ul class="relacionadas">' + ofType('servicio').map(link).join('') + '</ul></section>';
    h += '<section><h2>Dónde trabajamos</h2><ul class="relacionadas">' + ofType('ciudad').map(link).join('') + '</ul></section>';
    if (P['taptap-real-estate-academy']) h += '<section><h2>TAPTAP Real Estate Academy</h2><p>Formación y acompañamiento para nuevos gestores inmobiliarios que quieran incorporarse al equipo.</p><p><a class="btn" href="' + P['taptap-real-estate-academy'].ruta + '">Conocer la Academy</a></p></section>';
  }
  return h;
}

function legalHtml(p) {
  const f = 'templates/legal/' + p.plantilla + '.html';
  if (!fs.existsSync(path.join(ROOT, f))) { warn('Falta ' + f + ' (la página legal sale con aviso de contenido pendiente).'); return '<section><p>Contenido pendiente.</p></section>'; }
  const L = site.legal;
  const v = { legal_titular: L.titular, legal_actividad: L.actividad, legal_forma_juridica: L.forma_juridica, legal_nif_cif: L.nif_cif, legal_domicilio: L.domicilio, legal_email: L.email, legal_inscripcion: L.inscripcion_registral || 'No consta', url_base: base, marca: site.marca.nombre, telefono_visible: site.contacto.telefono_visible, fecha_actualizacion: today };
  Object.entries(L).forEach(([k, val]) => { if (/\[PENDIENTE\]/.test(val)) warn('site.json: legal.' + k + ' sigue como [PENDIENTE] (obligatorio en el aviso legal).'); });
  return '<section class="legal">' + rd(f).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in v ? esc(v[k]) : m)) + '</section>';
}

function procesoHtml(p) {
  if (p.tipo === 'legal') return '';
  const pr = site.proceso;
  return '<section><h2>' + esc(pr.titulo) + '</h2><ol class="pasos">' + pr.pasos.map((s) => '<li><strong>' + esc(s.titulo) + '</strong>' + esc(s.texto) + '</li>').join('') + '</ol></section>';
}

function resenasHtml(p) {
  if ((site.resenas.excluir_en_tipos || []).includes(p.tipo)) return '';
  const rs = (reviews.resenas || []).slice(0, site.resenas.max_mostrar || 3);
  const url = reviews.google_review_url || reviews.google_profile_url;
  if (!rs.length && !url) { warn('reviews.json: falta google_review_url; el bloque de opiniones no se muestra hasta que lo añadas.'); return ''; }
  let h = '<section><h2>' + esc(reviews.titulo_bloque) + '</h2>';
  if (rs.length) {
    h += '<div class="resenas">' + rs.map((r) => '<blockquote><p>' + esc(r.texto) + '</p><cite>' + esc(r.nombre) + (r.zona ? ', ' + esc(r.zona) : '') + (r.valoracion ? ' (' + esc(r.valoracion) + '/5)' : '') + '</cite></blockquote>').join('') + '</div>';
  } else h += '<p>' + esc(reviews.texto_sin_resenas) + '</p>';
  if (url) h += '<p><a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(reviews.texto_boton) + '</a></p>';
  return h + '</section>';
}

function faqHtml(p) {
  if (!p.faqs || !p.faqs.length) return '';
  return '<section><h2>Preguntas frecuentes</h2>' + p.faqs.map((f) => '<details><summary>' + esc(f.pregunta) + '</summary><p>' + esc(f.respuesta) + '</p></details>').join('') + '</section>';
}

function relacionadasHtml(p) {
  let it = [];
  const same = (t, f) => ofType(t, f);
  if (p.tipo === 'servicio') it = [...same('servicio-ciudad', (x) => x.servicio === p.id), P['tasacion-gratuita']];
  else if (p.tipo === 'ciudad') it = [...same('barrio', (x) => x.ciudad === p.ciudad), ...same('servicio-ciudad', (x) => x.ciudad === p.ciudad)];
  else if (p.tipo === 'barrio') it = [P['inmobiliaria-' + p.ciudad], P['venta-de-viviendas-' + p.ciudad], P['venta-de-viviendas'], P['tasacion-gratuita'], ...same('barrio', (x) => x.ciudad === p.ciudad && x.id !== p.id).slice(0, 6)];
  else if (p.tipo === 'servicio-ciudad') it = [P[p.servicio], P['inmobiliaria-' + p.ciudad], ...same('servicio-ciudad', (x) => x.ciudad === p.ciudad && x.id !== p.id), ...same('servicio-ciudad', (x) => x.servicio === p.servicio && x.id !== p.id)];
  else if (p.tipo === 'academy' || p.tipo === 'institucional') it = [P['venta-de-viviendas'], P['tasacion-gratuita']];
  it = [...new Set(it.filter(Boolean))].filter((x) => x.id !== p.id);
  if (!it.length) return '';
  const t = p.tipo === 'servicio' ? 'Este servicio por ciudad' : p.tipo === 'ciudad' ? 'Barrios y servicios en ' + terr[p.ciudad].nombre : 'Te puede interesar';
  return '<section><h2>' + t + '</h2><ul class="relacionadas">' + it.map(link).join('') + '</ul></section>';
}

/* ---------- Schema.org ---------- */
function schemaJson(p) {
  const url = abs(p.ruta);
  const sameAs = redes.filter(([, r]) => r.url).map(([, r]) => r.url);
  const agente = {
    '@type': 'RealEstateAgent', '@id': base + '/#negocio', name: site.marca.nombre, legalName: site.marca.nombre_empresa,
    url: base + '/', telephone: site.contacto.telefono_enlace, email: site.contacto.email,
    areaServed: site.territorio.map((c) => ({ '@type': 'City', name: c.nombre, containedInPlace: { '@type': 'AdministrativeArea', name: 'Asturias' } }))
  };
  if (assetExists(site.seo.og_imagen)) agente.image = abs(site.seo.og_imagen);
  if (assetExists(site.marca.logo.ruta)) agente.logo = abs(site.marca.logo.ruta);
  if (sameAs.length) agente.sameAs = sameAs;
  const g = [agente];
  if (p.tipo === 'home') g.push({ '@type': 'WebSite', '@id': base + '/#web', url: base + '/', name: site.marca.nombre, inLanguage: 'es', publisher: { '@id': agente['@id'] } });
  if (['servicio', 'servicio-ciudad', 'barrio'].includes(p.tipo)) {
    const c = terr[p.ciudad]; const z = c && p.zona ? c.zmap[p.zona] : null;
    const area = p.tipo === 'servicio' ? { '@type': 'AdministrativeArea', name: 'Asturias' }
      : p.tipo === 'barrio' ? { '@type': 'Place', name: (z.centro ? 'Centro' : z.nombre) + ', ' + c.nombre }
      : { '@type': 'City', name: c.nombre };
    g.push({ '@type': 'Service', '@id': url + '#servicio', name: p.h1, description: p.description, url, provider: { '@id': agente['@id'] }, serviceType: nombreServ[p.servicio] || p.etiqueta, areaServed: area });
  }
  if (p.id === 'contacto') g.push({ '@type': 'ContactPage', '@id': url + '#pagina', url, name: p.title });
  if (p.id === 'sobre-nosotros') g.push({ '@type': 'AboutPage', '@id': url + '#pagina', url, name: p.title });
  g.push({ '@type': 'BreadcrumbList', itemListElement: cadena(p).map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.etiqueta, item: abs(x.ruta) })) });
  if (p.faqs && p.faqs.length) g.push({ '@type': 'FAQPage', mainEntity: p.faqs.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })) });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': g }).replace(/</g, '\\u003c');
}

/* ---------- Render ---------- */
const F = site.formulario;
const opciones = '<option value="">Selecciona una opción</option>' + F.tipos_consulta.map((o) => '<option value="' + esc(o.valor) + '">' + esc(o.etiqueta) + '</option>').join('');
const sugerencias = site.territorio.map((c) => '<option value="' + esc(c.nombre) + '">' + c.zonas.map((z) => '<option value="' + esc((z.centro ? 'Centro' : z.nombre) + ', ' + c.nombre) + '">').join('')).join('');
const missing = new Set();
function fill(t, vars) { return t.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vars)) { missing.add(k); return m; } return vars[k]; }); }

function render(p) {
  const cta = p.tipo === 'academy' ? 'Enviar mi candidatura' : p.id === 'contacto' ? 'Escríbenos' : site.hero.cta_texto;
  const contactoTitulo = p.tipo === 'academy' ? 'Envía tu candidatura' : ['institucional', 'legal'].includes(p.tipo) ? 'Contacta con nosotros' : 'Pide tu tasación gratuita';
  const wa = site.whatsapp;
  const tieneLogo = assetExists(site.marca.logo.ruta);
  const tienePoster = assetExists(site.hero.poster);
  const tieneVideo = assetExists(site.hero.video);
  const tieneOgImagen = assetExists(site.seo.og_imagen);
  const videoPoster = tienePoster ? ' poster="' + esc(site.hero.poster) + '"' : '';
  const heroMedia = tieneVideo
    ? '<video class="hero__video" autoplay muted loop playsinline preload="metadata"' + videoPoster + ' aria-hidden="true" tabindex="-1"><source src="' + esc(site.hero.video) + '" type="video/mp4"></video>'
    : '';
  const ogMeta = tieneOgImagen
    ? '<meta property="og:image" content="' + esc(abs(site.seo.og_imagen)) + '">\n<meta property="og:image:width" content="' + site.seo.og_ancho + '">\n<meta property="og:image:height" content="' + site.seo.og_alto + '">\n<meta name="twitter:image" content="' + esc(abs(site.seo.og_imagen)) + '">'
    : '';
  const vars = {
    title: esc(p.title), description: esc(p.description), robots: p.estado === 'listo' ? esc(site.seo.robots_defecto) : 'noindex, nofollow',
    canonical: esc(abs(p.ruta)), favicon_html: assetExists(site.marca.favicon) ? '<link rel="icon" type="image/x-icon" href="' + esc(site.marca.favicon) + '">' : '', locale: esc(site.seo.locale), marca: esc(site.marca.nombre),
    og_meta: ogMeta, twitter_card: esc(site.seo.twitter_card),
    schema_json: schemaJson(p), consulta_defecto: esc(p.consulta_defecto), titulo_corto: esc(p.h1),
    whatsapp_numero: esc(site.contacto.whatsapp_numero), whatsapp_mensaje: esc(wa.mensaje_base), whatsapp_aria: esc(wa.aria_label),
    logo_html: tieneLogo
      ? '<img src="' + esc(site.marca.logo.ruta) + '" width="' + site.marca.logo.ancho + '" height="' + site.marca.logo.alto + '" alt="' + esc(site.marca.logo.alt) + '">'
      : '<span class="logo__texto">' + esc(site.marca.nombre) + '</span>',
    nav_principal: navHtml(p), cta_nav_href: P[site.navegacion.cta.id] ? P[site.navegacion.cta.id].ruta : '#contacto', cta_nav_texto: esc(site.navegacion.cta.etiqueta),
    hero_clase: p.tipo === 'legal' ? 'hero--compacto' : '', hero_poster: tienePoster ? "url('" + esc(site.hero.poster) + "')" : 'linear-gradient(135deg, #0b2a2c, #15575a)', hero_media: heroMedia, hero_capa: site.hero.opacidad_capa_oscura,
    h1: esc(p.h1), hero_subtitulo: p.tipo === 'legal' ? '' : p.tipo === 'home' ? 'Tasación gratuita, proceso explicado paso a paso y trato cercano.' : esc(primera(p.intro)),
    hero_cta_texto: esc(cta), migas: migasHtml(p), contenido: contenidoHtml(p), bloque_proceso: procesoHtml(p), bloque_resenas: resenasHtml(p),
    bloque_faq: faqHtml(p), bloque_relacionadas: relacionadasHtml(p), contacto_titulo: esc(contactoTitulo),
    telefono_enlace: esc(site.contacto.telefono_enlace), telefono_visible: esc(site.contacto.telefono_visible), email: esc(site.contacto.email),
    form_endpoint: esc(F.endpoint), form_access_key: esc(F.access_key), form_subject: esc(F.campos_ocultos.subject), form_from_name: esc(F.campos_ocultos.from_name), form_origen: esc(F.campos_ocultos.origen),
    opciones_consulta: opciones, sugerencias_zonas: sugerencias, privacidad_href: P['politicas-privacidad'] ? P['politicas-privacidad'].ruta : '/politicas-privacidad.html',
    form_boton: esc(F.texto_boton), form_ok: esc(F.mensaje_exito), form_error: esc(F.mensaje_error),
    pie_columnas: pieHtml(), pie_texto_legal: esc(site.pie.texto_legal.replace('{{año}}', new Date().getFullYear()))
  };
  return fill(tpl, vars);
}

/* ---------- Salida ---------- */
const CACHE = path.join(ROOT, '.build-cache.json');
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const nuevoCache = {};
const generados = new Set();
const validas = new Set(lista.map((p) => p.ruta));
const rotos = new Set();
let nListos = 0, nBorr = 0;

if (TODO) fs.rmSync(path.join(ROOT, 'preview'), { recursive: true, force: true });
lista.forEach((p) => {
  const html = render(p);
  const listo = p.estado === 'listo';
  const rel = listo ? (p.carpeta === 'raiz' ? p.archivo : 'pages/' + p.archivo) : 'preview/pages/' + p.archivo;
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (listo) {
    nListos++; generados.add(rel);
    const hash = crypto.createHash('sha1').update(html).digest('hex');
    const prev = cache[p.ruta];
    nuevoCache[p.ruta] = { hash, lastmod: prev && prev.hash === hash ? prev.lastmod : today };
  } else nBorr++;
  (html.match(/href="\/[^"#?]*"/g) || []).forEach((h) => {
    const u = h.slice(6, -1);
    if (/^\/(css|js|img|videos)\//.test(u)) return;
    if (!validas.has(u)) rotos.add(p.id + ' -> ' + u);
  });
});
fs.writeFileSync(CACHE, JSON.stringify(nuevoCache, null, 2));

/* Elimina de /pages/ lo que ya no se genera (p. ej. un barrio devuelto a borrador) */
const dirPages = path.join(ROOT, 'pages');
if (fs.existsSync(dirPages)) {
  fs.readdirSync(dirPages).filter((f) => f.endsWith('.html')).forEach((f) => {
    if (!generados.has('pages/' + f)) { fs.unlinkSync(path.join(dirPages, f)); console.log('Eliminada (ya no se genera): pages/' + f); }
  });
}

if (missing.size) warn('La plantilla usa marcadores sin valor: ' + [...missing].join(', '));
rotos.forEach((r) => warn('Enlace interno roto: ' + r));
console.log('Generadas ' + nListos + ' páginas' + (TODO ? ' + ' + nBorr + ' borradores en /preview/pages/' : '') + '.');
if (warns.length) { console.log('\nAvisos (' + warns.length + '):'); warns.forEach((w) => console.log(' - ' + w)); }
if (STRICT && warns.length) process.exit(1);
