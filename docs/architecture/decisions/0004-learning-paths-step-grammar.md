# 0004 — Learning paths: step grammar v1

Date: 2026-09-09 · Status: accepted

## Context

ADR 0003's backlog (item 5) left `paths` empty pending a decision on the step grammar. The v1 seed already had two step kinds (`entry`, `prose`) and nothing else — no level, no ordering between paths, no learner interaction. Authoring content against an undecided grammar would have produced migration debt.

## Decision

Minimal grammar, decided before authoring:

- **Path fields.** `level: intro | intermediate | advanced` (required), `prerequisites: ref(paths)[]` (default empty), `estimatedMinutes` (optional positive integer). Prerequisites must resolve and form no cycle; a path cannot list itself. Cycle reporting is deterministic (each elementary cycle once, from its lexicographically smallest member).
- **Step kinds.** `entry { ref: { collection, slug }, note? }` sends the learner to one wiki entry (`paths` and `categories` are not valid targets — a nested path is a prerequisite, a category is a listing); `prose { body }` is authored transition text; **new:** `check { prompt, answer }` is a self-check question whose answer the learner reveals. No grading engine, no answer normalization — prose only.
- **Pipeline.** Entry steps resolve at integrity; every step prose field is strict-KaTeX-linted exactly like descriptions and is never allowlist-downgradable. `presentation/paths.json` carries each entry step's resolved `target { name, symbolText }` so readers need no second lookup. Paths index into search and catalog-lite like any collection. `SCHEMA_VERSION` stays at 2: the engine slice is untouched.
- **Progress** lives on the reader's device (`equreka.v1.path-progress`, a record path slug → completed step ids) and travels inside the favorites export envelope as an optional `pathProgress` field; import merges by union. Step ids are therefore a stable contract — renaming one resets that step's progress.

## Deviations from the implementation brief

- The brief asked to keep the `entry` step flat (`{ id, collection, slug }`). Rejected after a build-time finding: Astro's content layer walks every entry's data and treats any object carrying a known `collection` plus an `id` (preferred) or `slug` as a `reference()`, logging `Invalid content reference` when the id is not in the store — so a step whose `id` differs from its target slug (`mass-energy` → `mass-energy-equivalence`) was flagged, and the rest passed only because their ids happened to equal the slugs. The step's identity and its target are separate concerns; nesting the target under `ref` makes Astro validate exactly what is a reference and nothing else.

- The brief asked the pipeline to emit a `route` per entry step. Rejected: routes are a web URL scheme (prefixes share one page; variables have none), and the artifact is platform-neutral (ADR 0002 — mobile consumes the same JSON). Readers derive the route from `(collection, slug)` through their own router; the web already has `entryHref` for search and favorites.

## Consequences

- Four paths ship with the decision (SI base units, temperature scales, energy/work/heat, circle-and-triangle geometry), fully bilingual at the step level.
- Grading, branching, and media steps are explicitly out of scope; adding a step kind is a schema + this-ADR change.
- An entry step may target a `variables` entity, which has no page on the web; the path page renders it as a card without a link. A variables page is a separate decision.
