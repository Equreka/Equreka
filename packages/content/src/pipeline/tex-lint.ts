import { COLLECTIONS, type CollectionName } from '@equreka/schema';
import katex from 'katex';
import { isEntityLevel, type ProseField, proseFields } from './prose-fields.js';
import { extractTexFragments, italicLetterRun, normalizeDashes, stripMacros } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

/**
 * Stage 4 TeX lint: every equation expression (annotation macros stripped),
 * every equation term key (rendered alone as the term's symbol on web and
 * mobile) and every `$...$`/`$$...$$` fragment of every prose field must
 * pass strict KaTeX — these strings are baked into rendered pages at build
 * time, so a parse failure here is a broken page later. A term key with a
 * bare multi-letter run warns: it typesets as a product of italic letters.
 * Dash-like Unicode is normalized to '-' first (warning) because the legacy
 * corpus authored en dashes inside math. Files listed in tex-allowlist.json
 * downgrade failures in downgradable (legacy) prose to warnings — a
 * pragmatic escape hatch, never applicable to equation expressions, term
 * keys or new prose. Findings in translated text name the sidecar the text
 * came from; the allowlist stays keyed by entity file. Each entity's own
 * text is linted before any term key or part-level prose.
 */
export function lintTex(corpus: Corpus, allowlist: ReadonlySet<string>): Issue[] {
	const issues: Issue[] = [];
	const dashFiles = new Set<string>();

	const lintFragment = (
		file: string,
		reportFile: string,
		context: string,
		tex: string,
		display: boolean,
		downgradable: boolean,
	): void => {
		const normalized = normalizeDashes(tex);
		if (normalized.changed) {
			dashFiles.add(file);
		}
		try {
			katex.renderToString(stripMacros(normalized.text), {
				strict: 'error',
				throwOnError: true,
				displayMode: display,
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			const severity = downgradable && allowlist.has(file) ? 'warning' : 'error';
			issues.push(issue(severity, 'tex', reportFile, `${context}: ${reason}`));
		}
	};

	const lintProse = (collection: CollectionName, slug: string, field: ProseField): void => {
		for (const fragment of extractTexFragments(field.text)) {
			lintFragment(
				fileOf(collection, slug),
				fileOf(collection, slug, field.locale),
				`${field.path}.${field.locale} ${JSON.stringify(truncate(fragment.tex))}`,
				fragment.tex,
				fragment.display,
				field.downgradable,
			);
		}
	};

	for (const collection of COLLECTIONS) {
		for (const [slug, entity] of corpus[collection] as Map<string, { expression?: string }>) {
			const file = fileOf(collection, slug);
			if (entity.expression !== undefined) {
				lintFragment(file, file, 'expression', entity.expression, false, false);
			}
			for (const field of proseFields(collection, entity).filter(isEntityLevel)) {
				lintProse(collection, slug, field);
			}
		}
	}

	for (const [slug, equation] of corpus.equations) {
		const file = fileOf('equations', slug);
		for (const key of Object.keys(equation.terms)) {
			lintFragment(file, file, `terms key '${key}'`, key, false, false);
			const run = italicLetterRun(key);
			if (run !== undefined) {
				issues.push(
					issue(
						'warning',
						'tex',
						file,
						`terms key '${key}' sets '${run}' as a product of italic letters; wrap it in \\mathrm{} (an identifier override keeps solutions readable)`,
					),
				);
			}
		}
	}

	for (const collection of COLLECTIONS) {
		for (const [slug, entity] of corpus[collection] as Map<string, unknown>) {
			for (const field of proseFields(collection, entity)) {
				if (!isEntityLevel(field)) {
					lintProse(collection, slug, field);
				}
			}
		}
	}

	if (dashFiles.size > 0) {
		issues.push(
			issue(
				'warning',
				'tex',
				'',
				`normalized en dash/em dash/minus sign to '-' in: ${[...dashFiles].sort().join(', ')}`,
			),
		);
	}
	return issues;
}

function truncate(tex: string): string {
	return tex.length > 40 ? `${tex.slice(0, 40)}…` : tex;
}
