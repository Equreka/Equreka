import katex from 'katex';
import { extractTexFragments, normalizeDashes, stripMacros } from './tex.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

/**
 * Stage 4 TeX lint: every equation expression (annotation macros stripped)
 * and every `$...$`/`$$...$$` fragment of every description must pass
 * strict KaTeX — these strings are baked into rendered pages at build time,
 * so a parse failure here is a broken page later. Dash-like Unicode is
 * normalized to '-' first (warning) because the legacy corpus authored
 * en dashes inside math. Files listed in tex-allowlist.json downgrade
 * description-fragment failures to warnings — a pragmatic escape hatch for
 * legacy prose, never applicable to equation expressions.
 */
export function lintTex(corpus: Corpus, allowlist: ReadonlySet<string>): Issue[] {
	const issues: Issue[] = [];
	const dashFiles = new Set<string>();

	const lintFragment = (
		file: string,
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
			issues.push(issue(severity, 'tex', file, `${context}: ${reason}`));
		}
	};

	for (const collection of Object.keys(corpus) as (keyof Corpus)[]) {
		for (const [slug, entity] of corpus[collection] as Map<
			string,
			{ description?: { en: string; es?: string }; expression?: string }
		>) {
			const file = fileOf(collection, slug);
			if (entity.expression !== undefined) {
				lintFragment(file, 'expression', entity.expression, false, false);
			}
			for (const locale of ['en', 'es'] as const) {
				const text = entity.description?.[locale];
				if (text === undefined) {
					continue;
				}
				for (const fragment of extractTexFragments(text)) {
					lintFragment(
						file,
						`description.${locale} ${JSON.stringify(truncate(fragment.tex))}`,
						fragment.tex,
						fragment.display,
						true,
					);
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
