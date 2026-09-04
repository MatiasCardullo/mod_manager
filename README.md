# IARA Mod Manager

`mod_manager` es una aplicación Vite + React. El layout compartido, los
controles, el carrito, la configuración y el almacenamiento viven en
`src/components/`, `src/helpers/` y `src/services/`; los adaptadores por juego
debajo de `src/config/games.js` y los servicios del juego.

## Rutas

- `/minecraft` busca en la API pública de Modrinth. Soporta ordenamiento por
  popular/updated/newest, filtros de loader/version/category, selección de
  versión y archivo, resolución de dependencias requeridas, carrito persistente,
  descargas directas desde el navegador, exportación JSON y el handoff opcional
  al Downloader.
- `/factorio` lee listados de Mod Portal a través del proxy CORS integrado,
  obtiene metadatos y dependencias desde `re146.dev` y descarga archivos desde
  `mods-storage.re146.dev`. Soporta listados por updated/downloaded/trending,
  filtros de versión/expansión/categoría/tag de Factorio, resolución de
  dependencias, acciones de carrito/exportación/descarga y carga opcional de
  `factorio-current.log` para reparar versión y dependencias.

El carrito permite quitar elementos, reemplazar versiones, detectar conflictos
al agregar, vaciar contenido y guardar/cargar perfiles JSON. Perfiles incluyen
`format`, `version`, `savedAt` e `items`; se normalizan al cargarlos y mantienen
compatibilidad con formato usado por Downloader. Reparación Factorio acepta
`factorio-current.log` mediante selector de archivo, detecta versión y
componentes, y agrega dependencias faltantes al carrito. Wrapper de escritorio
puede sustituir selector por bridge nativo sin cambiar servicios.

## Desarrollo y build

Se corre desde la raíz del proyecto (`IARA/mod_manager`):

```bash
npm install
npm run dev
```

Abre `http://localhost:5173/minecraft` o
`http://localhost:5173/factorio`. Genera el bundle de producción con:

```bash
npm run build
npm run preview
```

Publica `dist/` en un host estático. Vite crea
`dist/minecraft/index.html` y `dist/factorio/index.html` como fallbacks de
ruta, usa paths relativos y mantiene el refresco directo y la navegación por
rutas en hosts que sirvan índices de directorio. `vercel.json` entrega
rewrites equivalentes para Vercel. No hace falta runtime de React en servidor.

## Proxy de Factorio

Factorio usa proxy CORS integrado
`https://factoriomods.supermaty97.workers.dev` porque Mod Portal normalmente
no se puede consultar cross-origin. Proxy no aparece en Settings ni se guarda
en almacenamiento del navegador. Cada consulta agrega cache-busting al URL
upstream para evitar respuestas 404 obsoletas al cambiar entre juegos o modos.

## Almacenamiento del navegador y migración

Settings y carritos se guardan por origen del navegador en `localStorage`.
Las claves canónicas son:

- Minecraft: `modrinthSearchSettings`, `modrinthSearchCart`
- Factorio: `modSearchSettings`, `modSearchCart`

La app React también lee aliases viejos
(`minecraftModSettings`/`minecraftModCart` y
`factorioModSettings`/`factorioModCart`). Los registros del carrito se
normalizan entre nombres antiguos como `mod_id`, `projectId`, `version_id`,
`download_url` y `filename`, y luego se escriben en la clave canónica. Las
claves viejas no se eliminan. El almacenamiento no se comparte entre hosts,
puertos o perfiles de navegador distintos.

## Handoff al Downloader

`Send to IARA Downloader` transforma cada elemento del carrito en:

```json
{"url":"…","path":"…","password":"","title":"…"}
```

Serializa la lista en JSON, la codifica en base64url UTF-8 y navega a:

```text
iara-downloads://add-mods?payload=<base64url-json>
```

Esta URI requiere el protocol handler Windows empaquetado por
`installer/`, que decodifica el payload y abre el Downloader. El fallback
confiable sigue siendo
`Export JSON`, seguido por:

```bash
python download_manager.py modrinth_cart.json
python download_manager.py mod_search_cart.json
```

El carrito también soporta descargas directas desde el navegador sin el
Downloader.

## Alcance del proyecto

La implementación canónica es la app React bajo `src/`. Las viejas páginas
estáticas de Minecraft y Factorio no están incluidas en este repositorio.
