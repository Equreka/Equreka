import { ARTIFACT_BUDGETS, artifactBudgetPatterns } from '@equreka/content/artifact-budgets';
import {
	PRESENTATION_SHARDS,
	presentationShardPath,
	readPresentationSlice,
	SHARDED_COLLECTIONS,
} from '@equreka/content/presentation-shards';
import { MATH_SHARD_COUNT, mathShardName } from '@equreka/content/rich-text';
import { describe, expect, it, jest } from '@jest/globals';
import { getEntity } from '../entities/content/lookup';
import {
	getAllMathBodies,
	getMathBody,
	getMathBodyShard,
	getPresentation,
	getPresentationShard,
	getSearchLeads,
} from '../shared/content/artifact';

declare const __dirname: string;

/**
 * The part of node:fs these checks use, typed structurally: the app's
 * TypeScript program carries no Node types, and jest runs on Node.
 */
interface FileSystem {
	readFileSync(path: string, encoding: 'utf8'): string;
	readdirSync(path: string, options: { recursive: true }): string[];
	statSync(path: string): { isFile(): boolean };
}

const fs = jest.requireActual<FileSystem>('node:fs');

const ARTIFACT_SOURCE = `${__dirname}/../shared/content/artifact.ts`;

const DIST = `${__dirname}/../node_modules/@equreka/content/dist`;

const ARTIFACT_SPECIFIER_RE =
	/(?:from |require(?:<[^>]*>)?\()'@equreka\/content\/artifact\/([^']+)'/g;

function importedArtifacts(): string[] {
	const source = fs.readFileSync(ARTIFACT_SOURCE, 'utf8');
	return Array.from(source.matchAll(ARTIFACT_SPECIFIER_RE), (match) => match[1] ?? '');
}

function readDist(relPath: string): unknown {
	return JSON.parse(fs.readFileSync(`${DIST}/${relPath}`, 'utf8'));
}

function distFiles(): string[] {
	return fs
		.readdirSync(DIST, { recursive: true })
		.map((path) => path.replace(/\\/g, '/'))
		.filter((path) => fs.statSync(`${DIST}/${path}`).isFile())
		.sort();
}

describe('bundled content artifact', () => {
	it('reads exactly the files ARTIFACT_BUDGETS flags as mobile-bundled', () => {
		const files = distFiles();
		const imported = new Set(importedArtifacts());
		expect(imported.size).toBeGreaterThan(20);
		for (const file of files) {
			const patterns = artifactBudgetPatterns(file);
			expect(patterns).toHaveLength(1);
			expect([file, ARTIFACT_BUDGETS[patterns[0] ?? '']?.mobileBundled]).toEqual([
				file,
				imported.has(file),
			]);
		}
		for (const specifier of imported) {
			expect(files).toContain(specifier);
		}
	});

	it('requires every math body shard, loader i reading bodies/<mathShardName(i)>.json', () => {
		const shardPaths = Array.from(
			{ length: MATH_SHARD_COUNT },
			(_, shard) => `presentation/math/bodies/${mathShardName(shard)}.json`,
		);
		expect(
			importedArtifacts().filter((path) => path.startsWith('presentation/math/bodies/')),
		).toEqual(shardPaths);
		shardPaths.forEach((path, shard) => {
			expect(getMathBodyShard(shard)).toEqual(
				JSON.parse(fs.readFileSync(`${DIST}/${path}`, 'utf8')),
			);
		});
		expect(getMathBodyShard(MATH_SHARD_COUNT)).toBeUndefined();
	});

	it('requires every presentation shard, loader i reading <collection>/<shardName(i)>.json', () => {
		for (const collection of SHARDED_COLLECTIONS) {
			const { count } = PRESENTATION_SHARDS[collection];
			const shardPaths = Array.from({ length: count }, (_, shard) =>
				presentationShardPath(collection, shard),
			);
			expect(
				importedArtifacts().filter((path) => path.startsWith(`presentation/${collection}/`)),
			).toEqual(shardPaths);
			shardPaths.forEach((path, shard) => {
				expect(getPresentationShard(collection, shard)).toEqual(readDist(path));
			});
			expect(getPresentationShard(collection, count)).toBeUndefined();
		}
	});

	it('rebuilds every entry of a sharded collection from its index row and its shard row', () => {
		for (const collection of SHARDED_COLLECTIONS) {
			const whole = readPresentationSlice(collection, readDist);
			const slugs = Object.keys(getPresentation(collection));
			expect(slugs.sort()).toEqual(Object.keys(whole).sort());
			for (const slug of slugs) {
				expect([collection, slug, getEntity(collection, slug)]).toEqual([
					collection,
					slug,
					whole[slug],
				]);
			}
			expect(getEntity(collection, 'no-such-entry')).toBeUndefined();
			expect(getEntity(collection, 'constructor')).toBeUndefined();
		}
	});

	it('reads the search leads of each locale from its own file', () => {
		expect(getSearchLeads('en')).toEqual(readDist('search/leads.en.json'));
		expect(getSearchLeads('es')).toEqual(readDist('search/leads.es.json'));
	});

	it('finds every body through the shard its TeX hashes to', () => {
		const bodies = Object.entries(getAllMathBodies());
		expect(bodies.length).toBeGreaterThan(300);
		for (const [tex, body] of bodies) {
			expect(getMathBody(tex)).toBe(body);
		}
		expect(getMathBody('constructor')).toBeUndefined();
		expect(getMathBody('\\notatex')).toBeUndefined();
	});
});
