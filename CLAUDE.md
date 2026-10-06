# Equreka v2

Open-source, offline-first educational wiki + calculator (equations, constants, magnitudes, units, SI prefixes). pnpm + Turborepo monorepo; Astro 7 web app + Expo SDK 57 mobile app sharing a typed domain core.

## Layout

- `apps/web` (Astro + React islands) · `apps/mobile` (Expo, Expo Go-compatible)
- `packages/schema` (Zod contract) · `packages/content` (YAML + pipeline → sharded artifact) · `packages/engine` (platform-free math, float64 runtime) · `packages/core` (shared hooks + ports, no react-dom/react-native) · `packages/tokens` · `packages/config` (tsconfig/vitest/biome presets)
- `tools/migrate-legacy` (one-time; `legacy/` holds the old app's content as migration input)
- `docs/architecture/decisions/` — ADRs. Read 0002 before challenging a stack constraint.

## Critical rules

- Physical values are **decimal strings** end-to-end; parse only at consumption boundaries. Never convert content values to YAML/JSON numbers.
- Only the eemeli `yaml` package parses YAML (1.2 core). js-yaml is forbidden.
- No `eval`, no runtime CAS in the calculator path. Equation solutions are authored in content and build-verified.
- Versions come from the pnpm catalog (`catalog:`); exact-pinned entries (katex, mathjax, minisearch, biome, compute-engine, typescript) are pinned for reasons documented in `pnpm-workspace.yaml` — do not float them.
- Package purity is enforced by Biome presets: `engine`/`schema`/`content` import no React; `core` imports no react-dom/react-native.
- TeX in YAML: plain/single-quoted/block scalars only; double quotes break on `\m`.
- Licensing: code is GPL-3.0-or-later; everything under `packages/content/content/` is CC BY-SA 4.0 (ADR 0011). Prose is original; adapted third-party text needs a `textSources` credit.
- Quality gates: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all green or the change is not done.

## Workflow

- Conventional Commits (commit-msg hook enforces; type `content` exists for data-only changes).
- main is protected; PRs only. Skip idiom for hooks: `LEFTHOOK=0 git commit` (exceptional, not routine).
- Env files: `envs/<environment>/.env`, bootstrapped by `pnpm env:init`, consumed via explicit dotenv-cli.
- Content program: `docs/content/` (roadmap, style guide, Spanish glossary); skills `equreka-author`, `equreka-verify`, `equreka-content-wave` in `.claude/skills/`.
