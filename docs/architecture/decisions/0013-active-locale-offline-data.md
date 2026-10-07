# 0013 — Active-locale offline data

Date: 2026-10-07 · Status: accepted

## Context

ADR 0002 makes the web app offline-first: a precached shell, per-locale content bundles, runtime-cached pages and an offline reader for entries the reader never visited. `apps/web/src/integrations/equreka-pwa.ts` implemented it as one Workbox precache manifest that held the shell and the data payloads of both locales: per locale, the search index, catalog-lite, the converter payload, the offline reader payload and the learning-path payload. The build failed when the whole manifest passed 6 MiB.

The reader payload carries every entry's full description so the offline reader can show entries that were never visited, and descriptions dominate it (95% of `reader.en.json`). Measured with `pnpm --filter web build`:

| Build | Shell | en payloads | es payloads | Precache (both locales) |
| --- | --- | --- | --- | --- |
| W4 (`main` at this change) | 1,211.5 KiB, 168 URLs | 1,272.4 KiB | 1,357.1 KiB | 3,840.5 KiB, 177 URLs, 62.5% of 6 MiB |
| W5 (`content/w5-dynamics-energy-momentum` merged) | 1,233.0 KiB, 195 URLs | 1,359.4 KiB | 1,451.5 KiB | 4,043.9 KiB, 65.8% |

The shell and payload columns come from this change's build, whose shell gains one 209-byte chunk (*Consequences*). The W4 precache is the manifest the old build printed, and the W5 precache is the sum of its row. W5 added 203 KiB to the precache. Eleven waves remain in milestone 1 (W6 to W16, about 420 equations plus units), and university descriptions run longer than school ones, so at that slope the precache crosses 6 MiB around W16, before milestone 1 ends.

A reader browses one interface locale at a time: the `/` tree in English or the `/es/` tree in Spanish (Astro i18n, `prefixDefaultLocale: false`). Every install and every content update downloaded and stored the other locale's 1.3–1.4 MiB for nothing.

## Decision

Precache only the locale-neutral shell. Each locale's data payloads go to a separate, versioned cache that the service worker fills for the locales the reader uses.

### Shell

`SHELL_PRECACHE_GLOBS` (`apps/web/src/pwa/precache.ts`) keeps everything the old manifest held except the locale payloads: the app-shell routes of both locale trees, `_astro` scripts and styles, KaTeX, the self-hosted fonts, the icons, the web manifest, the logo and `pwa-register.js`. The shell pages of both trees stay because they are small and they make an offline locale switch land on a real page.

### Data cache

- **Payloads.** `LOCALE_PAYLOADS` and `localePayloadUrl` (`apps/web/src/lib/locale-payloads.ts`) name the five payloads and their URLs. The build writes them there, every island fetches them through it, and the worker caches exactly that set. A test fails when any source file under `apps/web/src` hardcodes a payload URL.
- **Cache per locale and build.** `equreka-data-<locale>-<version>`, where the version is 64 bits of SHA-256 over the locale's URL and file-digest pairs. A content change renames the cache, and a cache only ever holds one build's bytes.
- **Worker script.** `apps/web/src/pwa/data-cache.ts` holds the logic, written against a structural slice of the service worker scope so tests run it on an in-memory fake. At `astro:build:done`, `data-cache-build.ts` reads the built payloads, computes the manifest (URL, SHA-256 and cache name per locale) and bundles `data-cache-worker.ts` with esbuild into a classic script for the ADR 0002 browser floor, with the manifest compiled in. The file name carries the content hash, `sw-data-cache.<hash>.js`, and generateSW's `importScripts` loads it. A data change therefore changes `sw.js`, and browsers install the update.
- **Install.** The worker caches every locale it already has a data cache for, from any build, plus the locale of every open window (`clients.matchAll({ includeUncontrolled: true })`). On a first install that is the page that registered it. The work runs inside the install event, so a worker that cannot cache them does not activate, which is the precache's own failure mode.
- **Navigation.** A navigation caches its tree's locale in the background. Switching locale while online therefore makes the new locale available offline.
- **Requests.** A payload request is answered cache first from this build's cache, with the network on a miss. The listener runs before Workbox's, because generateSW emits `importScripts` ahead of its own registrations. It stops propagation, so Workbox's same-origin runtime route never handles payload URLs.
- **Integrity.** Each payload is fetched with `cache: 'no-cache'` and stored only if its SHA-256 equals the build's. Nothing is written until every missing file of the locale has arrived and verified. The stored response keeps the content type only, because the body is already decoded.
- **Activation** deletes every `equreka-data-*` cache this build does not name.

### Budget

The build sums the shell and each locale's payloads, then counts the shell plus the largest locale against `OFFLINE_BUDGET_BYTES` (6 MiB). It fails over the budget and warns from `BUDGET_WARN_RATIO` (80%, `@equreka/content/artifact-budgets`), which `equreka-assets.ts` now imports in place of its own copy of the ratio. The per-payload budgets of ADR 0010 are unchanged except the reader payload's, raised to 2 MiB (see Consequences). The build prints:

```
offline install: shell 168 URLs 1211.5 KiB + largest locale data (es) = 2568.6 KiB of 6144.0 KiB (41.8%); locale data: en 1272.4 KiB, es 1357.1 KiB
```

### Offline contract

| Situation | Behaviour |
| --- | --- |
| First online visit in a locale | Install stores the shell and that locale's data. Afterwards search, the converter, the offline reader (never-visited entries included) and learning paths work offline in that locale, as before. |
| Locale switch while online | The navigation caches the other locale in the background. It works offline from then on, and the first locale still does. |
| Locale switch while offline, never online in that locale | The shell page or the offline reader of that tree renders from the precache. Each island shows its existing message: the reader's `offline.error` ("Reconnect and reload once to store it"), `search.unavailable` or the converter's error. Pages never break. |
| Content update | The new worker caches the new version of every locale the reader has during its install, while the old worker keeps serving its own caches. Activation, after the reader accepts the update prompt, purges the old caches. Versions never mix. |
| Deploy race | If the server already serves the next build while this worker caches, the digests differ and nothing is stored. Online requests fall through to the network, and the next worker installs normally. |

### Safari

- WebKit deletes a site's script-writable storage, service worker registration and Cache Storage included, after seven days of browser use without interaction with the site, unless it was added to the Home Screen. The next visit is a first install. It now stores one locale, about 1.4 MiB less than before.
- The worker uses Cache Storage, `CacheStorage.match` with `cacheName`, `clients.matchAll` with `includeUncontrolled`, `SubtleCrypto.digest` in workers (Safari 11 and later, per MDN browser-compat-data) and `waitUntil` on install and fetch events. All of them are within the Safari 15 floor. `Object.hasOwn` (Safari 15.4) is avoided. Nothing relies on Background Sync, Background Fetch or periodic sync, which Safari lacks. Every write happens inside an install or fetch event, and a write that is cut short leaves an incomplete cache that the next navigation completes.
- Checked once with Playwright's WebKit build on Windows: install stored only the English data, a visit to `/es/` stored the Spanish data, and with the server stopped the offline reader in both locales and the converter answered from the data cache. The committed offline E2E stays Chromium-only, as `playwright.config.ts` sets it: under Playwright's `setOffline`, WebKit's offline navigations fail with an internal error, while the same checks pass with the server stopped.

## Alternatives considered

- **Keep both locales and raise the budget.** It defers the failure without changing the slope. Every reader keeps storing, and every content update keeps downloading, a locale they do not read.
- **Two precache manifests, chosen at registration** (`sw-en.js` and `sw-es.js`, or a locale query on the script URL). A scope has one worker, so a locale switch means registering a different script. That is a full update cycle: with `skipWaiting: false` the reader gets the update prompt for changing language, and with `skipWaiting: true` a page can run against a worker from another build. Workbox's activation drops the previous locale's entries, so a bilingual reader loses offline data at every switch. Splitting the scope (`/es/` against `/`) instead doubles the shell across two precaches and two update prompts.
- **Runtime caching of the payload URLs** (stale-while-revalidate). A payload is cached only after an island has fetched it. The offline reader's payload is fetched only by the offline reader, so never-visited entries would break offline. Files would refresh one at a time and mix builds, catalog-lite from one build next to a reader payload from another, and nothing would purge old versions.
- **Warming from the page** (`pwa-register.js` fetches the locale's payloads once a worker controls the page). The worker can activate before the data lands, so a reader who goes offline right after the first visit has none. The page and the worker must agree on URLs and cache names, and the first visit is uncontrolled, so its own fetches bypass the worker.
- **A custom worker through `injectManifest`.** It replaces the generated routing (`precacheFallback` navigations, the update prompt, URL parameter rules) with hand-written code. That is more surface for the same behaviour, while `importScripts` adds only the part generateSW cannot express.
- **Content-hashed payload URLs** (`data/reader.en.<hash>.json`). Immutable URLs version the files without digests, but every island needs the URL map compiled into its chunk, so each content change also changes the island chunks and the precached shell. Per-locale selection and purging are still needed. Digest checks give the same guarantee with stable URLs.

## Consequences

- The budget counts the shell plus the largest locale. On W5 the accounted install is 2,684.5 KiB (43.7%) instead of 4,043.9 KiB (65.8%). W5 grew it by 116 KiB rather than 203 KiB, which projects to about 3.9 MiB, 64%, at the end of milestone 1.
- **The reader payload's own budget rises from 1 MiB to 2 MiB.** `data/reader.es.json` is 866,240 bytes on W5, 82.6% of the old 1 MiB budget, and grows about 62 KB per wave, so it would have failed around W8. The 1 MiB ceiling was set while both locales' payloads shared the precache; the binding limit is now the install budget, which counts one locale and stands at 43.7%. Splitting the reader payload would not shrink what the offline reader must store, since it needs every description, so the per-file ceiling only guards against an unexpected jump and is sized to reach the end of milestone 1 (about 1.5 MB projected) with headroom. Revisit it if the offline reader's parse time on a low-end phone becomes noticeable.
- A bilingual reader stores both locales, which is the old footprint. An update downloads each stored locale whole, about 1.4 MiB each. Before, it downloaded only the changed files, but of both locales. Search, catalog-lite and the reader payload change in every content wave, so an update transfers less than before for a one-locale reader and about the same for a bilingual one.
- An existing install keeps working through the upgrade. The new worker caches the open window's locale. Workbox's activation removes both locales' old precached payloads, and the other locale returns on the reader's next online visit to its tree.
- A new payload is one entry in `LOCALE_PAYLOADS`. A new locale needs nothing in the worker: it comes from `@equreka/core` `LOCALES`, and `localeOfPathname` mirrors the prefixed routing.
- The worker depends on generateSW emitting `importScripts` before its own listeners. The offline E2E catches a change in that order, because the reader payload of a never-visited entry is only reachable through the data cache.
- `esbuild`, already in the catalog for the engine's Hermes smoke bundle, becomes a dev dependency of `apps/web`.
- Islands import `localePayloadUrl` through one shared 209-byte chunk, which is precached with the shell.
