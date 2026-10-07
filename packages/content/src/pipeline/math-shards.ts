import {
	hydrateMathBody,
	isLeanMathBody,
	leanMathBody,
	MATH_SHARD_COUNT,
	type MathAtlas,
	type MathBodies,
	type MathBody,
	type MathBodyShard,
	type MathBodyV2,
	mathShardOf,
} from '../rich-text.js';
import { type Issue, issue } from './types.js';

/**
 * `shards[i]` is the content of
 * `presentation/math/bodies/<mathShardName(i)>.json`, empty shards
 * included; `raw` lists the TeX of every body shipped in raw form.
 */
export interface MathShards {
	shards: MathBodyShard[];
	raw: string[];
	issues: Issue[];
}

function hydratesIdentically(lean: MathBodyV2, body: MathBody, atlas: MathAtlas): boolean {
	try {
		return hydrateMathBody(lean, atlas) === hydrateMathBody(body, atlas);
	} catch {
		return false;
	}
}

/**
 * The shipped form of one rendered body: lean only when hydrating it yields
 * exactly the XML the rendered body hydrates to, the string react-native-svg
 * receives, so the encoding can never change a pixel; the rendered body
 * itself otherwise.
 */
export function encodeMathBody(body: MathBody, atlas: MathAtlas): MathBodyV2 {
	const lean = leanMathBody(body);
	return lean !== undefined && hydratesIdentically(lean, body, atlas) ? lean : body;
}

/**
 * Encodes every body and groups the results by `mathShardOf`. A raw body is
 * correct but about two and a half times the size of a lean one, and it
 * means the MathJax output drifted from the lean grammar, so raw bodies are
 * reported in one warning.
 */
export function shardMathBodies(bodies: MathBodies, atlas: MathAtlas): MathShards {
	const encoded = Object.entries(bodies).map(([tex, body]) => ({
		tex,
		shard: mathShardOf(tex),
		body: encodeMathBody(body, atlas),
	}));
	const shards = Array.from(
		{ length: MATH_SHARD_COUNT },
		(_, shard): MathBodyShard =>
			Object.fromEntries(
				encoded.filter((entry) => entry.shard === shard).map((entry) => [entry.tex, entry.body]),
			),
	);
	const raw = encoded
		.filter((entry) => !isLeanMathBody(entry.body))
		.map((entry) => entry.tex)
		.sort();
	const shown = raw
		.slice(0, 5)
		.map((tex) => JSON.stringify(tex))
		.join(', ');
	const issues =
		raw.length === 0
			? []
			: [
					issue(
						'warning',
						'math',
						'',
						`${raw.length} math bodies fall outside the lean encoding and ship raw (ADR 0005): ${shown}${raw.length > 5 ? ', …' : ''}`,
					),
				];
	return { shards, raw, issues };
}
