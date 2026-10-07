import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Symbol as AuthoredSymbol, LocalizedText, PathStep } from '@equreka/schema';
import { CONTENT_PIPELINE_VERSION } from '../pipeline-version.js';
import {
	canonicalTex,
	type MathAtlas,
	type MathBodies,
	type MathBody,
	splitRichText,
} from '../rich-text.js';
import { sha256 } from './load.js';
import {
	createMathRenderer,
	MATH_CONFIG_HASH,
	MATHJAX_VERSION,
	MathRenderError,
} from './math-render.js';
import { type Issue, issue } from './types.js';
import { type Corpus, fileOf } from './validate.js';

/**
 * One canonical TeX string's usage across the corpus: display wins when the
 * same string is authored both inline and in display mode (the body is then
 * rendered once, in display style), and every source is kept so a render
 * failure names the file and field to fix.
 */
export interface MathUse {
	display: boolean;
	sources: string[];
}

export interface MathStats {
	uniqueTex: number;
	glyphs: number;
	rendered: number;
	cached: number;
}

export interface MathArtifact {
	atlas: MathAtlas;
	bodies: MathBodies;
	stats: MathStats;
}

export interface MathArtifactResult {
	artifact: MathArtifact;
	issues: Issue[];
}

interface MathCache {
	mathjax: string;
	config: string;
	pipeline: number;
	bodies: Record<string, MathBody>;
	glyphs: Record<string, string>;
}

/**
 * Everything the mobile app may render as static math: every symbol and
 * alternate symbol, every equation expression (display) and term key, every
 * math segment of every localized description and path-step prose field.
 * Keys are canonical TeX — the exact strings the presentation slices carry.
 */
export function collectMathUses(corpus: Corpus): Map<string, MathUse> {
	const uses = new Map<string, MathUse>();
	const add = (tex: string, display: boolean, source: string): void => {
		const key = canonicalTex(tex);
		const existing = uses.get(key);
		if (existing === undefined) {
			uses.set(key, { display, sources: [source] });
		} else {
			existing.display = existing.display || display;
			existing.sources.push(source);
		}
	};
	const addProse = (text: LocalizedText | undefined, source: string): void => {
		if (text === undefined) {
			return;
		}
		for (const [locale, localized] of Object.entries(text)) {
			if (localized === undefined) {
				continue;
			}
			for (const segment of splitRichText(localized)) {
				if (segment.t === 'math') {
					add(segment.tex, segment.display, `${source}.${locale}`);
				}
			}
		}
	};

	for (const collection of Object.keys(corpus) as (keyof Corpus)[]) {
		for (const [slug, entity] of corpus[collection] as Map<
			string,
			{
				symbol?: AuthoredSymbol;
				symbolAlt?: AuthoredSymbol;
				expression?: string;
				terms?: Record<string, unknown>;
				description?: LocalizedText;
			}
		>) {
			const file = fileOf(collection, slug);
			if (entity.symbol !== undefined) {
				add(entity.symbol.tex, false, `${file} symbol.tex`);
			}
			if (entity.symbolAlt !== undefined) {
				add(entity.symbolAlt.tex, false, `${file} symbolAlt.tex`);
			}
			if (entity.expression !== undefined) {
				add(entity.expression, true, `${file} expression`);
			}
			for (const key of Object.keys(entity.terms ?? {})) {
				add(key, false, `${file} terms.${key}`);
			}
			addProse(entity.description, `${file} description`);
		}
	}
	for (const [slug, path] of corpus.paths) {
		const file = fileOf('paths', slug);
		for (const step of path.steps) {
			for (const [field, text] of stepProse(step)) {
				addProse(text, `${file} steps.${step.id}.${field}`);
			}
		}
	}
	return uses;
}

function stepProse(step: PathStep): [string, LocalizedText | undefined][] {
	switch (step.kind) {
		case 'entry':
			return [['note', step.note]];
		case 'prose':
			return [['body', step.body]];
		case 'check':
			return [
				['prompt', step.prompt],
				['answer', step.answer],
			];
	}
}

/**
 * Stage 4b: renders the corpus's math once through MathJax with a global
 * font cache and assembles atlas + bodies. Content-addressed cache: a body
 * is reused when its TeX, display mode, MathJax version, render config and
 * pipeline version all match and every glyph it references is cached too;
 * a fully warm build never boots MathJax. The atlas is rebuilt from the
 * union of body glyphs on every build, so warm and cold output are
 * byte-identical by construction.
 */
export async function buildMathArtifact(
	corpus: Corpus,
	cacheDir: string | null,
): Promise<MathArtifactResult> {
	const issues: Issue[] = [];
	const uses = collectMathUses(corpus);
	const cachePath = cacheDir === null ? null : join(cacheDir, 'math-render.json');
	const cache = readCache(cachePath);
	let cacheDirty = false;

	const bodies: MathBodies = {};
	const misses: [string, MathUse][] = [];
	let cached = 0;
	for (const [tex, use] of [...uses].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
		const hit = cache.bodies[cacheKey(tex, use.display)];
		if (hit?.glyphs.every((id) => cache.glyphs[id] !== undefined)) {
			bodies[tex] = hit;
			cached += 1;
		} else {
			misses.push([tex, use]);
		}
	}

	if (misses.length > 0) {
		const renderer = await createMathRenderer();
		const rendered: [string, MathBody][] = [];
		for (const [tex, use] of misses) {
			try {
				const body = await renderer.render(tex, use.display);
				rendered.push([tex, body]);
			} catch (error) {
				if (!(error instanceof MathRenderError)) {
					throw error;
				}
				issues.push(renderIssue(tex, use, error.message));
			}
		}
		const paths = renderer.glyphPaths();
		for (const [tex, body] of rendered) {
			let complete = true;
			for (const id of body.glyphs) {
				const d = paths.get(id);
				if (d === undefined) {
					complete = false;
					issues.push(
						renderIssue(tex, uses.get(tex) as MathUse, `glyph '${id}' missing from font cache`),
					);
				} else {
					cache.glyphs[id] = d;
				}
			}
			if (complete) {
				bodies[tex] = body;
				cache.bodies[cacheKey(tex, (uses.get(tex) as MathUse).display)] = body;
				cacheDirty = true;
			}
		}
	}

	const glyphs: Record<string, string> = {};
	for (const body of Object.values(bodies)) {
		for (const id of body.glyphs) {
			const d = cache.glyphs[id];
			if (d !== undefined) {
				glyphs[id] = d;
			}
		}
	}
	if (cachePath !== null && cacheDirty) {
		writeCache(cachePath, cache);
	}
	return {
		artifact: {
			atlas: { schemaVersion: 2, font: 'mathjax-newcm', glyphs },
			bodies,
			stats: {
				uniqueTex: uses.size,
				glyphs: Object.keys(glyphs).length,
				rendered: misses.length,
				cached,
			},
		},
		issues,
	};
}

function renderIssue(tex: string, use: MathUse, message: string): Issue {
	const [first = ''] = use.sources;
	const spaceAt = first.indexOf(' ');
	const file = spaceAt === -1 ? first : first.slice(0, spaceAt);
	const context = spaceAt === -1 ? '' : first.slice(spaceAt + 1);
	const more = use.sources.length > 1 ? ` (+${use.sources.length - 1} more)` : '';
	const shown = tex.length > 60 ? `${tex.slice(0, 60)}…` : tex;
	return issue('error', 'math', file, `${context}${more}: ${message} — ${JSON.stringify(shown)}`);
}

function cacheKey(tex: string, display: boolean): string {
	const material = [
		display ? 'display' : 'inline',
		tex,
		`mathjax=${MATHJAX_VERSION}`,
		`config=${MATH_CONFIG_HASH}`,
		`pipeline=${CONTENT_PIPELINE_VERSION}`,
	].join('\n');
	return sha256(Buffer.from(material, 'utf8'));
}

function emptyCache(): MathCache {
	return {
		mathjax: MATHJAX_VERSION,
		config: MATH_CONFIG_HASH,
		pipeline: CONTENT_PIPELINE_VERSION,
		bodies: {},
		glyphs: {},
	};
}

/**
 * Glyph paths are keyed by atlas id alone, so the whole cache is discarded
 * when the MathJax/font version or render config changes — a stale path
 * under an unchanged id must never survive.
 */
function readCache(cachePath: string | null): MathCache {
	if (cachePath === null) {
		return emptyCache();
	}
	try {
		const parsed = JSON.parse(readFileSync(cachePath, 'utf8')) as Partial<MathCache>;
		if (
			parsed.mathjax === MATHJAX_VERSION &&
			parsed.config === MATH_CONFIG_HASH &&
			parsed.pipeline === CONTENT_PIPELINE_VERSION &&
			typeof parsed.bodies === 'object' &&
			parsed.bodies !== null &&
			typeof parsed.glyphs === 'object' &&
			parsed.glyphs !== null
		) {
			return {
				mathjax: parsed.mathjax,
				config: parsed.config,
				pipeline: parsed.pipeline,
				bodies: parsed.bodies,
				glyphs: parsed.glyphs,
			};
		}
	} catch {
		return emptyCache();
	}
	return emptyCache();
}

function writeCache(cachePath: string, cache: MathCache): void {
	try {
		mkdirSync(dirname(cachePath), { recursive: true });
		writeFileSync(cachePath, JSON.stringify(cache));
	} catch {
		return;
	}
}
