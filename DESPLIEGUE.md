# Despliegue de Taptap Inmobiliaria: GitHub + Render (Static Site)

## 0. Antes de subir nada

1. En `site.json`: sustituye `[DOMINIO]` (campo `dominio.url_base`, p. ej. `https://tudominio.es`, sin barra final) y completa `legal` (forma jurídica, NIF/CIF, domicilio).
2. Añade los archivos de medios: `img/hero-taptap-poster.webp` e `img/og-taptap.webp`. El vídeo del hero es `videos/hero.mp4` (se recomiendan menos de 4 MB). El navbar, el footer y el favicon usan las imágenes de marca configuradas en `site.json`.
3. Comprueba que todo está bien:

```bash
npm run build:strict
```

Debe terminar sin avisos. Así se generan las páginas, `sitemap.xml` y `robots.txt` con tu dominio.

## 1. Repositorio en GitHub

Crea primero un repositorio vacío en GitHub (recomendado: privado) y después, desde la carpeta del proyecto:

```bash
git init -b main
git add .
git commit -m "Taptap Inmobiliaria: web inicial"
git remote add origin https://github.com/TU_USUARIO/taptap-inmobiliaria.git
git push -u origin main
```

Se suben también las páginas generadas y `.build-cache.json`, que conserva las fechas `lastmod` del sitemap. El `.gitignore` excluye `node_modules/`, `preview/` y `public/`.

**Flujo diario de cambios:**

```bash
# 1. edita pages.json / site.json / reviews.json / plantilla
npm run build:strict
git add .
git commit -m "Describe el cambio"
git push
```

Render despliega solo al detectar el push en `main`.

## 2. Render: Static Site

**Opción A: panel de Render**

1. New > Static Site > conecta tu cuenta de GitHub y elige el repositorio.
2. Ajustes:

| Campo | Valor |
|---|---|
| Branch | `main` |
| Build Command | `npm run build:render` |
| Publish Directory | `public` |
| Auto-Deploy | Yes (despliegue automático desde `main`) |
| Environment (opcional) | `NODE_VERSION` = `20` |

3. Create Static Site. El primer despliegue tarda un par de minutos.

**Opción B: Blueprint.** El archivo `render.yaml` ya contiene esos ajustes más cabeceras de seguridad y caché. En Render: New > Blueprint y selecciona el repositorio.

`npm run build:render` regenera las páginas y copia a `public/` solo lo que se sirve: HTML, `css/`, `js/`, `img/`, `videos/`, `sitemap.xml` y `robots.txt`. Así `site.json`, `pages.json`, las plantillas y los scripts no quedan expuestos.

## 3. Dominio propio y SSL

1. En el servicio: Settings > Custom Domains > Add Custom Domain.
2. Decide una única versión principal (con o sin `www`) y usa esa misma en `dominio.url_base` de `site.json`. Render añade la versión contraria y redirige a la principal; compruébalo en esa pantalla.
3. En tu proveedor de DNS crea los registros que Render te muestra en el panel (no copies direcciones de otras guías). Elimina cualquier registro AAAA que apunte a otro sitio.
4. Pulsa Verify. Render emite y renueva el certificado SSL automáticamente, pero puede tardar hasta que el DNS se propague.
5. Si cambias el dominio principal respecto a lo que pusiste en `site.json`, actualiza `url_base`, ejecuta `npm run build:strict` y haz push (cambian canonical, Open Graph, schema y sitemap).

## 4. Redirecciones 301

Render **no lee** un archivo `_redirects`. Si hacen falta, se configuran en el panel (Settings > Redirects/Rewrites) o en el bloque `routes` de `render.yaml`:

```yaml
routes:
  - type: redirect
    source: /home-asturias
    destination: /
```

Para el lanzamiento no hace falta ninguna. Si la landing antigua de Home Asturias tenía URLs propias, anótalas y las añadimos aquí.

## 5. Comprobaciones tras el primer despliegue

- `https://TU-DOMINIO/` carga con SSL, y `robots.txt` y `sitemap.xml` abren.
- El sitemap lista tu dominio real (ya no aparece `[DOMINIO]`).
- Envía un formulario de prueba: debe llegar a taptaprealestate@gmail.com con el asunto que empieza por `[TAPTAP]` y mostrar el mensaje de confirmación.
- En móvil: el botón de WhatsApp abre el chat con el mensaje y desaparece al llegar al formulario.
- El vídeo del hero se reproduce, y con "reducir movimiento" activado solo se ve el póster.
- Revisa PageSpeed Insights (móvil) en home, una página de servicio y un barrio.
- Prueba un par de URLs de `/pages/`: deben abrir con la ruta `/pages/...` y sin redirecciones raras.

## 6. Search Console e indexación (máximo 10 URLs al día)

**Alta (una sola vez)**

1. Search Console > Añadir propiedad. Recomendado: propiedad de dominio, verificada con un registro TXT en el DNS.
2. Sitemaps > añade `https://TU-DOMINIO/sitemap.xml` y envíalo.
3. Comprueba que Search Console lo lee sin errores.

**Plan diario**

Cada día, en Inspección de URLs, pega cada URL del día y pulsa "Solicitar indexación". Hazlo como máximo con 10 URLs. El plan completo está en `docs/indexacion-plan.md` (se regenera con `npm run plan`) y está ordenado por prioridad:

| Día | URLs | Contenido |
|---|---|---|
| 1 | 10 | Home, venta de viviendas, tasación gratuita, compra de viviendas, las 3 ciudades principales y venta en Oviedo, Gijón y Avilés |
| 2 | 10 | Resto de servicios y de ciudades |
| 3 | 10 | Venta en Mieres, Siero y Llanera, y 7 barrios |
| 4 y 5 | 20 | Barrios |
| 6 | 10 | 2 barrios y 8 combinaciones servicio + ciudad |
| 7 | 10 | Combinaciones servicio + ciudad |
| 8 | 10 | 5 combinaciones, Academy, Sobre nosotros, Contacto y 2 páginas legales |
| 9 | 2 | Las 2 páginas legales restantes |

Las URLs exactas de cada día están en `docs/indexacion-plan.md`, con casillas para ir marcando.

**Seguimiento**

- A los 3-4 días revisa Páginas > Indexación: URLs indexadas, "Rastreada, actualmente sin indexar" y errores.
- No pidas reindexar de nuevo la misma URL salvo que hayas cambiado su contenido.
- Si una página queda "sin indexar" tras 2-3 semanas, mejora su contenido local antes de insistir.
- Cuando rellenes los 7 barrios en borrador y los pases a `listo`: `npm run build:strict`, push, y sigue añadiendo a 10 URLs diarias.
