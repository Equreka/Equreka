import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, useSettings } from '../hooks/use-settings';
import { createMemoryStorage } from './memory-storage';

afterEach(cleanup);

describe('useSettings', () => {
	it('defaults to system theme, en locale and readable results on empty or corrupt storage', () => {
		const defaults = { theme: 'system', locale: 'en', numberFormat: 'readable' };
		expect(DEFAULT_SETTINGS).toEqual(defaults);

		const empty = renderHook(() => useSettings(createMemoryStorage()));
		expect(empty.result.current.settings).toEqual(defaults);

		const corrupt = renderHook(() =>
			useSettings(createMemoryStorage({ [SETTINGS_KEY]: '{"theme":"neon","locale":"fr"' })),
		);
		expect(corrupt.result.current.settings).toEqual(defaults);
	});

	it('persists theme, locale and number format independently under the versioned key', () => {
		const storage = createMemoryStorage();
		const { result } = renderHook(() => useSettings(storage));

		act(() => result.current.setTheme('dark'));
		act(() => result.current.setLocale('es'));
		act(() => result.current.setNumberFormat('scientific'));

		const expected = { theme: 'dark', locale: 'es', numberFormat: 'scientific' };
		expect(result.current.settings).toEqual(expected);
		expect(JSON.parse(storage.get(SETTINGS_KEY) ?? '{}')).toEqual(expected);
	});

	it('drops unknown values while keeping the valid ones', () => {
		const storage = createMemoryStorage({
			[SETTINGS_KEY]: '{"theme":"dark","locale":"de","numberFormat":"engineering"}',
		});
		const { result } = renderHook(() => useSettings(storage));
		expect(result.current.settings).toEqual({
			theme: 'dark',
			locale: 'en',
			numberFormat: 'readable',
		});
	});

	it('reads settings stored before the number format existed as readable', () => {
		const storage = createMemoryStorage({ [SETTINGS_KEY]: '{"theme":"light","locale":"es"}' });
		const { result } = renderHook(() => useSettings(storage));
		expect(result.current.settings).toEqual({
			theme: 'light',
			locale: 'es',
			numberFormat: 'readable',
		});

		act(() => result.current.setNumberFormat('scientific'));
		expect(JSON.parse(storage.get(SETTINGS_KEY) ?? '{}')).toEqual({
			theme: 'light',
			locale: 'es',
			numberFormat: 'scientific',
		});
	});
});
