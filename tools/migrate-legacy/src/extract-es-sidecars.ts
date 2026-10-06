import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	COLLECTIONS,
	type CollectionName,
	collectionLocaleTrees,
	type LocaleNode,
	SOURCE_LOCALE,
	TRANSLATION_LOCALES,
	type TranslationLocale,
} from '@equreka/schema';
import {
	Document,
	isMap,
	isScalar,
	isSeq,
	type Node,
	type Pair,
	parseDocument,
	parse as parseYaml,
	Scalar,
} from 'yaml';
import { deepEquals } from './emit-yaml.js';

/**
 * One-shot migration (ADR 0003 backlog item 8): moves every inline
 * translation (`es:` beside `en:` at a localized position) out of the entity
 * files into `<collection>/<slug>.<locale>.yaml` sidecars, after which the
 * loader rejects inline translations. Entity files are edited by range
 * splicing, so every other byte survives; each rewrite is gated on a
 * failsafe reparse deep-equal to the input minus its translations, and each
 * sidecar on a reparse deep-equal to what was extracted. Refuses to overwrite
 * an existing sidecar. Kept as a record of the migration — not part of any
 * build.
 */
const PARSE_OPTIONS = {
	version: '1.2',
	schema: 'failsafe',
	merge: false,
	uniqueKeys: true,
} as const;

const CONTENT_ROOT = fileURLToPath(new URL('../../../packages/content/content/', import.meta.url));

interface Extracted {
	segments: string[];
	pair: Pair<Node, Node>;
	value: string;
	folded: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Walks the parsed document along the locale tree, collecting the pair of
 * `locale` at every localized position. Array items are addressed by `id`,
 * the sidecar's keying.
 */
function collect(
	node: LocaleNode,
	yamlNode: unknown,
	segments: string[],
	locale: TranslationLocale,
): Extracted[] {
	if (!isMap(yamlNode)) {
		return node.kind === 'keyed' && node.by === 'id' && isSeq(yamlNode)
			? yamlNode.items.flatMap((item) => {
					const id = isMap(item) ? item.get('id') : undefined;
					if (typeof id !== 'string') {
						throw new Error(`${segments.join('.')}: list item without a string id`);
					}
					return collect(node.item, item, [...segments, id], locale);
				})
			: [];
	}
	switch (node.kind) {
		case 'text': {
			const pair = yamlNode.items.find(
				(entry) => isScalar(entry.key) && entry.key.value === locale,
			);
			if (pair === undefined) {
				return [];
			}
			if (!isScalar(pair.value) || typeof pair.value.value !== 'string') {
				throw new Error(`${segments.join('.')}.${locale}: not a string scalar`);
			}
			return [
				{
					segments,
					pair: pair as Pair<Node, Node>,
					value: pair.value.value,
					folded: pair.value.type === Scalar.BLOCK_FOLDED,
				},
			];
		}
		case 'object':
			return Object.entries(node.fields).flatMap(([key, child]) =>
				collect(child, yamlNode.get(key, true), [...segments, key], locale),
			);
		case 'keyed':
			return node.by === 'key'
				? yamlNode.items.flatMap((entry) =>
						isScalar(entry.key) && typeof entry.key.value === 'string'
							? collect(node.item, entry.value, [...segments, entry.key.value], locale)
							: [],
					)
				: [];
	}
}

/**
 * The entity's plain data with every non-source key removed at localized
 * positions — what the rewritten file must reparse to.
 */
function stripTranslations(node: LocaleNode, value: unknown): unknown {
	switch (node.kind) {
		case 'text':
			return isRecord(value) ? { [SOURCE_LOCALE]: value[SOURCE_LOCALE] } : value;
		case 'object':
			if (!isRecord(value)) {
				return value;
			}
			return Object.fromEntries(
				Object.entries(value).map(([key, child]) => {
					const field = node.fields[key];
					return [key, field === undefined ? child : stripTranslations(field, child)];
				}),
			);
		case 'keyed':
			if (node.by === 'id') {
				return Array.isArray(value)
					? value.map((item: unknown) => stripTranslations(node.item, item))
					: value;
			}
			return isRecord(value)
				? Object.fromEntries(
						Object.entries(value).map(([key, item]) => [key, stripTranslations(node.item, item)]),
					)
				: value;
	}
}

function nest(extracted: readonly Extracted[]): Record<string, unknown> {
	const root: Record<string, unknown> = {};
	for (const { segments, value } of extracted) {
		let cursor = root;
		for (const segment of segments.slice(0, -1)) {
			const next = cursor[segment];
			const child = isRecord(next) ? next : {};
			cursor[segment] = child;
			cursor = child;
		}
		const leaf = segments.at(-1);
		if (leaf === undefined) {
			throw new Error('a localized position always has a path');
		}
		cursor[leaf] = value;
	}
	return root;
}

/**
 * Sidecar text: schema header, then the translations in the entity's own
 * nesting — prose that was a folded block stays folded, short labels stay
 * single-quoted (the corpus quoting convention; TeX backslashes survive).
 */
function sidecarText(
	collection: CollectionName,
	extracted: readonly Extracted[],
	data: Record<string, unknown>,
): string {
	const doc = new Document(data);
	for (const { segments, folded } of extracted) {
		const scalar = doc.getIn(segments, true);
		if (isScalar(scalar)) {
			scalar.type = folded ? Scalar.BLOCK_FOLDED : Scalar.QUOTE_SINGLE;
		}
	}
	const body = doc.toString({
		blockQuote: 'folded',
		defaultKeyType: Scalar.PLAIN,
		defaultStringType: Scalar.QUOTE_SINGLE,
		lineWidth: 100,
	});
	return `# yaml-language-server: $schema=../../dist/schemas/${collection}.locale.schema.json\n${body}`;
}

/**
 * Byte range of one block-map pair, from its line start through the newline
 * that ends its value, so removal leaves no blank line behind.
 */
function pairLineRange(text: string, pair: Pair<Node, Node>, where: string): [number, number] {
	const keyRange = (pair.key as Node).range;
	const valueRange = (pair.value as Node).range;
	if (keyRange == null || valueRange == null) {
		throw new Error(`${where}: node without a source range`);
	}
	const start = text.lastIndexOf('\n', keyRange[0] - 1) + 1;
	if (text.slice(start, keyRange[0]).trim() !== '') {
		throw new Error(`${where}: translation is not a block-map entry on its own line`);
	}
	const valueEnd = valueRange[1];
	const end = text[valueEnd - 1] === '\n' ? valueEnd : text.indexOf('\n', valueEnd) + 1;
	return [start, end === 0 ? text.length : end];
}

let sidecars = 0;
let moved = 0;
let rewritten = 0;
for (const collection of COLLECTIONS) {
	const dir = join(CONTENT_ROOT, collection);
	if (!existsSync(dir)) {
		continue;
	}
	const tree = collectionLocaleTrees[collection];
	const names = readdirSync(dir)
		.filter((name) => /^[a-z0-9]+(?:-[a-z0-9]+)*\.yaml$/.test(name))
		.sort();
	for (const name of names) {
		const file = join(dir, name);
		const slug = name.slice(0, -'.yaml'.length);
		const before = readFileSync(file, 'utf8');
		const doc = parseDocument(before, PARSE_OPTIONS);
		if (doc.errors.length > 0) {
			throw new Error(`${collection}/${name}: parse errors before extraction`);
		}
		const extractedAll = TRANSLATION_LOCALES.map(
			(locale) => [locale, collect(tree, doc.contents, [], locale)] as const,
		);
		if (extractedAll.every(([, extracted]) => extracted.length === 0)) {
			continue;
		}
		const ranges = extractedAll.flatMap(([locale, extracted]) =>
			extracted.map(({ segments, pair }) =>
				pairLineRange(before, pair, `${collection}/${name}:${segments.join('.')}.${locale}`),
			),
		);
		let after = before;
		for (const [start, end] of [...ranges].sort((a, b) => b[0] - a[0])) {
			after = after.slice(0, start) + after.slice(end);
		}
		const expected = stripTranslations(tree, doc.toJS());
		const check = parseDocument(after, PARSE_OPTIONS);
		if (check.errors.length > 0 || !deepEquals(expected, check.toJS())) {
			throw new Error(`${collection}/${name}: extraction would change the entity — not written`);
		}
		const outputs = extractedAll
			.filter(([, extracted]) => extracted.length > 0)
			.map(([locale, extracted]) => {
				const target = join(dir, `${slug}.${locale}.yaml`);
				if (existsSync(target)) {
					throw new Error(`${collection}/${slug}.${locale}.yaml already exists — refusing`);
				}
				const data = nest(extracted);
				const text = sidecarText(collection, extracted, data);
				if (!deepEquals(data, parseYaml(text, PARSE_OPTIONS))) {
					throw new Error(
						`${collection}/${slug}.${locale}.yaml: sidecar round-trip is not identity`,
					);
				}
				return { target, text, count: extracted.length };
			});
		writeFileSync(file, after, 'utf8');
		rewritten += 1;
		for (const { target, text, count } of outputs) {
			writeFileSync(target, text, 'utf8');
			sidecars += 1;
			moved += count;
		}
	}
}

console.log(
	`extract-es-sidecars: ${rewritten} entity files rewritten, ${sidecars} sidecars written, ${moved} translations moved`,
);
