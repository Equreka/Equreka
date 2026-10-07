# 0011 — Content licensing and attribution

Date: 2026-10-06 · Status: accepted

## Context

- **One license for everything.** The repository declared `GPL-3.0` in the root `package.json` and the README. That SPDX identifier is deprecated, and it is ambiguous between "only" and "or later". The repository had no LICENSE file, and the workspace packages declared nothing. The content (YAML prose, data and translations) therefore fell under the GPL by default. The GPL is written for programs (source code, object code, installation information). It fits an encyclopedia entry poorly. It is also not the license of the ecosystem the content draws on and links to: Wikipedia is CC BY-SA, Wikidata is CC0.
- **Copied legacy prose.** The corpus migrated from the legacy app carries descriptions copied from Wikipedia without credit. CC BY-SA requires attribution (section 3(a)) and, for adaptations, ShareAlike (section 3(b)). Shipping that text uncredited is a license violation today, not a style issue.
- **No footer slot.** ADR 0008 fixes the shell, footer included, at 1:1 parity with the original app, so the footer cannot carry a license line.

## Decision

### Dual licensing

- **Code: GPL-3.0-or-later.** The root `LICENSE` is the verbatim GPLv3 text (35,149 bytes; SHA-256 `3972dc97…b36986`, the hash of gnu.org's `gpl-3.0.txt`). The root `package.json` changes from `GPL-3.0` to `GPL-3.0-or-later`, and every workspace `package.json` declares the license explicitly.
- **Content: CC BY-SA 4.0.** Content is everything under `packages/content/content/` (YAML prose and data, translation sidecars) plus every artifact built from it: `packages/content/dist/`, and the presentation, search and engine JSON the apps bundle.
  - `packages/content/content/LICENSE` holds the verbatim legal code, and `@equreka/content` declares `GPL-3.0-or-later AND CC-BY-SA-4.0`.
  - The pipeline reads only `<collection>/*.yaml` and yaml-lint only `*.yaml`, so the LICENSE file is never content. A loader test pins this, including the content hash.
  - Copyright does not cover bare facts such as a constant's value. The license covers whatever rights do exist in the selection, arrangement and prose.
- **Credit line.** Reusers credit the content as "Equreka contributors, https://github.com/Equreka/Equreka" (`CONTENT_ATTRIBUTION` in `@equreka/core/license`, identical in every locale).
- **Inbound = outbound.** A contribution is licensed under the license of the part it changes.

### Why CC BY-SA 4.0

- **Interchange with Wikimedia.** English and Spanish Wikipedia publish their text under CC BY-SA 4.0 (each site's API `rightsinfo`, checked 2026-10-06). Adapting their text requires BY-SA anyway, and BY-SA lets Equreka text flow back into Wikipedia. Wikidata is CC0, so using its identifiers imposes nothing.
- **Share-alike.** It keeps adaptations of an open educational resource open, the same intent the GPL serves for the code.
- **One-way compatibility with GPLv3.** Creative Commons declared GPLv3 a "BY-SA–Compatible License" for BY-SA 4.0 on 8 October 2015. Sources: the compatible-licenses page (creativecommons.org/compatible-licenses) and the announcement "CC BY-SA 4.0 now one-way compatible with GPLv3", both read 2026-10-06.
  - BY-SA 4.0 text may therefore become part of GPLv3 code, as some UI catalog strings already have. The reverse is not allowed: GPL code never becomes BY-SA content.
  - The code license is "or later", so GPLv3 is always available to receive such text.
- **Rejected alternatives.**
  - *GPL for everything* (the status quo). Reusers of a paragraph would face source-code obligations, and Equreka text could not flow back into Wikipedia.
  - *CC BY 4.0* and *CC0*. Neither can carry adapted BY-SA text, which must stay BY-SA, and both give up share-alike.

### Attribution surfaces

1. **Settings (web and mobile).** A License card with three lines: the content license with the credit line, the code license, and the repository, which holds the license texts and `THIRD_PARTY_NOTICES.md`.
2. **Entry pages.** Every entry with a non-empty `textSources` shows one line per source under its description: "Text adapted from <title> (<license>)", with both parts linked.
   - Web: unit, magnitude, constant, equation, category, branch and path pages (`components/text-sources.astro`).
   - Mobile: the entry, category, branch and path screens (`shared/ui/text-sources.tsx`).
3. **Invisible metadata.**
   - Every web page's head carries `<link rel="license" href="https://creativecommons.org/licenses/by-sa/4.0/">`.
   - The entry JSON-LD (`DefinedTerm`) carries `license` and one `isBasedOn` `CreativeWork` (name, url, license deed) per `textSources` item.
   - Category and branch pages now emit that JSON-LD too, so their credits are machine-readable.

**Not the footer.** ADR 0008 keeps the footer to the original's three columns. CC BY-SA 4.0 section 3(a)(2) accepts attribution "in any reasonable manner based on the medium", and a credit beside the adapted text, a settings page and machine-readable metadata together meet that standard.

### `textSources` contract

- **Shape.** Every entity, categories and branches included, accepts `textSources: [{ title, url, license }]`. The object is strict, the list defaults to `[]`, a URL may not repeat, and `url` must be http(s).
- **Licenses.** `license` is one of `CC-BY-SA-4.0`, `CC-BY-SA-3.0`, `CC-BY-4.0`, `CC0-1.0`, `public-domain`. Each permits publishing an adaptation under BY-SA 4.0 (BY-SA 3.0 section 4(b) permits a later version with the same license elements). GFDL-only and NC/ND texts cannot enter.
- **Not translated.** `title` names the credited work ("Wikipedia: Metre") and is not localized. The schema-derived locale tree has no node for it, so a sidecar cannot carry it.
- **Presentation only.** `textSources` rides in `presentation/*.json` and never in the engine slice.
  - `SCHEMA_VERSION` stays 4: the engine slice is unchanged, following the precedent of ADR 0004 and ADR 0007.
  - `CONTENT_PIPELINE_VERSION` is unchanged: no verification or math-render input changed.

### Originality check

`scripts/content/originality.mjs` is dev-only and network-bound: never in CI, never in `pnpm quality`. Its pure functions (`scripts/content/lib/`) are unit-tested by node:test inside `pnpm quality`.

- **Sources.** The entry's `externalIds.wikidata` item gives the article through its sitelinks (`wbgetentities`, batched by 50, lighter than `Special:EntityData`). English descriptions are compared with enwiki, Spanish sidecar descriptions with eswiki. A description that article does not flag, or that has no article, is compared with the hits of phrase searches for up to 5 of its shingles. Requests are sequential and paced, with the User-Agent `EquerekaOriginalityCheck/1.0 (https://github.com/Equreka/Equreka)`.
- **Normalization.** `$...$` and `$$...$$` TeX are stripped, then the text goes through NFKD with combining marks removed, lowercasing, and punctuation removal.
- **Measure.** 8-word shingles. The report gives the shared shingles, the longest shared run in words, and the share of the description's shingles found in the article.
- **Threshold.** Against the entry's own article, a description is flagged when the longest run is at least 8 words or the overlap is at least 15%.
  - A run of 8 words is one shared shingle, so the run rule subsumes the overlap rule. The overlap ranks how much was copied.
  - A search hit is not the entry's own article, so it must meet both rules. On the run rule alone, one stock 8-word phrase credited a Spanish branch description to an unrelated article.
- **Failure.** It fails closed: a network or API failure exits 2 and no source is guessed.
- **Modes.** `--apply` appends the missing credits as text and re-parses the file with the eemeli `yaml` parser to prove the edit; prose is never touched. `--check` exits 1 when a flagged description has no credit: this is the hook for the content verifier.
- **Limits.** The check compares against today's revision of each article. A legacy copy of a passage Wikipedia has since reworded escapes it, so *below the threshold* does not mean original. Stock phrases can over-credit. Over-crediting is harmless; under-crediting is the violation.

### Legacy-copy debt and its retirement

- **Baseline.** The run of 2026-10-06 (`docs/content/originality-baseline.md`) checked 139 descriptions. It flagged and credited 97: 84 against the entry's Wikidata-linked article and 13 through phrase search. Another 42 fell below the threshold, and 28 could not be checked (no Wikidata item or article, and no search match).
- **Policy.** New prose is original writing. Adapting licensed text is allowed only with a `textSources` credit, and it is a debt to repay, not a way to write.
- **Retirement.** The rewrite wave replaces every legacy description with original writing, whatever its baseline row says. A rewritten description that no longer flags loses its Wikipedia `textSources` entry in the same change. The debt is retired when the baseline's flagged list is empty and the verifier runs `--check` on every content change.
- **UI catalog.** The legacy home-card strings (`design.content.home.type.*` and `design.content.home.category.*` in `packages/core/src/i18n`) are also Wikipedia text. They sit in GPL code under the one-way compatibility above and are credited in `THIRD_PARTY_NOTICES.md` until the same wave rewrites them.

## Consequences

- Every legacy Wikipedia copy the check can see is credited on its page and in its metadata. The license question for the content is settled before the corpus grows.
- **Contributors.**
  - Content and code changes carry different licenses. A PR touching both is two contributions under two licenses.
  - Authors either write original prose or credit what they adapt (`docs/guides/authoring-content.md`, *Universal rules*).
- **Visual cost.** The settings page gains one card, and entry pages gain one note line when an entry credits a source. The shell and footer are untouched (ADR 0008).
- **Tool limits.** The originality tool depends on Wikimedia APIs and on Wikidata identifiers. Entries without a QID are checked only by phrase search, and the tool cannot prove a text original.
