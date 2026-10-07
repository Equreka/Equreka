---
name: equreka-content-wave
description: Main-session runbook for one Equreka content wave from docs/content/roadmap.yaml - preflight, build the Workflow args, run the saved content-wave workflow (authors and adversarial verifiers), reconcile leftovers in the roadmap, run the gates and open the PR. Use when asked to run, resume or finish a content wave (W1.1 to W17).
---

# Equreka content wave

One wave is one multi-agent run and one PR. You orchestrate: authors follow `equreka-author`, verifiers follow `equreka-verify`, and you own the roadmap, the gates, the commit and the PR. Read `docs/content/README.md` first.

## 1. Preflight

1. Confirm the base branch the user named (default `main`) is checked out, up to date and clean: `git status --short` is empty.
2. `CI=true pnpm install --frozen-lockfile`.
3. Baseline must be green before any authoring: `pnpm --filter @equreka/content check`, `pnpm quality`. Record the warning count; a wave may not add warnings except the transient empty-branch ones the README lists.
4. Record the artifact baseline: `pnpm --filter @equreka/content build`, then the byte sizes of `packages/content/dist/engine.json`, `packages/content/dist/presentation/`, `packages/content/dist/search/` and the math bodies.
5. Create the branch `content/<wave id, lowercase>-<topic>`, for example `content/w2-arithmetic-algebra-statistics` or `content/w1.3-thermo-em-optics`.

## 2. Build the args

```sh
node scripts/content/roadmap.mjs --wave <id> --json > <scratchpad>/wave-args.json
node scripts/content/roadmap.mjs --wave <id>
```

`slices[].items` are the remaining entries (planned and not done, computed from the files), and `ownerBySlug` maps every writable `<collection>/<slug>` to its slice. If `summary.remaining` is 0 the wave is done: report and stop. If a slice depends on an entry of an earlier wave that is not done (`--status` shows it remaining), stop and run that wave first.

## 3. Run the workflow

Invoke the saved workflow **`content-wave`** with the args file. Per slice it runs one author (opus) under `equreka-author` and one verifier (sonnet) under `equreka-verify`, loops blocker and major findings back to the author until the verifier passes, and returns every author output and verifier report. Slices run in parallel; only the owning slice writes a file.

While it runs, do not edit content yourself. After it returns:

- Apply `sharedEdits[]` centrally, one by one, after checking each against the rules (an edit no slice owned, such as a `unitOf` entry on a unit of an earlier wave). Re-run the check after them.
- Every verifier verdict must be `pass`. A slice that still fails after the workflow's retries: revert its unfinished files and park its entries (step 4).

## 4. Reconcile the roadmap

Edit `docs/content/roadmap.yaml` (eemeli-`yaml`-compatible text, the existing one-line entry style):

- Entries the authors reported in `deferred[]`, or that you parked: `state: deferred` or `blocked` with a `reason` that names the missing piece.
- `missingPrereqs[]`: add a `create` entry in the earliest wave that can still own it (this wave if it was authored here, otherwise a later prerequisite or the next wave), with a `note`.
- Renamed slugs (an author found a better conventional slug): change the entry, never leave two.
- Never store progress: no done flags, no word counts.

Then `node scripts/quality/roadmap-check.mjs` and `node scripts/content/roadmap.mjs --wave <id>` (remaining must be only what you parked).

## 5. Gates

All green, or the wave is not done:

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm quality
pnpm --filter @equreka/content check
node scripts/content/originality.mjs <every file the wave wrote> --format json --out <scratchpad>/originality.json
```

The originality report must show `flagged: false` for every new or rewritten description (legacy entries outside the wave may still flag until W1.5–W1.7 rewrite them).

Measure the artifact delta against the preflight baseline. `pnpm --filter @equreka/content build` prints every artifact's size, gzip size and share of its budget (`ARTIFACT_BUDGETS` in `packages/content/src/artifact-budgets.ts`, ADR 0010), then the mobile-bundled total against 8 MiB; the web build checks its derived payloads the same way. The build warns from 80% of a budget and fails over it. If any artifact passes 90% of its budget, stop before committing and raise it with the user: the README records the open budget decision.

## 6. Commit and PR

One commit per wave, Conventional Commits with the `content` type for data-only changes (`content(<scope>): <wave id> <title>`), roadmap edits included. Push the branch and open the PR against the base branch. **Never merge**, never set `reviewed`, never push to `main`.

PR body:

```markdown
## <wave id>: <wave title>

<one-paragraph summary: N entries created, M rewritten; all status draft>

### Entries
| Entry | Action | Level | Flags (as implemented) | Spanish |
| --- | --- | --- | --- | --- |
| equations/<slug> | create | intro | MR, G:asin | complete |

### Deferred or blocked
- <collection>/<slug>: <state>, <reason>

### Review checklist (confirmed by the verifiers)
For each entry: values and uncertainties with the NIST/BIPM/IUPAC URL, QIDs with their EntityData URL, QUDT IRIs, one worked example per equation. A reviewer ticks each line, then promotes the entry to `reviewed` in a follow-up.
- [ ] constants/<slug>: value … uncertainty … (<url>)
- [ ] equations/<slug>: worked example … (<url>)

### Open questions
- <from the authors' openQuestions and the verifiers' minor findings>

### Gates
- lint / typecheck / test / build: pass
- quality (yaml-lint, roadmap-check): pass
- content check: 0 errors, N warnings (<which, why>)
- originality: 0 flagged of N descriptions

### Artifact size
| File | Before | After | Delta |
| --- | --- | --- | --- |
| engine.json | | | |
| presentation/ | | | |
| search/ | | | |
| math bodies | | | |
```

End the PR body with the attribution line the session requires.
