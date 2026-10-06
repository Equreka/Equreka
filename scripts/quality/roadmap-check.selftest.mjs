import assert from 'node:assert/strict';
import {
	countWords,
	entityFacts,
	isDone,
	localizedPaths,
	regionalUnitNames,
	validateRoadmap,
	waveArgs,
} from '../content/lib/roadmap-model.mjs';

/**
 * Adversarial fixtures proving every roadmap rule fires and stays quiet on a
 * compliant roadmap, plus the computed-progress functions. Runs in
 * `pnpm quality` before roadmap-check.mjs, as yaml-lint.selftest.mjs does.
 */
function baseRoadmap() {
	return {
		waves: [
			{
				id: 'W1.1',
				title: 'Taxonomy',
				milestone: 1,
				slices: [{ id: 'mathematics', title: 'Mathematics', branches: ['algebra'] }],
				paths: [],
			},
			{
				id: 'W2',
				title: 'School algebra',
				milestone: 1,
				slices: [
					{ id: 'algebra', title: 'Algebra', branches: ['algebra'] },
					{ id: 'arithmetic', title: 'Arithmetic', branches: ['geometry'] },
				],
				paths: ['percentages'],
			},
		],
		entries: [
			{
				collection: 'branches',
				slug: 'algebra',
				action: 'create',
				wave: 'W1.1',
				slice: 'mathematics',
				branches: [],
				milestone: 1,
				flags: [],
				name: 'Algebra',
				state: 'planned',
			},
			{
				collection: 'branches',
				slug: 'geometry',
				action: 'rewrite',
				wave: 'W1.1',
				slice: 'mathematics',
				branches: [],
				milestone: 1,
				flags: [],
				name: 'Geometry',
				state: 'planned',
			},
			{
				collection: 'magnitudes',
				slug: 'speed',
				action: 'rewrite',
				wave: 'W1.1',
				slice: 'mathematics',
				branches: [],
				milestone: 1,
				flags: [],
				name: 'Speed',
				state: 'planned',
			},
			{
				collection: 'equations',
				slug: 'quadratic-formula',
				action: 'create',
				wave: 'W2',
				slice: 'algebra',
				branches: ['algebra'],
				level: 'intro',
				milestone: 1,
				flags: ['MR', 'G:sqrt', 'NC:a,b'],
				name: 'Quadratic formula',
				state: 'planned',
				edits: ['branches/geometry'],
			},
			{
				collection: 'paths',
				slug: 'percentages',
				action: 'create',
				wave: 'W2',
				slice: 'arithmetic',
				branches: ['geometry'],
				level: 'intro',
				milestone: 1,
				flags: [],
				name: 'Percentages',
				state: 'planned',
			},
			{
				collection: 'equations',
				slug: 'hess-law',
				action: 'create',
				wave: 'W2',
				slice: 'algebra',
				branches: ['algebra'],
				level: 'intro',
				milestone: 1,
				flags: [],
				name: "Hess's law",
				state: 'blocked',
				reason: 'needs summation over species',
			},
		],
	};
}

const baseContent = () => ({
	files: { branches: ['geometry'], magnitudes: ['speed'], units: [], constants: [] },
});

/**
 * Each case mutates a fresh fixture (`roadmap`, `content`) and names the
 * violation it must produce, or `null` for a compliant shape.
 */
const CASES = [
	{ name: 'compliant roadmap stays quiet', mutate: () => {}, expect: null },
	{
		name: 'unknown collection',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].collection = 'formulas';
		},
		expect: /unknown collection 'formulas'/,
	},
	{
		name: 'duplicate (collection, slug)',
		mutate: ({ roadmap }) => {
			roadmap.entries.push({ ...roadmap.entries[3] });
		},
		expect: /duplicate \(collection, slug\)/,
	},
	{
		name: 'slug not kebab-case',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].slug = 'Quadratic_Formula';
		},
		expect: /slug must be kebab-case/,
	},
	{
		name: 'unknown wave',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].wave = 'W99';
		},
		expect: /unknown wave 'W99'/,
	},
	{
		name: 'slice of another wave',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].slice = 'mathematics';
		},
		expect: /unknown slice 'mathematics' in W2/,
	},
	{
		name: 'equation without level',
		mutate: ({ roadmap }) => {
			delete roadmap.entries[3].level;
		},
		expect: /level is required on equations/,
	},
	{
		name: 'level on a magnitude',
		mutate: ({ roadmap }) => {
			roadmap.entries[2].level = 'intro';
		},
		expect: /level applies to equations and paths only/,
	},
	{
		name: 'existing content file without an entry',
		mutate: ({ content }) => {
			content.files.magnitudes.push('velocity');
		},
		expect: /magnitudes\/velocity: content file has no roadmap entry/,
	},
	{
		name: 'rewrite target without a file',
		mutate: ({ content }) => {
			content.files.branches = [];
		},
		expect: /rewrite target has no file/,
	},
	{
		name: 'create entry whose file exists is done, not an error',
		mutate: ({ content }) => {
			content.files.equations = ['quadratic-formula'];
		},
		expect: null,
	},
	{
		name: 'unknown flag',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].flags.push('MULTI');
		},
		expect: /unknown flag 'MULTI'/,
	},
	{
		name: 'G: flag outside the solution grammar',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].flags.push('G:gamma');
		},
		expect: /unknown grammar function in 'G:gamma'/,
	},
	{
		name: 'SHARED with one branch',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].flags.push('SHARED');
		},
		expect: /SHARED needs at least two branches/,
	},
	{
		name: 'unknown branch',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].branches = ['algebar'];
		},
		expect: /unknown or retired branch 'algebar'/,
	},
	{
		name: 'branch listed after its retirement',
		mutate: ({ roadmap }) => {
			roadmap.entries[1].action = 'retire';
		},
		expect: /unknown or retired branch 'geometry'/,
	},
	{
		name: 'blocked without a reason',
		mutate: ({ roadmap }) => {
			delete roadmap.entries[5].reason;
		},
		expect: /state 'blocked' needs a reason/,
	},
	{
		name: 'reason on a planned entry',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].reason = 'why';
		},
		expect: /reason is only for deferred or blocked/,
	},
	{
		name: 'milestone disagrees with its wave',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].milestone = 2;
		},
		expect: /milestone 2 differs from W2/,
	},
	{
		name: 'misspelled field',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].flag = ['MR'];
		},
		expect: /unknown field 'flag'/,
	},
	{
		name: 'more than three slices',
		mutate: ({ roadmap }) => {
			for (const id of ['a', 'b']) roadmap.waves[1].slices.push({ id, title: id, branches: [] });
		},
		expect: /a wave has 1 to 3 slices/,
	},
	{
		name: 'wave path without a create entry',
		mutate: ({ roadmap }) => {
			roadmap.waves[1].paths.push('ratios');
		},
		expect: /path 'ratios' needs a create entry in this wave/,
	},
	{
		name: 'created path missing from the wave paths',
		mutate: ({ roadmap }) => {
			roadmap.waves[1].paths = [];
		},
		expect: /path 'percentages' is created here but missing from paths/,
	},
	{
		name: 'edits target owned by another slice of the wave',
		mutate: ({ roadmap }) => {
			roadmap.entries[4].edits = ['branches/geometry'];
		},
		expect: /branches\/geometry is owned by slice 'algebra' and 'arithmetic' in W2/,
	},
	{
		name: 'edits target that nothing creates',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].edits = ['units/degree'];
		},
		expect: /edits target 'units\/degree' neither exists/,
	},
	{
		name: 'equation slug shared with a magnitude',
		mutate: ({ roadmap }) => {
			roadmap.entries[3].slug = 'speed';
		},
		expect: /equations\/speed: slug shared with magnitudes\/speed/,
	},
];

let failures = 0;
const check = (name, run) => {
	try {
		run();
		console.log(`ok    ${name}`);
	} catch (error) {
		failures += 1;
		console.error(`FAIL  ${name}\n      ${error.message}`);
	}
};

for (const { name, mutate, expect } of CASES) {
	check(name, () => {
		const fixture = { roadmap: baseRoadmap(), content: baseContent() };
		mutate(fixture);
		const errors = validateRoadmap(fixture.roadmap, fixture.content);
		if (expect === null) {
			assert.deepEqual(errors, []);
		} else {
			assert.ok(
				errors.some((error) => expect.test(error)),
				`expected ${expect}, got: ${errors.length === 0 ? '(none)' : errors.join('; ')}`,
			);
		}
	});
}

const entity = {
	name: { en: 'Torque' },
	description: { en: 'Torque is $\\tau = r F$ in one word block.' },
	terms: { r: { kind: 'symbol', label: { en: 'Lever arm' } } },
	steps: [{ id: 'intro', kind: 'prose', body: { en: 'Body.' } }],
	references: [{ title: 'Ref', url: 'https://example.org' }],
};

check('countWords counts each math fragment as one word', () => {
	assert.equal(countWords('Torque is $\\tau = r F$ here, $$x$$ too.'), 6);
});
check('localizedPaths keys steps by id and skips references', () => {
	assert.deepEqual(
		localizedPaths(entity).map((path) => path.join('.')),
		['name', 'description', 'terms.r.label', 'steps.intro.body'],
	);
});
check('regionalUnitNames flags lowercase regional forms only', () => {
	assert.deepEqual(
		regionalUnitNames(
			'Un joule, dos kilowatts, la ley de Ohm, el efecto Joule, $\\text{watt}$, voltaje',
		),
		['joule', 'kilowatts'],
	);
});
check('entityFacts reports missing sidecar fields and regional names', () => {
	const facts = entityFacts('magnitudes', entity, {
		name: 'Momento de fuerza',
		description: 'Un joule.',
	});
	assert.deepEqual(facts.esMissing, ['terms.r.label', 'steps.intro.body']);
	assert.deepEqual(facts.regional, ['joule']);
	assert.equal(facts.words.en, 7);
});
check('done is computed per action', () => {
	const absent = entityFacts('magnitudes', null, null);
	const short = entityFacts('magnitudes', entity, null);
	assert.equal(isDone({ action: 'create' }, absent), false);
	assert.equal(isDone({ action: 'create' }, short), true);
	assert.equal(isDone({ action: 'retire' }, absent), true);
	assert.equal(isDone({ action: 'rewrite' }, short), false);
	const long = {
		name: { en: 'Path' },
		description: { en: 'word '.repeat(10) },
	};
	assert.equal(
		isDone(
			{ action: 'edit' },
			entityFacts('paths', long, { name: 'Ruta', description: 'palabra' }),
		),
		true,
	);
	assert.equal(
		isDone(
			{ action: 'edit' },
			entityFacts('paths', long, { name: 'Ruta', description: 'un joule' }),
		),
		false,
	);
});
check('waveArgs lists remaining items with their owning slice', () => {
	const roadmap = baseRoadmap();
	const args = waveArgs(roadmap, 'W2', () => ({ exists: false }));
	assert.deepEqual(
		args.slices.map((slice) => slice.items.map((item) => item.slug)),
		[['quadratic-formula'], ['percentages']],
	);
	assert.equal(args.ownerBySlug['branches/geometry'], 'algebra');
	assert.equal(args.summary.blocked, 1);
	assert.equal(args.summary.remaining, 2);
});

if (failures > 0) {
	console.error(`roadmap-check selftest: ${failures} failure(s)`);
	process.exit(1);
}
console.log(`roadmap-check selftest: ok (${CASES.length + 6} cases)`);
