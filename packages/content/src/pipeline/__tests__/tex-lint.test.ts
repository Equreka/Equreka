import { describe, expect, it } from 'vitest';
import { lintTex } from '../tex-lint.js';
import type { Corpus } from '../validate.js';
import { corpusWith } from './corpus-with.js';

function corpusWithEquation(expression: string, terms: Record<string, unknown>): Corpus {
	return corpusWith({
		equations: { sample: { name: { en: 'Sample' }, level: 'intro', expression, terms } },
	});
}

const label = { en: 'Term' };

describe('lintTex over equation term keys', () => {
	it('fails a key strict KaTeX cannot render', () => {
		const issues = lintTex(
			corpusWithEquation('\\var{\\notacommand}=\\var{x}', {
				'\\notacommand': { kind: 'symbol', label, identifier: 'y' },
				x: { kind: 'symbol', label },
			}),
			new Set(['equations/sample.yaml']),
		);
		expect(issues.filter((entry) => entry.message.startsWith("terms key '\\notacommand'"))).toEqual(
			[expect.objectContaining({ severity: 'error', stage: 'tex' })],
		);
	});

	it('warns on a bare multi-letter key and not on its upright form', () => {
		const issues = lintTex(
			corpusWithEquation('\\var{KE}=\\var{\\mathrm{PE}}', {
				KE: { kind: 'symbol', label },
				'\\mathrm{PE}': { kind: 'symbol', label, identifier: 'PE' },
			}),
			new Set(),
		);
		expect(issues).toEqual([
			expect.objectContaining({
				severity: 'warning',
				stage: 'tex',
				message: expect.stringContaining("terms key 'KE' sets 'KE' as a product of italic letters"),
			}),
		]);
	});
});
