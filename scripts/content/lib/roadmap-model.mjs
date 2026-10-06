import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, parseDocument } from 'yaml';

export const ROADMAP_PATH = join('docs', 'content', 'roadmap.yaml');
export const CONTENT_ROOT = join('packages', 'content', 'content');

/**
 * Mirrors COLLECTIONS in @equreka/schema. Root scripts cannot import the
 * TypeScript package, and the loader rejects any folder outside this list.
 */
export const COLLECTIONS = [
	'categories',
	'branches',
	'magnitudes',
	'units',
	'prefixes',
	'constants',
	'variables',
	'equations',
	'paths',
];

export const ACTIONS = ['create', 'rewrite', 'edit', 'retire'];
export const STATES = ['planned', 'deferred', 'blocked'];
export const LEVELS = ['intro', 'intermediate', 'advanced'];
export const MILESTONES = [1, 2];

/**
 * Mirrors RESERVED_FUNCTION_NAMES of the solution grammar (ADR 0009): a
 * `G:<fn>` flag must name a function a solution can call.
 */
export const GRAMMAR_FUNCTIONS = [
	'sqrt',
	'abs',
	'ln',
	'exp',
	'sin',
	'cos',
	'tan',
	'asin',
	'acos',
	'atan',
	'log10',
	'log2',
	'cbrt',
	'sinh',
	'cosh',
	'tanh',
	'asinh',
	'acosh',
	'atanh',
	'factorial',
];

export const PLAIN_FLAGS = ['MR', 'ANG', 'T2', 'INT', 'NONALG', 'KEY', 'SHARED', 'NC'];

/**
 * Minimum English description length per collection (docs/content/style-guide.md).
 * A rewrite or edit counts as done only at or above it; 0 means no floor.
 */
export const WORD_FLOORS = {
	categories: 150,
	branches: 150,
	magnitudes: 200,
	units: 150,
	prefixes: 80,
	constants: 200,
	variables: 150,
	equations: 200,
	paths: 0,
};

/** Collections whose `slug` an equation must not reuse (style-guide slug rule). */
export const EQUATION_SLUG_RIVALS = ['magnitudes', 'units', 'constants'];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WAVE_ID_RE = /^W\d+(?:\.\d+)?$/;
const ENTRY_KEYS = new Set([
	'collection',
	'slug',
	'action',
	'wave',
	'slice',
	'branches',
	'level',
	'milestone',
	'flags',
	'name',
	'note',
	'state',
	'reason',
	'edits',
]);

/**
 * Regional Spanish forms of SI unit names; glossary-es.md keeps them in
 * `aliases` only. Lowercase on purpose: Joule, Watt or Ohm as a person's
 * name (efecto Joule, ley de Ohm) stays legal.
 */
const REGIONAL_ES_UNIT_RE =
	/(?<!\p{L})(?:[a-z]*(?:joule|watt|ampere|volt|ohm|coulomb|farad|henry)s?|hertz)(?!\p{L})/gu;

const MATH_RE = /\$\$[^$]+\$\$|\$[^$\n]+\$/g;

/** Failsafe parse, as the content loader does: every scalar is a string. */
const CONTENT_PARSE_OPTIONS = {
	version: '1.2',
	schema: 'failsafe',
	merge: false,
	uniqueKeys: true,
};

export function readRoadmap(root) {
	const text = readFileSync(join(root, ROADMAP_PATH), 'utf8');
	return parse(text, { version: '1.2', uniqueKeys: true });
}

/**
 * Entity slugs per collection, from filenames alone, so the structural check
 * never parses content. Generated prefixed units have no file and are absent.
 */
export function listContent(contentRoot) {
	const files = {};
	for (const collection of COLLECTIONS) {
		const dir = join(contentRoot, collection);
		const names = existsSync(dir) ? readdirSync(dir) : [];
		files[collection] = names
			.filter((name) => name.endsWith('.yaml'))
			.map((name) => name.slice(0, -'.yaml'.length))
			.filter((stem) => !stem.includes('.'))
			.sort();
	}
	return { files };
}

export function entryKey(entry) {
	return `${entry.collection}/${entry.slug}`;
}

/**
 * Flag grammar: a plain flag, `G:<grammar function>`, or `NC:<term[,term]>`.
 * SHARED additionally needs two branches, checked by the caller.
 */
export function flagIssue(flag) {
	if (typeof flag !== 'string') return 'flag must be a string';
	if (PLAIN_FLAGS.includes(flag)) return null;
	if (flag.startsWith('G:')) {
		return GRAMMAR_FUNCTIONS.includes(flag.slice(2))
			? null
			: `unknown grammar function in '${flag}'`;
	}
	if (/^NC:[^,\s]+(?:,[^,\s]+)*$/.test(flag)) return null;
	return `unknown flag '${flag}'`;
}

/**
 * Structural validation of the roadmap against the content filenames. Pure:
 * returns every violation as a message, never throws. "Done" is not checked
 * here; it is computed from content by entryFacts/isDone.
 */
export function validateRoadmap(roadmap, content) {
	const errors = [];
	const fail = (where, message) => errors.push(`${where}: ${message}`);
	if (roadmap === null || typeof roadmap !== 'object') {
		return ['roadmap: not a mapping'];
	}
	const waves = Array.isArray(roadmap.waves) ? roadmap.waves : [];
	const entries = Array.isArray(roadmap.entries) ? roadmap.entries : [];
	if (!Array.isArray(roadmap.waves)) fail('roadmap', 'waves must be a list');
	if (!Array.isArray(roadmap.entries)) fail('roadmap', 'entries must be a list');

	const existing = new Map(
		COLLECTIONS.map((collection) => [collection, new Set(content.files[collection] ?? [])]),
	);
	const fileExists = (key) => {
		const [collection, slug] = key.split('/');
		return existing.get(collection)?.has(slug) ?? false;
	};

	const waveIndex = new Map();
	const sliceIds = new Map();
	waves.forEach((wave, index) => {
		const where = `wave[${index}]`;
		if (typeof wave?.id !== 'string' || !WAVE_ID_RE.test(wave.id)) {
			fail(where, `id must look like W2 or W1.3, got '${wave?.id}'`);
			return;
		}
		if (waveIndex.has(wave.id)) fail(wave.id, 'duplicate wave id');
		waveIndex.set(wave.id, index);
		if (typeof wave.title !== 'string' || wave.title === '') fail(wave.id, 'title is required');
		if (!MILESTONES.includes(wave.milestone)) fail(wave.id, 'milestone must be 1 or 2');
		const slices = Array.isArray(wave.slices) ? wave.slices : [];
		if (slices.length < 1 || slices.length > 3) fail(wave.id, 'a wave has 1 to 3 slices');
		const ids = new Set();
		for (const slice of slices) {
			if (typeof slice?.id !== 'string' || !SLUG_RE.test(slice.id)) {
				fail(wave.id, `slice id must be kebab-case, got '${slice?.id}'`);
				continue;
			}
			if (ids.has(slice.id)) fail(wave.id, `duplicate slice '${slice.id}'`);
			ids.add(slice.id);
			if (typeof slice.title !== 'string' || slice.title === '') {
				fail(`${wave.id}/${slice.id}`, 'title is required');
			}
			if (!Array.isArray(slice.branches)) fail(`${wave.id}/${slice.id}`, 'branches must be a list');
		}
		sliceIds.set(wave.id, ids);
		if (!Array.isArray(wave.paths)) fail(wave.id, 'paths must be a list (empty when none)');
	});

	const retired = new Set(
		entries
			.filter((entry) => entry?.collection === 'branches' && entry.action === 'retire')
			.map((entry) => entry.slug),
	);
	const knownBranches = new Set(
		[
			...(content.files.branches ?? []),
			...entries
				.filter((entry) => entry?.collection === 'branches' && entry.action === 'create')
				.map((entry) => entry.slug),
		].filter((slug) => !retired.has(slug)),
	);
	const checkBranches = (where, branches) => {
		for (const branch of branches) {
			if (!knownBranches.has(branch)) fail(where, `unknown or retired branch '${branch}'`);
		}
	};
	for (const wave of waves) {
		for (const slice of Array.isArray(wave?.slices) ? wave.slices : []) {
			if (Array.isArray(slice?.branches)) checkBranches(`${wave.id}/${slice.id}`, slice.branches);
		}
	}

	const byKey = new Map();
	const owners = new Map();
	const claimOwner = (key, wave, slice, where) => {
		const ownerKey = `${wave}|${key}`;
		const previous = owners.get(ownerKey);
		if (previous !== undefined && previous !== slice) {
			fail(where, `${key} is owned by slice '${previous}' and '${slice}' in ${wave}`);
		}
		owners.set(ownerKey, slice);
	};

	entries.forEach((entry, index) => {
		if (entry === null || typeof entry !== 'object') {
			fail(`entry[${index}]`, 'not a mapping');
			return;
		}
		const key = entryKey(entry);
		const where = `entry ${key}`;
		for (const field of Object.keys(entry)) {
			if (!ENTRY_KEYS.has(field)) fail(where, `unknown field '${field}'`);
		}
		if (!COLLECTIONS.includes(entry.collection)) {
			fail(where, `unknown collection '${entry.collection}'`);
		}
		if (typeof entry.slug !== 'string' || !SLUG_RE.test(entry.slug)) {
			fail(where, 'slug must be kebab-case');
		}
		if (byKey.has(key)) fail(where, 'duplicate (collection, slug)');
		byKey.set(key, entry);
		if (!ACTIONS.includes(entry.action)) fail(where, `unknown action '${entry.action}'`);
		if (!STATES.includes(entry.state)) fail(where, `unknown state '${entry.state}'`);
		const parked = entry.state === 'deferred' || entry.state === 'blocked';
		if (parked && (typeof entry.reason !== 'string' || entry.reason === '')) {
			fail(where, `state '${entry.state}' needs a reason`);
		}
		if (!parked && entry.reason !== undefined)
			fail(where, 'reason is only for deferred or blocked');
		if (typeof entry.name !== 'string' || entry.name === '') fail(where, 'name is required');
		if (entry.note !== undefined && (typeof entry.note !== 'string' || entry.note === '')) {
			fail(where, 'note must be a non-empty string');
		}
		const wave = waves[waveIndex.get(entry.wave)];
		if (wave === undefined) {
			fail(where, `unknown wave '${entry.wave}'`);
		} else {
			if (!sliceIds.get(entry.wave)?.has(entry.slice)) {
				fail(where, `unknown slice '${entry.slice}' in ${entry.wave}`);
			}
			if (entry.milestone !== wave.milestone) {
				fail(where, `milestone ${entry.milestone} differs from ${entry.wave} (${wave.milestone})`);
			}
			claimOwner(key, entry.wave, entry.slice, where);
		}
		if (Array.isArray(entry.branches)) {
			checkBranches(where, entry.branches);
		} else {
			fail(where, 'branches must be a list');
		}
		if (entry.collection === 'equations' && entry.level === undefined) {
			fail(where, 'level is required on equations');
		}
		if (entry.level !== undefined) {
			if (!LEVELS.includes(entry.level)) fail(where, `unknown level '${entry.level}'`);
			if (entry.collection !== 'equations' && entry.collection !== 'paths') {
				fail(where, 'level applies to equations and paths only');
			}
		}
		if (Array.isArray(entry.flags)) {
			for (const flag of entry.flags) {
				const issue = flagIssue(flag);
				if (issue !== null) fail(where, issue);
			}
			if (
				entry.flags.includes('SHARED') &&
				(!Array.isArray(entry.branches) || entry.branches.length < 2)
			) {
				fail(where, 'SHARED needs at least two branches');
			}
		} else {
			fail(where, 'flags must be a list (empty when none)');
		}
		const present = fileExists(key);
		if ((entry.action === 'rewrite' || entry.action === 'edit') && !present) {
			fail(where, `${entry.action} target has no file`);
		}
	});

	entries.forEach((entry) => {
		if (entry === null || typeof entry !== 'object' || entry.edits === undefined) return;
		const where = `entry ${entryKey(entry)}`;
		if (!Array.isArray(entry.edits)) {
			fail(where, 'edits must be a list of <collection>/<slug>');
			return;
		}
		for (const target of entry.edits) {
			const [collection, slug, extra] = String(target).split('/');
			if (!COLLECTIONS.includes(collection) || !SLUG_RE.test(slug ?? '') || extra !== undefined) {
				fail(where, `edits target '${target}' is not <collection>/<slug>`);
				continue;
			}
			const planned = byKey.get(target);
			const plannedEarlier =
				planned?.action === 'create' &&
				(waveIndex.get(planned.wave) ?? Infinity) <= (waveIndex.get(entry.wave) ?? -1);
			if (!fileExists(target) && !plannedEarlier) {
				fail(
					where,
					`edits target '${target}' neither exists nor is created by this wave or an earlier one`,
				);
			}
			if (waveIndex.has(entry.wave)) claimOwner(target, entry.wave, entry.slice, where);
		}
	});

	for (const wave of waves) {
		if (!Array.isArray(wave?.paths)) continue;
		for (const slug of wave.paths) {
			const entry = byKey.get(`paths/${slug}`);
			if (entry === undefined || entry.wave !== wave.id || entry.action !== 'create') {
				fail(wave.id, `path '${slug}' needs a create entry in this wave`);
			}
		}
		for (const entry of entries) {
			if (
				entry?.collection === 'paths' &&
				entry.action === 'create' &&
				entry.wave === wave.id &&
				!wave.paths.includes(entry.slug)
			) {
				fail(wave.id, `path '${entry.slug}' is created here but missing from paths`);
			}
		}
	}

	for (const collection of COLLECTIONS) {
		for (const slug of content.files[collection] ?? []) {
			if (!byKey.has(`${collection}/${slug}`)) {
				fail(`${collection}/${slug}`, 'content file has no roadmap entry');
			}
		}
	}

	const rivalSlugs = new Map();
	for (const collection of EQUATION_SLUG_RIVALS) {
		for (const slug of content.files[collection] ?? []) rivalSlugs.set(slug, collection);
	}
	for (const entry of entries) {
		if (EQUATION_SLUG_RIVALS.includes(entry?.collection))
			rivalSlugs.set(entry.slug, entry.collection);
	}
	const equationSlugs = new Set([
		...(content.files.equations ?? []),
		...entries.filter((entry) => entry?.collection === 'equations').map((entry) => entry.slug),
	]);
	for (const slug of equationSlugs) {
		if (rivalSlugs.has(slug)) {
			fail(
				`equations/${slug}`,
				`slug shared with ${rivalSlugs.get(slug)}/${slug}; suffix the equation with -formula`,
			);
		}
	}
	return errors;
}

/** Words of English or Spanish prose; each `$…$` or `$$…$$` fragment counts as one word. */
export function countWords(text) {
	if (typeof text !== 'string') return 0;
	return text.replace(MATH_RE, ' M ').split(/\s+/).filter(Boolean).length;
}

/** Regional Spanish unit names found in prose, math excluded. */
export function regionalUnitNames(text) {
	if (typeof text !== 'string') return [];
	return [...text.replace(MATH_RE, ' ').matchAll(REGIONAL_ES_UNIT_RE)].map((match) => match[0]);
}

/**
 * Every localized field the entity authors, as sidecar paths: `{ en }` maps
 * anywhere in the tree, with list elements keyed by their `id` (path steps),
 * which is how sidecars address them. Elements without an id (references)
 * hold no localized text.
 */
export function localizedPaths(data, prefix = []) {
	if (data === null || typeof data !== 'object') return [];
	if (Array.isArray(data)) {
		return data.flatMap((element) =>
			element !== null && typeof element === 'object' && typeof element.id === 'string'
				? localizedPaths(element, [...prefix, element.id])
				: [],
		);
	}
	return Object.entries(data).flatMap(([key, value]) => {
		if (value !== null && typeof value === 'object' && typeof value.en === 'string') {
			return [[...prefix, key]];
		}
		return localizedPaths(value, [...prefix, key]);
	});
}

function valueAt(data, path) {
	return path.reduce(
		(node, key) => (node !== null && typeof node === 'object' ? node[key] : undefined),
		data,
	);
}

function stringsOf(data) {
	if (typeof data === 'string') return [data];
	if (data === null || typeof data !== 'object') return [];
	return Object.values(data).flatMap(stringsOf);
}

/**
 * Computed facts for one entity: everything progress reporting needs, derived
 * from the entity file and its Spanish sidecar (both parsed data or null).
 */
export function entityFacts(collection, entity, sidecar) {
	if (entity === null || typeof entity !== 'object') {
		return { exists: false };
	}
	const required = localizedPaths(entity);
	const esMissing =
		sidecar === null
			? required.map((path) => path.join('.'))
			: required
					.filter((path) => {
						const value = valueAt(sidecar, path);
						return typeof value !== 'string' || value.trim() === '';
					})
					.map((path) => path.join('.'));
	const en = countWords(entity.description?.en);
	const es = countWords(typeof sidecar?.description === 'string' ? sidecar.description : undefined);
	return {
		exists: true,
		status: entity.status ?? 'draft',
		hasDescription: typeof entity.description?.en === 'string',
		words: { en, es, ratio: en === 0 ? null : Number((es / en).toFixed(2)) },
		floor: WORD_FLOORS[collection] ?? 0,
		esSidecar: sidecar !== null,
		esMissing,
		regional: sidecar === null ? [] : [...new Set(stringsOf(sidecar).flatMap(regionalUnitNames))],
	};
}

/**
 * The content contract a rewrite or edit must reach: a complete Spanish
 * sidecar, no regional unit names in it, and an English description at or
 * above the collection's floor.
 */
export function meetsContract(facts) {
	if (!facts.exists) return false;
	const longEnough = facts.floor === 0 || (facts.hasDescription && facts.words.en >= facts.floor);
	return facts.esMissing.length === 0 && facts.regional.length === 0 && longEnough;
}

/**
 * Done is computed, never stored: a create is done when its file exists, a
 * retire when its file is gone, a rewrite or edit when the entity meets the
 * content contract.
 */
export function isDone(entry, facts) {
	if (entry.action === 'create') return facts.exists;
	if (entry.action === 'retire') return !facts.exists;
	return meetsContract(facts);
}

function readYaml(path) {
	if (!existsSync(path)) return null;
	const document = parseDocument(readFileSync(path, 'utf8'), CONTENT_PARSE_OPTIONS);
	if (document.errors.length > 0) {
		throw new Error(`${path}: ${document.errors[0].message}`);
	}
	return document.toJS();
}

export function readEntityFacts(contentRoot, collection, slug) {
	const dir = join(contentRoot, collection);
	return entityFacts(
		collection,
		readYaml(join(dir, `${slug}.yaml`)),
		readYaml(join(dir, `${slug}.es.yaml`)),
	);
}

/** Planned entries of a wave that are not done yet, i.e. the work a wave run must do. */
export function remainingEntries(entries, factsOf) {
	return entries.filter((entry) => entry.state === 'planned' && !isDone(entry, factsOf(entry)));
}

/**
 * The Workflow `args` payload of one wave: its remaining items grouped by
 * slice, and `ownerBySlug`, keyed `<collection>/<slug>`, naming the slice
 * allowed to write each file (entries and their `edits` targets).
 */
export function waveArgs(roadmap, waveId, factsOf) {
	const wave = roadmap.waves.find((candidate) => candidate.id === waveId);
	if (wave === undefined) {
		throw new Error(`unknown wave '${waveId}'`);
	}
	const entries = roadmap.entries.filter((entry) => entry.wave === waveId);
	const remaining = new Set(remainingEntries(entries, factsOf));
	const ownerBySlug = {};
	const slices = wave.slices.map((slice) => {
		const items = entries
			.filter((entry) => entry.slice === slice.id && remaining.has(entry))
			.map((entry) => {
				ownerBySlug[entryKey(entry)] = slice.id;
				for (const target of entry.edits ?? []) ownerBySlug[target] = slice.id;
				return {
					collection: entry.collection,
					slug: entry.slug,
					action: entry.action,
					name: entry.name,
					...(entry.level === undefined ? {} : { level: entry.level }),
					branches: entry.branches,
					flags: entry.flags,
					...(entry.note === undefined ? {} : { note: entry.note }),
					...(entry.edits === undefined ? {} : { edits: entry.edits }),
					file: `${CONTENT_ROOT.split('\\').join('/')}/${entry.collection}/${entry.slug}.yaml`,
					sidecar: `${CONTENT_ROOT.split('\\').join('/')}/${entry.collection}/${entry.slug}.es.yaml`,
				};
			});
		return { id: slice.id, title: slice.title, branches: slice.branches, items };
	});
	return {
		wave: { id: wave.id, title: wave.title, milestone: wave.milestone, paths: wave.paths },
		slices,
		ownerBySlug,
		summary: waveSummary(entries, factsOf),
	};
}

/**
 * Per-wave progress. `reviewed`, `esGaps` (incomplete Spanish sidecar) and
 * `short` (English description under the floor) count existing entities.
 */
export function waveSummary(entries, factsOf) {
	const summary = {
		total: entries.length,
		done: 0,
		remaining: 0,
		deferred: 0,
		blocked: 0,
		reviewed: 0,
		esGaps: 0,
		short: 0,
	};
	for (const entry of entries) {
		const facts = factsOf(entry);
		if (isDone(entry, facts)) summary.done += 1;
		else if (entry.state === 'planned') summary.remaining += 1;
		if (entry.state === 'deferred') summary.deferred += 1;
		if (entry.state === 'blocked') summary.blocked += 1;
		if (!facts.exists || entry.action === 'retire') continue;
		if (facts.status === 'reviewed') summary.reviewed += 1;
		if (facts.esMissing.length > 0) summary.esGaps += 1;
		if (facts.floor > 0 && facts.words.en < facts.floor) summary.short += 1;
	}
	return summary;
}
