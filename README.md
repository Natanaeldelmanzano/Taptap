# Taptap Inmobiliaria: sistema de generación de páginas

Web estática generada con Node.js (sin dependencias). Requiere Node 18 o superior.

## Estructura

```
site.json              marca, contacto, redes, formulario, hero, navegación, pie, territorio
pages.json             89 páginas con sus variables SEO y su contenido
reviews.json           reseñas reales (vacío) y enlace a Google
templates/base.html    plantilla única con marcadores {{...}}
templates/legal/       textos de las 4 páginas legales (entregable 5)
css/styles.css  js/script.js
img/  videos/          imágenes de marca y vídeo hero.mp4
generate.js            genera las páginas
generate-sitemap.js    genera sitemap.xml, robots.txt y el plan de indexación
publicar.js            copia a /public solo lo que se sirve (lo usa Render)
render.yaml            Blueprint de Render (sitio estático)
DESPLIEGUE.md          guía GitHub + Render y plan de Search Console
docs/                  plan de indexación (npm run plan)
index.html, legales    se generan en la raíz
pages/                 se genera aquí todo lo demás (no edites a mano)
```

La raíz solo contiene `index.html`, `sitemap.xml`, `robots.txt` y las cuatro páginas legales. Todo lo demás va en `/pages/`: sitemap, canonical y enlaces internos salen del campo `ruta` de `pages.json`, que ya incluye `/pages/`.

## Uso

```bash
npm run build           # genera páginas "listo" + sitemap.xml + robots.txt
npm run build:strict    # igual, pero falla si hay avisos o enlaces rotos (úsalo antes de publicar)
npm run borradores      # genera además los borradores en /preview/pages/ (noindex)
npm run plan            # escribe docs/indexacion-plan.md (URLs por día, máximo 10)
npm run serve           # servidor local para revisar el resultado
```

`generate.js` avisa de: marcadores `[DOMINIO]`/`[PENDIENTE]`, plantillas legales que faltan, enlaces internos rotos y marcadores sin valor en la plantilla. Elimina de `/pages/` lo que ya no se genera.

## Qué se edita y dónde

| Quiero... | Edito |
|---|---|
| Cambiar teléfono, email, dominio | `site.json` (`contacto`, `dominio`) |
| Añadir Instagram, Facebook o LinkedIn | `site.json` > `redes`: solo rellenar `url` |
| Añadir reseñas reales | `reviews.json` > `resenas` (máx. 3 visibles) y `google_review_url` |
| Cambiar el texto o el SEO de una página | `pages.json` |
| Publicar un barrio en borrador | Rellenar `intro`, `puntos` y `faqs`, y cambiar `"estado"` a `"listo"` |
| Cambiar menú o pie | `site.json` > `navegacion` y `pie` |
| Cambiar diseño | `templates/base.html` y `css/styles.css` |

Mientras `reviews.json` no tenga reseñas, las páginas muestran solo el botón para dejar una opinión (si hay `google_review_url`). No se genera `AggregateRating`.

Mientras una red social tenga la `url` vacía, su icono se muestra sin enlace y no entra en `sameAs` del schema.

## Estados de página

- `listo`: se genera en su ruta, entra en el sitemap y se indexa.
- `borrador`: no se genera en producción. Con `npm run borradores` sale en `/preview/pages/` con `noindex`. Añade `preview/` a `.gitignore`.

El campo `datos_pendientes` de cada borrador indica qué datos locales faltan.

## Enlazado interno (automático)

- Servicio: sus páginas servicio + ciudad y la tasación gratuita.
- Ciudad: sus barrios y sus páginas servicio + ciudad.
- Barrio: su ciudad, venta en esa ciudad, venta de viviendas, tasación y barrios vecinos.
- Servicio + ciudad: el servicio, la ciudad y otras combinaciones relacionadas.
- Migas de pan: siguen el campo `padre` de `pages.json`.

## lastmod del sitemap

`generate.js` guarda un hash de cada página en `.build-cache.json` (súbelo al repositorio). El `lastmod` solo cambia cuando cambia el HTML de esa página.

## Antes de publicar

1. Sustituir `[DOMINIO]` en `site.json`.
2. Completar `legal` en `site.json` (forma jurídica, NIF/CIF, domicilio).
3. Añadir `img/hero-taptap-poster.webp` e `img/og-taptap.webp`. El vídeo del hero es `videos/hero.mp4` y se recomiendan menos de 4 MB. El logo del navbar, el logotipo del footer y el favicon se configuran desde los archivos de `img/` indicados en `site.json`.
4. Revisar los textos de barrios y servicio + ciudad (datos locales y nombres de polígonos).
5. `npm run build:strict` debe terminar sin avisos.

## Fase 2: idiomas (propuesta)

Carpetas `/en/`, `/de/` y `/zh/` que replican la estructura, con un `translationKey` en `pages.json` y bloques `hreflang` recíprocos más `x-default`, generados automáticamente. Solo se traducirían las páginas prioritarias, con traducción real. `site.json` > `idiomas.fase2` ya reserva la configuración.
