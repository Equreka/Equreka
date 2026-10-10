# 0002 — v2 stack

Date: 2026-08-13 · Status: accepted

## Context

The legacy app (Nuxt 2, EOL; `eval()` on content; broken conversions; PWA-in-name-only) is being rebuilt. Design went through three parallel design tracks and an adversarial review of eight stack pillars against current (Aug 2026) evidence. Full plan: the session plan file; review verdicts summarized here because they bind implementation.

## Decision

- **Monorepo**: pnpm workspaces + Turborepo. Apps unscoped (`web`, `mobile`); packages `@equreka/*`; source exports; pnpm catalogs with `catalogMode: strict` as version SSOT.
- **Content**: YAML (eemeli `yaml@2`, YAML 1.2 only) in `packages/content/content/`, Zod-validated, compiled to a **sharded** JSON artifact (engine slice ≠ presentation slices). **All physical values are decimal strings end-to-end** — unquoted YAML numbers truncate to float64 silently; the legacy repo already worked around this in `pi.json5`.
- **Equation solving**: hand-authored per-variable solutions in content, **machine-verified at build** (random-substitution agreement), codegen'd to plain TS functions. `@cortex-js/compute-engine` is a build-time assistant and a lazy web-only playground, never an unattended oracle (74 releases in 2026, breaking changes in three consecutive releases Aug 9–12, bus factor 1, documented solve() failures on formula rearrangement until 2026).
- **Runtime numerics**: float64 + significant-figure display. Exact arithmetic only at build (factor composition).
- **Math rendering**: KaTeX ≥ 0.18.2 SSR'd at build on web (trust callback allowlisting `\htmlClass`/`\htmlData` only); MathJax 4.1 on mobile — build-time tex2svg with a shared glyph atlas + runtime liteAdaptor for calculator output. No WebView.
- **Offline**: shell + per-locale content bundle precache (~3–6 MB) + runtime caching + offline reader fallback. Full-HTML precache rejected (churn: any chunk change invalidates every page; sequential Workbox installs). Custom Astro integration over workbox-build/Serwist (`@vite-pwa/astro` is two Astro majors behind). *Amended by ADR 0013:* the precache holds the locale-neutral shell only; each locale's content bundle lives in a versioned data cache that the service worker fills for the locales the reader uses, and the 6 MiB budget counts the shell plus the largest locale.
- **TypeScript**: 6.x canonical everywhere (TS 7 has no stable programmatic API until 7.1 — astro check, Vitest type tests, and Expo tooling all require it). `tsgo` optional fast lane. Flip to 7 is tracked, gated on 7.1.
- **Mobile**: Expo SDK 57, committed v1 phase (user decision). Expo Go-compatible: `expo-sqlite/kv-store` for persistence (not MMKV — the sole dev-build forcer), no react-native-webview. Content bundled as per-collection JSON modules; MiniSearch index built on-device.
- **Search**: MiniSearch (pinned; dormant upstream but zero-dep and vendorable) behind a canonical shared `searchOptions` module; two-lane (exact/startsWith catalog lane above BM25); diacritic folding mandatory in both locales.
- **Styling**: Tailwind ≥ 4.1 with a written degradation floor (Safari 15-class devices must render legibly) and an old-engine smoke test; tokens from `@equreka/tokens`.
- **Lint/format**: Biome v2 pinned exact; boundary presets enforce package purity.

## Consequences

Adding an equation requires authoring its solutions — the build refuses expressions it cannot verify, so a wrong answer cannot ship silently. Artifact slices have CI size budgets; growth fails loudly. The TS 7 flip, Temml/MathML Core, Sveltia CMS, and self-hosted expo-updates are documented escape hatches, not v1 work.

## Format decision re-verified (2026-08-13)

A three-agent adversarial deep-research pass re-examined the content-format choice against current evidence; all three tracks independently concluded YAML (eemeli `yaml`, 1.2) remains the best fit. Two hardening outcomes were adopted:

- **Failsafe schema at the parse boundary.** The pipeline now parses with `{ version: '1.2', schema: 'failsafe', merge: false, uniqueKeys: true }`: every scalar arrives as a string, so unquoted-numeric float64 truncation is structurally impossible rather than lint-prevented, and 1.1 re-typing (octals, `yes`/`no`, tags, merge keys) is neutralized. Typed coercion happens exactly once, in `@equreka/schema` (`strictBool`, `intFromString`; rational `num`/`den` are digit strings only). Parser warnings surface as pipeline issues; `%YAML`/`%TAG` directives are lint errors in content.
- **JSON5 stays banned.** The research reproduced JSON5's silent TeX destruction: `\m`, `\c`, etc. are valid JSON5 escapes that decode to bare `m`, `c` — `"\mu"` becomes `mu` with no error, corrupting every TeX field it touches. That failure mode is unlintable at the text layer without reimplementing the escape grammar, and it is the recorded reason JSON5 remains excluded despite its comment support.

Prose scalars were migrated to folded block style (`en: >-`), removing the single-quote apostrophe-doubling trap from the corpus; block scalars carry TeX and apostrophes byte-literally.
