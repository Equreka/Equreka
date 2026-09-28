import { describe, expect, it } from 'vitest';
import { type Catalogs, en, engineMessage, es, pickLocalized, t, tParts } from '../i18n/index';

describe('t', () => {
	it('returns the localized string when the locale catalog has the key', () => {
		expect(t('en', 'favorites.title')).toBe('Favorites');
		expect(t('es', 'favorites.title')).toBe('Favoritos');
	});

	it('falls back to English when the locale catalog lacks the key', () => {
		const catalogs: Catalogs = { en, es: {} };
		expect(t('es', 'favorites.title', undefined, catalogs)).toBe('Favorites');
	});

	it('interpolates {param} tokens and leaves unknown tokens verbatim', () => {
		expect(t('en', 'units.lead', { count: 78 })).toContain('78 units');
		expect(t('es', 'favorites.imported', { count: 3 })).toBe('Se importaron 3 favoritos nuevos.');
		expect(t('en', 'unit.convert', {})).toBe('Convert {name}');
	});

	it('covers every English key in the Spanish catalog (fallback is for future keys)', () => {
		const missing = Object.keys(en).filter((key) => !(key in es));
		expect(missing).toEqual([]);
	});
});

describe('tParts', () => {
	it('splits a localized template into text and param parts in order', () => {
		expect(tParts('en', 'unit.derivedFrom')).toEqual([
			{ kind: 'text', text: 'Derived from ' },
			{ kind: 'param', name: 'base' },
			{ kind: 'text', text: ' with the SI prefix ' },
			{ kind: 'param', name: 'prefix' },
			{ kind: 'text', text: '.' },
		]);
		expect(tParts('es', 'unit.derivedFrom').filter((part) => part.kind === 'param')).toEqual([
			{ kind: 'param', name: 'base' },
			{ kind: 'param', name: 'prefix' },
		]);
	});

	it('returns a single text part for a template without params', () => {
		expect(tParts('en', 'favorites.title')).toEqual([{ kind: 'text', text: 'Favorites' }]);
	});
});

describe('engineMessage', () => {
	it('maps engine error codes to localized messages', () => {
		expect(engineMessage('en', 'inputs/not-a-number')).toBe('Enter numeric values only.');
		expect(engineMessage('es', 'solve/no-real-solution')).toBe(
			'No existe una solución real para estos valores.',
		);
	});
});

describe('pickLocalized', () => {
	it('returns the translation without a fallback flag when present', () => {
		expect(pickLocalized({ en: 'Metre', es: 'Metro' }, 'es')).toEqual({
			value: 'Metro',
			untranslated: false,
		});
	});

	it('flags the English fallback when the translation is missing', () => {
		expect(pickLocalized({ en: 'Metre' }, 'es')).toEqual({ value: 'Metre', untranslated: true });
	});

	it('never flags the source locale', () => {
		expect(pickLocalized({ en: 'Metre' }, 'en')).toEqual({ value: 'Metre', untranslated: false });
	});
});
