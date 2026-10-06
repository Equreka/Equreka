import { z } from 'zod';
import { localizedProse, localizedText } from './common.js';

/**
 * The language every entity file is authored in; translations live only in
 * `<slug>.<locale>.yaml` sidecars beside it (ADR 0003 backlog item 8).
 */
export const SOURCE_LOCALE = 'en';

/**
 * Locales a sidecar may carry — the optional keys of `localizedText`.
 * Adding a locale means adding it here and to `localizedText` together.
 */
export const TRANSLATION_LOCALES = ['es'] as const;

export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

/**
 * Where localized text sits inside an entity, derived from its Zod schema so
 * a new `localizedText` or `localizedProse` field is translatable without
 * touching the sidecar contract. `prose` marks rich text that may embed
 * math. `keyed` marks a collection whose sidecar form is a map: array items
 * are keyed by their `id` (never by index, so reordering steps cannot
 * misattach a translation) and records by their own key.
 */
export type LocaleNode =
	| { readonly kind: 'text'; readonly prose: boolean }
	| { readonly kind: 'object'; readonly fields: Readonly<Record<string, LocaleNode>> }
	| {
			readonly kind: 'keyed';
			readonly by: 'id' | 'key';
			readonly keySchema: z.ZodType<string>;
			readonly item: LocaleNode;
	  };

export type LocaleObjectNode = Extract<LocaleNode, { kind: 'object' }>;

function mergeNodes(left: LocaleNode, right: LocaleNode, at: string): LocaleNode {
	if (left.kind === 'text' && right.kind === 'text' && left.prose === right.prose) {
		return left;
	}
	if (left.kind === 'object' && right.kind === 'object') {
		const fields: Record<string, LocaleNode> = { ...left.fields };
		for (const [key, node] of Object.entries(right.fields)) {
			const existing = fields[key];
			fields[key] = existing === undefined ? node : mergeNodes(existing, node, `${at}.${key}`);
		}
		return { kind: 'object', fields };
	}
	throw new Error(`locale tree: union options disagree on the shape of localized text at ${at}`);
}

function objectShapeOf(schema: z.ZodType): Record<string, z.ZodType> | null {
	return schema instanceof z.ZodObject ? (schema.shape as Record<string, z.ZodType>) : null;
}

/**
 * The `id` schema shared by every item of a keyed array, or null when some
 * item shape has no `id` field.
 */
function itemIdSchema(element: z.ZodType): z.ZodType<string> | null {
	const shapes =
		element instanceof z.ZodUnion
			? (element.options as readonly z.ZodType[]).map(objectShapeOf)
			: [objectShapeOf(element)];
	const ids = shapes.map((shape) => shape?.id);
	const first = ids[0];
	if (first === undefined || ids.some((id) => id === undefined)) {
		return null;
	}
	return first as z.ZodType<string>;
}

/**
 * Derives the locale tree of one schema position, or null when nothing
 * beneath it is localized. Throws on shapes a sidecar cannot address (an
 * array of localized items without ids) so the gap surfaces at import time,
 * not as a silently untranslatable field.
 */
export function localeTreeOf(schema: z.ZodType, at = '(root)'): LocaleNode | null {
	if (schema === localizedText || schema === localizedProse) {
		return { kind: 'text', prose: schema === localizedProse };
	}
	if (
		schema instanceof z.ZodOptional ||
		schema instanceof z.ZodDefault ||
		schema instanceof z.ZodNullable
	) {
		return localeTreeOf(schema.unwrap() as z.ZodType, at);
	}
	if (schema instanceof z.ZodPipe) {
		return localeTreeOf(schema.in as z.ZodType, at);
	}
	if (schema instanceof z.ZodObject) {
		const fields: Record<string, LocaleNode> = {};
		for (const [key, child] of Object.entries(schema.shape as Record<string, z.ZodType>)) {
			const node = localeTreeOf(child, at === '(root)' ? key : `${at}.${key}`);
			if (node !== null) {
				fields[key] = node;
			}
		}
		return Object.keys(fields).length === 0 ? null : { kind: 'object', fields };
	}
	if (schema instanceof z.ZodUnion) {
		const nodes = (schema.options as readonly z.ZodType[])
			.map((option) => localeTreeOf(option, at))
			.filter((node): node is LocaleNode => node !== null);
		const [first, ...rest] = nodes;
		return first === undefined
			? null
			: rest.reduce((acc, node) => mergeNodes(acc, node, at), first);
	}
	if (schema instanceof z.ZodArray) {
		const element = schema.element as z.ZodType;
		const item = localeTreeOf(element, `${at}[]`);
		if (item === null) {
			return null;
		}
		const keySchema = itemIdSchema(element);
		if (keySchema === null) {
			throw new Error(
				`locale tree: ${at} holds localized text but its items have no id to key sidecar entries by`,
			);
		}
		return { kind: 'keyed', by: 'id', keySchema, item };
	}
	if (schema instanceof z.ZodRecord) {
		const item = localeTreeOf(schema.valueType as z.ZodType, `${at}{}`);
		if (item === null) {
			return null;
		}
		return { kind: 'keyed', by: 'key', keySchema: schema.keyType as z.ZodType<string>, item };
	}
	return null;
}

/**
 * Root locale tree of an entity schema. Every entity has a localized `name`,
 * so the root is always an object node.
 */
export function entityLocaleTree(schema: z.ZodType): LocaleObjectNode {
	const tree = localeTreeOf(schema);
	if (tree === null || tree.kind !== 'object') {
		throw new Error('locale tree: an entity schema must localize at least one field');
	}
	return tree;
}

/**
 * Strict Zod schema of a sidecar: every localized position becomes a plain
 * string, keyed collections become maps, and any other key is rejected — a
 * sidecar can only ever carry translations.
 */
export function sidecarSchemaOf(node: LocaleNode): z.ZodType {
	switch (node.kind) {
		case 'text':
			return z.string().min(1);
		case 'object': {
			const shape: Record<string, z.ZodType> = {};
			for (const [key, child] of Object.entries(node.fields)) {
				shape[key] = sidecarSchemaOf(child).optional();
			}
			return z.object(shape).strict();
		}
		case 'keyed':
			return z.record(node.keySchema, sidecarSchemaOf(node.item));
	}
}
