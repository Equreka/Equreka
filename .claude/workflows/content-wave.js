export const meta = {
  name: 'content-wave',
  description: 'Author one Equreka content wave: slice authors, adversarial verifiers, consistency critic, fixer, gate',
  whenToUse: 'Run one roadmap wave (docs/content/roadmap.yaml) after `node scripts/content/roadmap.mjs --wave <id> --json` produced the args, on a fresh content/<wave> branch.',
  phases: [
    { title: 'Author', detail: 'one opus author per slice writes entity + es sidecar files', model: 'opus' },
    { title: 'Verify', detail: 'one adversarial sonnet verifier per slice, starts as soon as its author ends', model: 'sonnet' },
    { title: 'Consistency', detail: 'cross-slice critic: symbols, labels, Spanish terminology, duplicates', model: 'sonnet' },
    { title: 'Fix', detail: 'single writer applies blockers and majors, loops check until clean', model: 'opus' },
    { title: 'Gate', detail: 'all quality gates, commit, PR body', model: 'sonnet' },
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

const itemsList = (slice) =>
  slice.items
    .map((it) => `- ${it.collection}/${it.slug} [${it.action}] — ${it.name}${it.level ? ` (level ${it.level})` : ''}${it.flags && it.flags.length ? ` flags: ${it.flags.join(', ')}` : ''}${it.note ? ` — ${it.note}` : ''} · branches: ${(it.branches ?? []).join(', ')} · files: ${it.file}, ${it.sidecar}${it.edits && it.edits.length ? ` · also edit: ${it.edits.join(', ')}` : ''}`)
    .join('\n')

const authorPrompt = (slice) => `You are a content AUTHOR for Equreka wave ${wave} (${waveTitle}), slice "${slice.id}" (${slice.title}).
Load and follow the project skill \`equreka-author\` (.claude/skills/equreka-author/SKILL.md) and its references; follow docs/content/style-guide.md and docs/content/glossary-es.md exactly.
You own ONLY these entries (entity file + <slug>.es.yaml sidecar each; for action "rewrite"/"edit" you modify the existing files):
${itemsList(slice)}
Other slices are writing their own files in the same working tree at the same time: never touch files you do not own; request any change to a shared/existing file via sharedEdits. Ignore \`pnpm --filter @equreka/content check\` issues that only concern files you do not own.
Never set status reviewed. Never type a numeric value, Wikidata QID, QUDT IRI or historical claim from memory: fetch it and cite it.
If an entry cannot be authored correctly (missing prerequisite, no closed form, contested data), do not force it: put it in deferred with the reason.
Before returning, run \`pnpm --filter @equreka/content check\` and return the issues that concern your files as checkIssues.
Do not run git commands that change state.`

const verifyPrompt = (slice, authored) => `You are an ADVERSARIAL VERIFIER for Equreka wave ${wave}, slice "${slice.id}".
Load and follow the project skill \`equreka-verify\` (.claude/skills/equreka-verify/SKILL.md).
Files written by the author: ${JSON.stringify(authored?.filesWritten ?? [])}
Author notes: deferred=${JSON.stringify(authored?.deferred ?? [])} openQuestions=${JSON.stringify(authored?.openQuestions ?? [])}
Assume every value, formula, identifier, Spanish term and history claim is wrong until a source you FETCH confirms it. Recompute one textbook worked example per equation. Run \`node scripts/content/originality.mjs\` on these entries for the originality lens.
Do NOT edit any file. Return findings (blocker/major/minor) with evidence URLs, the confirmed list (value/QID/source URL per item, for the PR review checklist), and \`pnpm --filter @equreka/content check\` issues on these files.`

const criticPrompt = (results) => `You are the CROSS-SLICE CONSISTENCY CRITIC for Equreka wave ${wave} (${waveTitle}).
Slices and their authored files:
${results.map((r) => `- ${r.slice.id}: ${JSON.stringify(r.authored?.filesWritten ?? [])}`).join('\n')}
Read every file listed. Find: the same physical symbol or term label written differently across entries; one concept authored twice under different slugs; Spanish terminology that differs between entries or from docs/content/glossary-es.md; branch placement inconsistencies; equations whose term keys/labels for the same quantity diverge; descriptions that contradict each other. Do NOT edit files. Use severity blocker/major/minor and lens "consistency".`

const fixPrompt = (results, critic) => {
  const findings = results.flatMap((r) => (r.verified?.findings ?? []).map((f) => ({ ...f, slice: r.slice.id })))
  const issues = results.flatMap((r) => [...(r.authored?.checkIssues ?? []), ...(r.verified?.checkIssues ?? [])])
  const shared = results.flatMap((r) => r.authored?.sharedEdits ?? [])
  const prereqs = results.flatMap((r) => r.authored?.missingPrereqs ?? [])
  return `You are the single FIXER for Equreka wave ${wave} (${waveTitle}). You are the only agent allowed to edit any file now.
Follow the \`equreka-author\` skill rules. Apply EVERY blocker and major finding below (verify each claim yourself with a fetched source before changing a value; if a finding is wrong, reject it with the reason). Apply minors when cheap.
Apply the requested sharedEdits when correct and in scope; author a missing prerequisite only if it is small and clearly in this wave's scope, otherwise defer the dependent entries with the reason.
Then loop: run \`pnpm --filter @equreka/content check\`, fix, repeat — at most 6 rounds. Then run \`pnpm quality\`.
If an entry still cannot pass, defer it: delete its files and record slug + reason (the roadmap will mark it).
Verifier + critic findings: ${JSON.stringify([...findings, ...(critic?.findings ?? [])])}
Check issues reported so far: ${JSON.stringify(issues)}
Shared edits requested: ${JSON.stringify(shared)}
Missing prerequisites reported: ${JSON.stringify(prereqs)}
Owners: ${JSON.stringify(ownerBySlug)}
Do not run git commands that change state.`
}

const gatePrompt = (fix, results) => `You are the GATE for Equreka wave ${wave} (${waveTitle}) on branch ${args.branch}.
Fixer outcome: ${JSON.stringify({ checkClean: fix?.checkClean, qualityClean: fix?.qualityClean, deferred: fix?.deferred, remaining: fix?.remainingIssues })}
1. For every deferred entry (from authors and fixer) set its roadmap entry (docs/content/roadmap.yaml) to state deferred with the reason; nothing else in the roadmap changes.
2. Run from the repo root, in order: \`pnpm lint\`, \`pnpm typecheck\`, \`pnpm test\`, \`pnpm build\`, \`pnpm quality\`, \`pnpm --filter @equreka/content check\`. Record each result. Capture artifact sizes printed by the content build and compare with the base branch build if available (report the delta).
3. If ALL gates pass: stage only content files, sidecars and the roadmap, and make ONE commit with message \`content(${wave}): ${waveTitle} (draft)\` and a body listing entries, ending with the line \`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\`. Do not push. If any gate fails, do not commit; set ready=false.
4. Write the PR body: summary; entries by collection; flags; deferrals with reasons; a review checklist built from the verifiers' confirmed list (value, QID, source URL per item) — this is what the human uses to promote entries to reviewed; gate results; artifact size delta. End the body with a line "🤖 Generated with [Claude Code](https://claude.com/claude-code)".
Verifiers' confirmed lists: ${JSON.stringify(results.flatMap((r) => r.verified?.confirmed ?? []))}
Authors' entries: ${JSON.stringify(results.flatMap((r) => r.authored?.entries ?? []))}`

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
