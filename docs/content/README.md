# Content program

The plan and the system for growing the corpus from its migrated seed to about 770 roadmap entries (≈430 new equations plus their prerequisites and a rewrite of every legacy entity), authored by AI agents in waves and reviewed by people.

## Where things live

| What | Where |
| --- | --- |
| Plan: every planned, rewritten or retired slug | [`roadmap.yaml`](roadmap.yaml) |
| How prose reads | [`style-guide.md`](style-guide.md) |
| Spanish conventions and terms | [`glossary-es.md`](glossary-es.md) |
| Field and YAML contract | [`../guides/authoring-content.md`](../guides/authoring-content.md), ADRs 0003, 0006, 0007, 0009 |
| Author procedure (one agent, one slice) | `.claude/skills/equreka-author/` |
| Adversarial verification | `.claude/skills/equreka-verify/` |
| Main-session runbook for one wave | `.claude/skills/equreka-content-wave/` |
| Roadmap CLI | `scripts/content/roadmap.mjs` |
| Roadmap structure gate (in `pnpm quality`) | `scripts/quality/roadmap-check.mjs` |
| Originality check (dev-only, network) | `scripts/content/originality.mjs` |

## Phases

| Phase | Waves | Content |
| --- | --- | --- |
| W1.0 | (this change) | Authoring system: style guide, glossary, roadmap, scripts, skills |
| Taxonomy | W1.1 | Category and branch rewrites, new branches, `arithmetic-and-algebra` split and retired |
| Prerequisites | W1.2–W1.4 | Magnitudes, units and constants the equations need |
| Legacy rewrite | W1.5–W1.7 | Every migrated entity rewritten to the style guide, with a Spanish sidecar |
| School | W2–W12 | `level: intro` equations, one learning path per wave |
| University | W13–W16 | `level: intermediate` equations |
| Milestone 2 | W17 | Deferred-scope equations |

| Wave | Title | Entries |
| --- | --- | --- |
| W1.1 | Taxonomy: categories and branches | 27 |
| W1.2 | Prerequisites: mechanics, waves, mathematics, gravitation | 53 |
| W1.3 | Prerequisites: thermodynamics, electromagnetism, optics | 49 |
| W1.4 | Prerequisites: modern physics, nuclear physics, chemistry | 41 |
| W1.5 | Legacy rewrite I: magnitudes, constants, variable, equations, paths | 50 |
| W1.6 | Legacy rewrite II: SI and SI-accepted units | 38 |
| W1.7 | Legacy rewrite III: customary and historical units, prefixes | 49 |
| W2 | Arithmetic, algebra, statistics and probability | 34 |
| W3 | Geometry and trigonometry | 39 |
| W4 | Kinematics | 24 |
| W5 | Dynamics, energy, momentum | 28 |
| W6 | Gravitation, fluids, rotation and statics | 28 |
| W7 | Waves, sound, optics | 35 |
| W8 | Thermodynamics and gases | 23 |
| W9 | Electrostatics and circuits | 26 |
| W10 | Magnetism, induction, modern physics | 24 |
| W11 | Nuclear physics, amount of substance, atomic structure, solutions | 26 |
| W12 | Acids and bases, thermochemistry, kinetics, electrochemistry | 14 |
| W13 | University: mathematics, mechanics, gravitation, fluids | 36 |
| W14 | University: waves, optics, thermodynamics | 25 |
| W15 | University: electromagnetism, modern and nuclear physics | 26 |
| W16 | University: chemistry | 32 |
| W17 | Milestone 2 | 40 |

Live progress: `node scripts/content/roadmap.mjs --status`.

## Running a wave

One wave is one multi-agent workflow (authors on opus, adversarial verifiers on sonnet) and one PR. The main session follows the `equreka-content-wave` skill:

1. Preflight on the base branch: `pnpm --filter @equreka/content check` green; create `content/<wave-id>-<topic>`.
2. `node scripts/content/roadmap.mjs --wave <id> --json` builds the Workflow `args`: the remaining items by slice and `ownerBySlug`.
3. Run the saved `content-wave` workflow. Each slice's author follows `equreka-author`; each verifier follows `equreka-verify`.
4. Park leftovers in the roadmap as `deferred` or `blocked` with a `reason`.
5. Open the PR with the review checklist from the skill. Never merge: a person promotes entries to `reviewed`.

## Roadmap model

`roadmap.yaml` holds `waves` (id, title, milestone, up to three `slices` with their branches, the `paths` the wave creates) and `entries`, one per `(collection, slug)`:

| Field | Meaning |
| --- | --- |
| `action` | `create` a new file; `rewrite` an existing description to the style guide with a complete sidecar; `edit` a targeted change; `retire` delete the file |
| `wave`, `slice` | Owner. Only that slice's author writes the file |
| `branches` | Target branches (for a rewrite, after re-filing) |
| `level` | `intro` or `intermediate`; required on equations |
| `milestone` | 1 or 2; equals the wave's |
| `flags` | Authoring hints, below |
| `name` | Working title; the author sets the final name per the style guide |
| `note` | Planning hints (dimension, base unit, factor, source). Hints, never values to copy: every value is fetched |
| `edits` | Other files this entry's author changes, as `<collection>/<slug>` (an alias moving, a `kindOf`, a `unitOf`) |
| `state` | `planned`, `deferred` or `blocked`; the last two need a `reason` |

**Done is computed, never stored.** `create`: the file exists. `retire`: the file is gone. `rewrite` and `edit`: the entity meets the content contract, which is a Spanish sidecar carrying every localized field, no regional unit name in it, and an English description at or above the style guide's floor. `--status` also counts, from the files, `reviewed` entries, sidecar gaps and descriptions under the floor.

**Flags**

| Flag | Meaning |
| --- | --- |
| `MR` | A target has several roots; list the physical root first |
| `G:<fn>` | Needs grammar function `<fn>` (`asin`, `log10`, `cbrt`, `factorial`, …) |
| `ANG` | An angle term: a `plane-angle` magnitude term anchored on the radian |
| `T2` | A temperature difference: declare the term `delta: true` |
| `NC` / `NC:<terms>` | No closed form for those terms: narrow `calculator.solveFor` |
| `INT` | Integer terms: `integer: true` |
| `NONALG` | Notation only: `algebraic: false`, no solutions, no calculator |
| `KEY` | The conventional symbol needs care as a TeX key (`c_{\mathrm{A}}`, `K_{\mathrm{a}}`, an `identifier` override for `[\mathrm{H}^{+}]`) |
| `SHARED` | Filed in two branches |

`roadmap-check` (in `pnpm quality`) fails on: an unknown collection, wave, slice, branch, field or flag; a duplicate `(collection, slug)`; a non-kebab slug; an equation without `level`; a `rewrite` or `edit` without a file; an existing content file without an entry; a slug an equation shares with a magnitude, unit or constant; an `edits` target nothing creates by that wave, or that two slices of one wave own; a wave with more than three slices or a path missing from its wave's `paths`. It reads filenames only, so it runs offline in milliseconds.

## Decision log

**2026-10-06**

- **Audience staged.** All school entries (`intro`) before the university pass (`intermediate`); every domain in both.
- **Descriptions are encyclopedic and original** under CC BY-SA 4.0. Wikipedia may be used to find sources, is never cited and never closely paraphrased; `scripts/content/originality.mjs` is the verifier's check.
- **Bilingual from day one.** Every entity ships a complete `.es.yaml`; Spanish unit names follow CEM's SI Brochure (julio, vatio, …), regional forms only in `aliases`. The decimal point is used in both languages (allowed by the 22nd CGPM, Resolution 10), deviating from CEM's comma so math stays byte-identical.
- **AI content is always `draft`.** Adversarial verifiers check values against primary sources (NIST CODATA 2022, SI Brochure 9th ed. Table 8, NIST SP 811 App. B.8, IUPAC/CIAAW, IAU) and formulas before commit; a person promotes to `reviewed`.
- **The roadmap is the single source of truth** for planned slugs, outside `packages/content/content` so the loader and yaml-lint ignore it; progress is computed from content.
- **Roadmap adjustments made while encoding the approved catalog:**
  - `retire` added as a fourth action (done when the file is gone) for `arithmetic-and-algebra`.
  - Slug rule applied to three more equations: `volumetric-flow-rate-formula`, `sound-intensity-formula`, `sound-intensity-level-formula`.
  - `reciprocal-metre` moved from W7 to W1.4, because the Rydberg constant (W1.4) needs it.
  - Five magnitude-less compound units added beside the constants that need an SI-coherent unit: `cubic-metre-per-kilogram-second-squared` (G), `newton-square-metre-per-square-coulomb` (kₑ), `watt-per-square-metre-kelvin-to-the-fourth` (σ), `metre-kelvin` (b), `coulomb-per-mole` (F).
  - `isobaric-work` is SHARED with `gases` like `ideal-gas-law` (the catalog tagged both); `KEY` added to the acid-base, kinetics, equilibrium and Nernst equations, whose conventional symbols are bracketed or subscripted concentrations.
  - Milestone-2 equations default to `intermediate`; eight that are school topics are `intro` (loan payment, annuity, sum of squares, frustum, point-line distance, projectile trajectory, Wheatstone bridge, heat-pump COP).
  - Existing paths take `edit` entries (fix regional unit names in their Spanish prose); two already meet the contract and count as done.
  - Prerequisite and legacy waves have slices of up to 20 entries (W1.7 prefixes) to keep three slices per wave; the entries there are short.
- **Open decision before W2: artifact budgets will not hold the program.** Measured on the W1.0 base: `presentation/math/bodies.json` is 580 KB of its 1 MB budget with 599 bodies (≈0.97 KB each), leaving room for ≈480 more unique fragments, while the ≈430 new equation expressions alone need ≈430 and each description adds more; the search indexes (313 KB `es`, 311 KB `en`, 1 MB budget each, `emit.ts`) index full descriptions, which grow about fourfold per entry across three times the entries. Expect the math budget to fail during the school waves and the search budget soon after. Options: shard or lazy-load math bodies per collection or per entry, index only a description's lede, or raise the budgets with a measured mobile cost. The wave runbook stops a wave at 90% of any budget.
  - **Search resolved (ADR 0010):** every artifact now has a budget in `ARTIFACT_BUDGETS`; shipped JSON is compact; search indexes only a description's lede (first paragraph, 480 characters), which projects to about half the 1 MiB budget at the full program; presentation slices no longer carry pre-split segments. `build` prints each artifact's share of its budget and warns from 80%.
  - **Math bodies resolved (ADR 0005, ADR 0010):** bodies v2 store only what varies per body and ship in 16 hash shards of 128 KiB each; the 599 bodies fell from 552 KB to 221 KB, and the largest shard is 19 KB. A shard nearing its budget means doubling `MATH_SHARD_COUNT` (ADR 0010).
- **Known transient warnings.** W1.1 creates branches that no entry lists until their content waves (arithmetic, algebra, gravitation, fluid-mechanics, nuclear-physics, gases, solutions, thermochemistry, acids-and-bases, electrochemistry); the build warns once per empty branch until then.
