# Equreka

Your free and open-source app for equations, formulas, constants, magnitudes, variables and units — an offline-first web app (Astro) and mobile app (Expo) sharing one typed domain core.

> **Status: v2 rebuild in progress.** The previous Nuxt 2 application lives in the git history of this organization's original repository.

## Development

```bash
pnpm install
pnpm env:init
pnpm dev:web
```

| Command                                      | Action                                                 |
| -------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev:web` / `pnpm dev:mobile`           | Run an app in dev mode                                 |
| `pnpm build`                                 | Build everything (Turborepo, cached)                   |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates                                          |
| `pnpm check`                                 | Content validation (schema, integrity, TeX, solutions) |

## Repository layout

- `apps/` — `web` (Astro 7 + React islands, offline PWA) · `mobile` (Expo SDK 57)
- `packages/` — `schema`, `content`, `engine`, `core`, `tokens`, `config`
- `docs/architecture/decisions/` — architecture decision records

## License

Equreka licenses its code and its content separately ([ADR 0011](docs/architecture/decisions/0011-content-licensing-and-attribution.md)).

### Code

All source code is free software, licensed under the [GNU General Public License v3.0 or later](LICENSE) (`GPL-3.0-or-later`). That covers everything in this repository except the content described below.

### Content

The content is licensed under [Creative Commons Attribution-ShareAlike 4.0 International](packages/content/content/LICENSE) (`CC-BY-SA-4.0`). That covers:

- the entries in `packages/content/content/`: names, descriptions, learning paths, translations and data;
- the artifacts the build compiles from them: `packages/content/dist/`, and the presentation, search and engine data bundled into the web and mobile apps.

When you reuse the content, credit it as **Equreka contributors, https://github.com/Equreka/Equreka**, link to the license, and share any adaptation under CC BY-SA 4.0.

Some entries adapt third-party text, mostly from Wikipedia under CC BY-SA. Each one names its source in its `textSources` field, and the app shows that credit on the entry page. Keep it when you reuse the entry. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists the other third-party material.

### Contributions

Inbound = outbound: you contribute under the license of the part you change, GPL-3.0-or-later for code and CC BY-SA 4.0 for content. Opening a pull request means you agree to that.

Write prose in your own words. If you adapt licensed text, credit it in `textSources`; [docs/guides/authoring-content.md](docs/guides/authoring-content.md) explains how.
