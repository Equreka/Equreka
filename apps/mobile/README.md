# Equreka mobile

Expo SDK 57 app over the shared `@equreka/*` domain core: the wiki, the unit converter, the equation calculator and learning paths, fully offline. Content ships inside the JS bundle as per-collection JSON modules; nothing is fetched at runtime.

## Constraints that shape this app (ADR 0002, 0005)

- **Expo Go-compatible.** Persistence is `expo-sqlite/kv-store` (not MMKV), there is no WebView, and no module here needs a custom native build during development.
- **Math is pre-rendered.** `@equreka/content` emits a MathJax glyph atlas and per-TeX SVG bodies at build; the app hydrates a body per render into `react-native-svg`'s `SvgXml`. Plain symbols (letters, Greek, simple scripts, degree forms) render as Unicode `Text` inline; 2-D math renders as an SVG block below its paragraph. `SvgXml` is never nested inside `<Text>`. The one runtime exception is the calculator's solved form: `shared/math/runtime-mathjax.ts` boots MathJax (`@mathjax/src`, the pin the pipeline renders with) on the first solve and shows the plain solution string in monospace if a render throws or overruns its 250 ms budget.
- **Search is built on-device** from the bundled catalog-lite plus localized descriptions, with the canonical `searchOptions` from `@equreka/content/search-options`.
- **Versions come from the pnpm catalog.** Every native-facing dependency is pinned to `expo@57.0.21`'s `bundledNativeModules.json`; `react`/`react-dom` stay on the catalog's `19.2.3`.

## Layout

```
app/          Expo Router routes (thin: params → feature screen, header title)
features/     one folder per screen: home, browse, category, entry, converter,
              calculator, paths, search, favorites, settings
entities/     content projections: presentation types, lookups, routes, notation
shared/       content source (artifact getters), engine registry, math tiering +
              hydration, providers, sqlite storage, theme, ui primitives
__tests__/    jest-expo suite
```

Deep links: `equreka://entry/<collection>/<slug>` (e.g. `equreka://entry/units/metre`), `equreka://paths/<slug>`, `equreka://category/<slug>`, `equreka://converter?magnitude=length&from=metre`, `equreka://calculator/<slug>`.

## Develop

```sh
pnpm --filter @equreka/content build   # once: populates the artifact the app bundles
pnpm dev:mobile                        # expo start — scan with Expo Go
```

Metro is configured for the pnpm monorepo (`metro.config.js`): the workspace root is a watch folder, both `node_modules` roots are lookup paths, the workspace packages' `./x.js` imports resolve to their `.ts` sources, and `inlineRequires` keeps each JSON collection lazy until a screen needs it.

## Gates

```sh
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm --filter mobile export            # expo export --platform android: proves Metro
                                       # resolution, JSON modules and Hermes bytecode
```

All three also run under the root `pnpm typecheck && pnpm test` and are part of CI.

## Release lanes

Expo Go covers daily development. Anything that ships to a device goes through EAS:

| Lane | `eas.json` profile | What it is |
| --- | --- | --- |
| development | `development` | dev client (`developmentClient: true`), internal distribution |
| preview | `preview` | release build, internal distribution, channel `preview` |
| production | `production` | store build, auto-incremented, channel `production` |

`runtimeVersion` uses the **fingerprint policy**: the runtime version is the `@expo/fingerprint` hash of everything native (config, native deps, plugins). `.fingerprintignore` excludes JS-only churn so a content or screen change never forces a native build.

### OTA updates are CI-only

`eas update` is never run from a workstation. `.github/workflows/mobile-update.yml` (`workflow_dispatch`) computes the current fingerprint, runs `eas fingerprint:compare` against the target channel's latest build, and publishes only when the fingerprints match. A mismatch means a native build is required first, and the job fails loudly instead of shipping an update no installed binary can load.

Required secrets: `EXPO_TOKEN`. `app.json` carries placeholder `updates.url` / `extra.eas.projectId` values; `eas init` replaces them once the project exists on EAS.

## Assets

`assets/*.png` are placeholder rasterizations of `docs/brand/logo.png` produced by `pnpm --filter mobile brand:icons`. Replace them with designer exports before store submission; the geometry already matches Expo's requirements.
