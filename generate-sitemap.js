#!/usr/bin/env node
'use strict';
/**
 * node generate-sitemap.js         -> sitemap.xml y robots.txt (solo páginas con estado "listo")
 * node generate-sitemap.js --plan  -> además escribe docs/indexacion-plan.md (URLs por día para Search Console)
 * Ejecútalo después de generate.js: toma la fecha lastmod de .build-cache.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const js = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const site = js('site.json');
const doc = js('pages.json');
const cachePath = path.join(ROOT, '.build-cache.json');
const cache = fs.existsSync(cachePath) ? js('.build-cache.json') : {};
const base = site.dominio.url_base.replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

if (/\[/.test(base)) console.warn('AVISO: site.json dominio.url_base conserva el marcador [DOMINIO]. Sustitúyelo antes de publicar.');

const listos = doc.paginas
  .filter((p) => p.estado === 'listo')
  .sort((a, b) => (a.indexacion_dia - b.indexacion_dia) || (b.sitemap.prioridad - a.sitemap.prioridad));

const urls = listos.map((p) => {
  const lastmod = (cache[p.ruta] && cache[p.ruta].lastmod) || today;
  return '  <url>\n    <loc>' + xml(base + p.ruta) + '</loc>\n    <lastmod>' + lastmod + '</lastmod>\n    <changefreq>' + p.sitemap.cambio + '</changefreq>\n    <priority>' + p.sitemap.prioridad.toFixed(1) + '</priority>\n  </url>';
});
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(ROOT, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /preview/\n\nSitemap: ' + base + '/sitemap.xml\n');
console.log('sitemap.xml con ' + listos.length + ' URLs y robots.txt generados.');

if (process.argv.includes('--plan')) {
  const porDia = {};
  listos.forEach((p) => { (porDia[p.indexacion_dia] = porDia[p.indexacion_dia] || []).push(p); });
  let md = '# Plan de indexación en Search Console\n\nMáximo ' + site.indexacion.urls_por_dia + ' URLs al día (Inspección de URLs > Solicitar indexación).\n';
  Object.keys(porDia).sort((a, b) => a - b).forEach((d) => {
    md += '\n## Día ' + d + '\n\n' + porDia[d].map((p) => '- [ ] ' + base + p.ruta).join('\n') + '\n';
  });
  const pend = doc.paginas.filter((p) => p.estado !== 'listo');
  if (pend.length) md += '\n## Pendientes de contenido (no indexar aún)\n\n' + pend.map((p) => '- ' + p.id).join('\n') + '\n';
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'indexacion-plan.md'), md);
  console.log('docs/indexacion-plan.md generado (' + Object.keys(porDia).length + ' días).');
}
