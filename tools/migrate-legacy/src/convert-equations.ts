import type { LegacyCorpus, LegacyEquationEntry } from './corpus.js';
import { auditKeys, localized, mapReferences, normalizeProse } from './normalize.js';
import type { MigrationReport } from './report.js';
import { MigrationError } from './report.js';
import { EQUATION_RENAMES, SOLUTIONS } from './tables.js';

const KNOWN_KEYS = new Set([
	'name',
	'expression',
	'expressionIntern',
	'categories',
	'description',
	'units',
	'constants',
	'magnitudes',
	'variables',
	'references',
	'supported',
]);

const MACRO_KIND: Record<string, 'magnitude' | 'constant' | 'variable'> = {
	mag: 'magnitude',
	const: 'constant',
	var: 'variable',
};

interface TermCandidate {
	slug: string;
	text?: string;
	tex?: string;
}

function candidatesFor(
	kind: 'magnitude' | 'constant' | 'variable',
	entry: LegacyEquationEntry,
	corpus: LegacyCorpus,
	context: string,
): TermCandidate[] {
	const slugs =
		kind === 'magnitude'
			? (entry.data.magnitudes ?? [])
			: kind === 'constant'
				? (entry.data.constants ?? [])
				: (entry.data.variables ?? []);
	return slugs.map((slug) => {
		const related =
			kind === 'magnitude'
				? corpus.magnitudes.get(slug)
				: kind === 'constant'
					? corpus.constants.get(slug)
					: corpus.variables.get(slug);
		if (related === undefined) {
			throw new MigrationError(`${context}: related ${kind} '${slug}' not found in corpus`);
		}
		const candidate: TermCandidate = { slug };
		if (related.symbol.text !== undefined) candidate.text = related.symbol.text;
		if (related.symbol.tex !== undefined) candidate.tex = related.symbol.tex;
		return candidate;
	});
}

function buildTerms(
	entry: LegacyEquationEntry,
	corpus: LegacyCorpus,
	context: string,
): Record<string, { kind: string; ref: string }> {
	const expression = entry.data.expressionIntern;
	if (expression === undefined) throw new MigrationError(`${context}: no expressionIntern`);
	const terms: Record<string, { kind: string; ref: string }> = {};
	const macroPattern = /\\(mag|const|var)\{([^}]+)\}/g;
	for (
		let match = macroPattern.exec(expression);
		match !== null;
		match = macroPattern.exec(expression)
	) {
		const macro = match[1];
		const argument = match[2];
		if (macro === undefined || argument === undefined) {
			throw new MigrationError(`${context}: malformed macro in '${expression}'`);
		}
		const kind = MACRO_KIND[macro];
		if (kind === undefined) throw new MigrationError(`${context}: unknown macro \\${macro}`);
		const existing = terms[argument];
		if (existing !== undefined) {
			if (existing.kind !== kind) {
				throw new MigrationError(`${context}: term '${argument}' bound to two macro kinds`);
			}
			continue;
		}
		const matches = candidatesFor(kind, entry, corpus, context).filter(
			(candidate) => candidate.text === argument || candidate.tex === argument,
		);
		const sole = matches[0];
		if (matches.length !== 1 || sole === undefined) {
			throw new MigrationError(
				`${context}: term '${argument}' (\\${macro}) matched ${matches.length} related ${kind}s [${matches
					.map((candidate) => candidate.slug)
					.join(', ')}] — manual review`,
			);
		}
		terms[argument] = { kind, ref: sole.slug };
	}
	if (Object.keys(terms).length === 0) {
		throw new MigrationError(`${context}: no terms extracted from '${expression}'`);
	}
	return terms;
}

export function convertEquations(
	corpus: LegacyCorpus,
	report: MigrationReport,
): Map<string, Record<string, unknown>> {
	const out = new Map<string, Record<string, unknown>>();
	for (const [legacySlug, entry] of corpus.equations) {
		const context = `equations/${legacySlug}`;
		auditKeys(entry.data as unknown as Record<string, unknown>, KNOWN_KEYS, context);
		const slug = EQUATION_RENAMES[legacySlug] ?? legacySlug;
		if (slug !== legacySlug) {
			report.note(`equations: renamed '${legacySlug}' → '${slug}' (legacy misspelling)`);
		}
		const terms = buildTerms(entry, corpus, context);
		const solutions = SOLUTIONS[slug];
		if (solutions === undefined) {
			throw new MigrationError(`${context}: no hand-authored solutions table entry`);
		}
		for (const solved of Object.keys(solutions)) {
			if (terms[solved] === undefined) {
				throw new MigrationError(`${context}: solution key '${solved}' is not a term key`);
			}
		}
		if (slug === 'area-circle') {
			report.note(
				"equations/area-circle: term key is '\\pi' but solutions reference it as 'pi' — the P2 verifier defines identifier normalization",
			);
		}
		report.drop(
			'equations',
			'expression (display TeX; expressionIntern is the source)',
			legacySlug,
		);
		report.drop(
			'equations',
			'related lists magnitudes[]/constants[]/variables[] (consumed by term matching)',
			legacySlug,
		);

		const entity: Record<string, unknown> = {
			name: { en: normalizeProse(entry.data.name) },
			kind: entry.kind,
			level: 'intro',
			expression: entry.data.expressionIntern,
			terms,
			solutions,
		};
		if (entry.data.supported === true) entity.calculator = { enabled: true };
		if (entry.data.units !== undefined && entry.data.units.length > 0) {
			report.drop('equations', 'units[] (related units are pipeline-derived from terms)', slug);
		}
		if (entry.data.categories !== undefined && entry.data.categories.length > 0) {
			entity.categories = [...entry.data.categories];
		}
		const description = localized(entry.data.description);
		if (description !== undefined) entity.description = description;
		const references = mapReferences(entry.data.references, report, 'equations', slug);
		if (references !== undefined) entity.references = references;
		out.set(slug, entity);
	}
	return out;
}
