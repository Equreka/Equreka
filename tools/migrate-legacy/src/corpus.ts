import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { loadLegacyJson5 } from './legacy-source.js';
import type { LegacyReference, LegacySymbol } from './normalize.js';

export interface LegacyConversionRow {
	value: string;
	units: string;
	formula?: string;
	exact?: boolean;
	sup?: number;
}

export interface LegacyValueRow {
	value: string;
	units: string;
	exact?: boolean;
	base?: boolean;
	sup?: number;
}

export interface LegacyCategory {
	id: number;
	name: string;
	description?: string;
}

export interface LegacyMagnitude {
	name: string;
	symbol: LegacySymbol;
	symbolAlt?: LegacySymbol;
	alias?: string[];
	categories?: string[];
	description?: string | null;
	baseUnit?: string;
	units?: string[];
	branches?: string[];
	subcategories?: string[];
	expression?: string;
}

export interface LegacyUnit {
	name: string;
	symbol: LegacySymbol;
	unitOf?: string[] | null | false;
	type?: string | null;
	baseUnit?: string;
	units?: string[];
	branches?: string[];
	categories?: string[];
	description?: string | null;
	conversions?: LegacyConversionRow[];
	references?: LegacyReference[];
}

export interface LegacyPrefix {
	name: string;
	symbol: LegacySymbol;
	value: string;
	type?: string;
	categories?: string[];
	description?: string | null;
}

export interface LegacyConstant {
	name: string;
	symbol: LegacySymbol;
	symbolAlt?: LegacySymbol;
	categories?: string[];
	description?: string | null;
	units?: string[];
	values?: LegacyValueRow[];
	references?: LegacyReference[];
}

export interface LegacyVariable {
	name: string;
	symbol: LegacySymbol;
	categories?: string[];
	description?: string | null;
	baseUnit?: string;
	units?: string[];
}

export interface LegacyEquation {
	name: string;
	expression?: string;
	expressionIntern?: string;
	categories?: string[];
	description?: string | null;
	units?: string[];
	constants?: string[];
	magnitudes?: string[];
	variables?: string[];
	references?: LegacyReference[];
	supported?: boolean;
}

export interface LegacyEquationEntry {
	kind: 'equation' | 'formula';
	data: LegacyEquation;
}

export interface LegacyCorpus {
	categories: Map<string, LegacyCategory>;
	magnitudes: Map<string, LegacyMagnitude>;
	units: Map<string, LegacyUnit>;
	prefixes: Map<string, LegacyPrefix>;
	constants: Map<string, LegacyConstant>;
	variables: Map<string, LegacyVariable>;
	equations: Map<string, LegacyEquationEntry>;
}

function loadDirectory<T>(root: string, collection: string): Map<string, T> {
	const directory = join(root, collection);
	const entries = new Map<string, T>();
	for (const file of readdirSync(directory).sort()) {
		if (!file.endsWith('.json5')) continue;
		const slug = basename(file, '.json5');
		entries.set(slug, loadLegacyJson5(join(directory, file)) as unknown as T);
	}
	return entries;
}

export function loadCorpus(legacyContentRoot: string): LegacyCorpus {
	const equations = new Map<string, LegacyEquationEntry>();
	for (const [slug, data] of loadDirectory<LegacyEquation>(legacyContentRoot, 'equations')) {
		equations.set(slug, { kind: 'equation', data });
	}
	for (const [slug, data] of loadDirectory<LegacyEquation>(legacyContentRoot, 'formulas')) {
		equations.set(slug, { kind: 'formula', data });
	}
	return {
		categories: loadDirectory<LegacyCategory>(legacyContentRoot, 'categories'),
		magnitudes: loadDirectory<LegacyMagnitude>(legacyContentRoot, 'magnitudes'),
		units: loadDirectory<LegacyUnit>(legacyContentRoot, 'units'),
		prefixes: loadDirectory<LegacyPrefix>(legacyContentRoot, 'prefixes'),
		constants: loadDirectory<LegacyConstant>(legacyContentRoot, 'constants'),
		variables: loadDirectory<LegacyVariable>(legacyContentRoot, 'variables'),
		equations,
	};
}
