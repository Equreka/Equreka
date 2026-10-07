import { collectionSchemas } from '@equreka/schema';
import { describe, expect, it } from 'vitest';
import { isEntityLevel, proseFields } from '../prose-fields.js';

const path = collectionSchemas.paths.parse({
	name: { en: 'Temperature', es: 'Temperatura' },
	description: { en: 'About $T$.', es: 'Sobre $T$.' },
	level: 'intro',
	steps: [
		{
			id: 'kelvin',
			kind: 'entry',
			ref: { collection: 'units', slug: 'kelvin' },
			note: { en: 'N' },
		},
		{ id: 'bare', kind: 'entry', ref: { collection: 'units', slug: 'metre' } },
		{ id: 'intro', kind: 'prose', body: { en: 'B', es: 'Cuerpo' } },
		{ id: 'check', kind: 'check', prompt: { en: 'P' }, answer: { en: 'A', es: 'R' } },
	],
});

describe('proseFields', () => {
	it('enumerates every prose position per locale in schema order, skipping plain text', () => {
		expect(proseFields('paths', path)).toEqual([
			{ path: 'description', locale: 'en', text: 'About $T$.', downgradable: true },
			{ path: 'description', locale: 'es', text: 'Sobre $T$.', downgradable: true },
			{ path: 'steps.kelvin.note', locale: 'en', text: 'N', downgradable: false },
			{ path: 'steps.intro.body', locale: 'en', text: 'B', downgradable: false },
			{ path: 'steps.intro.body', locale: 'es', text: 'Cuerpo', downgradable: false },
			{ path: 'steps.check.prompt', locale: 'en', text: 'P', downgradable: false },
			{ path: 'steps.check.answer', locale: 'en', text: 'A', downgradable: false },
			{ path: 'steps.check.answer', locale: 'es', text: 'R', downgradable: false },
		]);
	});

	it('leaves names, unit plurals and term labels out: they never carry math', () => {
		const equation = collectionSchemas.equations.parse({
			name: { en: 'Area' },
			level: 'intro',
			expression: '\\var{A}=\\var{s}^2',
			terms: {
				A: { kind: 'symbol', label: { en: 'Area $A$' } },
				s: { kind: 'symbol', label: { en: 'Side' } },
			},
		});
		expect(proseFields('equations', equation)).toEqual([]);
		const unit = collectionSchemas.units.parse({
			name: { en: 'Metre' },
			namePlural: { en: 'metres' },
			symbol: { tex: 'm' },
			unitOf: ['length'],
			description: { en: 'The SI unit of length.' },
		});
		expect(proseFields('units', unit).map((field) => field.path)).toEqual(['description']);
	});

	it('splits entity-level prose from prose inside parts', () => {
		expect(
			proseFields('paths', path)
				.filter(isEntityLevel)
				.map((field) => field.path),
		).toEqual(['description', 'description']);
	});
});
