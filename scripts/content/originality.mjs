import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseDocument } from 'yaml';
import { appendTextSources, isAttributed, wikipediaTextSource } from './lib/attribution.mjs';
import {
	compareTexts,
	isFlagged,
	isStrongMatch,
	SHINGLE_SIZE,
	stripMath,
	THRESHOLDS,
} from './lib/shingles.mjs';

/**
 * Originality check (ADR 0011): compares every content description with the
 * Wikipedia article its `externalIds.wikidata` item links (English
 * descriptions against enwiki, Spanish sidecar descriptions against eswiki),
 * then phrase-searches the wiki for descriptions that article does not
 * explain, and reports 8-word shingle overlap. Dev-only and network-bound,
 * so never part of CI or `pnpm quality`; it fails closed (exit 2) rather
 * than guess a source when an API is unreachable. Exit 1 is reserved for
 * `--check`.
 */
const USAGE = `Usage: node scripts/content/originality.mjs [paths...] [options]

  paths                 content files (<collection>/<slug>.yaml or a <slug>.es.yaml sidecar)
  --collection <name>   only this collection (repeatable)
  --slug <slug>         only this slug (repeatable)
  --lang en|es|all      descriptions to check (default all)
  --format md|json      report format (default md)
  --out <file>          write the report to a file (default stdout)
  --check               exit 1 when a flagged description has no textSources entry for its article
  --apply               append the missing textSources entries to the entity files
  --no-search           compare only against the Wikidata-linked article
  --delay <ms>          pause between API requests (default 300)
  --help                show this text`;

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const CONTENT_ROOT = join(ROOT, 'packages', 'content', 'content');
const USER_AGENT = 'EquerekaOriginalityCheck/1.0 (https://github.com/Equreka/Equreka)';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_BATCH = 50;
const MAX_ATTEMPTS = 4;
const SEARCH_HITS = 3;
const SEARCH_PHRASES = 5;
const LOCALE_SITES = Object.freeze({ en: 'enwiki', es: 'eswiki' });
const PARSE_OPTIONS = Object.freeze({ version: '1.2', schema: 'failsafe', merge: false });

/**
 * A failure that must stop the run with exit code 2: bad usage, unreadable
 * content, or an API that did not answer.
 */
class FatalError extends Error {}

function parseCli(argv) {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		allowNegative: true,
		options: {
			collection: { type: 'string', multiple: true, default: [] },
			slug: { type: 'string', multiple: true, default: [] },
			lang: { type: 'string', default: 'all' },
			format: { type: 'string', default: 'md' },
			out: { type: 'string' },
			check: { type: 'boolean', default: false },
			apply: { type: 'boolean', default: false },
			search: { type: 'boolean', default: true },
			delay: { type: 'string', default: '300' },
			help: { type: 'boolean', default: false },
		},
	});
	if (!['en', 'es', 'all'].includes(values.lang)) {
		throw new FatalError(`--lang must be en, es or all (got '${values.lang}')`);
	}
	if (!['md', 'json'].includes(values.format)) {
		throw new FatalError(`--format must be md or json (got '${values.format}')`);
	}
	const delay = Number(values.delay);
	if (!Number.isInteger(delay) || delay < 0) {
		throw new FatalError(`--delay must be a non-negative integer (got '${values.delay}')`);
	}
	return {
		...values,
		delay,
		locales: values.lang === 'all' ? ['en', 'es'] : [values.lang],
		paths: positionals,
	};
}

function readYaml(absPath) {
	const document = parseDocument(readFileSync(absPath, 'utf8'), PARSE_OPTIONS);
	if (document.errors.length > 0) {
		throw new FatalError(`${relative(ROOT, absPath)}: ${document.errors[0].message}`);
	}
	return document.toJS();
}

/**
 * `{ collection, slug }` of a positional content path, accepting an entity
 * file or one of its locale sidecars.
 */
function entityOfPath(path) {
	const relPath = relative(CONTENT_ROOT, resolve(path)).split(/[\\/]/);
	const match =
		relPath.length === 2 ? /^([a-z0-9-]+)(?:\.[a-z]{2})?\.yaml$/.exec(relPath[1]) : null;
	if (match === null || relPath[0].startsWith('..')) {
		throw new FatalError(`not a content file under packages/content/content: ${path}`);
	}
	return { collection: relPath[0], slug: match[1] };
}

function collectionsOnDisk() {
	return readdirSync(CONTENT_ROOT, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

/**
 * Every selected entity with its descriptions per locale. Selection is the
 * union of positional paths, intersected with the collection and slug
 * filters; no selector at all means the whole corpus.
 */
function selectEntities(options) {
	const fromPaths = options.paths.map(entityOfPath);
	const wanted = (collection, slug) =>
		(fromPaths.length === 0 ||
			fromPaths.some((entity) => entity.collection === collection && entity.slug === slug)) &&
		(options.collection.length === 0 || options.collection.includes(collection)) &&
		(options.slug.length === 0 || options.slug.includes(slug));
	return collectionsOnDisk().flatMap((collection) =>
		readdirSync(join(CONTENT_ROOT, collection))
			.filter((name) => /^[a-z0-9-]+\.yaml$/.test(name))
			.map((name) => name.slice(0, -'.yaml'.length))
			.filter((slug) => wanted(collection, slug))
			.sort()
			.map((slug) => {
				const file = join(CONTENT_ROOT, collection, `${slug}.yaml`);
				const data = readYaml(file) ?? {};
				const sidecar = join(CONTENT_ROOT, collection, `${slug}.es.yaml`);
				const spanish = existsSync(sidecar) ? (readYaml(sidecar) ?? {}) : {};
				return {
					collection,
					slug,
					file,
					qid: data.externalIds?.wikidata,
					textSources: Array.isArray(data.textSources) ? data.textSources : [],
					descriptions: {
						en: typeof data.description?.en === 'string' ? data.description.en : undefined,
						es: typeof spanish.description === 'string' ? spanish.description : undefined,
					},
				};
			}),
	);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Sequential, paced JSON GET with a descriptive User-Agent, retrying
 * throttling and server errors with backoff (honoring Retry-After).
 */
async function fetchJson(url, delay) {
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		await sleep(delay);
		try {
			const response = await fetch(url, {
				headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT },
			});
			if (response.ok) {
				return await response.json();
			}
			if (response.status !== 429 && response.status < 500) {
				throw new FatalError(`${url}: HTTP ${response.status}`);
			}
			const retryAfter = Number(response.headers.get('retry-after'));
			await sleep(
				Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * attempt,
			);
		} catch (error) {
			if (error instanceof FatalError) {
				throw error;
			}
			if (attempt === MAX_ATTEMPTS) {
				throw new FatalError(`${url}: ${error.message}`);
			}
			await sleep(2000 * attempt);
		}
	}
	throw new FatalError(`${url}: no answer after ${MAX_ATTEMPTS} attempts`);
}

/**
 * QID → `{ enwiki?, eswiki? }` article titles, batched through
 * wbgetentities (sitelinks only), which is far lighter per item than
 * Special:EntityData. A redirected QID maps through to its target.
 */
async function sitelinksOf(qids, delay) {
	const unique = [...new Set(qids)].sort();
	const batches = Array.from({ length: Math.ceil(unique.length / WIKIDATA_BATCH) }, (_, index) =>
		unique.slice(index * WIKIDATA_BATCH, (index + 1) * WIKIDATA_BATCH),
	);
	const sites = Object.values(LOCALE_SITES).join('|');
	const entries = [];
	for (const batch of batches) {
		const url = `${WIKIDATA_API}?action=wbgetentities&props=sitelinks&sitefilter=${encodeURIComponent(sites)}&format=json&ids=${batch.join('|')}`;
		const body = await fetchJson(url, delay);
		if (body.error !== undefined) {
			throw new FatalError(`wikidata: ${body.error.info ?? body.error.code}`);
		}
		for (const [id, entity] of Object.entries(body.entities ?? {})) {
			const titles = Object.fromEntries(
				Object.entries(entity.sitelinks ?? {}).map(([site, link]) => [site, link.title]),
			);
			entries.push([id, titles]);
			if (entity.redirects?.from !== undefined) {
				entries.push([entity.redirects.from, titles]);
			}
		}
	}
	return new Map(entries);
}

/**
 * Plain text of one article and its canonical title (redirects followed),
 * or null when the article does not exist.
 */
async function articleText(site, title, delay) {
	const host = `https://${site.replace(/wiki$/, '')}.wikipedia.org/w/api.php`;
	const url = `${host}?action=query&prop=extracts&explaintext=1&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
	const body = await fetchJson(url, delay);
	const page = body.query?.pages?.[0];
	if (page === undefined || page.missing === true || typeof page.extract !== 'string') {
		return null;
	}
	return { title: page.title, text: page.extract };
}

function baseResult(entity, locale, status) {
	return {
		collection: entity.collection,
		slug: entity.slug,
		file: relative(ROOT, entity.file).replaceAll('\\', '/'),
		locale,
		qid: entity.qid ?? null,
		status,
		article: null,
	};
}

function comparedResult(entity, locale, site, article, via) {
	const source = wikipediaTextSource(site, article.title);
	const comparison = compareTexts(entity.descriptions[locale], article.text);
	return {
		...baseResult(entity, locale, 'checked'),
		article: { site, title: article.title, url: source.url, via },
		...comparison,
		flagged: isFlagged(comparison),
		attributed: isAttributed(entity.textSources, source.url),
	};
}

async function searchTitles(site, phrase, delay) {
	const host = `https://${site.replace(/wiki$/, '')}.wikipedia.org/w/api.php`;
	const url = `${host}?action=query&list=search&srsearch=${encodeURIComponent(`"${phrase}"`)}&srnamespace=0&srlimit=${SEARCH_HITS}&srprop=&format=json&formatversion=2`;
	const body = await fetchJson(url, delay);
	return (body.query?.search ?? []).map((hit) => hit.title);
}

/**
 * Phrases a copied description shares verbatim with its source: up to
 * `SEARCH_PHRASES` shingles spread evenly from first to last, so a copy of
 * an older revision still meets the current article wherever a passage
 * survived. TeX and punctuation are removed; case and accents stay for the
 * search engine.
 */
function searchPhrases(description) {
	const words = stripMath(description)
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word !== '');
	const last = words.length - SHINGLE_SIZE;
	if (last < 0) {
		return [];
	}
	const count = Math.min(SEARCH_PHRASES, Math.floor(words.length / SHINGLE_SIZE));
	const starts =
		count <= 1
			? [0]
			: Array.from({ length: count }, (_, index) => Math.round((index * last) / (count - 1)));
	return [...new Set(starts)].map((start) => words.slice(start, start + SHINGLE_SIZE).join(' '));
}

function byStrength(left, right) {
	return right.overlap - left.overlap || right.longestRun - left.longestRun;
}

/**
 * Second pass for a description its Wikidata-linked article did not flag,
 * or that has none: phrase-searches the wiki for its shingles, compares
 * every hit, and keeps the strongest hit only when it meets both rules
 * (`isStrongMatch`). A match is a measured shared passage, never a guess
 * from a name.
 */
async function searchMatch(entity, locale, linked, fetchArticle, delay) {
	const site = LOCALE_SITES[locale];
	const titles = [];
	for (const phrase of searchPhrases(entity.descriptions[locale])) {
		titles.push(...(await searchTitles(site, phrase, delay)));
	}
	const candidates = [];
	for (const title of new Set(titles)) {
		const article = title === linked.article?.title ? null : await fetchArticle(site, title);
		if (article !== null) {
			candidates.push(comparedResult(entity, locale, site, article, 'search'));
		}
	}
	return candidates.filter((candidate) => isStrongMatch(candidate)).sort(byStrength)[0] ?? linked;
}

async function checkEntities(entities, options) {
	const log = (message) => process.stderr.write(`${message}\n`);
	const targets = entities.flatMap((entity) =>
		options.locales
			.filter((locale) => entity.descriptions[locale] !== undefined)
			.map((locale) => ({ entity, locale })),
	);
	const qids = targets.map((target) => target.entity.qid).filter((qid) => qid !== undefined);
	log(`originality: ${targets.length} descriptions, ${new Set(qids).size} Wikidata items`);
	const sitelinks = await sitelinksOf(qids, options.delay);
	const articles = new Map();
	const fetchArticle = async (site, title) => {
		const key = `${site}:${title}`;
		if (!articles.has(key)) {
			log(`  ${site} ${title}`);
			articles.set(key, await articleText(site, title, options.delay));
		}
		return articles.get(key);
	};
	const results = [];
	for (const { entity, locale } of targets) {
		const site = LOCALE_SITES[locale];
		const linkedTitle = entity.qid === undefined ? undefined : sitelinks.get(entity.qid)?.[site];
		const article = linkedTitle === undefined ? null : await fetchArticle(site, linkedTitle);
		const linked =
			entity.qid === undefined
				? baseResult(entity, locale, 'no-wikidata')
				: article === null
					? baseResult(entity, locale, 'no-article')
					: comparedResult(entity, locale, site, article, 'wikidata');
		results.push(
			linked.flagged === true || !options.search
				? linked
				: await searchMatch(entity, locale, linked, fetchArticle, options.delay),
		);
	}
	return results.sort(
		(left, right) =>
			(right.overlap ?? -1) - (left.overlap ?? -1) ||
			(right.longestRun ?? -1) - (left.longestRun ?? -1) ||
			`${left.collection}/${left.slug}/${left.locale}`.localeCompare(
				`${right.collection}/${right.slug}/${right.locale}`,
			),
	);
}

/**
 * Appends one `textSources` entry per flagged, unattributed article to its
 * entity file, re-parses the file to prove the edit, and returns the
 * results with those descriptions marked attributed.
 */
function applyTextSources(results) {
	const pending = results.filter((result) => result.flagged && !result.attributed);
	const byFile = Map.groupBy(pending, (result) => result.file);
	for (const [file, fileResults] of byFile) {
		const absPath = join(ROOT, file);
		const current = readYaml(absPath) ?? {};
		const sources = [
			...new Map(
				fileResults.map((result) => [
					result.article.url,
					wikipediaTextSource(result.article.site, result.article.title),
				]),
			).values(),
		].filter((source) => !isAttributed(current.textSources, source.url));
		const text = appendTextSources(readFileSync(absPath, 'utf8'), sources);
		const parsed = parseDocument(text, PARSE_OPTIONS);
		const written = parsed.errors.length === 0 ? parsed.toJS().textSources : undefined;
		if (!sources.every((source) => isAttributed(written, source.url))) {
			throw new FatalError(`${file}: the textSources edit did not round-trip; edit it by hand`);
		}
		writeFileSync(absPath, text, 'utf8');
		process.stderr.write(
			`  applied ${sources.length} textSources entr${sources.length === 1 ? 'y' : 'ies'} to ${file}\n`,
		);
	}
	const applied = new Set(pending);
	return results.map((result) => (applied.has(result) ? { ...result, attributed: true } : result));
}

function summaryOf(results) {
	const checked = results.filter((result) => result.status === 'checked');
	const flagged = checked.filter((result) => result.flagged);
	return {
		checked: checked.length,
		flagged: flagged.length,
		unattributed: flagged.filter((result) => !result.attributed).length,
		unchecked: results.length - checked.length,
	};
}

function percent(ratio) {
	return `${(ratio * 100).toFixed(1)}%`;
}

function resultRow(result) {
	return `| ${result.collection}/${result.slug} | ${result.locale} | [${result.article.title}](${result.article.url}) | ${result.article.via} | ${result.longestRun} | ${result.sharedShingles}/${result.shingles} | ${percent(result.overlap)} | ${result.attributed ? 'yes' : 'no'} |`;
}

function renderMarkdown(report) {
	const { summary, results } = report;
	const checked = results.filter((result) => result.status === 'checked');
	const table = (rows) => [
		'| Entry | Lang | Article | Via | Longest run (words) | Shared shingles | Overlap | Attributed |',
		'| --- | --- | --- | --- | ---: | ---: | ---: | --- |',
		...rows.map(resultRow),
	];
	const unchecked = results.filter((result) => result.status !== 'checked');
	const searchNote = report.search
		? `; a description that article does not flag, or that has none, is also compared with the hits of phrase searches for up to ${SEARCH_PHRASES} of its shingles spread across it (via \`search\`), keeping the strongest hit that meets both rules (a search hit is not the entry's own article, so one shared stock phrase is not enough)`
		: '';
	return [
		'# Originality report',
		'',
		`- Date: ${report.date}`,
		`- Command: \`${report.command}\``,
		`- Rule: ${SHINGLE_SIZE}-word shingles over normalized text (TeX, punctuation, case and diacritics removed). A description is flagged when its longest run shared with the article is at least ${report.thresholds.minRun} words or at least ${percent(report.thresholds.minOverlap)} of its shingles occur in the article.`,
		`- Sources: the article the entry's Wikidata item links (via \`wikidata\`)${searchNote}.`,
		`- Summary: ${summary.checked} descriptions checked, ${summary.flagged} flagged (${summary.unattributed} without attribution), ${summary.unchecked} not checkable.`,
		'',
		`## Flagged (${summary.flagged})`,
		'',
		...(summary.flagged === 0 ? ['None.'] : table(checked.filter((result) => result.flagged))),
		'',
		`## Below the threshold (${summary.checked - summary.flagged})`,
		'',
		...(summary.checked === summary.flagged
			? ['None.']
			: table(checked.filter((result) => !result.flagged))),
		'',
		`## Not checkable (${summary.unchecked})`,
		'',
		...(unchecked.length === 0
			? ['None.']
			: [
					'| Entry | Lang | Reason |',
					'| --- | --- | --- |',
					...unchecked.map(
						(result) =>
							`| ${result.collection}/${result.slug} | ${result.locale} | ${result.status === 'no-wikidata' ? 'no externalIds.wikidata' : `no ${LOCALE_SITES[result.locale]} article for ${result.qid}`}${report.search ? ', no phrase-search match' : ''} |`,
					),
				]),
		'',
	].join('\n');
}

async function main() {
	const options = parseCli(process.argv.slice(2));
	if (options.help) {
		process.stdout.write(`${USAGE}\n`);
		return 0;
	}
	const checked = await checkEntities(selectEntities(options), options);
	const results = options.apply ? applyTextSources(checked) : checked;
	const report = {
		date: new Date().toISOString().slice(0, 10),
		command: ['node scripts/content/originality.mjs', ...process.argv.slice(2)].join(' '),
		thresholds: { shingleSize: SHINGLE_SIZE, ...THRESHOLDS },
		search: options.search,
		summary: summaryOf(results),
		results,
	};
	const text =
		options.format === 'json' ? `${JSON.stringify(report, null, '\t')}\n` : renderMarkdown(report);
	if (options.out === undefined) {
		process.stdout.write(text);
	} else {
		writeFileSync(resolve(options.out), text, 'utf8');
	}
	const { summary } = report;
	process.stderr.write(
		`originality: ${summary.checked} checked, ${summary.flagged} flagged, ${summary.unattributed} unattributed, ${summary.unchecked} not checkable\n`,
	);
	return options.check && summary.unattributed > 0 ? 1 : 0;
}

main().then(
	(code) => {
		process.exitCode = code;
	},
	(error) => {
		process.stderr.write(
			`originality: ${error instanceof FatalError || String(error?.code).startsWith('ERR_PARSE_ARGS') ? error.message : error.stack}\n${USAGE}\n`,
		);
		process.exitCode = 2;
	},
);
