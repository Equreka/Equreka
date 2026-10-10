import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseDocument } from 'yaml';
import { appendTextSources, isAttributed, wikipediaTextSource } from './lib/attribution.mjs';
import {
	CACHE_MAX_AGE_DAYS,
	compareSource,
	contentKind,
	fetchableUrl,
	isFreshRecord,
	needsAction,
	REFERENCE_VIA,
	referenceCachePath,
	referenceRecord,
	strongestSource,
	unreadableRecord,
} from './lib/references.mjs';
import { isStrongMatch, SHINGLE_SIZE, stripMath, THRESHOLDS } from './lib/shingles.mjs';

/**
 * Originality check (ADR 0011): compares every content description with the
 * Wikipedia article its `externalIds.wikidata` item links (English
 * descriptions against enwiki, Spanish sidecar descriptions against eswiki),
 * phrase-searches the wiki for descriptions that article does not explain,
 * and compares both descriptions with the readable text of every URL in the
 * entry's `references`, reporting 8-word shingle overlap. Dev-only and
 * network-bound, so never part of CI or `pnpm quality`. It fails closed
 * (exit 2) rather than guess a source when a Wikimedia API is unreachable;
 * a reference page that cannot be read is reported as not checkable, since
 * that is a property of the page, not of the run. Exit 1 is reserved for
 * `--check`.
 */
const USAGE = `Usage: node scripts/content/originality.mjs [paths...] [options]

  paths                 content files (<collection>/<slug>.yaml or a <slug>.es.yaml sidecar)
  --collection <name>   only this collection (repeatable)
  --slug <slug>         only this slug (repeatable)
  --lang en|es|all      descriptions to check (default all)
  --format md|json      report format (default md)
  --out <file>          write the report to a file (default stdout)
  --check               exit 1 when a description is flagged against a cited reference, or
                        against a Wikipedia article without a textSources entry for it
  --apply               append the missing Wikipedia textSources entries to the entity files
  --no-search           compare only against the Wikidata-linked article
  --no-references       skip the entry's cited references
  --refresh-references  refetch every reference instead of reading the cache
                        (.cache/originality, reused for ${CACHE_MAX_AGE_DAYS} days)
  --delay <ms>          pause before every request (default 300)
  --help                show this text`;

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const CONTENT_ROOT = join(ROOT, 'packages', 'content', 'content');
const CACHE_DIR = join(ROOT, '.cache', 'originality');
const USER_AGENT = 'EquerekaOriginalityCheck/1.0 (https://github.com/Equreka/Equreka)';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_BATCH = 50;
const MAX_ATTEMPTS = 4;
const SEARCH_HITS = 3;
const SEARCH_PHRASES = 5;
const LOCALE_SITES = Object.freeze({ en: 'enwiki', es: 'eswiki' });
const PARSE_OPTIONS = Object.freeze({ version: '1.2', schema: 'failsafe', merge: false });
const REFERENCE_ACCEPT = 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.1';
const REFERENCE_ATTEMPTS = 2;
const REFERENCE_TIMEOUT_MS = 30_000;
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_RETRY_AFTER_S = 60;
const CITED_BY_SHOWN = 5;

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
			references: { type: 'boolean', default: true },
			'refresh-references': { type: 'boolean', default: false },
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
		refreshReferences: values['refresh-references'],
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
					references: (Array.isArray(data.references) ? data.references : [])
						.filter((reference) => typeof reference?.url === 'string')
						.map((reference) => ({ title: reference.title ?? reference.url, url: reference.url })),
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

function articleSource(entity, locale, site, article, via) {
	const origin = {
		via,
		site,
		title: article.title,
		url: wikipediaTextSource(site, article.title).url,
	};
	return compareSource(origin, entity.descriptions[locale], article.text, entity.textSources);
}

function missingArticle(entity, locale, search) {
	const site = LOCALE_SITES[locale];
	const reason =
		entity.qid === undefined ? 'no externalIds.wikidata' : `no ${site} article for ${entity.qid}`;
	return {
		via: 'wikidata',
		site,
		title: null,
		url: null,
		status: 'not-checkable',
		reason: search ? `${reason}, no phrase-search match` : reason,
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
		const article = title === linked.title ? null : await fetchArticle(site, title);
		if (article !== null) {
			candidates.push(articleSource(entity, locale, site, article, 'search'));
		}
	}
	return candidates.filter((candidate) => isStrongMatch(candidate)).sort(byStrength)[0] ?? linked;
}

/**
 * Body bytes of a response, or null past `limit` bytes, so one oversized
 * page cannot exhaust memory.
 */
async function readCapped(response, limit) {
	if (Number(response.headers.get('content-length')) > limit) {
		await response.body?.cancel();
		return null;
	}
	const chunks = [];
	let size = 0;
	for await (const chunk of response.body ?? []) {
		size += chunk.byteLength;
		if (size > limit) {
			return null;
		}
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

/**
 * One cited reference as a cache record (`referenceRecord`), paced, with a
 * timeout, following redirects, and retried once on throttling, a server
 * error or no answer. `cacheable` is false for failures worth retrying on
 * the next run: an HTTP error status, a timeout, a network error.
 */
async function fetchReference(url, delay) {
	let reason = 'no answer';
	for (let attempt = 1; attempt <= REFERENCE_ATTEMPTS; attempt += 1) {
		await sleep(delay);
		try {
			const response = await fetch(url, {
				headers: { 'User-Agent': USER_AGENT, Accept: REFERENCE_ACCEPT },
				redirect: 'follow',
				signal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS),
			});
			if (response.ok) {
				const contentType = response.headers.get('content-type');
				const meta = {
					url,
					finalUrl: response.url,
					contentType,
					fetchedAt: new Date().toISOString(),
				};
				const refused = contentKind(contentType).reason;
				if (refused !== null) {
					await response.body?.cancel();
					return { record: unreadableRecord(meta, refused), cacheable: true };
				}
				const bytes = await readCapped(response, MAX_REFERENCE_BYTES);
				const record =
					bytes === null
						? unreadableRecord(meta, `larger than ${MAX_REFERENCE_BYTES / 1024 / 1024} MB`)
						: referenceRecord(meta, bytes);
				return { record, cacheable: true };
			}
			await response.body?.cancel();
			reason = `HTTP ${response.status}`;
			const retryAfter = Number(response.headers.get('retry-after'));
			if ((response.status !== 429 && response.status < 500) || retryAfter > MAX_RETRY_AFTER_S) {
				break;
			}
			if (attempt < REFERENCE_ATTEMPTS) {
				await sleep(retryAfter > 0 ? retryAfter * 1000 : 2000 * attempt);
			}
		} catch (error) {
			reason =
				error?.name === 'TimeoutError'
					? `no answer within ${REFERENCE_TIMEOUT_MS / 1000} s`
					: `network error (${error?.cause?.code ?? error?.message ?? error})`;
			if (attempt < REFERENCE_ATTEMPTS) {
				await sleep(2000 * attempt);
			}
		}
	}
	return {
		record: unreadableRecord({ url, fetchedAt: new Date().toISOString() }, reason),
		cacheable: false,
	};
}

/**
 * A cache record from disk; a missing, corrupt or foreign file is a miss.
 */
function readCachedReference(url) {
	try {
		const record = JSON.parse(readFileSync(referenceCachePath(CACHE_DIR, url), 'utf8'));
		return isFreshRecord(record, url) ? record : null;
	} catch {
		return null;
	}
}

/**
 * Writes through a temporary file and a rename, so an interrupted run never
 * leaves a truncated record behind.
 */
function writeCachedReference(record) {
	const path = referenceCachePath(CACHE_DIR, record.url);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(`${path}.tmp`, `${JSON.stringify(record)}\n`, 'utf8');
	renameSync(`${path}.tmp`, path);
}

/**
 * `load(url)` resolves a reference to its cache record once per run: from
 * the disk cache unless `--refresh-references`, else by fetching it.
 * `stats` counts both paths over unique URLs.
 */
function referenceLoader(options, log) {
	const records = new Map();
	const stats = { fromCache: 0, fetched: 0 };
	const load = async (url) => {
		const key = fetchableUrl(url);
		if (!records.has(key)) {
			const cached = options.refreshReferences ? null : readCachedReference(key);
			if (cached === null) {
				log(`  reference ${key}`);
				const { record, cacheable } = await fetchReference(key, options.delay);
				if (cacheable) {
					writeCachedReference(record);
				}
				if (record.text === null) {
					log(`    not checkable: ${record.reason}`);
				}
				stats.fetched += 1;
				records.set(key, record);
			} else {
				stats.fromCache += 1;
				records.set(key, cached);
			}
		}
		return records.get(key);
	};
	return { load, stats };
}

async function referenceSources(entity, locale, load) {
	const sources = [];
	for (const reference of entity.references) {
		const record = await load(reference.url);
		const origin = {
			via: REFERENCE_VIA,
			site: null,
			title: reference.title,
			url: reference.url,
			fetchedAt: record.fetchedAt,
			...(record.finalUrl && record.finalUrl !== record.url ? { finalUrl: record.finalUrl } : {}),
		};
		sources.push(
			record.text === null
				? { ...origin, status: 'not-checkable', reason: record.reason }
				: compareSource(origin, entity.descriptions[locale], record.text, entity.textSources),
		);
	}
	return sources;
}

/**
 * Why no source of a description could be read: the Wikipedia gap, then
 * the references' state.
 */
function uncheckedReason(sources, options) {
	const [wikipedia, ...references] = sources;
	const referencePart = !options.references
		? 'references skipped (--no-references)'
		: references.length === 0
			? 'no references'
			: `${references.length} reference${references.length === 1 ? '' : 's'} not checkable`;
	return `${wikipedia.reason}; ${referencePart}`;
}

/**
 * One report row: the description's identity, every source it was
 * compared with (the Wikipedia source first), and the strongest of them
 * (`strongestSource`) spread into the top-level fields the report has
 * always carried. `status` is `checked` once any source was read, else the
 * Wikipedia gap (`no-wikidata`, `no-article`).
 */
function descriptionResult(base, sources, reason) {
	const { collection, slug, file, locale, qid } = base;
	const identity = { collection, slug, file, locale, qid };
	const strongest = strongestSource(sources);
	if (strongest === null) {
		return {
			...identity,
			status: qid === null ? 'no-wikidata' : 'no-article',
			reason,
			article: null,
			sources,
		};
	}
	const { via, site, title, url, words, shingles, sharedShingles, longestRun, run, overlap } =
		strongest;
	return {
		...identity,
		status: 'checked',
		reason: null,
		article: { site, title, url, via },
		words,
		shingles,
		sharedShingles,
		longestRun,
		run,
		overlap,
		flagged: strongest.flagged,
		attributed: strongest.attributed,
		sources,
	};
}

async function checkEntities(entities, options) {
	const log = (message) => process.stderr.write(`${message}\n`);
	const targets = entities.flatMap((entity) =>
		options.locales
			.filter((locale) => entity.descriptions[locale] !== undefined)
			.map((locale) => ({ entity, locale })),
	);
	const qids = targets.map((target) => target.entity.qid).filter((qid) => qid !== undefined);
	const cited = new Set(
		options.references
			? targets.flatMap((target) =>
					target.entity.references.map((reference) => fetchableUrl(reference.url)),
				)
			: [],
	);
	log(
		`originality: ${targets.length} descriptions, ${new Set(qids).size} Wikidata items, ${cited.size} cited references`,
	);
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
	const references = referenceLoader(options, log);
	const results = [];
	for (const { entity, locale } of targets) {
		const site = LOCALE_SITES[locale];
		const linkedTitle = entity.qid === undefined ? undefined : sitelinks.get(entity.qid)?.[site];
		const article = linkedTitle === undefined ? null : await fetchArticle(site, linkedTitle);
		const linked =
			article === null
				? missingArticle(entity, locale, options.search)
				: articleSource(entity, locale, site, article, 'wikidata');
		const wikipedia =
			linked.flagged === true || !options.search
				? linked
				: await searchMatch(entity, locale, linked, fetchArticle, options.delay);
		const sources = [
			wikipedia,
			...(options.references ? await referenceSources(entity, locale, references.load) : []),
		];
		const base = {
			collection: entity.collection,
			slug: entity.slug,
			file: relative(ROOT, entity.file).replaceAll('\\', '/'),
			locale,
			qid: entity.qid ?? null,
		};
		results.push(descriptionResult(base, sources, uncheckedReason(sources, options)));
	}
	const sorted = results.sort(
		(left, right) =>
			(right.overlap ?? -1) - (left.overlap ?? -1) ||
			(right.longestRun ?? -1) - (left.longestRun ?? -1) ||
			`${left.collection}/${left.slug}/${left.locale}`.localeCompare(
				`${right.collection}/${right.slug}/${right.locale}`,
			),
	);
	return { results: sorted, referenceStats: references.stats };
}

/**
 * Appends one `textSources` entry per flagged, uncredited Wikipedia article
 * to its entity file, re-parses the file to prove the edit, and returns the
 * results with those sources marked attributed. A cited reference is never
 * credited (`isCredited`), so a copy from one stays flagged.
 */
function applyTextSources(results) {
	const pending = results.flatMap((result) =>
		result.sources
			.filter((source) => source.via !== REFERENCE_VIA && needsAction(source))
			.map((source) => ({ file: result.file, source })),
	);
	const byFile = Map.groupBy(pending, (item) => item.file);
	for (const [file, items] of byFile) {
		const absPath = join(ROOT, file);
		const current = readYaml(absPath) ?? {};
		const sources = [
			...new Map(
				items.map(({ source }) => [source.url, wikipediaTextSource(source.site, source.title)]),
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
	const applied = new Set(pending.map((item) => item.source));
	return results.map((result) =>
		result.sources.some((source) => applied.has(source))
			? descriptionResult(
					result,
					result.sources.map((source) =>
						applied.has(source) ? { ...source, attributed: true } : source,
					),
					result.reason,
				)
			: result,
	);
}

/**
 * Every cited reference URL once, with its read state and the entries that
 * cite it.
 */
function citedReferences(results) {
	const byUrl = new Map();
	for (const result of results) {
		for (const source of result.sources.filter((item) => item.via === REFERENCE_VIA)) {
			const key = fetchableUrl(source.url);
			const entry = byUrl.get(key) ?? {
				url: key,
				status: source.status,
				reason: source.reason,
				citedBy: new Set(),
			};
			entry.citedBy.add(`${result.collection}/${result.slug}`);
			byUrl.set(key, entry);
		}
	}
	return [...byUrl.values()].map((entry) => ({ ...entry, citedBy: [...entry.citedBy].sort() }));
}

function summaryOf(results, referenceStats) {
	const checked = results.filter((result) => result.status === 'checked');
	const flagged = checked.filter((result) => result.flagged);
	const cited = citedReferences(results);
	return {
		checked: checked.length,
		flagged: flagged.length,
		unattributed: flagged.filter((result) => !result.attributed).length,
		unchecked: results.length - checked.length,
		references: {
			cited: cited.length,
			readable: cited.filter((reference) => reference.status === 'checked').length,
			notCheckable: cited.filter((reference) => reference.status !== 'checked').length,
			...referenceStats,
		},
	};
}

function percent(ratio) {
	return `${(ratio * 100).toFixed(1)}%`;
}

function referencesRead(result) {
	const references = result.sources.filter((source) => source.via === REFERENCE_VIA);
	return `${references.filter((source) => source.status === 'checked').length}/${references.length}`;
}

function attributedCell(source) {
	if (source.via === REFERENCE_VIA) {
		return source.flagged ? 'never (cited reference)' : 'n/a';
	}
	return source.attributed ? 'yes' : 'no';
}

function renderMarkdown(report) {
	const { summary, results } = report;
	const checked = results.filter((result) => result.status === 'checked');
	const sourceCells = (result, source) =>
		`| ${result.collection}/${result.slug} | ${result.locale} | [${source.title.replaceAll('|', '\\|')}](${source.url}) | ${source.via} | ${source.longestRun} | ${source.sharedShingles}/${source.shingles} | ${percent(source.overlap)} | ${attributedCell(source)} | ${report.references ? referencesRead(result) : 'skipped'} |`;
	const columns =
		'| Entry | Lang | Source | Via | Longest run (words) | Shared shingles | Overlap | Attributed | References read |';
	const alignment = '| --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: |';
	const flaggedRows = checked
		.filter((result) => result.flagged)
		.flatMap((result) =>
			result.sources
				.filter((source) => source.status === 'checked' && source.flagged)
				.toSorted(byStrength)
				.map((source) => `${sourceCells(result, source)} ${source.run} |`),
		);
	const belowRows = checked
		.filter((result) => !result.flagged)
		.map((result) => sourceCells(result, strongestSource(result.sources)));
	const unchecked = results.filter((result) => result.status !== 'checked');
	const unreadable = citedReferences(results).filter((reference) => reference.status !== 'checked');
	const searchNote = report.search
		? `; a description that article does not flag, or that has none, is also compared with the hits of phrase searches for up to ${SEARCH_PHRASES} of its shingles spread across it (via \`search\`), keeping the strongest hit that meets both rules (a search hit is not the entry's own article, so one shared stock phrase is not enough)`
		: '';
	const referenceNote = report.references
		? `; and every URL in the entry's \`references\` (via \`reference\`), fetched as HTML and reduced to its readable text (navigation, headers, footers, sidebars, scripts and math removed; cached in \`.cache/originality\` for ${CACHE_MAX_AGE_DAYS} days). A reference is one of the entry's own sources, so either rule flags it, and no \`textSources\` credit clears it: a copy from a cited reference is rewritten`
		: '';
	const citedBy = (reference) =>
		reference.citedBy.length > CITED_BY_SHOWN
			? `${reference.citedBy.slice(0, CITED_BY_SHOWN).join(', ')} and ${reference.citedBy.length - CITED_BY_SHOWN} more`
			: reference.citedBy.join(', ');
	return [
		'# Originality report',
		'',
		`- Date: ${report.date}`,
		`- Command: \`${report.command}\``,
		`- Rule: ${SHINGLE_SIZE}-word shingles over normalized text (TeX, punctuation, case and diacritics removed). A description is flagged when its longest run shared with a source is at least ${report.thresholds.minRun} words or at least ${percent(report.thresholds.minOverlap)} of its shingles occur in the source.`,
		`- Sources: the article the entry's Wikidata item links (via \`wikidata\`)${searchNote}${referenceNote}.`,
		`- Summary: ${summary.checked} descriptions checked, ${summary.flagged} flagged (${summary.unattributed} needing action: a cited-reference copy or an uncredited article), ${summary.unchecked} not checkable.`,
		...(report.references
			? [
					`- References: ${summary.references.cited} cited URLs, ${summary.references.readable} read, ${summary.references.notCheckable} not checkable (${summary.references.fromCache} from the cache, ${summary.references.fetched} fetched).`,
				]
			: []),
		'',
		`## Flagged (${summary.flagged})`,
		'',
		...(flaggedRows.length === 0
			? ['None.']
			: [
					'One row per flagged source, strongest first. The shared run is shown normalized (lowercase, no punctuation or diacritics).',
					'',
					`${columns} Longest shared run |`,
					`${alignment} --- |`,
					...flaggedRows,
				]),
		'',
		`## Below the threshold (${summary.checked - summary.flagged})`,
		'',
		...(belowRows.length === 0
			? ['None.']
			: ['The strongest source of each description.', '', columns, alignment, ...belowRows]),
		'',
		`## Not checkable (${summary.unchecked})`,
		'',
		...(unchecked.length === 0
			? ['None.']
			: [
					'No source text could be read: no Wikipedia article (and no phrase-search match), and no readable reference.',
					'',
					'| Entry | Lang | Reason |',
					'| --- | --- | --- |',
					...unchecked.map(
						(result) =>
							`| ${result.collection}/${result.slug} | ${result.locale} | ${result.reason} |`,
					),
				]),
		'',
		...(report.references
			? [
					`## References not checkable (${unreadable.length})`,
					'',
					...(unreadable.length === 0
						? ['None.']
						: [
								'Descriptions citing these pages were not compared with them; compare them by hand.',
								'',
								'| Reference | Reason | Cited by |',
								'| --- | --- | --- |',
								...unreadable.map(
									(reference) =>
										`| ${reference.url} | ${reference.reason} | ${citedBy(reference)} |`,
								),
							]),
					'',
				]
			: []),
	].join('\n');
}

async function main() {
	const options = parseCli(process.argv.slice(2));
	if (options.help) {
		process.stdout.write(`${USAGE}\n`);
		return 0;
	}
	const { results: checked, referenceStats } = await checkEntities(
		selectEntities(options),
		options,
	);
	const results = options.apply ? applyTextSources(checked) : checked;
	const report = {
		date: new Date().toISOString().slice(0, 10),
		command: ['node scripts/content/originality.mjs', ...process.argv.slice(2)].join(' '),
		thresholds: { shingleSize: SHINGLE_SIZE, ...THRESHOLDS },
		search: options.search,
		references: options.references,
		summary: summaryOf(results, referenceStats),
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
		`originality: ${summary.checked} checked, ${summary.flagged} flagged, ${summary.unattributed} needing action, ${summary.unchecked} not checkable\n`,
	);
	if (options.references) {
		process.stderr.write(
			`originality: references: ${summary.references.cited} cited, ${summary.references.readable} read, ${summary.references.notCheckable} not checkable (${summary.references.fromCache} from cache, ${summary.references.fetched} fetched)\n`,
		);
	}
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
