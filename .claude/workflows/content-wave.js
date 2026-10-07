export const meta = {
  name: 'content-wave',
  description: 'Author one Equreka content wave: slice authors, adversarial verifiers, consistency critic, fixer, gate',
  whenToUse: 'Run one roadmap wave (docs/content/roadmap.yaml) after `node scripts/content/roadmap.mjs --wave <id> --json` produced the args, on a fresh content/<wave> branch.',
  phases: [
    { title: 'Author', detail: 'one opus author per slice writes entity + es sidecar files', model: 'opus' },
    { title: 'Verify', detail: 'one adversarial sonnet verifier per slice, starts as soon as its author ends', model: 'sonnet' },
    { title: 'Consistency', detail: 'cross-slice critic: symbols, labels, Spanish terminology, duplicates', model: 'sonnet' },
    { title: 'Fix', detail: 'single writer applies blockers and majors, loops check until clean', model: 'opus' },
    { title: 'Gate', detail: 'all quality gates, originality, artifact delta, PR body (no commit)', model: 'sonnet' },
  ],
}

const ISSUE = {
  type: 'object',
  properties: {
    severity: { type: 'string', enum: ['error', 'warning'] },
    stage: { type: 'string' },
    file: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['severity', 'file', 'message'],
}

const AUTHOR_SCHEMA = {
  type: 'object',
  properties: {
    filesWritten: { type: 'array', items: { type: 'string' } },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          collection: { type: 'string' },
          slug: { type: 'string' },
          flags: { type: 'array', items: { type: 'string' } },
          references: { type: 'array', items: { type: 'string' } },
        },
        required: ['collection', 'slug'],
      },
    },
    deferred: {
      type: 'array',
      items: {
        type: 'object',
        properties: { slug: { type: 'string' }, reason: { type: 'string' } },
        required: ['slug', 'reason'],
      },
    },
    missingPrereqs: { type: 'array', items: { type: 'string' } },
    sharedEdits: {
      type: 'array',
      items: {
        type: 'object',
        properties: { file: { type: 'string' }, change: { type: 'string' }, why: { type: 'string' } },
        required: ['file', 'change', 'why'],
      },
    },
    openQuestions: { type: 'array', items: { type: 'string' } },
    checkIssues: { type: 'array', items: ISSUE },
  },
  required: ['filesWritten', 'entries', 'deferred', 'missingPrereqs', 'sharedEdits', 'checkIssues'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          field: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          lens: { type: 'string' },
          claim: { type: 'string' },
          evidence: { type: 'string' },
          suggestedFix: { type: 'string' },
        },
        required: ['file', 'severity', 'lens', 'claim', 'evidence', 'suggestedFix'],
      },
    },
    confirmed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          item: { type: 'string' },
          value: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['file', 'item', 'source'],
      },
    },
    checkIssues: { type: 'array', items: ISSUE },
  },
  required: ['findings', 'confirmed', 'checkIssues'],
}

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    applied: { type: 'array', items: { type: 'string' } },
    rejected: {
      type: 'array',
      items: {
        type: 'object',
        properties: { finding: { type: 'string' }, reason: { type: 'string' } },
        required: ['finding', 'reason'],
      },
    },
    deferred: {
      type: 'array',
      items: {
        type: 'object',
        properties: { slug: { type: 'string' }, reason: { type: 'string' } },
        required: ['slug', 'reason'],
      },
    },
    rounds: { type: 'number' },
    checkClean: { type: 'boolean' },
    qualityClean: { type: 'boolean' },
    remainingIssues: { type: 'array', items: ISSUE },
  },
  required: ['applied', 'rejected', 'deferred', 'rounds', 'checkClean', 'qualityClean', 'remainingIssues'],
}

const GATE_SCHEMA = {
  type: 'object',
  properties: {
    ready: { type: 'boolean' },
    gates: {
      type: 'array',
      items: {
        type: 'object',
        properties: { command: { type: 'string' }, ok: { type: 'boolean' }, summary: { type: 'string' } },
        required: ['command', 'ok', 'summary'],
      },
    },
    commit: { type: 'string' },
    artifactDelta: { type: 'string' },
    prTitle: { type: 'string' },
    prBody: { type: 'string' },
  },
  required: ['ready', 'gates', 'prTitle', 'prBody'],
}

const wave = args.wave.id
const waveTitle = args.wave.title
const slices = args.slices
const ownerBySlug = args.ownerBySlug ?? {}
const waveNotes = args.wave.notes ? `\nWave conventions (they apply to every entry of this wave and override nothing in the skills): ${args.wave.notes}` : ''

const itemsList = (slice) =>
  slice.items
    .map((it) => `- ${it.collection}/${it.slug} [${it.action}] — ${it.name}${it.level ? ` (level ${it.level})` : ''}${it.flags && it.flags.length ? ` flags: ${it.flags.join(', ')}` : ''}${it.note ? ` — ${it.note}` : ''} · branches: ${(it.branches ?? []).join(', ')} · files: ${it.file}, ${it.sidecar}${it.edits && it.edits.length ? ` · also edit: ${it.edits.join(', ')}` : ''}`)
    .join('\n')

const authorPrompt = (slice) => `You are a content AUTHOR for Equreka wave ${wave} (${waveTitle}), slice "${slice.id}" (${slice.title}).
Load and follow the project skill \`equreka-author\` (.claude/skills/equreka-author/SKILL.md) and its references; follow docs/content/style-guide.md and docs/content/glossary-es.md exactly.
You own ONLY these entries (entity file + <slug>.es.yaml sidecar each; for action "rewrite"/"edit" you modify the existing files):
${itemsList(slice)}${waveNotes}
Other slices are writing their own files in the same working tree at the same time: never touch files you do not own; request any change to a shared/existing file via sharedEdits. Ignore \`pnpm --filter @equreka/content check\` issues that only concern files you do not own.
Never set status reviewed. Never type a numeric value, Wikidata QID, QUDT IRI or historical claim from memory: fetch it and cite it.
If an entry cannot be authored correctly (missing prerequisite, no closed form, contested data), do not force it: put it in deferred with the reason.
Before returning, run \`pnpm --filter @equreka/content check\` and return the issues that concern your files as checkIssues.
Do not run git commands that change state. Never run Expo or Metro commands (expo, expo-doctor, metro, pnpm --filter mobile dev/start/export): Expo CLI rewrites apps/mobile/tsconfig.json and deletes expo-env.d.ts.`

const verifyPrompt = (slice, authored) => `You are an ADVERSARIAL VERIFIER for Equreka wave ${wave}, slice "${slice.id}".
Load and follow the project skill \`equreka-verify\` (.claude/skills/equreka-verify/SKILL.md).
Files written by the author: ${JSON.stringify(authored?.filesWritten ?? [])}
Author notes: deferred=${JSON.stringify(authored?.deferred ?? [])} openQuestions=${JSON.stringify(authored?.openQuestions ?? [])}${waveNotes}
A departure from the wave conventions is a major finding.
Assume every value, formula, identifier, Spanish term and history claim is wrong until a source you FETCH confirms it. Recompute one textbook worked example per equation. Run \`node scripts/content/originality.mjs\` on these entries for the originality lens.
Do NOT edit any file. Return findings (blocker/major/minor) with evidence URLs, the confirmed list (value/QID/source URL per item, for the PR review checklist), and \`pnpm --filter @equreka/content check\` issues on these files.`

const criticPrompt = (results) => `You are the CROSS-SLICE CONSISTENCY CRITIC for Equreka wave ${wave} (${waveTitle}).
Slices and their authored files:
${results.map((r) => `- ${r.slice.id}: ${JSON.stringify(r.authored?.filesWritten ?? [])}`).join('\n')}${waveNotes}
Read every file listed. Entries that apply the wave conventions differently are findings. Find: the same physical symbol or term label written differently across entries; one concept authored twice under different slugs; Spanish terminology that differs between entries or from docs/content/glossary-es.md; branch placement inconsistencies; equations whose term keys/labels for the same quantity diverge; descriptions that contradict each other. Do NOT edit files. Use severity blocker/major/minor and lens "consistency".`

const fixPrompt = (results, critic) => {
  const findings = results.flatMap((r) => (r.verified?.findings ?? []).map((f) => ({ ...f, slice: r.slice.id })))
  const issues = results.flatMap((r) => [...(r.authored?.checkIssues ?? []), ...(r.verified?.checkIssues ?? [])])
  const shared = results.flatMap((r) => r.authored?.sharedEdits ?? [])
  const prereqs = results.flatMap((r) => r.authored?.missingPrereqs ?? [])
  return `You are the single FIXER for Equreka wave ${wave} (${waveTitle}). You are the only agent allowed to edit any file now.${waveNotes}
Follow the \`equreka-author\` skill rules. Apply EVERY blocker and major finding below (verify each claim yourself with a fetched source before changing a value; if a finding is wrong, reject it with the reason). Apply minors when cheap.
Apply the requested sharedEdits when correct and in scope; author a missing prerequisite only if it is small and clearly in this wave's scope, otherwise defer the dependent entries with the reason.
Then loop: run \`pnpm --filter @equreka/content check\`, fix, repeat — at most 6 rounds. Then run \`pnpm quality\` and \`pnpm test --continue\` (without --continue turbo stops at the first failing package and hides the rest).
A test that fails only because it pins an entry this wave legitimately changed (a slug used as the example of some property, a literal value or prose string) is fixed by turning that assertion into an invariant derived from the compiled corpus or artifact, or into a synthetic fixture inside the test. Never rewrite it to the new content, never delete the coverage, never weaken it. Any other test failure is a content bug: fix the content.
If an entry still cannot pass, defer it: delete its files and record slug + reason (the roadmap will mark it).
Locale debt (ADR 0012): a rewritten legacy entity that now has a complete Spanish sidecar makes the check report "stale locale debt". Remove those ids from packages/content/locale-debt.json and lower LOCALE_DEBT_CEILING in packages/content/src/pipeline/__tests__/locale-completeness.test.ts to the new list length (the test requires equality).
Verifier + critic findings: ${JSON.stringify([...findings, ...(critic?.findings ?? [])])}
Check issues reported so far: ${JSON.stringify(issues)}
Shared edits requested: ${JSON.stringify(shared)}
Missing prerequisites reported: ${JSON.stringify(prereqs)}
Owners: ${JSON.stringify(ownerBySlug)}
Do not run git commands that change state. Never run Expo or Metro commands (expo, expo-doctor, metro, pnpm --filter mobile dev/start/export): Expo CLI rewrites apps/mobile/tsconfig.json and deletes expo-env.d.ts.`
}

const gatePrompt = (fix, results) => `You are the GATE for Equreka wave ${wave} (${waveTitle}) on branch ${args.branch}. You do not edit files, do not touch docs/content/roadmap.yaml and do not commit: the main session reconciles the roadmap, commits and opens the PR from your report.
Fixer outcome: ${JSON.stringify({ checkClean: fix?.checkClean, qualityClean: fix?.qualityClean, deferred: fix?.deferred, remaining: fix?.remainingIssues })}
1. Run from the repo root, in order: \`pnpm lint\`, \`pnpm typecheck\`, \`pnpm test --continue --force\`, \`pnpm build\`, \`pnpm quality\`, \`pnpm --filter @equreka/content check\`. Record each result (ok + a one-line summary; on failure, the failing lines). For tests, take the per-package verdict from turbo's closing "Tasks:" and "Failed:" lines: a package whose test task did not run is "not run", never "passed".
2. Run \`node scripts/content/originality.mjs <every entity file and sidecar this wave wrote> --format json\` (search on). Every new or rewritten description must come back flagged:false; list any that do not. Exit code 2 means the network check failed: rerun once, then report it as not run.
3. Artifact delta: the content build prints every artifact's bytes and share of budget. Baseline before the wave: ${JSON.stringify(args.baseline ?? null)}. Report before/after/delta for engine.json, presentation/, search/, math bodies, and the mobile-bundled total; flag anything above 90% of its budget.
4. Write the PR title \`content(${wave.toLowerCase().replace(/\./g, '-')}): ${wave} ${waveTitle}\` and body following the template in .claude/skills/equreka-content-wave/SKILL.md (section 6): summary, entries table, deferred/blocked with reasons, the review checklist built from the verifiers' confirmed list (value, QID, source URL per item), open questions, gates, originality, artifact size. End the body with the line "🤖 Generated with [Claude Code](https://claude.com/claude-code)".
5. Run \`git status --short\` and list every changed path outside packages/content/content/, docs/content/, packages/content/locale-debt.json and packages/content/src/pipeline/__tests__/locale-completeness.test.ts as strayChanges in the PR body (do not restore them yourself).
ready = every gate passed, no originality flag on wave files, no artifact above 90% of budget.
Verifiers' confirmed lists: ${JSON.stringify(results.flatMap((r) => r.verified?.confirmed ?? []))}
Authors' entries: ${JSON.stringify(results.flatMap((r) => r.authored?.entries ?? []))}
Deferred: ${JSON.stringify([...results.flatMap((r) => r.authored?.deferred ?? []), ...(fix?.deferred ?? [])])}
Open questions: ${JSON.stringify(results.flatMap((r) => r.authored?.openQuestions ?? []))}`

phase('Author')
log(`Wave ${wave}: ${slices.length} slices, ${slices.reduce((n, s) => n + s.items.length, 0)} entries`)

const perSlice = await pipeline(
  slices,
  (slice) => agent(authorPrompt(slice), { label: `author:${slice.id}`, phase: 'Author', model: 'opus', effort: 'high', schema: AUTHOR_SCHEMA }),
  (authored, slice) => {
    if (!authored) {
      log(`author for ${slice.id} returned nothing — its items are deferred`)
      return { slice, authored: null, verified: null }
    }
    return agent(verifyPrompt(slice, authored), { label: `verify:${slice.id}`, phase: 'Verify', model: 'sonnet', effort: 'high', schema: FINDINGS_SCHEMA })
      .then((verified) => ({ slice, authored, verified }))
  },
)

const results = perSlice.filter(Boolean)
const blockers = results.flatMap((r) => r.verified?.findings ?? []).filter((f) => f.severity === 'blocker').length
log(`verification: ${blockers} blocker findings across ${results.length} slices`)

phase('Consistency')
const critic = await agent(criticPrompt(results), { label: 'critic', phase: 'Consistency', model: 'sonnet', effort: 'high', schema: FINDINGS_SCHEMA })

phase('Fix')
const fix = await agent(fixPrompt(results, critic), { label: 'fixer', phase: 'Fix', model: 'opus', effort: 'high', schema: FIX_SCHEMA })
if (!fix) log('fixer returned nothing — gate will report the state as is')

phase('Gate')
const gate = await agent(gatePrompt(fix, results), { label: 'gate', phase: 'Gate', model: 'sonnet', effort: 'low', schema: GATE_SCHEMA })

return {
  wave,
  ready: gate?.ready ?? false,
  gates: gate?.gates ?? [],
  commit: gate?.commit ?? null,
  prTitle: gate?.prTitle ?? null,
  prBody: gate?.prBody ?? null,
  artifactDelta: gate?.artifactDelta ?? null,
  deferred: [...results.flatMap((r) => r.authored?.deferred ?? []), ...(fix?.deferred ?? [])],
  rejectedFindings: fix?.rejected ?? [],
  blockersFound: blockers,
}
