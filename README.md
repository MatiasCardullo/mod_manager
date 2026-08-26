# IARA Mod Manager

`Downloader/mod_manager` is a Vite + React application. Shared layout, controls,
cart, settings, and storage code lives under `src/components/`, `src/helpers/`, and
`src/services/`; game adapters live in `src/config/games.js` and the game services.

## Routes

- `/minecraft` searches the public Modrinth API. It supports popular/updated/
  newest sorting, loader/version/category filters, version and file selection,
  required dependency resolution, a persistent cart, direct browser downloads,
  JSON export, and the optional Downloader handoff.
- `/factorio` reads Mod Portal listings through a configurable CORS proxy,
  obtains mod metadata and dependencies from `re146.dev`, and downloads files
  from `mods-storage.re146.dev`. It supports updated/downloaded/trending
  listings, Factorio version/expansion/category/tag filters, dependency
  resolution, cart/export/download actions, and optional
  `factorio-current.log` upload for version and dependency repair.

## Development and build

Run commands from `Downloader/mod_manager`:

```bash
npm install
npm run dev
```

Open `http://localhost:5173/minecraft` or
`http://localhost:5173/factorio`. Create the production bundle with:

```bash
npm run build
npm run preview
```

Publish `dist/` to a static host. Vite creates
`dist/minecraft/index.html` and `dist/factorio/index.html` route fallbacks,
uses relative asset paths, and keeps direct route navigation/refresh working
on hosts that serve directory indexes. `vercel.json` provides equivalent
rewrites for Vercel. No server-side React runtime is required.

## Proxy configuration

Proxy settings are per game and saved in browser storage:

- Minecraft uses Modrinth directly by default. Its proxy is optional; the
  default field value is `http://localhost:8787`.
- Factorio uses the deployed
  `https://factoriomods.supermaty97.workers.dev` proxy by default because
  Mod Portal pages normally cannot be fetched cross-origin. Disable it only
  when the selected endpoints provide suitable CORS headers.

The app requests `<proxy>/fetch?url=<encoded upstream URL>`. A replacement
must expose that endpoint, return upstream content/status, and send CORS
headers. Use a trusted proxy; the app sends requested upstream URLs to it.

## Browser storage and migration

Settings and carts are stored per browser origin in `localStorage`.
Canonical keys are:

- Minecraft: `modrinthSearchSettings`, `modrinthSearchCart`
- Factorio: `modSearchSettings`, `modSearchCart`

The React app also reads older aliases
(`minecraftModSettings`/`minecraftModCart` and
`factorioModSettings`/`factorioModCart`). Cart records are normalized across
older field names such as `mod_id`, `projectId`, `version_id`,
`download_url`, and `filename`, then written to the canonical key. Legacy keys
are not deleted. Storage does not transfer between different hosts, ports, or
browser profiles.

## Downloader handoff

`Send to IARA Downloader` maps each cart item to:

```json
{"url":"…","path":"…","password":"","title":"…"}
```

It JSON-serializes the list, UTF-8 base64url-encodes it, and navigates to:

```text
iara-downloads://add-mods?payload=<base64url-json>
```

This URI only works when an operating-system protocol handler is registered
and a receiver decodes the payload. This repository currently provides the
URI generation but no protocol registration/receiver, so the reliable
fallback is `Export JSON`, followed by:

```bash
python download_manager.py modrinth_cart.json
python download_manager.py mod_search_cart.json
```

The cart also supports direct browser downloads without Downloader.

## Project scope

The canonical implementation is the React app under `src/`. Older static
Minecraft and Factorio pages are not included in this repository.
