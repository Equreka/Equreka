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

GPL-3.0
