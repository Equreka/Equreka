import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { ICONS, type IconDefinition, type IconName } from '../icons';

const requireFromHere = createRequire(import.meta.url);

const PATH_RE = /<path([^>]*)\/>/g;

/**
 * Re-parses one bootstrap-icons source SVG into the vendored shape, so the
 * map can never drift from the pinned package (or gain hand-edited paths).
 */
function fromPackage(name: IconName): IconDefinition {
	const svg = readFileSync(requireFromHere.resolve(`bootstrap-icons/icons/${name}.svg`), 'utf8');
	const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '';
	const paths = [...svg.matchAll(PATH_RE)].map(([, attrs = '']) => {
		const d = / d="([^"]+)"/.exec(attrs)?.[1] ?? '';
		return attrs.includes('fill-rule="evenodd"') ? { d, fillRule: 'evenodd' as const } : { d };
	});
	return { viewBox, paths };
}

describe('vendored bootstrap-icons', () => {
	it('carries exactly the icons the legacy design lists', () => {
		expect(Object.keys(ICONS).sort()).toEqual(
			[
				'arrow-clockwise',
				'arrow-right',
				'box-arrow-in-down',
				'box-arrow-up',
				'check2',
				'chevron-left',
				'chevron-right',
				'clipboard',
				'cloud-download',
				'discord',
				'facebook',
				'flag',
				'gear',
				'gear-wide',
				'github',
				'heart',
				'heart-fill',
				'house',
				'info-square',
				'moon',
				'paypal',
				'pencil',
				'plus',
				'plus-square',
				'search',
				'sun',
				'translate',
				'twitter',
				'x',
			].sort(),
		);
	});

	it('matches the pinned package path data verbatim', () => {
		for (const name of Object.keys(ICONS) as IconName[]) {
			expect(ICONS[name], name).toEqual(fromPackage(name));
		}
	});
});
