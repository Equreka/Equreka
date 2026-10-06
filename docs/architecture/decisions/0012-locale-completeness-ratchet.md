# 0012 — Locale completeness ratchet

Date: 2026-10-06 · Status: accepted

## Context

Equreka is bilingual (en/es). Entity files carry English only, and translations live in `<slug>.es.yaml` sidecars (ADR 0003 item 8). The `es` key of every `localizedText` is optional. A reader on the Spanish site sees English with an *untranslated* notice wherever it is missing.

Nothing in the build told an author that a translation was missing. A new entity with no sidecar shipped as English on the Spanish site, and the build stayed green. The only completeness check was a test pinned to the four learning paths.

The checker introduced here reports, on the corpus as of this change, that 137 of the 153 authored entity files lack at least one Spanish field:

| Collection | Incomplete | Typical gap |
| --- | --- | --- |
| categories | 4 / 4 | name, description |
| branches | 0 / 12 | — |
| magnitudes | 33 / 33 | name, description |
| units | 67 / 67 (the 3 prefixed overrides included) | description, often name |
| prefixes | 20 / 20 | description |
| constants | 8 / 8 | name, description |
| variables | 1 / 1 | name, description |
| equations | 4 / 4 | name, description (term labels are translated) |
| paths | 0 / 4 | — |

In total, 102 entities lack a Spanish `name` and 135 lack a Spanish `description`. The corpus is about to grow by an order of magnitude (ADR 0009 counts roughly 390 equations), and every entity added without a gate grows this backlog.

The decision taken: all new content is bilingual from the day it lands, and the existing gaps are backfilled by the content waves W1.5–W1.7.

## Decision

### Rule

Pipeline stage `locale` (`pipeline/locale-completeness.ts`) runs after validation and before prefix expansion. For every translation locale (`TRANSLATION_LOCALES`, today only `es`), every localized position whose English text an entity authors must carry non-blank text in that locale. A missing translation is an error. The finding names the sidecar the translation belongs in and lists the missing positions, addressed as the sidecar addresses them.

The positions are derived from the schema's locale tree (`collectionLocaleTrees`), the same tree that drives the sidecar contract. A `localizedText` field added to the schema later is therefore gated without any change to the stage. Today the tree yields:

- `name` and `description` in every collection;
- `namePlural` of units;
- `terms.<key>.label` of equation symbol terms, keyed by term key;
- `steps.<id>.note`, `steps.<id>.body`, `steps.<id>.prompt` and `steps.<id>.answer` of paths, keyed by step id.

An optional position the entity does not author (no `description`, an entry step without a `note`) asks for nothing.

### What is judged

The stage reads the loaded entity files with their sidecars merged, before prefix expansion:

- **Generated prefixed units are never judged.** They have no file. Their Spanish is the template's, and it exists exactly when the prefix and the base are translated (ADR 0007), which the stage already requires of those two entities.
- **A hand override is judged on what it authors.** A `prefixOf` file's hand English description needs a hand Spanish description. The template-generated Spanish that the expansion would merge in describes the generic prefixed unit. It does not translate the hand text (the micron, `mcg`).

Judging the expanded corpus instead would demand translations for 143 files that do not exist and would accept the template text as a translation of hand prose.

### Debt file

`packages/content/locale-debt.json` lists the entities allowed to stay incomplete, per locale:

```json
{ "es": ["categories/chemistry", "units/ampere"] }
```

- An incomplete entity that the debt does not list is an error.
- A listed entity that is complete, or that no longer exists, is an error: `stale locale debt: remove '<id>'`. The change that lands a translation must also delete the entity from the list, so the list only shrinks.
- Entries must be sorted and unique, so every removal is a one-line diff and no second copy of an id can survive a removal.
- A missing file reads as an empty debt, the state the ratchet ends in. A malformed file is an error that names the file. It is never read as an empty debt.
- The initial 137 entries were generated from the checker's own output, not typed by hand.

### Ceiling

`LOCALE_DEBT_CEILING` in `pipeline/__tests__/locale-completeness.test.ts` is set to the debt's size, 137. The test fails when the debt is larger than the ceiling, and also when it is smaller. A backfill change that shrinks the debt lowers the ceiling to match.

The stale-entry rule stops a completed entity from staying on the list. The ceiling closes the other route: adding a new id to the list. Doing that now also means raising a test constant, which is a visible decision in review. The ceiling is an equality rather than an upper bound because an upper bound would leave slack after each shrink. A later change could then fill that slack with a new incomplete entity without touching the ceiling.

### Reporting

`check` and `build` print `locale es: <complete>/<total> authored entities complete, <n> in debt`. `CompileReport.locale` carries the same coverage for each locale.

## Alternatives considered

- **Big-bang backfill, then the gate.** Writing 135 descriptions is content work that belongs to waves W1.5–W1.7. If the gate waited for that work, it would stay open the whole time, and every entity merged meanwhile would enlarge the backlog the waves must clear. The ratchet closes the gate now and lets the backlog only shrink.
- **A warning instead of an error.** A warning does not stop a merge. It would recreate the silent fallback with extra output.
- **A coverage percentage.** A percentage lets new incomplete entities land as long as the ratio holds. That contradicts "no new incomplete entity".
- **Per-field debt** (`units/metre#description`). It is finer-grained, but the file would be about 240 lines and would churn. The entity is also the unit a translator works in: one sidecar.

## Consequences

- New content lands bilingual or fails `check` and `build`.
- The runtime fallback stays. A debt entity falls back to English with the untranslated notice until it is backfilled. A generated unit whose prefix or base lacks a locale still falls back, but the gate now requires both of those entities to be translated.
- Each backfill change adds the sidecar text, deletes the ids the build reports as stale, and lowers the ceiling.
- When the debt is empty, the end of W1.7, `locale-debt.json`, `readLocaleDebt` and the ceiling test are deleted. The stage stays and enforces completeness with no exceptions. A translation locale added later is a new decision: it lands complete, or it brings its own debt under its own ADR.
- No version bump. `SCHEMA_VERSION` is unchanged because no schema changed. `CONTENT_PIPELINE_VERSION` is unchanged because the stage emits nothing, leaves the artifact bytes as they are, and no derivation cache stores a locale verdict. The debt file is a tracked file of `@equreka/content`, so Turborepo's default task inputs cover it, and editing it re-runs `check`, `build` and `test`.
