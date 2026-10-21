#!/usr/bin/env node
'use strict';
/**
 * Copia a /public solo lo que debe servirse (sin site.json, pages.json, plantillas ni scripts).
 * Render publica la carpeta public.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const OUT = path.join(ROOT, 'public');
const ITEMS = ['index.html', 'aviso-legal.html', 'politicas-privacidad.html', 'politicas-cookies.html', 'terminos-servicio.html',
  'sitemap.xml', 'robots.txt', 'pages', 'css', 'js', 'img', 'videos'];

if (!fs.existsSync(path.join(ROOT, 'index.html'))) { console.error('Falta index.html: ejecuta primero npm run build.'); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
ITEMS.forEach((it) => {
  const src = path.join(ROOT, it);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT, it), { recursive: true });
  else console.warn('Aviso: no existe ' + it + ' (se omite).');
});
console.log('public/ listo para publicar.');
